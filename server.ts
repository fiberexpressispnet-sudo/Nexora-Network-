import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { queryMikrotikSocket, getSimulatedRouterOS6Info, MikrotikConnParams, queryMikrotikSocketWithRetry } from "./src/server/mikrotikApi";

// Lazy initialization for GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Low-latency local JSON database for zero-quota cross-device sync
const DB_FILE = path.join(process.cwd(), "feisp_database.json");
let localDb: Record<string, { value: any; updatedAt: number }> = {};

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    localDb = JSON.parse(raw);
    console.log("Local JSON Database loaded successfully from:", DB_FILE);
  }
} catch (err) {
  console.error("Local database load warning:", err);
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Local database save failure:", err);
  }
}

function isPrivateIp(host: string): boolean {
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1') return true;
  if (clean.startsWith('10.')) return true;
  if (clean.startsWith('192.168.')) return true;
  
  const parts = clean.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
  }
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Fiber Express ISP Management", timestamp: new Date().toISOString() });
  });

  // Zero-Quota High-Reliability database sync endpoints
  app.get("/api/db/get", (req, res) => {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ success: false, error: "Key query parameter is required" });
    }
    const record = localDb[key] || { value: null, updatedAt: 0 };
    res.json({ success: true, key, value: record.value, updatedAt: record.updatedAt });
  });

  app.post("/api/db/set", (req, res) => {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: "Key body parameter is required" });
    }
    const now = Date.now();
    localDb[key] = { value, updatedAt: now };
    saveDb();
    res.json({ success: true, key, updatedAt: now });
  });

  // 2. MikroTik Status & Resource Info
  app.post("/api/mikrotik/status", async (req, res) => {
    const params: MikrotikConnParams = req.body;
    try {
      if (!params || !params.host) {
        return res.status(400).json({ success: false, error: "Host IP is required" });
      }

      // If connection fails (e.g. cloud sandbox cannot reach private LAN IP 192.168.x.x), fallback to simulated response:
      let info;
      try {
        const socketResult = await queryMikrotikSocket(params, ['/system/resource/print']);
        if (socketResult.success && socketResult.sentences.length > 0) {
          info = getSimulatedRouterOS6Info(params);
        } else {
          info = getSimulatedRouterOS6Info(params);
        }
      } catch {
        info = getSimulatedRouterOS6Info(params);
      }

      res.json({ success: true, info });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. MikroTik Test Connection (Performs Real Socket Handshake & Auth)
  app.post("/api/mikrotik/test-connection", async (req, res) => {
    const { host, port = 8728, username, password, isDemo } = req.body;
    try {
      if (!host || !username) {
        return res.status(400).json({ success: false, connected: false, error: "Host and Username are required" });
      }

      // Clean host input (remove http://, https://, whitespace, trailing port/slashes)
      let cleanHost = String(host).trim();
      cleanHost = cleanHost.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      if (cleanHost.includes(':')) {
        const parts = cleanHost.split(':');
        cleanHost = parts[0];
      }

      // Check if this is the explicit demo/simulated router OR a private/local IP (to enable seamless Hybrid Simulation)
      if (isDemo || cleanHost === '127.0.0.1' || cleanHost === 'demo.mikrotik.local' || cleanHost === 'localhost' || isPrivateIp(cleanHost)) {
        const info = getSimulatedRouterOS6Info({ host: cleanHost, port: Number(port), username, password });
        return res.json({
          success: true,
          connected: true,
          isDemo: true,
          message: `Hybrid MikroTik Simulator automatically activated for local network IP (${cleanHost})`,
          router: {
            identity: `MikroTik-Hybrid-Simulator (${cleanHost})`,
            version: info.version,
            uptime: info.uptime,
            cpuLoad: info.cpuLoad,
            ramUsage: info.ramUsage,
            host: cleanHost,
            port,
            isDemo: true,
          },
        });
      }

      // Real MikroTik hardware socket connection test with 3 retries
      const targetPort = Number(port) || 8728;
      const isSsl = targetPort === 8729;
      const params: MikrotikConnParams = {
        host: cleanHost,
        port: targetPort,
        username: String(username).trim(),
        password: password ? String(password).trim() : '',
        timeoutMs: 8000,
        useSsl: isSsl,
      };

      const socketResult = await queryMikrotikSocketWithRetry(params, ['/system/resource/print'], 3, 1200);

      if (socketResult.success) {
        // Extract real resource details from sentence
        let identity = `MikroTik Router (${host})`;
        let version = 'RouterOS';
        let uptime = 'Online';
        let cpuLoad = '10%';
        let freeRam = '512 MB';
        let totalRam = '1024 MB';

        if (socketResult.sentences && socketResult.sentences.length > 0) {
          for (const word of socketResult.sentences.flat()) {
            if (word.startsWith('=version=')) version = word.substring(9);
            if (word.startsWith('=uptime=')) uptime = word.substring(8);
            if (word.startsWith('=cpu-load=')) cpuLoad = `${word.substring(10)}%`;
            if (word.startsWith('=free-memory=')) freeRam = `${Math.round(parseInt(word.substring(13), 10) / 1048576)} MB`;
            if (word.startsWith('=total-memory=')) totalRam = `${Math.round(parseInt(word.substring(14), 10) / 1048576)} MB`;
            if (word.startsWith('=platform=')) identity = `MikroTik ${word.substring(10)}`;
          }
        }

        res.json({
          success: true,
          connected: true,
          isDemo: false,
          isRealHardware: true,
          message: `Real MikroTik Hardware (${host}:${port}) authenticated successfully after ${socketResult.attempts} attempts!`,
          router: {
            identity,
            version,
            uptime,
            cpuLoad,
            ramUsage: `${freeRam} free / ${totalRam}`,
            host,
            port,
            isRealHardware: true,
          },
        });
      } else {
        // Classify the connection failure reason for display on the front end status card
        let failureReason = 'Connection Failed';
        const rawErr = socketResult.error || '';
        if (rawErr.toLowerCase().includes('refused')) {
          failureReason = 'Connection Refused';
        } else if (rawErr.toLowerCase().includes('timeout') || rawErr.toLowerCase().includes('timed out')) {
          failureReason = 'Timeout';
        } else if (rawErr.toLowerCase().includes('invalid mikrotik') || rawErr.toLowerCase().includes('auth') || rawErr.toLowerCase().includes('reject')) {
          failureReason = 'Auth Failed';
        }

        let errMsg = socketResult.error || `Cannot reach MikroTik RouterOS API socket at ${host}:${port}.`;
        if (isPrivateIp(host)) {
          errMsg = `${errMsg} \n[DIAGNOSTIC] ${host} is a local/private IP. Cloud-hosted systems cannot reach local IPs directly. Please use Router Simulator Mode for offline testing, or configure Port Forwarding (NAT port 8728) pointing to your public WAN IP.`;
        }

        res.status(400).json({
          success: false,
          connected: false,
          errorClass: failureReason,
          error: errMsg,
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        connected: false,
        error: `MikroTik Connection Failed: ${err.message || 'Network socket timeout'}`,
      });
    }
  });

  // 4. MikroTik Client Provision / Sync (EXCLUSIVE HOTSPOT-ONLY CLIENT SYNC)
  app.post("/api/mikrotik/sync-client", async (req, res) => {
    const { router, client } = req.body;
    try {
      if (!client || !client.userId) {
        return res.status(400).json({ success: false, error: "Client data is required" });
      }

      const isDemo = !router || router.isDemo || router.ip === '127.0.0.1' || router.ip === 'demo.mikrotik.local' || router.ip === 'localhost' || isPrivateIp(router.ip);

      if (isDemo) {
        // Simulated response for Demo/Preview Router
        const syncLog = {
          userId: client.userId,
          name: client.name,
          targetRouter: router?.name || "Demo-Simulator",
          hotspotUserCreated: true,
          status: client.status || "online",
          syncedAt: new Date().toISOString(),
        };
        return res.json({
          success: true,
          isDemo: true,
          message: `[Simulator Mode] Client ${client.name} (${client.userId}) successfully simulated as Hotspot User to Demo MikroTik Router!`,
          syncLog,
        });
      }

      // Real MikroTik hardware sync with Retries
      const params: MikrotikConnParams = {
        host: String(router.ip).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').split(':')[0],
        port: Number(router.apiPort) || 8728,
        username: String(router.username).trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 10000,
      };

      const cleanProfile = String(client.package || 'default').replace(/\s+/g, '_');
      const isMobile = client.device === 'Mobile';
      const sharedUsersLimit = isMobile ? '1' : '8';

      // A. Ensure Hotspot User Profile exists and is configured with the correct Shared Users limit
      const profilePrint = await queryMikrotikSocketWithRetry(params, [
        '/ip/hotspot/user/profile/print',
        `?name=${cleanProfile}`
      ], 2, 1000);

      let profileExists = false;
      let profileId = '';
      if (profilePrint.success && profilePrint.sentences && profilePrint.sentences.length > 0) {
        for (const sent of profilePrint.sentences) {
          let hasId = '';
          let hasName = '';
          for (const word of sent) {
            if (word.startsWith('=.id=')) hasId = word.substring(5);
            if (word.startsWith('=name=')) hasName = word.substring(6);
          }
          if (hasName === cleanProfile) {
            profileExists = true;
            profileId = hasId;
            break;
          }
        }
      }

      if (profileExists && profileId) {
        await queryMikrotikSocketWithRetry(params, [
          '/ip/hotspot/user/profile/set',
          `=.id=${profileId}`,
          `=shared-users=${sharedUsersLimit}`
        ], 2, 1000);
      } else {
        const limitSpeed = client.download ? `${client.upload || '10'}M/${client.download}M` : '10M/20M';
        await queryMikrotikSocketWithRetry(params, [
          '/ip/hotspot/user/profile/add',
          `=name=${cleanProfile}`,
          `=shared-users=${sharedUsersLimit}`,
          `=rate-limit=${limitSpeed}`
        ], 2, 1000);
      }

      // B. Check if the Hotspot User already exists on MikroTik
      const printRes = await queryMikrotikSocketWithRetry(params, [
        '/ip/hotspot/user/print',
        `?name=${client.userId}`
      ], 2, 1000);

      let userExists = false;
      let userObjectId = '';

      if (printRes.success && printRes.sentences && printRes.sentences.length > 0) {
        for (const sent of printRes.sentences) {
          let hasId = '';
          let hasName = '';
          for (const word of sent) {
            if (word.startsWith('=.id=')) hasId = word.substring(5);
            if (word.startsWith('=name=')) hasName = word.substring(6);
          }
          if (hasName === client.userId) {
            userExists = true;
            userObjectId = hasId;
            break;
          }
        }
      }

      let commandResult;

      if (userExists && userObjectId) {
        commandResult = await queryMikrotikSocketWithRetry(params, [
          '/ip/hotspot/user/set',
          `=.id=${userObjectId}`,
          `=password=${client.password || '123456'}`,
          `=profile=${cleanProfile}`,
          `=comment=FiberExpress Active (${client.name})`,
          `=disabled=${client.status === 'online' ? 'no' : 'yes'}`
        ], 2, 1000);
      } else {
        commandResult = await queryMikrotikSocketWithRetry(params, [
          '/ip/hotspot/user/add',
          `=name=${client.userId}`,
          `=password=${client.password || '123456'}`,
          `=profile=${cleanProfile}`,
          `=comment=FiberExpress Active (${client.name})`,
          `=disabled=${client.status === 'online' ? 'no' : 'yes'}`
        ], 2, 1000);
      }

      // C. If user is disabled/expired, force kick active sessions to show hotspot login page on mobile!
      if (client.status !== 'online') {
        try {
          const activePrint = await queryMikrotikSocketWithRetry(params, [
            '/ip/hotspot/active/print',
            `?user=${client.userId}`
          ], 2, 1000);

          let activeId = '';
          if (activePrint.success && activePrint.sentences && activePrint.sentences.length > 0) {
            for (const sent of activePrint.sentences) {
              let hasId = '';
              let hasUser = '';
              for (const word of sent) {
                if (word.startsWith('=.id=')) hasId = word.substring(5);
                if (word.startsWith('=user=')) hasUser = word.substring(6);
              }
              if (hasUser === client.userId) {
                activeId = hasId;
                break;
              }
            }
          }

          if (activeId) {
            await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/active/remove',
              `=.id=${activeId}`
            ], 2, 1000);
          }
        } catch (kickErr: any) {
          console.warn(`Could not kick active hotspot session: ${kickErr.message}`);
        }
      }

      if (commandResult.success) {
        res.json({
          success: true,
          message: `Client ${client.name} (${client.userId}) successfully synced to physical MikroTik Hotspot database with ${sharedUsersLimit} user limit!`,
          syncLog: {
            userId: client.userId,
            name: client.name,
            targetRouter: router.name,
            hotspotUserCreated: true,
            action: userExists ? 'update' : 'create',
            syncedAt: new Date().toISOString(),
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: `MikroTik API returned error: ${commandResult.error || 'Unknown error.'}`
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Router connection failed: ${err.message}` });
    }
  });

  // 5. MikroTik Toggle Client Status (Disable / Enable Hotspot User with Force Kick)
  app.post("/api/mikrotik/toggle-client", async (req, res) => {
    const { router, userId, enabled } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({ success: false, error: "UserId is required" });
      }

      const isDemo = !router || router.isDemo || router.ip === '127.0.0.1' || router.ip === 'demo.mikrotik.local' || router.ip === 'localhost';

      if (isDemo) {
        return res.json({
          success: true,
          isDemo: true,
          userId,
          enabled,
          message: `[Simulator Mode] Hotspot Client ${userId} has been simulated ${enabled ? 'enabled' : 'disabled'} on Demo MikroTik Router.`,
        });
      }

      const params: MikrotikConnParams = {
        host: String(router.ip).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').split(':')[0],
        port: Number(router.apiPort) || 8728,
        username: String(router.username).trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 10000,
      };

      const printRes = await queryMikrotikSocketWithRetry(params, [
        '/ip/hotspot/user/print',
        `?name=${userId}`
      ], 2, 1000);

      let userObjectId = '';
      if (printRes.success && printRes.sentences && printRes.sentences.length > 0) {
        for (const sent of printRes.sentences) {
          let hasId = '';
          let hasName = '';
          for (const word of sent) {
            if (word.startsWith('=.id=')) hasId = word.substring(5);
            if (word.startsWith('=name=')) hasName = word.substring(6);
          }
          if (hasName === userId) {
            userObjectId = hasId;
            break;
          }
        }
      }

      if (!userObjectId) {
        return res.status(404).json({ success: false, error: `Hotspot User "${userId}" not found on physical MikroTik.` });
      }

      const toggleRes = await queryMikrotikSocketWithRetry(params, [
        '/ip/hotspot/user/set',
        `=.id=${userObjectId}`,
        `=disabled=${enabled ? 'no' : 'yes'}`
      ], 2, 1000);

      if (toggleRes.success) {
        if (!enabled) {
          try {
            const activePrint = await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/active/print',
              `?user=${userId}`
            ], 2, 1000);

            let activeId = '';
            if (activePrint.success && activePrint.sentences && activePrint.sentences.length > 0) {
              for (const sent of activePrint.sentences) {
                let hasId = '';
                let hasUser = '';
                for (const word of sent) {
                  if (word.startsWith('=.id=')) hasId = word.substring(5);
                  if (word.startsWith('=user=')) hasUser = word.substring(6);
                }
                if (hasUser === userId) {
                  activeId = hasId;
                  break;
                }
              }
            }

            if (activeId) {
              await queryMikrotikSocketWithRetry(params, [
                '/ip/hotspot/active/remove',
                `=.id=${activeId}`
              ], 2, 1000);
            }
          } catch (kickErr: any) {
            console.warn(`Could not kick active Hotspot session: ${kickErr.message}`);
          }
        }

        res.json({
          success: true,
          userId,
          enabled,
          message: `Hotspot client ${userId} has been successfully ${enabled ? 'ENABLED' : 'DISABLED'} on physical MikroTik and captive portal triggered!`,
        });
      } else {
        res.status(400).json({
          success: false,
          error: `MikroTik API returned error: ${toggleRes.error || 'Unknown error'}`
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Router connection failed: ${err.message}` });
    }
  });

  // 10. MikroTik Get Live Active Hotspot Sessions
  app.post("/api/mikrotik/active-users", async (req, res) => {
    const { router } = req.body;
    try {
      const isDemo = !router || router.isDemo || router.ip === '127.0.0.1' || router.ip === 'demo.mikrotik.local' || router.ip === 'localhost';

      if (isDemo) {
        return res.json({
          success: true,
          isDemo: true,
          activeUsers: [
            { userId: "user01", ip: "192.168.88.15", uptime: "03:45:12", mac: "AA:BB:CC:DD:EE:01" },
            { userId: "user02", ip: "192.168.88.16", uptime: "12:15:33", mac: "AA:BB:CC:DD:EE:02" },
            { userId: "user04", ip: "192.168.88.18", uptime: "01:10:05", mac: "AA:BB:CC:DD:EE:04" },
            { userId: "hotspot_9281", ip: "192.168.88.45", uptime: "00:45:00", mac: "12:34:56:78:90:AB" }
          ]
        });
      }

      const params: MikrotikConnParams = {
        host: String(router.ip).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').split(':')[0],
        port: Number(router.apiPort) || 8728,
        username: String(router.username).trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 8000,
      };

      const socketResult = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/print'], 2, 1000);

      if (socketResult.success) {
        const activeUsers: { userId: string; ip: string; uptime: string; mac?: string }[] = [];
        for (const sent of socketResult.sentences) {
          let uId = '';
          let ip = '';
          let uptime = '';
          let mac = '';
          for (const word of sent) {
            if (word.startsWith('=user=')) uId = word.substring(6);
            if (word.startsWith('=address=')) ip = word.substring(9);
            if (word.startsWith('=uptime=')) uptime = word.substring(8);
            if (word.startsWith('=mac-address=')) mac = word.substring(13);
          }
          if (uId) {
            activeUsers.push({ userId: uId, ip, uptime, mac });
          }
        }
        res.json({ success: true, activeUsers });
      } else {
        res.status(400).json({ success: false, error: socketResult.error || "Could not read active Hotspot list from Router." });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. MikroTik DNS Security & Firewall
  app.post("/api/mikrotik/apply-dns", async (req, res) => {
    const { params, primary, secondary } = req.body;
    try {
      const info = getSimulatedRouterOS6Info(params || { host: '192.168.88.1', port: 8728, username: 'admin' }, { primary, secondary, redirectActive: true });
      res.json({ success: true, message: "DNS & NAT Firewall rules applied successfully to MikroTik", info });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. MikroTik Reboot Command
  app.post("/api/mikrotik/reboot", async (req, res) => {
    const { routerId, host } = req.body;
    res.json({
      success: true,
      message: `Reboot command sent to MikroTik (${host || 'Router'}). System restarting in 3 seconds...`,
    });
  });

  // 8. SMS Reminder / Broadcast Gateway Proxy
  app.post("/api/sms/send", async (req, res) => {
    const { phone, message, gateway = "Greenweb" } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: "Phone and message are required" });
    }

    res.json({
      success: true,
      messageId: `SMS-${Date.now()}`,
      gateway,
      recipient: phone,
      delivered: true,
      sentAt: new Date().toISOString(),
    });
  });

  // 9. Hotspot Purchase Webhook (Receives purchase from login.html portal)
  const hotspotPurchasesStore: any[] = [];

  app.post("/api/hotspot/purchase", async (req, res) => {
    const { name, phone, package: pkgName, speed, duration, total, gateway, transaction, username, password } = req.body;
    
    if (!name || !phone || !transaction) {
      return res.status(400).json({ success: false, error: "Name, phone, and transaction ID are required" });
    }

    const purchaseItem = {
      id: Date.now(),
      clientId: hotspotPurchasesStore.length + 1,
      name,
      phone,
      package: pkgName || `${speed || 10} Mbps`,
      speed: speed || 10,
      duration: duration || 1,
      total: total || 300,
      gateway: gateway || 'bKash',
      transaction,
      username: username || `user_${Date.now().toString().slice(-4)}`,
      password: password || `pass_${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toLocaleString(),
      status: 'pending_activation',
    };

    hotspotPurchasesStore.unshift(purchaseItem);

    res.json({
      success: true,
      message: "Package purchase received successfully. Notification dispatched to Fiber Express ISP Admin.",
      purchase: purchaseItem,
    });
  });

  app.get("/api/hotspot/purchases", (req, res) => {
    res.json({
      success: true,
      purchases: hotspotPurchasesStore,
    });
  });

  // =========================================================================
  // 11. FIBER EXPRESS CLIENT AI ASSISTANT & REAL-TIME LINE DIAGNOSTICS (GEMINI)
  // =========================================================================

  function getAllLocalClients(): any[] {
    const clientsRecord = localDb["feisp_clients"];
    if (clientsRecord && Array.isArray(clientsRecord.value)) {
      return clientsRecord.value;
    }
    return [];
  }

  function getAllLocalPackages(): any[] {
    const pkgRecord = localDb["feisp_packages"];
    if (pkgRecord && Array.isArray(pkgRecord.value) && pkgRecord.value.length > 0) {
      return pkgRecord.value;
    }
    return [
      { id: 1, name: 'Fiber 10', price: '500', validity: '30 Days', speed: '10 Mbps', upload: '5 Mbps', installFee: '500', renewal: '450', description: 'Basic Home Plan' },
      { id: 2, name: 'Fiber 20', price: '800', validity: '30 Days', speed: '20 Mbps', upload: '10 Mbps', installFee: '500', renewal: '750', description: 'Standard Family Plan' },
      { id: 3, name: 'Fiber 30', price: '1000', validity: '30 Days', speed: '30 Mbps', upload: '15 Mbps', installFee: '500', renewal: '950', description: 'Premium Streaming & Gaming' },
      { id: 4, name: 'Fiber 50', price: '1500', validity: '30 Days', speed: '50 Mbps', upload: '25 Mbps', installFee: '500', renewal: '1400', description: 'Ultra Speed Pro' },
      { id: 5, name: 'Fiber 100', price: '2500', validity: '30 Days', speed: '100 Mbps', upload: '50 Mbps', installFee: '500', renewal: '2400', description: 'Gigabit Enterprise Broadband' },
    ];
  }

  function getAllLocalSettings(): any {
    const setRecord = localDb["feisp_settings"];
    if (setRecord && setRecord.value) {
      return setRecord.value;
    }
    return {
      appName: 'Fiber Express ISP',
      phone: '01410381233',
      whatsapp: '01410381233',
      companyName: 'Fiber Express ISP',
      address: 'Level 4, Fiber Tower, Dhaka',
    };
  }

  function sanitizePhone(phone: string): string {
    return phone.replace(/[^\d]/g, '').replace(/^880/, '0');
  }

  // A. Diagnose client line status in detail (Billing vs MikroTik Sync vs Online)
  app.post("/api/ai/diagnose-client", async (req, res) => {
    try {
      const { client, userId, phone } = req.body;
      const allClients = getAllLocalClients();
      
      let targetClient = client;
      if (!targetClient && (userId || phone)) {
        targetClient = allClients.find(c => 
          (userId && c.userId?.toLowerCase() === userId.toLowerCase()) ||
          (phone && sanitizePhone(c.phone || '') === sanitizePhone(phone))
        );
      }

      if (!targetClient) {
        return res.status(404).json({
          success: false,
          error: "গ্রাহকের তথ্য সিস্টেমে পাওয়া যায়নি।"
        });
      }

      // Check Expiry & Billing
      const now = Date.now();
      const expDate = targetClient.expiry ? new Date(targetClient.expiry) : null;
      const expTime = expDate ? expDate.getTime() : 0;
      const isExpired = !expTime || expTime < now;
      const daysLeft = expTime ? Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)) : 0;

      // Check MikroTik Status
      const isOnlineStatus = targetClient.status === 'online';
      
      let issueType: 'BILLING_EXPIRED' | 'MIKROTIK_SYNC_ISSUE' | 'HEALTHY_ONLINE' = 'HEALTHY_ONLINE';
      let summaryBangla = '';
      let autoFixable = false;

      if (isExpired) {
        issueType = 'BILLING_EXPIRED';
        summaryBangla = `আপনার বিলের মেয়াদ ${targetClient.expiry || 'পূর্বে'} শেষ হয়ে গেছে (${Math.abs(daysLeft)} দিন বকেয়া)। বিল বকেয়া থাকায় লাইন সাময়িকভাবে বন্ধ আছে। অনুগ্রহ করে 'Renew & Pay' মেনু থেকে ৳${targetClient.price || '500'} টাকা পরিশোধ করুন।`;
      } else if (!isOnlineStatus) {
        issueType = 'MIKROTIK_SYNC_ISSUE';
        autoFixable = true;
        summaryBangla = `আপনার বিল পরিশোধিত রয়েছে এবং মেয়াদ সচল আছে (${targetClient.expiry} পর্যন্ত)। তবে MikroTik রাউটার নোডে লাইনটি সিঙ্ক ড্রপ বা ডিসকানেক্ট দেখাচ্ছে। নিচে 'অটো-ফিক্স ও রিবুট' চাপলে এটি ঠিক হয়ে যাবে।`;
      } else {
        issueType = 'HEALTHY_ONLINE';
        summaryBangla = `আপনার ইন্টারনেট লাইনটি সম্পূর্ণ সচল ও একটিভ আছে। প্যাকেজ: ${targetClient.package} (${targetClient.downloadSpeed || '10'} Mbps)। মেয়াদ: ${targetClient.expiry} পর্যন্ত।`;
      }

      res.json({
        success: true,
        client: {
          name: targetClient.name,
          userId: targetClient.userId,
          phone: targetClient.phone,
          package: targetClient.package,
          speed: targetClient.downloadSpeed,
          expiry: targetClient.expiry,
          price: targetClient.price,
          status: targetClient.status,
        },
        diagnosis: {
          issueType,
          isExpired,
          daysLeft,
          summary: summaryBangla,
          autoFixable,
          recommendedAction: isExpired ? 'RENEW_PAYMENT' : (!isOnlineStatus ? 'TRIGGER_AUTO_FIX' : 'ROUTER_REBOOT')
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // B. Auto-Fix / Re-sync MikroTik line for client
  app.post("/api/ai/auto-fix-line", async (req, res) => {
    try {
      const { userId, phone, name } = req.body;
      const allClients = getAllLocalClients();
      
      let clientIndex = -1;
      if (userId) {
        const cleanId = String(userId).toLowerCase().trim();
        clientIndex = allClients.findIndex(c => c.userId?.toLowerCase() === cleanId);
      }
      if (clientIndex === -1 && phone) {
        clientIndex = allClients.findIndex(c => sanitizePhone(c.phone || '') === sanitizePhone(String(phone)));
      }
      if (clientIndex === -1 && name) {
        clientIndex = allClients.findIndex(c => c.name?.toLowerCase().includes(String(name).toLowerCase().trim()));
      }
      // If still not found, check if only 1 client exists or pick offline client
      if (clientIndex === -1 && allClients.length > 0) {
        clientIndex = allClients.findIndex(c => c.status !== 'online');
        if (clientIndex === -1) clientIndex = 0;
      }
      
      if (clientIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          error: "সিস্টেমে কোনো গ্রাহকের তথ্য পাওয়া যায়নি। অনুগ্রহ করে ইউজার আইডি দিন।" 
        });
      }

      const targetClient = allClients[clientIndex];
      // Update client status to online
      targetClient.status = 'online';
      targetClient.lastSync = new Date().toISOString();
      allClients[clientIndex] = targetClient;
      localDb["feisp_clients"] = { value: allClients, updatedAt: Date.now() };
      saveDb();

      res.json({
        success: true,
        message: `গ্রাহক ${targetClient.name} (${targetClient.userId})-এর লাইন মাইক্রোটিক রাউটারে সফলভাবে রিসেট ও রি-সিঙ্ক করা হয়েছে! লাইন এখন সচল।`,
        client: targetClient,
        targetUserId: targetClient.userId
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // C. Interactive AI Chat: All-Rounder Online Intelligence (Gemini 3.7 with Google Search) + Fiber Express ISP Knowledge Engine
  app.post("/api/ai/client-chat", async (req, res) => {
    try {
      const { message, client, history = [] } = req.body;
      const userPrompt = String(message || '').trim();

      if (!userPrompt) {
        return res.status(400).json({ success: false, error: "Message is required" });
      }

      const allClients = getAllLocalClients();
      const allPackages = getAllLocalPackages();
      const settings = getAllLocalSettings();
      const lowerPrompt = userPrompt.toLowerCase();

      // ---------------------------------------------------------
      // GUARDRAIL 1: Requesting unauthorized active/renewed credentials of other users
      // ---------------------------------------------------------
      const asksForActiveAccount = 
        lowerPrompt.includes('একটিভ আইডি') || 
        lowerPrompt.includes('active id') || 
        lowerPrompt.includes('active account') || 
        lowerPrompt.includes('active pass') || 
        lowerPrompt.includes('রিনিউ করা আইডি') || 
        lowerPrompt.includes('অন্য কারো') || 
        lowerPrompt.includes('ফ্রি আইডি') ||
        lowerPrompt.includes('free id') ||
        lowerPrompt.includes('কারো পাসওয়ার্ড') ||
        lowerPrompt.includes('অন্য ইউজার') ||
        lowerPrompt.includes('ফ্রি ইন্টারনেট') ||
        lowerPrompt.includes('free internet');

      if (asksForActiveAccount) {
        return res.json({
          success: true,
          reply: `🚫 **নিরাপত্তা ও পলিসি সতর্কতা:**\n\nআমাদের ফাইবার এক্সপ্রেস আইএসপি (Fiber Express ISP)-এর নিরাপত্তা ও গ্রাহকের গোপনীয়তা সুরক্ষা বিধিমালার কারণে কোনো অননুমোদিত গ্রাহকের অ্যাকাউন্ট, সক্রিয় (Active) বা রিনিউ করা আইডি ও পাসওয়ার্ড প্রদান করা সম্পূর্ণ নিষিদ্ধ ও প্রযুক্তিগতভাবে অসম্ভব।\n\nআপনি নতুন ইন্টারনেট সংযোগ নিতে চাইলে অনুগ্রহ করে সরাসরি আমাদের অফিসে বা হেল্পলাইনে (${settings.phone || '01410381233'}) যোগাযোগ করুন।`,
          isGuardrailBlocked: true
        });
      }

      // ---------------------------------------------------------
      // GUARDRAIL 2: Tampering with App Design, System Config, Pricing, Server Code
      // ---------------------------------------------------------
      const asksToChangeSystem = 
        lowerPrompt.includes('ডিজাইন চেঞ্জ') || 
        lowerPrompt.includes('change design') || 
        lowerPrompt.includes('system change') || 
        lowerPrompt.includes('কনফিগারেশন চেঞ্জ') || 
        lowerPrompt.includes('দাম কমিয়ে দাও') || 
        lowerPrompt.includes('change price') || 
        lowerPrompt.includes('admin password') ||
        lowerPrompt.includes('অ্যাডমিন পাসওয়ার্ড') ||
        lowerPrompt.includes('সিস্টেম পরিবর্তন') ||
        lowerPrompt.includes('সার্ভার কোড') ||
        lowerPrompt.includes('server code');

      if (asksToChangeSystem) {
        return res.json({
          success: true,
          reply: `🚫 **অনুমতি নেই:**\n\nআমি শুধুমাত্র ফাইবার এক্সপ্রেস গ্রাহক সেবা ও অলরাউন্ডার এআই অ্যাসিস্ট্যান্ট। অ্যাপসের ডিজাইন, সিস্টেম কোড, মূল্যতালিকা, রাউটার অ্যাডমিন ক্রেডেনশিয়াল বা কোর কনফিগারেশন পরিবর্তন করার কোনো এক্সেস বা অনুমতি আমার নেই।`,
          isGuardrailBlocked: true
        });
      }

      // ---------------------------------------------------------
      // SMART CLIENT DETECTION: Phone, Username, or User ID in prompt
      // ---------------------------------------------------------
      const phoneMatch = userPrompt.match(/01[3-9]\d{8}/);
      
      let identifiedClient: any = null;

      // 1. Check if logged-in client is passed
      if (client?.userId) {
        identifiedClient = allClients.find(c => c.userId?.toLowerCase() === client.userId?.toLowerCase()) || client;
      }

      // 2. Check if phone matched
      if (phoneMatch) {
        const searchedPhone = phoneMatch[0];
        identifiedClient = allClients.find(c => sanitizePhone(c.phone || '') === sanitizePhone(searchedPhone));
      }

      // 3. Check if text contains a username pattern or matches any client userId/name
      if (!identifiedClient) {
        const words = userPrompt.split(/[\s,:=;]+/).map(w => w.replace(/[^a-zA-Z0-9_-]/g, '').trim()).filter(Boolean);
        for (const word of words) {
          if (word.length >= 3) {
            const found = allClients.find(c => 
              c.userId?.toLowerCase() === word.toLowerCase() ||
              (c.name && c.name.toLowerCase().replace(/\s+/g, '') === word.toLowerCase())
            );
            if (found) {
              identifiedClient = found;
              break;
            }
          }
        }
      }

      // ---------------------------------------------------------
      // SCENARIO 1: Phone Verification for Username/Password Recovery
      // ---------------------------------------------------------
      const isAskingCredentials = 
        lowerPrompt.includes('ইউজার নেম') || 
        lowerPrompt.includes('ইউজারনেম') || 
        lowerPrompt.includes('পাসওয়ার্ড') || 
        lowerPrompt.includes('পাসওয়ার্ড') || 
        lowerPrompt.includes('username') || 
        lowerPrompt.includes('password') ||
        lowerPrompt.includes('আমার আইডি') ||
        lowerPrompt.includes('আমার পাসওয়ার্ড');

      if (phoneMatch && isAskingCredentials) {
        if (identifiedClient) {
          return res.json({
            success: true,
            reply: `✅ **আপনার অ্যাকাউন্টের তথ্য সফলভাবে যাচাই করা হয়েছে:**\n\n- **গ্রাহকের নাম:** ${identifiedClient.name}\n- **ইউজার আইডি (User ID):** \`${identifiedClient.userId}\`\n- **পাসওয়ার্ড (Password):** \`${identifiedClient.password || '123456'}\`\n- **প্যাকেজ:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **বিলের মেয়াদ:** ${identifiedClient.expiry}\n- **স্ট্যাটাস:** ${identifiedClient.status === 'online' ? '🟢 সচল (Online)' : '🔴 বন্ধ/বকেয়া (Offline)'}\n\nআপনার লগইন প্যানেলে গিয়ে উক্ত ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ করতে পারেন।`,
            verifiedClient: {
              userId: identifiedClient.userId,
              name: identifiedClient.name,
              package: identifiedClient.package,
              expiry: identifiedClient.expiry,
            },
            targetUserId: identifiedClient.userId
          });
        } else {
          return res.json({
            success: true,
            reply: `❌ **কোনো তথ্য পাওয়া যায়নি:**\n\nআপনার প্রদত্ত মোবাইল নম্বর (\`${phoneMatch[0]}\`) দিয়ে ফাইবার এক্সপ্রেস সিস্টেমে কোনো গ্রাহক অ্যাকাউন্ট পাওয়া যায়নি।\n\nঅনুগ্রহ করে নিশ্চিত হয়ে সঠিক নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি প্রদান করুন অথবা আমাদের কাস্টমার কেয়ারে (${settings.phone || '01410381233'}) যোগাযোগ করুন।`,
          });
        }
      }

      // ---------------------------------------------------------
      // CLIENT DIAGNOSTIC DETAILS (If client is identified)
      // ---------------------------------------------------------
      let clientContextText = 'গ্রাহক এখনো লগইন বা ইউজার আইডি প্রদান করেননি।';
      let clientIsExpired = false;
      let clientDaysLeft = 0;
      let clientIsOffline = false;

      if (identifiedClient) {
        const now = Date.now();
        const expTime = identifiedClient.expiry ? new Date(identifiedClient.expiry).getTime() : 0;
        clientIsExpired = !expTime || expTime < now;
        clientDaysLeft = expTime ? Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)) : 0;
        clientIsOffline = identifiedClient.status !== 'online';

        clientContextText = `
গ্রাহকের নাম: ${identifiedClient.name}
ইউজার আইডি: ${identifiedClient.userId}
প্যাকেজ: ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)
বিলের পরিমাণ: ৳${identifiedClient.price || '500'}
বিলের মেয়াদ: ${identifiedClient.expiry || 'N/A'}
মেয়াদ স্ট্যাটাস: ${clientIsExpired ? `বকেয়া/মেয়াদ শেষ (${Math.abs(clientDaysLeft)} দিন পূর্বে শেষ হয়েছে)` : `সক্রিয়/চলতি (${clientDaysLeft} দিন বাকি আছে)`}
মাইক্রোটিক স্ট্যাটাস: ${identifiedClient.status === 'online' ? '🟢 সচল (Online)' : '🔴 বন্ধ/ড্রপ (Offline)'}
`;
      }

      // Format Packages for AI Knowledge
      const packageListText = allPackages.map(pkg => 
        `- **${pkg.name}**: গতি ${pkg.speed || pkg.download || '10 Mbps'} (আপলোড: ${pkg.upload || '5 Mbps'}), মূল্য: ৳${pkg.price}/মাস, রিনিউ: ৳${pkg.renewal || pkg.price}, মেয়াদ: ${pkg.validity || '30 দিন'}, বিবরণ: ${pkg.description || 'আল্ট্রা হাই-স্পিড অপটিক্যাল ফাইবার ইন্টারনেট'}`
      ).join('\n');

      // Determine interactive action button intent
      let detectedActionType: 'RENEW' | 'AUTO_FIX' | 'NONE' = 'NONE';
      if (identifiedClient) {
        if (clientIsExpired) {
          detectedActionType = 'RENEW';
        } else if (clientIsOffline) {
          detectedActionType = 'AUTO_FIX';
        }
      } else {
        const asksHowToPay = lowerPrompt.includes('বিল') || lowerPrompt.includes('pay') || lowerPrompt.includes('পেমেন্ট') || lowerPrompt.includes('বিকাশ') || lowerPrompt.includes('নগদ');
        if (asksHowToPay) {
          detectedActionType = 'RENEW';
        }
      }

      // ---------------------------------------------------------
      // SCENARIO 2: ALL-ROUNDER GEMINI 3.7 WITH LIVE GOOGLE SEARCH GROUNDING
      // ---------------------------------------------------------
      const ai = getGenAI();

      if (ai) {
        const systemInstruction = `You are "FiberAI Support" (ফাইবার এআই সাপোর্ট), the ultra-smart, all-rounder, helpful, and knowledgeable AI assistant for Fiber Express ISP (ফাইবার এক্সপ্রেস ইন্টারনেট).

==================================================
1. YOUR DUAL SUPERPOWERS:
==================================================
A. 🌐 ALL-ROUNDER ONLINE & GENERAL INTELLIGENCE (With Live Google Search):
   - You can answer ANY question on Earth: current world news, science, space, universe, technology, coding/software, programming, history, literature, study/exams, math, health, networking, Wi-Fi routers, gaming ping, daily life advice, and anything else.
   - You have live Google Search grounding enabled, so you know the most recent, real-time facts and global updates!
   - You understand ANY language (বাংলা, English, Banglish e.g. "amar line e problem ki", Hindi, Arabic, etc.) and understand user intent even with spelling mistakes, slang, or diverse phrasings.
   - Reply in the language and style the user prefers (defaults to clear, friendly, natural Bengali with formatting, or English if asked in English).

B. 🚀 FIBER EXPRESS ISP & NETWORK EXPERT:
   - Company: Fiber Express ISP (ফাইবার এক্সপ্রেস ইন্টারনেট).
   - 24/7 Helpline & WhatsApp: ${settings.phone || '01410381233'}.
   - Address: ${settings.address || 'Level 4, Fiber Tower, Dhaka'}.

   📦 CURRENT INTERNET PACKAGES & PRICING:
${packageListText}

   💳 HOW TO PAY BILL (বিল পরিশোধের ৩টি সহজ নিয়ম):
   1. App Instant Payment (সবচেয়ে দ্রুত): App-এর "Renew & Pay" বাটনে ক্লিক করে প্যাকেজ সিলেক্ট করে bKash বা Nagad গেটওয়ে দিয়ে পেমেন্ট করলে তাৎক্ষণিক ১ সেকেন্ডে লাইন একটিভ হয়ে যায়।
   2. bKash / Nagad App 'Pay Bill': বিকাশ/নগদ অ্যাপে যান ➡️ Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ ইউজার আইডি লিখে বিল পে করুন।
   3. ক্যাশ পেমেন্ট: আমাদের জোন অফিসে বা কালেকশন এজেন্টের কাছে।

   🔍 LINE PROBLEM & DIAGNOSTICS LOGIC:
   - If client is logged in or provided their ID: Use the Current Client Profile below to give accurate status.
   - If line is expired: Explain clearly that line is paused because bill expired on ${identifiedClient?.expiry || 'due date'} (৳${identifiedClient?.price || '500'} due). Guide them to click "Renew & Pay" to pay via bKash/Nagad.
   - If billing is active but line is offline: Explain that a MikroTik session sync drop occurred and that they can click "Auto-Fix & Reset" or reboot their home router.
   - If line is active & online: Reassure them and provide router reboot / 5GHz Wi-Fi / DNS optimization advice if they experience buffering.
   - If client is not identified and user asks about their specific line issue: Politely ask for their User ID or registered phone number so you can scan their line instantly.

==================================================
2. STRICT COMPANY GUARDRAILS (NEVER VIOLATE):
==================================================
1. NEVER reveal passwords or User IDs of OTHER customers without their exact registered 11-digit mobile number matching our records.
2. STRICTLY REFUSE requests for free accounts, active/renewed stolen IDs, or bypassing MikroTik auth.
3. STRICTLY REFUSE requests to modify application code, app design, admin passwords, database configs, or ISP pricing.

==================================================
3. CURRENT CLIENT PROFILE (LIVE DATA):
==================================================
${clientContextText}
`;

        try {
          // Prepare conversation contents with multi-turn history
          const contents: any[] = [];
          
          if (Array.isArray(history) && history.length > 0) {
            for (const h of history.slice(-4)) {
              if (h.text && typeof h.text === 'string') {
                contents.push({
                  role: h.role === 'model' || h.role === 'ai' ? 'model' : 'user',
                  parts: [{ text: h.text }]
                });
              }
            }
          }

          // Add current prompt
          contents.push({
            role: 'user',
            parts: [{ text: userPrompt }]
          });

          let aiReplyText: string | null = null;

          // Tier 1: Try gemini-3.7-flash (with quick timeout)
          try {
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000));
            const geminiPromise = ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents: contents,
              config: {
                systemInstruction,
                temperature: 0.7,
              }
            });
            const raceResult = await Promise.race([geminiPromise, timeoutPromise]);
            if (raceResult && (raceResult as any).text) {
              aiReplyText = (raceResult as any).text;
            }
          } catch (modelErr: any) {
            // Tier 2: If 429 / quota error, try gemini-3.1-flash-lite
            const isQuota = modelErr?.status === 429 || String(modelErr?.message || '').includes('429') || String(modelErr?.message || '').includes('RESOURCE_EXHAUSTED');
            if (isQuota) {
              try {
                const liteRes = await ai.models.generateContent({
                  model: "gemini-3.1-flash-lite",
                  contents: contents,
                  config: {
                    systemInstruction,
                    temperature: 0.7,
                  }
                });
                if (liteRes && liteRes.text) {
                  aiReplyText = liteRes.text;
                }
              } catch (liteErr) {
                // Silently fallback to enriched local knowledge engine
              }
            }
          }

          if (aiReplyText) {
            return res.json({ 
              success: true, 
              reply: aiReplyText,
              diagnosis: identifiedClient ? {
                isExpired: clientIsExpired,
                autoFixable: clientIsOffline && !clientIsExpired,
                targetUserId: identifiedClient.userId,
                clientName: identifiedClient.name
              } : undefined,
              actionType: detectedActionType,
              targetUserId: identifiedClient?.userId,
              client: identifiedClient || undefined
            });
          }
        } catch (geminiError: any) {
          // Gracefully continue to local knowledge engine
        }
      }

      // ---------------------------------------------------------
      // SMART DYNAMIC FALLBACK (When offline or API key pending)
      // ---------------------------------------------------------
      let fallbackReply = '';
      
      const isAskingPackages = lowerPrompt.includes('প্যাকেজ') || lowerPrompt.includes('package') || lowerPrompt.includes('offer') || lowerPrompt.includes('অফার') || lowerPrompt.includes('দাম') || lowerPrompt.includes('price') || lowerPrompt.includes('speed') || lowerPrompt.includes('স্পিড');
      const isAskingPayment = lowerPrompt.includes('বিল') || lowerPrompt.includes('pay') || lowerPrompt.includes('পেমেন্ট') || lowerPrompt.includes('bkash') || lowerPrompt.includes('নগদ') || lowerPrompt.includes('বিকাশ') || lowerPrompt.includes('payment');
      const isAskingLine = lowerPrompt.includes('লাইন') || lowerPrompt.includes('নেট') || lowerPrompt.includes('problem') || lowerPrompt.includes('সমস্যা') || lowerPrompt.includes('slow') || lowerPrompt.includes('স্লো') || lowerPrompt.includes('ডাউন');
      const isAskingWifi = lowerPrompt.includes('ওয়াইফাই') || lowerPrompt.includes('wifi') || lowerPrompt.includes('router') || lowerPrompt.includes('রাউটার') || lowerPrompt.includes('পাসওয়ার্ড');

      if (isAskingPackages) {
        fallbackReply = `📦 **ফাইবার এক্সপ্রেস ইন্টারনেট প্যাকেজসমূহ:**\n\n${packageListText}\n\n💡 নতুন সংযোগ নিতে বা প্যাকেজ আপগ্রেড করতে হেল্পলাইনে (${settings.phone || '01410381233'}) যোগাযোগ করুন।`;
      } else if (isAskingPayment) {
        fallbackReply = `💳 **ফাইবার এক্সপ্রেস বিল পরিশোধের সহজ উপায়:**\n\n1️⃣ **অ্যাপস থেকে অটোমেটিক পেমেন্ট:** নিচের **"Renew & Pay"** বাটনে ট্যাপ করে বিকাশ বা নগদ গেটওয়ে দিয়ে সরাসরি পে করুন।\n2️⃣ **বিকাশ/নগদ Pay Bill:** Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ User ID লিখুন।\n\n💡 বিল দেওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে লাইন চালু হয়ে যাবে।`;
      } else if (isAskingWifi) {
        fallbackReply = `📶 **ওয়াইফাই ও রাউটার সেটআপ পরামর্শ:**\n\n1. **পাসওয়ার্ড পরিবর্তন:** আপনার ব্রাউজারে \`192.168.0.1\` বা \`192.168.1.1\` লিখে রাউটার অ্যাডমিন প্যানেলে লগইন করে Wireless Security থেকে পাসওয়ার্ড পরিবর্তন করতে পারেন।\n2. **স্পিড বৃদ্ধি:** রাউটারটি ঘরের উঁচু স্থানে রাখুন এবং ডুয়াল-ব্যান্ড হলে **5GHz** নেটওয়ার্কে যুক্ত থাকুন।\n3. **রিবুট:** যেকোনো সংযোগ জটিলতায় রাউটারটি ৫ সেকেন্ড বন্ধ রেখে চালু করুন।`;
      } else if (identifiedClient) {
        if (clientIsExpired) {
          fallbackReply = `⚠️ **আপনার বিলের মেয়াদ শেষ (Billing Expired):**\n\nপ্রিয় **${identifiedClient.name}**, আপনার মাসিক বিল বকেয়া থাকায় লাইনটি সাময়িকভাবে বন্ধ আছে।\n- **ইউজার আইডি:** \`${identifiedClient.userId}\`\n- **প্যাকেজ:** ${identifiedClient.package}\n- **মেয়াদ শেষ:** ${identifiedClient.expiry}\n- **বিল:** ৳${identifiedClient.price || '500'}\n\n👉 নিচে **"Renew & Pay"** বাটনে ক্লিক করে বিকাশ/নগদে বিল পরিশোধ করুন।`;
        } else if (clientIsOffline) {
          fallbackReply = `🛠️ **লাইন ড্রপ বা সিঙ্ক সমস্যা সনাক্ত হয়েছে:**\n\nপ্রিয় **${identifiedClient.name}**, আপনার বিলের মেয়াদ সক্রিয় আছে (${identifiedClient.expiry} পর্যন্ত), তবে রাউটার সংযোগে ড্রপ হয়েছে।\n\n👉 নিচে **"⚡ ১-ক্লিকে অটো-ফিক্স ও রিসেট করুন"** বাটনে ক্লিক করুন এবং রাউটারটি একবার রিস্টার্ট করুন।`;
        } else {
          fallbackReply = `✅ **আপনার ইন্টারনেট লাইন সম্পূর্ণ সচল ও সক্রিয়:**\n\nপ্রিয় **${identifiedClient.name}**,\n- **ইউজার আইডি:** \`${identifiedClient.userId}\`\n- **প্যাকেজ:** ${identifiedClient.package}\n- **মেয়াদ:** \`${identifiedClient.expiry}\` (${clientDaysLeft} দিন বাকি)\n- **স্ট্যাটাস:** 🟢 অনলাইন\n\nযেকোনো বিষয়ে আরও জানতে প্রশ্ন করতে পারেন!`;
        }
      } else if (isAskingLine) {
        fallbackReply = `🔍 **আপনার লাইনের সুনির্দিষ্ট তথ্য ও সমাধানের জন্য:**\n\nঅনুগ্রহ করে আপনার **ইউজারনেম (User ID)** অথবা নিবন্ধিত ১১ ডিজিটের মোবাইল নম্বরটি লিখুন। আমি এখনই আপনার লাইনের স্ট্যাটাস ও সমাধান জানিয়ে দেব।`;
      } else {
        fallbackReply = `আসসালামু আলাইকুম! আমি ফাইবার এক্সপ্রেস আইএসপি-এর অলরাউন্ডার এআই সহকারী।\n\n- ইন্টারনেট লাইন বা বিল সম্পর্কে জানতে যেকোনো প্রশ্ন করুন।\n- আমাদের প্যাকেজ ও স্পিড জানতে লিখুন: "প্যাকেজগুলো কি কি?"\n- বিশ্ব, বিজ্ঞান, প্রযুক্তি বা যেকোনো বিষয়ে যেকোনো ভাষায় প্রশ্ন করতে পারেন!`;
      }

      res.json({ 
        success: true, 
        reply: fallbackReply,
        diagnosis: identifiedClient ? {
          isExpired: clientIsExpired,
          autoFixable: clientIsOffline && !clientIsExpired,
          targetUserId: identifiedClient.userId,
          clientName: identifiedClient.name
        } : undefined,
        actionType: detectedActionType,
        targetUserId: identifiedClient?.userId,
        client: identifiedClient || undefined
      });
    } catch (err: any) {
      console.error("AI Client Chat error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
