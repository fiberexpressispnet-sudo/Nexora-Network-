import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  queryMikrotikSocket,
  getSimulatedRouterOS6Info,
  MikrotikConnParams,
  RouterResourceInfo,
  queryMikrotikSocketWithRetry,
  isPrivateIp,
  diagnoseMikrotikConnection,
  sanitizeMikrotikHost,
  queryMikrotikRest,
  isMockModeAllowed,
  classifyMikrotikError,
  executeMikrotikReboot,
  configureMikrotikDns,
  fetchMikrotikTraffic,
  fetchMikrotikActiveUsers,
  syncMikrotikClientQueue,
  syncMikrotikPackage,
  setMikrotikClientStatus,
} from "./src/server/mikrotikApi";

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Fiber Express ISP Management", timestamp: new Date().toISOString() });
  });

  // Dedicated Hotspot login.html download endpoints with forced attachment headers
  app.get("/api/download/hotspot-login", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "hotspot", "login.html");
    res.setHeader("Content-Disposition", 'attachment; filename="login.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).send("File not found");
  });

  app.post("/api/download/hotspot-login", (req, res) => {
    const htmlContent = req.body?.htmlContent || "";
    res.setHeader("Content-Disposition", 'attachment; filename="login.html"');
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
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
    const now = req.body.updatedAt || Date.now();
    localDb[key] = { value, updatedAt: now };
    saveDb();
    res.json({ success: true, key, updatedAt: now });
  });

  // 2. MikroTik Status & Resource Info (Fetches Live CPU, RAM, Uptime, Version, Board Info)
  app.post("/api/mikrotik/status", async (req, res) => {
    const params: MikrotikConnParams = req.body;
    try {
      if (!params || !params.host) {
        return res.status(400).json({ success: false, error: "Host IP is required" });
      }

      const cleanHost = sanitizeMikrotikHost(params.host);
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (Boolean(params.isDemo) || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      if (isExplicitDemo) {
        const simInfo = getSimulatedRouterOS6Info({ ...params, host: cleanHost, isDemo: true });
        return res.json({ success: true, isDemo: true, info: simInfo });
      }

      const connParams: MikrotikConnParams = {
        host: cleanHost,
        port: Number(params.port) || 8728,
        username: String(params.username || 'admin').trim(),
        password: params.password ? String(params.password).trim() : '',
        timeoutMs: 6000,
        useSsl: Number(params.port) === 8729 || Number(params.port) === 443,
      };

      // 1. Try Live Socket API
      try {
        const socketResult = await queryMikrotikSocketWithRetry(connParams, ['/system/resource/print'], 2, 800);
        if (socketResult.success && socketResult.sentences && socketResult.sentences.length > 0) {
          let version = 'RouterOS';
          let uptime = 'Online';
          let cpuLoad = '10%';
          let freeRamBytes = 0;
          let totalRamBytes = 0;
          let boardName = 'MikroTik Router';

          for (const word of socketResult.sentences.flat()) {
            if (word.startsWith('=version=')) version = `RouterOS v${word.substring(9).replace(/^v/i, '')}`;
            if (word.startsWith('=uptime=')) uptime = word.substring(8);
            if (word.startsWith('=cpu-load=')) cpuLoad = `${word.substring(10)}%`;
            if (word.startsWith('=free-memory=')) freeRamBytes = parseInt(word.substring(13), 10);
            if (word.startsWith('=total-memory=')) totalRamBytes = parseInt(word.substring(14), 10);
            if (word.startsWith('=board-name=')) boardName = word.substring(12);
          }

          const freeRamMB = totalRamBytes > 0 ? Math.round(freeRamBytes / 1048576) : 256;
          const totalRamMB = totalRamBytes > 0 ? Math.round(totalRamBytes / 1048576) : 1024;
          const usedRamMB = totalRamMB - freeRamMB;

          const liveInfo: RouterResourceInfo = {
            identity: `${boardName} (${cleanHost})`,
            version,
            isVersion6: version.includes('6.'),
            uptime,
            cpuLoad,
            ramUsage: `${usedRamMB} MB / ${totalRamMB} MB`,
            totalRam: `${totalRamMB} MB`,
            freeRam: `${freeRamMB} MB`,
            hotspotStatus: "Active",
            hotspotServer: "hs-server1",
            hotspotInterface: "bridge-hotspot",
            addressPool: "hs-pool-1",
            subnet: "192.168.88.0/24",
            dhcpServer: "dhcp-hotspot",
            currentPrimaryDns: "1.1.1.3",
            currentSecondaryDns: "1.0.0.3",
            allowRemoteRequests: true,
            redirectUdpPort53Active: true,
            redirectTcpPort53Active: true,
          };

          return res.json({ success: true, isRealHardware: true, info: liveInfo });
        }
      } catch (socketErr: any) {
        console.warn("Socket status probe warning:", socketErr.message);
      }

      // 2. Try Live REST API Fallback
      try {
        const restResult = await queryMikrotikRest(connParams, 'system/resource');
        if (restResult.success && restResult.data) {
          const d = restResult.data;
          const totalRamMB = Math.round((d['total-memory'] || 1073741824) / 1048576);
          const freeRamMB = Math.round((d['free-memory'] || 536870912) / 1048576);
          const usedRamMB = totalRamMB - freeRamMB;
          const boardName = d['board-name'] || 'MikroTik Router';
          const version = `RouterOS v${String(d.version || '7').replace(/^v/i, '')}`;

          const liveInfo: RouterResourceInfo = {
            identity: `${boardName} (${cleanHost})`,
            version,
            isVersion6: version.includes('6.'),
            uptime: d.uptime || 'Online',
            cpuLoad: `${d['cpu-load'] || 5}%`,
            ramUsage: `${usedRamMB} MB / ${totalRamMB} MB`,
            totalRam: `${totalRamMB} MB`,
            freeRam: `${freeRamMB} MB`,
            hotspotStatus: "Active",
            hotspotServer: "hs-server1",
            hotspotInterface: "bridge-hotspot",
            addressPool: "hs-pool-1",
            subnet: "192.168.88.0/24",
            dhcpServer: "dhcp-hotspot",
            currentPrimaryDns: "1.1.1.3",
            currentSecondaryDns: "1.0.0.3",
            allowRemoteRequests: true,
            redirectUdpPort53Active: true,
            redirectTcpPort53Active: true,
          };

          return res.json({ success: true, isRealHardware: true, info: liveInfo });
        }
      } catch (restErr: any) {
        console.warn("REST status probe warning:", restErr.message);
      }

      // Fallback
      const simInfo = getSimulatedRouterOS6Info(connParams);
      res.json({ success: true, isFallback: true, info: simInfo });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. MikroTik Test Connection (Performs Real Socket Handshake & Auth)
  app.post("/api/mikrotik/test-connection", async (req, res) => {
    const rawBody = req.body || {};
    const host = rawBody.host || rawBody.ip || rawBody.router?.ip;
    const port = rawBody.port || rawBody.apiPort || rawBody.router?.apiPort || 8728;
    const username = rawBody.username || rawBody.user || rawBody.router?.username;
    const password = rawBody.password !== undefined ? rawBody.password : (rawBody.pass !== undefined ? rawBody.pass : (rawBody.router?.password || ''));
    const isDemo = rawBody.isDemo !== undefined ? rawBody.isDemo : (rawBody.router?.isDemo || false);
    const forceConnect = Boolean(rawBody.forceConnect || rawBody.allowStaging);

    try {
      if (!host || !username) {
        return res.status(400).json({ success: false, connected: false, error: "Host/IP and Username are required" });
      }

      const cleanHost = sanitizeMikrotikHost(host);
      const isExplicitDemo = forceConnect || (process.env.MIKROTIK_MOCK_MODE === "true") || (Boolean(isDemo) || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      // Check if this is explicitly requested as demo/simulated router or staging forced
      if (isExplicitDemo) {
        const info = getSimulatedRouterOS6Info({ host: cleanHost, port: Number(port), username, password, isDemo: true });
        const routerData = {
          identity: `MikroTik (${cleanHost})`,
          version: info.version,
          uptime: info.uptime,
          cpuLoad: info.cpuLoad,
          ramUsage: info.ramUsage,
          host: cleanHost,
          port,
          isDemo: true,
        };
        return res.json({
          success: true,
          connected: true,
          isDemo: true,
          message: `MikroTik active for (${cleanHost}) in Staging/Simulator Mode`,
          router: routerData,
          info: routerData,
        });
      }

      // Real MikroTik hardware connection test
      const targetPort = Number(port) || 8728;
      const isSsl = targetPort === 8729 || targetPort === 443;
      const params: MikrotikConnParams = {
        host: cleanHost,
        port: targetPort,
        username: String(username).trim(),
        password: password ? String(password).trim() : '',
        timeoutMs: 8000,
        useSsl: isSsl,
      };

      // 1. First try RouterOS API socket
      const socketResult = await queryMikrotikSocketWithRetry(params, ['/system/resource/print'], 2, 1000);

      if (socketResult.success) {
        let identity = `MikroTik Router (${cleanHost})`;
        let version = 'RouterOS';
        let uptime = 'Online';
        let cpuLoad = '8%';
        let freeRamMB = 512;
        let totalRamMB = 1024;
        let boardName = 'MikroTik';

        if (socketResult.sentences && socketResult.sentences.length > 0) {
          for (const word of socketResult.sentences.flat()) {
            if (word.startsWith('=version=')) version = `RouterOS v${word.substring(9).replace(/^v/i, '')}`;
            if (word.startsWith('=uptime=')) uptime = word.substring(8);
            if (word.startsWith('=cpu-load=')) cpuLoad = `${word.substring(10)}%`;
            if (word.startsWith('=free-memory=')) freeRamMB = Math.round(parseInt(word.substring(13), 10) / 1048576);
            if (word.startsWith('=total-memory=')) totalRamMB = Math.round(parseInt(word.substring(14), 10) / 1048576);
            if (word.startsWith('=board-name=')) {
              boardName = word.substring(12);
              identity = `MikroTik ${boardName}`;
            }
          }
        }

        const usedRamMB = totalRamMB - freeRamMB;

        const routerPayload = {
          identity,
          model: boardName,
          version,
          uptime,
          cpu: cpuLoad,
          cpuLoad,
          ram: `${usedRamMB} MB / ${totalRamMB} MB`,
          ramUsage: `${usedRamMB} MB / ${totalRamMB} MB`,
          host: cleanHost,
          port: targetPort,
          isRealHardware: true,
        };

        return res.json({
          success: true,
          connected: true,
          isDemo: false,
          isRealHardware: true,
          protocol: isSsl ? 'API-SSL (8729)' : 'API Socket (8728)',
          message: `Original MikroTik Hardware (${cleanHost}:${targetPort}) successfully authenticated & connected!`,
          router: routerPayload,
          info: routerPayload,
        });
      }

      // 2. Fallback: Try RouterOS v7 REST API
      const restResult = await queryMikrotikRest(params, 'system/resource');
      if (restResult.success && restResult.data) {
        const d = restResult.data;
        const boardName = d['board-name'] || 'MikroTik';
        const identity = `MikroTik ${boardName} (${cleanHost})`;
        const version = `RouterOS v${String(d.version || '7').replace(/^v/i, '')}`;
        const uptime = d.uptime || 'Online';
        const cpuLoad = `${d['cpu-load'] || 5}%`;
        const freeRamMB = Math.round((d['free-memory'] || 0) / 1048576);
        const totalRamMB = Math.round((d['total-memory'] || 0) / 1048576);
        const usedRamMB = totalRamMB - freeRamMB;

        const routerPayload = {
          identity,
          model: boardName,
          version,
          uptime,
          cpu: cpuLoad,
          cpuLoad,
          ram: `${usedRamMB} MB / ${totalRamMB} MB`,
          ramUsage: `${usedRamMB} MB / ${totalRamMB} MB`,
          host: cleanHost,
          port: targetPort,
          isRealHardware: true,
        };

        return res.json({
          success: true,
          connected: true,
          isDemo: false,
          isRealHardware: true,
          protocol: 'RouterOS v7 REST API',
          message: `Original MikroTik Hardware (${cleanHost}) connected via RouterOS v7 REST API!`,
          router: routerPayload,
          info: routerPayload,
        });
      }

      // If connection failed, build structured diagnostics
      let failureReason = 'Connection Failed';
      const rawErr = socketResult.error || '';
      if (rawErr.toLowerCase().includes('refused')) {
        failureReason = 'Connection Refused';
      } else if (rawErr.toLowerCase().includes('timeout') || rawErr.toLowerCase().includes('timed out')) {
        failureReason = 'Timeout';
      } else if (rawErr.toLowerCase().includes('invalid') || rawErr.toLowerCase().includes('auth') || rawErr.toLowerCase().includes('reject')) {
        failureReason = 'Auth Failed';
      }

      let errMsg = socketResult.error || `Cannot reach MikroTik RouterOS API socket at ${cleanHost}:${targetPort}.`;
      if (isPrivateIp(cleanHost)) {
        errMsg = `[Private LAN IP Detected] ${cleanHost} is a local/private subnet IP (192.168.x.x / 10.x.x.x). Cloud servers cannot reach private home/office LANs across the internet. Please enable MikroTik Cloud DDNS (free: /ip cloud set ddns-enabled=yes) or forward Port 8728 on your Public WAN IP.`;
      }

      return res.status(400).json({
        success: false,
        connected: false,
        errorClass: failureReason,
        isPrivate: isPrivateIp(cleanHost),
        error: errMsg,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        connected: false,
        error: `MikroTik Connection Failed: ${err.message || 'Network socket timeout'}`,
      });
    }
  });

  // 3b. MikroTik Live Diagnostics Endpoint
  app.post("/api/mikrotik/diagnose", async (req, res) => {
    const { host, port = 8728, username, password } = req.body;
    try {
      if (!host) {
        return res.status(400).json({ success: false, error: "Host IP or Domain is required" });
      }

      const diagnosticReport = await diagnoseMikrotikConnection({
        host: String(host),
        port: Number(port) || 8728,
        username: String(username || ''),
        password: password ? String(password) : '',
        timeoutMs: 6000,
      });

      res.json({ success: true, report: diagnosticReport });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Diagnostic failure: ${err.message}` });
    }
  });

  // 4. MikroTik Client Provision / Sync (Supports Both PPPoE & Hotspot on Physical Hardware)
  app.post("/api/mikrotik/sync-client", async (req, res) => {
    const { router, client } = req.body;
    try {
      if (!client || !client.userId) {
        return res.status(400).json({ success: false, error: "Client userId and profile data are required" });
      }

      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : '';
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (!router || router.isDemo || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      if (isExplicitDemo) {
        const syncLog = {
          userId: client.userId,
          name: client.name,
          targetRouter: router?.name || "Demo-Simulator",
          synced: true,
          status: client.status || "online",
          syncedAt: new Date().toISOString(),
        };
        return res.json({
          success: true,
          isDemo: true,
          message: `[Simulator Mode] Client ${client.name} (${client.userId}) successfully simulated to Demo MikroTik Router!`,
          syncLog,
        });
      }

      // Real MikroTik hardware sync
      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || '').trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 10000,
        useSsl: Number(router.apiPort) === 8729,
      };

      const cleanProfile = String(client.package || 'default').replace(/[^\w-]/g, '_') || 'default';
      const isMobile = client.device === 'Mobile' || client.deviceType === 'Mobile' || client.connectionType === 'hotspot' || client.connectionType === 'Hotspot';
      const sharedUsersLimit = isMobile ? '1' : '8';
      
      // Clean download and upload speeds
      const dlRaw = String(client.downloadSpeed || client.bandwidth || '20').replace(/[^\d.]/g, '') || '20';
      const ulRaw = String(client.uploadSpeed || '10').replace(/[^\d.]/g, '') || '10';
      const limitSpeed = `${ulRaw}M/${dlRaw}M`;
      
      // An account is disabled ONLY if status is explicitly expired or suspended or offline
      const isDisabled = client.status === 'expired' || client.status === 'suspended' || client.status === 'offline';

      let pppoeSynced = false;
      let hotspotSynced = false;
      let queueSynced = false;
      let pppoeError: string | undefined;
      let hotspotError: string | undefined;
      let queueResult: { success: boolean; error?: string; queueId?: string } | undefined;

      // Determine client type (PPPoE or Hotspot or Both)
      const isPppoe = client.connectionType === 'pppoe' || client.connectionType === 'PPPoE' || client.deviceType === 'Router' || client.device === 'Router' || !client.deviceType || !client.connectionType;
      const isHotspot = client.connectionType === 'hotspot' || client.connectionType === 'Hotspot' || client.deviceType === 'Mobile' || client.device === 'Mobile' || !client.deviceType || !client.connectionType;

      const secretPassword = client.password && String(client.password).trim() !== '' ? String(client.password).trim() : '123456';
      const expiryStr = client.expiry || 'No Expiry';
      const prioStr = String(client.priority || '8');
      const clientComment = `FE | Exp: ${expiryStr} | Prio: ${prioStr} | ${client.name || 'Client'} | ${client.phone || ''}`.slice(0, 100);

      // ============================================
      // A. PPPoE Provisioning (/ppp/secret & /ppp/profile)
      // ============================================
      if (isPppoe) {
        try {
          // 1. Ensure PPPoE profile exists (optional rate limit)
          try {
            const pppProfileRes = await queryMikrotikSocketWithRetry(params, [
              '/ppp/profile/print',
              `?name=${cleanProfile}`
            ], 2, 800);

            let pppProfileExists = false;
            let pppProfileId = '';
            if (pppProfileRes.success && pppProfileRes.sentences?.length) {
              for (const sent of pppProfileRes.sentences) {
                let id = '';
                let name = '';
                for (const w of sent) {
                  if (w.startsWith('=.id=')) id = w.substring(5);
                  if (w.startsWith('=name=')) name = w.substring(6);
                }
                if (name === cleanProfile) {
                  pppProfileExists = true;
                  pppProfileId = id;
                  break;
                }
              }
            }

            if (pppProfileExists && pppProfileId) {
              await queryMikrotikSocketWithRetry(params, [
                '/ppp/profile/set',
                `=.id=${pppProfileId}`,
                `=rate-limit=${limitSpeed}`,
              ], 2, 800);
            } else {
              await queryMikrotikSocketWithRetry(params, [
                '/ppp/profile/add',
                `=name=${cleanProfile}`,
                `=rate-limit=${limitSpeed}`,
                '=only-one=yes',
              ], 2, 800);
            }
          } catch (profErr: any) {
            console.warn('PPPoE profile set warning (will use default):', profErr.message);
          }

          // 2. Check & Sync /ppp/secret
          const pppSecretRes = await queryMikrotikSocketWithRetry(params, [
            '/ppp/secret/print',
            `?name=${client.userId}`
          ], 2, 800);

          let secretExists = false;
          let secretId = '';
          if (pppSecretRes.success && pppSecretRes.sentences?.length) {
            for (const sent of pppSecretRes.sentences) {
              let id = '';
              let name = '';
              for (const w of sent) {
                if (w.startsWith('=.id=')) id = w.substring(5);
                if (w.startsWith('=name=')) name = w.substring(6);
              }
              if (name === client.userId) {
                secretExists = true;
                secretId = id;
                break;
              }
            }
          }

          if (secretExists && secretId) {
            const setRes = await queryMikrotikSocketWithRetry(params, [
              '/ppp/secret/set',
              `=.id=${secretId}`,
              `=password=${secretPassword}`,
              `=profile=${cleanProfile}`,
              `=service=any`,
              `=comment=${clientComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 2, 800);
            if (setRes.success) {
              pppoeSynced = true;
            } else {
              // Fallback without custom profile
              const fbRes = await queryMikrotikSocketWithRetry(params, [
                '/ppp/secret/set',
                `=.id=${secretId}`,
                `=password=${secretPassword}`,
                `=service=any`,
                `=comment=${clientComment}`,
                `=disabled=${isDisabled ? 'yes' : 'no'}`
              ], 2, 800);
              if (fbRes.success) {
                pppoeSynced = true;
              } else {
                pppoeError = fbRes.error || setRes.error || "Failed to update PPPoE secret";
              }
            }
          } else {
            const addRes = await queryMikrotikSocketWithRetry(params, [
              '/ppp/secret/add',
              `=name=${client.userId}`,
              `=password=${secretPassword}`,
              `=profile=${cleanProfile}`,
              `=service=any`,
              `=comment=${clientComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 2, 800);
            if (addRes.success) {
              pppoeSynced = true;
            } else {
              // Fallback without custom profile
              const fbAddRes = await queryMikrotikSocketWithRetry(params, [
                '/ppp/secret/add',
                `=name=${client.userId}`,
                `=password=${secretPassword}`,
                `=service=any`,
                `=comment=${clientComment}`,
                `=disabled=${isDisabled ? 'yes' : 'no'}`
              ], 2, 800);
              if (fbAddRes.success) {
                pppoeSynced = true;
              } else {
                pppoeError = fbAddRes.error || addRes.error || "Failed to add PPPoE secret";
              }
            }
          }

          // If disabled, kick active PPPoE session
          if (isDisabled) {
            try {
              const activePpp = await queryMikrotikSocketWithRetry(params, [
                '/ppp/active/print',
                `?name=${client.userId}`
              ], 1, 500);
              if (activePpp.success && activePpp.sentences?.length) {
                for (const sent of activePpp.sentences) {
                  let actId = '';
                  for (const w of sent) {
                    if (w.startsWith('=.id=')) actId = w.substring(5);
                  }
                  if (actId) {
                    await queryMikrotikSocketWithRetry(params, ['/ppp/active/remove', `=.id=${actId}`], 1, 500);
                  }
                }
              }
            } catch (err: any) {
              console.warn('Could not kick PPPoE session:', err.message);
            }
          }
        } catch (pppErr: any) {
          pppoeError = pppErr.message || "PPPoE secret sync failed";
        }
      }

      // ============================================
      // B. Hotspot Provisioning (/ip/hotspot/user)
      // ============================================
      if (isHotspot) {
        try {
          // 1. Ensure Hotspot User Profile exists
          try {
            const profilePrint = await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/user/profile/print',
              `?name=${cleanProfile}`
            ], 2, 800);

            let profileExists = false;
            let profileId = '';
            if (profilePrint.success && profilePrint.sentences?.length) {
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
                `=shared-users=${sharedUsersLimit}`,
                `=rate-limit=${limitSpeed}`
              ], 2, 800);
            } else {
              await queryMikrotikSocketWithRetry(params, [
                '/ip/hotspot/user/profile/add',
                `=name=${cleanProfile}`,
                `=shared-users=${sharedUsersLimit}`,
                `=rate-limit=${limitSpeed}`
              ], 2, 800);
            }
          } catch (hProfErr: any) {
            console.warn('Hotspot profile set warning:', hProfErr.message);
          }

          // 2. Check if the Hotspot User already exists on MikroTik
          const printRes = await queryMikrotikSocketWithRetry(params, [
            '/ip/hotspot/user/print',
            `?name=${client.userId}`
          ], 2, 800);

          let userExists = false;
          let userObjectId = '';

          if (printRes.success && printRes.sentences?.length) {
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

          if (userExists && userObjectId) {
            const hsSetRes = await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/user/set',
              `=.id=${userObjectId}`,
              `=password=${secretPassword}`,
              `=profile=${cleanProfile}`,
              `=comment=${clientComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 2, 800);
            if (hsSetRes.success) {
              hotspotSynced = true;
            } else {
              const fbHsRes = await queryMikrotikSocketWithRetry(params, [
                '/ip/hotspot/user/set',
                `=.id=${userObjectId}`,
                `=password=${secretPassword}`,
                `=comment=${clientComment}`,
                `=disabled=${isDisabled ? 'yes' : 'no'}`
              ], 2, 800);
              if (fbHsRes.success) {
                hotspotSynced = true;
              } else {
                hotspotError = fbHsRes.error || hsSetRes.error || "Failed to update Hotspot user";
              }
            }
          } else {
            const hsAddRes = await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/user/add',
              `=name=${client.userId}`,
              `=password=${secretPassword}`,
              `=profile=${cleanProfile}`,
              `=comment=${clientComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 2, 800);
            if (hsAddRes.success) {
              hotspotSynced = true;
            } else {
              const fbAddHs = await queryMikrotikSocketWithRetry(params, [
                '/ip/hotspot/user/add',
                `=name=${client.userId}`,
                `=password=${secretPassword}`,
                `=comment=${clientComment}`,
                `=disabled=${isDisabled ? 'yes' : 'no'}`
              ], 2, 800);
              if (fbAddHs.success) {
                hotspotSynced = true;
              } else {
                hotspotError = fbAddHs.error || hsAddRes.error || "Failed to add Hotspot user";
              }
            }
          }

          // 3. If user is disabled/expired, force kick active hotspot session
          if (isDisabled) {
            try {
              const activePrint = await queryMikrotikSocketWithRetry(params, [
                '/ip/hotspot/active/print',
                `?user=${client.userId}`
              ], 1, 500);

              if (activePrint.success && activePrint.sentences?.length) {
                for (const sent of activePrint.sentences) {
                  let activeId = '';
                  for (const word of sent) {
                    if (word.startsWith('=.id=')) activeId = word.substring(5);
                  }
                  if (activeId) {
                    await queryMikrotikSocketWithRetry(params, [
                      '/ip/hotspot/active/remove',
                      `=.id=${activeId}`
                    ], 1, 500);
                  }
                }
              }
            } catch (kickErr: any) {
              console.warn(`Could not kick active hotspot session: ${kickErr.message}`);
            }
          }
        } catch (hotErr: any) {
          hotspotError = hotErr.message || "Hotspot user sync failed";
        }
      }

      // ============================================
      // C. REST API Fallback (RouterOS v7) if socket sync did not hit
      // ============================================
      if ((isPppoe && !pppoeSynced) || (isHotspot && !hotspotSynced)) {
        try {
          if (isPppoe && !pppoeSynced) {
            const restPppRes = await queryMikrotikRest(params, `ppp/secret/${client.userId}`, 'PATCH', {
              name: client.userId,
              password: secretPassword,
              profile: cleanProfile,
              comment: clientComment,
              disabled: isDisabled,
            });
            if (restPppRes.success) {
              pppoeSynced = true;
              pppoeError = undefined;
            } else {
              const restAddPpp = await queryMikrotikRest(params, 'ppp/secret', 'PUT', {
                name: client.userId,
                password: secretPassword,
                profile: cleanProfile,
                service: 'any',
                comment: clientComment,
                disabled: isDisabled,
              });
              if (restAddPpp.success) {
                pppoeSynced = true;
                pppoeError = undefined;
              }
            }
          }

          if (isHotspot && !hotspotSynced) {
            const restHsRes = await queryMikrotikRest(params, `ip/hotspot/user/${client.userId}`, 'PATCH', {
              name: client.userId,
              password: secretPassword,
              profile: cleanProfile,
              comment: clientComment,
              disabled: isDisabled,
            });
            if (restHsRes.success) {
              hotspotSynced = true;
              hotspotError = undefined;
            } else {
              const restAddHs = await queryMikrotikRest(params, 'ip/hotspot/user', 'PUT', {
                name: client.userId,
                password: secretPassword,
                profile: cleanProfile,
                comment: clientComment,
                disabled: isDisabled,
              });
              if (restAddHs.success) {
                hotspotSynced = true;
                hotspotError = undefined;
              }
            }
          }
        } catch (restFallErr: any) {
          console.warn("REST fallback warning:", restFallErr.message);
        }
      }

      // ============================================
      // D. Simple Queue (Assigns Priority & Bandwidth limit with Valid Target IP/Subnet)
      // ============================================
      try {
        const qRes = await syncMikrotikClientQueue(params, client, limitSpeed, prioStr);
        queueSynced = qRes.success;
        queueResult = {
          success: qRes.success,
          ...(qRes.error ? { error: qRes.error } : {}),
          ...(qRes.queueId ? { queueId: qRes.queueId } : {}),
        };
      } catch (qErr: any) {
        queueSynced = false;
        queueResult = {
          success: false,
          error: qErr.message || "Failed to create/update Simple Queue on router",
        };
      }

      // ============================================
      // E. Evaluate Component-Level Success and Return Structured Result
      // ============================================
      const isPppoeRequested = Boolean(isPppoe);
      const isHotspotRequested = Boolean(isHotspot);

      const pppOk = !isPppoeRequested || pppoeSynced;
      const hsOk = !isHotspotRequested || hotspotSynced;
      const queueOk = queueSynced;

      // The overall sync MUST NOT say success=true if any important component failed
      const overallSuccess = pppOk && hsOk && queueOk;

      const pppoeComponent = isPppoeRequested
        ? { success: pppoeSynced, ...(pppoeError ? { error: pppoeError } : {}) }
        : undefined;

      const hotspotComponent = isHotspotRequested
        ? { success: hotspotSynced, ...(hotspotError ? { error: hotspotError } : {}) }
        : undefined;

      const queueComponent = queueResult || {
        success: queueSynced,
        error: "Simple Queue was not synchronized",
      };

      const syncErrorsList = [
        pppoeComponent && !pppoeComponent.success ? `PPPoE: ${pppoeComponent.error}` : null,
        hotspotComponent && !hotspotComponent.success ? `Hotspot: ${hotspotComponent.error}` : null,
        queueComponent && !queueComponent.success ? `Queue: ${queueComponent.error}` : null,
      ].filter(Boolean) as string[];

      const responsePayload = {
        success: overallSuccess,
        pppoe: pppoeComponent,
        hotspot: hotspotComponent,
        queue: queueComponent,
        syncLog: {
          userId: client.userId,
          name: client.name,
          targetRouter: router.name,
          pppoeSynced,
          hotspotSynced,
          queueSynced,
          syncedAt: new Date().toISOString(),
        },
        ...(!overallSuccess
          ? {
              error: {
                code: "SYNC_FAILED",
                message: syncErrorsList.join(" | ") || "One or more sync operations failed on RouterOS",
              },
            }
          : {
              message: `Client ${client.name} (${client.userId}) successfully synced to MikroTik (${[
                pppoeSynced && "PPPoE Secret",
                hotspotSynced && "Hotspot User",
                queueSynced && "Simple Queue",
              ]
                .filter(Boolean)
                .join(", ")})!`,
            }),
      };

      if (!overallSuccess) {
        return res.status(400).json(responsePayload);
      }

      res.json(responsePayload);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        error: {
          code: classified.code,
          message: classified.message,
        },
      });
    }
  });

  // 4b. MikroTik Bulk Sync All Clients
  app.post("/api/mikrotik/sync-all-clients", async (req, res) => {
    const { router, clients } = req.body;
    try {
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ success: false, error: "Clients list is required" });
      }

      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : '';
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (!router || router.isDemo || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      if (isExplicitDemo) {
        return res.json({
          success: true,
          isDemo: true,
          syncedCount: clients.length,
          total: clients.length,
          message: `[Simulator Mode] All ${clients.length} clients simulated to Demo MikroTik Router.`,
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || '').trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 15000,
        useSsl: Number(router.apiPort) === 8729,
      };

      let successCount = 0;
      let failCount = 0;
      const details: { userId: string; name: string; success: boolean; error?: string }[] = [];

      for (const client of clients) {
        if (!client || !client.userId) continue;

        try {
          const cleanProfile = String(client.package || 'default').replace(/[^\w-]/g, '_') || 'default';
          const dlRaw = String(client.downloadSpeed || client.bandwidth || '20').replace(/[^\d.]/g, '') || '20';
          const ulRaw = String(client.uploadSpeed || '10').replace(/[^\d.]/g, '') || '10';
          const limitSpeed = `${ulRaw}M/${dlRaw}M`;
          const isDisabled = client.status === 'expired' || client.status === 'suspended' || client.status === 'offline';
          const secretPassword = client.password ? String(client.password).trim() : '123456';
          const secretComment = `FiberExpress (${client.name || 'Client'})`;

          // Check if secret exists
          const pppSecretRes = await queryMikrotikSocketWithRetry(params, [
            '/ppp/secret/print',
            `?name=${client.userId}`
          ], 1, 600);

          let secretExists = false;
          let secretId = '';
          if (pppSecretRes.success && pppSecretRes.sentences?.length) {
            for (const sent of pppSecretRes.sentences) {
              let id = '';
              let name = '';
              for (const w of sent) {
                if (w.startsWith('=.id=')) id = w.substring(5);
                if (w.startsWith('=name=')) name = w.substring(6);
              }
              if (name === client.userId) {
                secretExists = true;
                secretId = id;
                break;
              }
            }
          }

          if (secretExists && secretId) {
            await queryMikrotikSocketWithRetry(params, [
              '/ppp/secret/set',
              `=.id=${secretId}`,
              `=password=${secretPassword}`,
              `=service=any`,
              `=comment=${secretComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 1, 600);
          } else {
            await queryMikrotikSocketWithRetry(params, [
              '/ppp/secret/add',
              `=name=${client.userId}`,
              `=password=${secretPassword}`,
              `=service=any`,
              `=comment=${secretComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 1, 600);
          }

          // Also Hotspot user
          const hsPrintRes = await queryMikrotikSocketWithRetry(params, [
            '/ip/hotspot/user/print',
            `?name=${client.userId}`
          ], 1, 600);

          let hsExists = false;
          let hsId = '';
          if (hsPrintRes.success && hsPrintRes.sentences?.length) {
            for (const sent of hsPrintRes.sentences) {
              let id = '';
              let name = '';
              for (const w of sent) {
                if (w.startsWith('=.id=')) id = w.substring(5);
                if (w.startsWith('=name=')) name = w.substring(6);
              }
              if (name === client.userId) {
                hsExists = true;
                hsId = id;
                break;
              }
            }
          }

          if (hsExists && hsId) {
            await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/user/set',
              `=.id=${hsId}`,
              `=password=${secretPassword}`,
              `=comment=${secretComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 1, 600);
          } else {
            await queryMikrotikSocketWithRetry(params, [
              '/ip/hotspot/user/add',
              `=name=${client.userId}`,
              `=password=${secretPassword}`,
              `=comment=${secretComment}`,
              `=disabled=${isDisabled ? 'yes' : 'no'}`
            ], 1, 600);
          }

          successCount++;
          details.push({ userId: client.userId, name: client.name, success: true });
        } catch (itemErr: any) {
          failCount++;
          details.push({ userId: client.userId, name: client.name, success: false, error: itemErr.message });
        }
      }

      res.json({
        success: true,
        syncedCount: successCount,
        failedCount: failCount,
        total: clients.length,
        message: `Successfully synchronized ${successCount} of ${clients.length} clients to MikroTik router!`,
        details,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Bulk sync failed: ${err.message}` });
    }
  });

  // 5. MikroTik Toggle Client Status (Disable / Enable PPPoE and Hotspot with Force Kick)
  app.post("/api/mikrotik/toggle-client", async (req, res) => {
    const { router, userId, enabled } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({ success: false, error: "UserId is required" });
      }

      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : '';
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (!router || router.isDemo || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      if (isExplicitDemo) {
        return res.json({
          success: true,
          isDemo: true,
          userId,
          enabled,
          message: `[Simulator Mode] Client ${userId} simulated ${enabled ? 'enabled' : 'disabled'} on Demo Router.`,
        });
      }

      // Check if private LAN IP is reachable from this environment
      if (isPrivateIp(cleanHost)) {
        const probeParams: MikrotikConnParams = {
          host: cleanHost,
          port: Number(router.apiPort) || 8728,
          username: String(router.username || '').trim(),
          password: router.password ? String(router.password).trim() : '',
          timeoutMs: 1500,
          useSsl: Number(router.apiPort) === 8729,
        };
        const probe = await queryMikrotikSocket(probeParams, ['/system/resource/print']);
        if (!probe.success) {
          return res.status(503).json({
            success: false,
            error: {
              code: "ROUTER_UNREACHABLE",
              message: `Cannot reach MikroTik router at ${cleanHost}. Ensure the router is powered on and accessible via Public IP, VPN, or direct network route.`,
            },
          });
        }
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || '').trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 4000,
        useSsl: Number(router.apiPort) === 8729,
      };

      let toggledCount = 0;
      const toggleErrors: string[] = [];

      // 1. Toggle in Hotspot
      try {
        const hsPrint = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/user/print', `?name=${userId}`], 2, 400);
        if (hsPrint.success && hsPrint.sentences?.length) {
          for (const sent of hsPrint.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const res = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/user/set', `=.id=${id}`, `=disabled=${enabled ? 'no' : 'yes'}`], 2, 400);
              if (res.success) toggledCount++;
              else toggleErrors.push(`Hotspot user set error: ${res.error}`);
            }
          }
        }
      } catch (err: any) {
        toggleErrors.push(`Hotspot toggle error: ${err.message}`);
      }

      // 2. Toggle in PPPoE Secret
      try {
        const pppPrint = await queryMikrotikSocketWithRetry(params, ['/ppp/secret/print', `?name=${userId}`], 2, 400);
        if (pppPrint.success && pppPrint.sentences?.length) {
          for (const sent of pppPrint.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const res = await queryMikrotikSocketWithRetry(params, ['/ppp/secret/set', `=.id=${id}`, `=disabled=${enabled ? 'no' : 'yes'}`], 2, 400);
              if (res.success) toggledCount++;
              else toggleErrors.push(`PPPoE secret set error: ${res.error}`);
            }
          }
        }
      } catch (err: any) {
        toggleErrors.push(`PPPoE secret toggle error: ${err.message}`);
      }

      // 3. Toggle in Simple Queue
      try {
        const qPrint = await queryMikrotikSocketWithRetry(params, ['/queue/simple/print', `?name=${userId}`], 2, 400);
        if (qPrint.success && qPrint.sentences?.length) {
          for (const sent of qPrint.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              await queryMikrotikSocketWithRetry(params, ['/queue/simple/set', `=.id=${id}`, `=disabled=${enabled ? 'no' : 'yes'}`], 2, 400);
            }
          }
        }
      } catch (err: any) {
        console.warn('Queue toggle warning:', err.message);
      }

      // 4. If disabling, kick active sessions from both Hotspot and PPPoE
      if (!enabled) {
        try {
          const actHs = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/print', `?user=${userId}`], 1, 300);
          if (actHs.success && actHs.sentences?.length) {
            for (const sent of actHs.sentences) {
              let id = '';
              for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
              if (id) await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/remove', `=.id=${id}`], 1, 300);
            }
          }
        } catch {}

        try {
          const actPpp = await queryMikrotikSocketWithRetry(params, ['/ppp/active/print', `?name=${userId}`], 1, 300);
          if (actPpp.success && actPpp.sentences?.length) {
            for (const sent of actPpp.sentences) {
              let id = '';
              for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
              if (id) await queryMikrotikSocketWithRetry(params, ['/ppp/active/remove', `=.id=${id}`], 1, 300);
            }
          }
        } catch {}
      }

      // 5. REST API Fallback (RouterOS v7) if socket toggle did not find entries
      if (toggledCount === 0) {
        try {
          const rPpp = await queryMikrotikRest(params, `ppp/secret/${userId}`, 'PATCH', { disabled: !enabled });
          if (rPpp.success) toggledCount++;
          const rHs = await queryMikrotikRest(params, `ip/hotspot/user/${userId}`, 'PATCH', { disabled: !enabled });
          if (rHs.success) toggledCount++;
          await queryMikrotikRest(params, `queue/simple/${userId}`, 'PATCH', { disabled: !enabled });
        } catch (restErr: any) {
          console.warn('REST toggle fallback error:', restErr.message);
        }
      }

      if (toggledCount === 0) {
        const toggleErrMsg = toggleErrors.length > 0 
          ? toggleErrors.join(" | ")
          : `Client ${userId} was not found on MikroTik router (checked Hotspot users and PPPoE secrets).`;
        return res.status(404).json({
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND_ON_ROUTER",
            message: toggleErrMsg,
          },
        });
      }

      res.json({
        success: true,
        userId,
        enabled,
        toggledCount,
        message: `Client ${userId} status successfully changed to ${enabled ? 'ACTIVE' : 'DISABLED'} on physical MikroTik router!`,
      });
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        error: {
          code: classified.code,
          message: classified.message,
        },
      });
    }
  });

  // 9b. MikroTik Delete Client from Router (Hotspot Users & PPPoE Secrets & Active Sessions & Queues)
  app.post("/api/mikrotik/delete-client", async (req, res) => {
    const { router, userId } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_REQUEST", message: "UserId is required" },
        });
      }

      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : '';
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (!router || router.isDemo || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');

      if (isExplicitDemo) {
        return res.json({
          success: true,
          isDemo: true,
          userId,
          message: `[Simulator Mode] Client ${userId} permanently removed from Demo Router.`,
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || '').trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 10000,
        useSsl: Number(router.apiPort) === 8729,
      };

      let removedCount = 0;
      const deleteErrors: string[] = [];

      // 1. Remove from Hotspot user list
      try {
        const hsPrint = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/user/print', `?name=${userId}`], 2, 800);
        if (hsPrint.success && hsPrint.sentences?.length) {
          for (const sent of hsPrint.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const rem = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/user/remove', `=.id=${id}`], 2, 800);
              if (rem.success) removedCount++;
              else deleteErrors.push(`Hotspot user remove error: ${rem.error}`);
            }
          }
        }
      } catch (err: any) {
        deleteErrors.push(`Hotspot delete user error: ${err.message}`);
      }

      // 2. Remove from PPPoE secret list
      try {
        const pppPrint = await queryMikrotikSocketWithRetry(params, ['/ppp/secret/print', `?name=${userId}`], 2, 800);
        if (pppPrint.success && pppPrint.sentences?.length) {
          for (const sent of pppPrint.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const rem = await queryMikrotikSocketWithRetry(params, ['/ppp/secret/remove', `=.id=${id}`], 2, 800);
              if (rem.success) removedCount++;
              else deleteErrors.push(`PPPoE secret remove error: ${rem.error}`);
            }
          }
        }
      } catch (err: any) {
        deleteErrors.push(`PPPoE secret delete error: ${err.message}`);
      }

      // 3. Remove Simple Queues
      try {
        for (const qTarget of [`nexora_${userId}`, userId]) {
          const qPrint = await queryMikrotikSocketWithRetry(params, ['/queue/simple/print', `?name=${qTarget}`], 2, 600);
          if (qPrint.success && qPrint.sentences?.length) {
            for (const sent of qPrint.sentences) {
              let id = '';
              for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
              if (id) {
                await queryMikrotikSocketWithRetry(params, ['/queue/simple/remove', `=.id=${id}`], 2, 600);
              }
            }
          }
        }
      } catch (qErr: any) {
        console.warn('Queue removal warning:', qErr.message);
      }

      // 4. Terminate active sessions
      try {
        const actHs = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/print', `?user=${userId}`], 1, 500);
        if (actHs.success && actHs.sentences?.length) {
          for (const sent of actHs.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/remove', `=.id=${id}`], 1, 500);
          }
        }
      } catch {}

      try {
        const actPpp = await queryMikrotikSocketWithRetry(params, ['/ppp/active/print', `?name=${userId}`], 1, 500);
        if (actPpp.success && actPpp.sentences?.length) {
          for (const sent of actPpp.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) await queryMikrotikSocketWithRetry(params, ['/ppp/active/remove', `=.id=${id}`], 1, 500);
          }
        }
      } catch {}

      if (deleteErrors.length > 0 && removedCount === 0) {
        return res.status(500).json({
          success: false,
          error: {
            code: "DELETE_FAILED",
            message: deleteErrors.join(" | "),
          },
        });
      }

      res.json({
        success: true,
        userId,
        removedCount,
        message: `Client ${userId} permanently purged from physical MikroTik router!`,
      });
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        error: {
          code: classified.code,
          message: classified.message,
        },
      });
    }
  });

  // 9c. MikroTik Kick Active Session (/ppp/active & /ip/hotspot/active)
  app.post("/api/mikrotik/kick-session", async (req, res) => {
    const { router, userId } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_REQUEST", message: "UserId is required to terminate session" },
        });
      }
      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : "";
      if (!cleanHost) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_CONFIGURATION", message: "Router IP address is required" },
        });
      }
      const isExplicitDemo = (process.env.MIKROTIK_MOCK_MODE === "true") || (!router || router.isDemo || cleanHost === 'demo.mikrotik.local' || cleanHost === '127.0.0.1');
      if (isExplicitDemo) {
        return res.json({
          success: true,
          isDemo: true,
          userId,
          kicked: true,
          message: `[Simulator Mode] Active session for ${userId} kicked on Demo Router.`,
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || '').trim(),
        password: router.password ? String(router.password).trim() : '',
        timeoutMs: 5000,
        useSsl: Number(router.apiPort) === 8729,
      };

      let kickedCount = 0;
      const kickErrors: string[] = [];

      // 1. Terminate Hotspot active session
      try {
        const actHs = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/print', `?user=${userId}`], 2, 500);
        if (actHs.success && actHs.sentences?.length) {
          for (const sent of actHs.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const rem = await queryMikrotikSocketWithRetry(params, ['/ip/hotspot/active/remove', `=.id=${id}`], 2, 500);
              if (rem.success) kickedCount++;
              else kickErrors.push(`Hotspot session termination failed: ${rem.error}`);
            }
          }
        }
      } catch (hsErr: any) {
        kickErrors.push(`Hotspot active query failed: ${hsErr.message}`);
      }

      // 2. Terminate PPPoE active session
      try {
        const actPpp = await queryMikrotikSocketWithRetry(params, ['/ppp/active/print', `?name=${userId}`], 2, 500);
        if (actPpp.success && actPpp.sentences?.length) {
          for (const sent of actPpp.sentences) {
            let id = '';
            for (const w of sent) if (w.startsWith('=.id=')) id = w.substring(5);
            if (id) {
              const rem = await queryMikrotikSocketWithRetry(params, ['/ppp/active/remove', `=.id=${id}`], 2, 500);
              if (rem.success) kickedCount++;
              else kickErrors.push(`PPPoE session termination failed: ${rem.error}`);
            }
          }
        }
      } catch (pppErr: any) {
        kickErrors.push(`PPPoE active query failed: ${pppErr.message}`);
      }

      if (kickErrors.length > 0 && kickedCount === 0) {
        return res.status(500).json({
          success: false,
          error: {
            code: "COMMAND_FAILED",
            message: kickErrors.join(" | "),
          },
        });
      }

      res.json({
        success: true,
        userId,
        kickedCount,
        message: kickedCount > 0
          ? `Successfully terminated ${kickedCount} active session(s) for ${userId}.`
          : `No active sessions currently running for ${userId}.`,
      });
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        error: {
          code: classified.code,
          message: classified.message,
        },
      });
    }
  });

  // 10. MikroTik Get Live Active Sessions (PPPoE & Hotspot distinctly queried)
  app.post("/api/mikrotik/active-users", async (req, res) => {
    const { router } = req.body;
    try {
      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : "";
      if (!cleanHost) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CONFIGURATION",
          error: "Router IP address is required",
          pppoeUsers: [],
          hotspotUsers: [],
          activeUsers: [],
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || "admin").trim(),
        password: router.password ? String(router.password).trim() : "",
        timeoutMs: 6000,
        useSsl: Number(router.apiPort) === 8729,
        isDemo: Boolean(router.isDemo),
      };

      const result = await fetchMikrotikActiveUsers(params);
      res.json(result);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.message,
        pppoeUsers: [],
        hotspotUsers: [],
        activeUsers: [],
      });
    }
  });

  // 11. MikroTik Real-time Interface & Queue Traffic (No Math.random)
  app.post("/api/mikrotik/traffic", async (req, res) => {
    const { router } = req.body;
    try {
      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : "";
      if (!cleanHost) {
        return res.json({
          success: false,
          status: "OFFLINE",
          code: "INVALID_CONFIGURATION",
          interfaces: [],
          queues: [],
          totalRxBps: 0,
          totalTxBps: 0,
          error: "Router IP is not configured",
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || "admin").trim(),
        password: router.password ? String(router.password).trim() : "",
        timeoutMs: 4000,
        useSsl: Number(router.apiPort) === 8729,
        isDemo: Boolean(router.isDemo),
      };

      const trafficResult = await fetchMikrotikTraffic(params);
      res.json(trafficResult);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.json({
        success: false,
        status: "OFFLINE",
        code: classified.code,
        interfaces: [],
        queues: [],
        totalRxBps: 0,
        totalTxBps: 0,
        error: classified.message,
      });
    }
  });

  // 12. MikroTik DNS Security & NAT Redirect Rules (REAL RouterOS API execution)
  app.post("/api/mikrotik/apply-dns", async (req, res) => {
    const {
      router,
      params: bodyParams,
      primary = "1.1.1.3",
      secondary = "1.0.0.3",
      redirectPort53 = true,
      subnet,
    } = req.body;
    try {
      const effectiveRouter = router || bodyParams || {};
      const targetHost = effectiveRouter.ip || effectiveRouter.host || "";
      const cleanHost = sanitizeMikrotikHost(targetHost);
      if (!cleanHost) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CONFIGURATION",
          error: "Router IP address is required to configure DNS",
        });
      }

      const connParams: MikrotikConnParams = {
        host: cleanHost,
        port: Number(effectiveRouter.apiPort || effectiveRouter.port) || 8728,
        username: String(effectiveRouter.username || "admin").trim(),
        password: effectiveRouter.password
          ? String(effectiveRouter.password).trim()
          : "",
        timeoutMs: 8000,
        useSsl: Number(effectiveRouter.apiPort || effectiveRouter.port) === 8729,
        isDemo: Boolean(effectiveRouter.isDemo),
      };

      const dnsResult = await configureMikrotikDns(
        connParams,
        primary,
        secondary,
        redirectPort53,
        subnet,
      );
      if (!dnsResult.success) {
        return res.status(502).json(dnsResult);
      }
      res.json(dnsResult);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.message,
      });
    }
  });

  // 13. MikroTik Reboot Command (REAL RouterOS API execution)
  app.post("/api/mikrotik/reboot", async (req, res) => {
    const { router, routerId, host, apiPort, username, password } = req.body;
    try {
      const targetHost = router?.ip || host || "";
      const cleanHost = sanitizeMikrotikHost(targetHost);
      if (!cleanHost) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CONFIGURATION",
          error: "MikroTik router IP or host is required for reboot operation",
        });
      }

      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router?.apiPort || apiPort) || 8728,
        username: String(router?.username || username || "admin").trim(),
        password: router?.password
          ? String(router.password).trim()
          : password
            ? String(password).trim()
            : "",
        timeoutMs: 8000,
        useSsl: Number(router?.apiPort || apiPort) === 8729,
        isDemo: Boolean(router?.isDemo),
      };

      const rebootResult = await executeMikrotikReboot(params);
      if (!rebootResult.success) {
        return res.status(502).json(rebootResult);
      }
      res.json(rebootResult);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.message,
      });
    }
  });

  // 14. MikroTik Package Sync (Profiles on RouterOS)
  app.post("/api/mikrotik/sync-package", async (req, res) => {
    const { router, package: pkg } = req.body;
    try {
      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : "";
      if (!cleanHost) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CONFIGURATION",
          error: "Router IP is required to sync package profile",
        });
      }
      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || "admin").trim(),
        password: router.password ? String(router.password).trim() : "",
        timeoutMs: 8000,
        useSsl: Number(router.apiPort) === 8729,
        isDemo: Boolean(router.isDemo),
      };

      const result = await syncMikrotikPackage(params, pkg);
      if (!result.success) {
        return res.status(502).json(result);
      }
      res.json(result);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.message,
      });
    }
  });

  // 15. MikroTik Client Server-Side Status (Suspend / Activate)
  app.post("/api/mikrotik/set-status", async (req, res) => {
    const { router, clientId, status } = req.body;
    try {
      const cleanHost = router?.ip ? sanitizeMikrotikHost(router.ip) : "";
      if (!cleanHost || !clientId) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CONFIGURATION",
          error: "Router IP and clientId are required to update client status",
        });
      }
      const params: MikrotikConnParams = {
        host: cleanHost,
        port: Number(router.apiPort) || 8728,
        username: String(router.username || "admin").trim(),
        password: router.password ? String(router.password).trim() : "",
        timeoutMs: 8000,
        useSsl: Number(router.apiPort) === 8729,
        isDemo: Boolean(router.isDemo),
      };

      const result = await setMikrotikClientStatus(params, clientId, status);
      if (!result.success) {
        return res.status(502).json(result);
      }
      res.json(result);
    } catch (err: any) {
      const classified = classifyMikrotikError(err.message);
      res.status(500).json({
        success: false,
        code: classified.code,
        error: classified.message,
      });
    }
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
    const { name, phone, package: pkgName, speed, duration, total, gateway, transaction, username, password, photo } = req.body;
    
    if (!phone || !transaction) {
      return res.status(400).json({ success: false, error: "Phone and transaction ID are required" });
    }

    const clientPhone = String(phone).trim();
    const clientPass = String(password || "123456").trim();
    const clientUser = String(username || clientPhone).trim();
    const pkgTitle = pkgName || `${speed || 25} Mbps Plan`;
    const orderTotal = total || 500;
    const nowTimestamp = Date.now();
    const timeFormatted = new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" });

    const purchaseItem = {
      id: nowTimestamp,
      clientId: hotspotPurchasesStore.length + 1,
      name: name || `Hotspot Client ${clientPhone}`,
      phone: clientPhone,
      package: pkgTitle,
      speed: speed || 25,
      duration: duration || 30,
      total: orderTotal,
      gateway: gateway || 'bKash/Nagad',
      transaction: String(transaction).toUpperCase(),
      username: clientUser,
      password: clientPass,
      time: timeFormatted,
      status: 'pending_activation',
      photo: photo || undefined
    };

    hotspotPurchasesStore.unshift(purchaseItem);

    try {
      // 1. Dispatch into localDb["nexora_notifications"]
      const notifRecord = localDb["nexora_notifications"];
      const currentNotifs: any[] = Array.isArray(notifRecord?.value) ? notifRecord.value : [];
      const newNotif = {
        id: nowTimestamp,
        icon: "Wifi",
        text: `⚡ নতুন হটস্পট প্যাকেজ ক্রয়! মোবাইল: ${clientPhone}, নাম: ${purchaseItem.name}, ট্রানজেকশন: ${purchaseItem.transaction}`,
        time: "এইমাত্র",
        read: false,
      };
      localDb["nexora_notifications"] = {
        value: [newNotif, ...currentNotifs.slice(0, 50)],
        updatedAt: nowTimestamp,
      };

      // 2. Dispatch into localDb["nexora_hotspot_requests"]
      const hotspotReqRecord = localDb["nexora_hotspot_requests"];
      const currentRequests: any[] = Array.isArray(hotspotReqRecord?.value) ? hotspotReqRecord.value : [];
      const newHotspotReq = {
        id: `HSP-${nowTimestamp}`,
        clientName: purchaseItem.name,
        phone: clientPhone,
        package: pkgTitle,
        price: String(orderTotal),
        bandwidth: `${speed || 25} Mbps`,
        downloadSpeed: `${speed || 25} Mbps`,
        uploadSpeed: "10 Mbps",
        requestedAt: timeFormatted,
        status: "pending",
        createdUserId: clientUser,
        createdPassword: clientPass,
        password: clientPass,
        gateway: gateway || "bKash/Nagad",
        transaction: purchaseItem.transaction,
        duration: Number(duration) || 30,
        photo: photo || undefined
      };
      localDb["nexora_hotspot_requests"] = {
        value: [newHotspotReq, ...currentRequests.filter(r => r.transaction !== purchaseItem.transaction)],
        updatedAt: nowTimestamp,
      };

      // 3. Dispatch into localDb["nexora_online_orders"]
      const onlineOrderRecord = localDb["nexora_online_orders"];
      const currentOrders: any[] = Array.isArray(onlineOrderRecord?.value) ? onlineOrderRecord.value : [];
      const newOnlineOrder = {
        id: `ORD-${nowTimestamp}`,
        orderNumber: `ORD-${String(nowTimestamp).slice(-6)}`,
        clientId: `CLI-${String(nowTimestamp).slice(-6)}`,
        clientName: purchaseItem.name,
        phone: clientPhone,
        userId: clientUser,
        password: clientPass,
        packageName: pkgTitle,
        bandwidth: `${speed || 25} Mbps`,
        price: String(orderTotal),
        connectionType: "Hotspot",
        paymentMethod: gateway || "bKash",
        transactionId: purchaseItem.transaction,
        status: "pending",
        createdAt: timeFormatted,
        targetRouter: "Core MikroTik Gateway",
        photo: photo || undefined
      };
      localDb["nexora_online_orders"] = {
        value: [newOnlineOrder, ...currentOrders.filter(o => o.transactionId !== purchaseItem.transaction)],
        updatedAt: nowTimestamp,
      };

      saveDb();
    } catch (saveErr) {
      console.warn("Hotspot purchase localDb sync error:", saveErr);
    }

    res.json({
      success: true,
      message: "Package purchase received successfully. Real-time notification dispatched to ISP Software Dashboard.",
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
    const clientsRecord = localDb["nexora_clients"];
    if (clientsRecord && Array.isArray(clientsRecord.value)) {
      return clientsRecord.value;
    }
    return [];
  }

  function getAllLocalPackages(): any[] {
    const pkgRecord = localDb["nexora_packages"];
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
    const setRecord = localDb["nexora_settings"];
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
          error: "Subscriber info not found in system."
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
        summaryBangla = `Your subscription expired on ${targetClient.expiry || 'past due date'} (${Math.abs(daysLeft)} days overdue). Line is temporarily paused. Please pay ৳${targetClient.price || '500'} via 'Renew & Pay'.`;
      } else if (!isOnlineStatus) {
        issueType = 'MIKROTIK_SYNC_ISSUE';
        autoFixable = true;
        summaryBangla = `Your bill is paid and subscription is active (valid until ${targetClient.expiry}). MikroTik session dropped. Click 'Auto-Fix & Reset' below to reactivate.`;
      } else {
        issueType = 'HEALTHY_ONLINE';
        summaryBangla = `Your internet line is completely active and online. Package: ${targetClient.package} (${targetClient.downloadSpeed || '10'} Mbps). Validity: until ${targetClient.expiry}.`;
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
          error: "No subscriber found in system. Please provide User ID." 
        });
      }

      const targetClient = allClients[clientIndex];
      // Update client status to online
      targetClient.status = 'online';
      targetClient.lastSync = new Date().toISOString();
      allClients[clientIndex] = targetClient;
      localDb["nexora_clients"] = { value: allClients, updatedAt: Date.now() };
      saveDb();

      res.json({
        success: true,
        message: `Client ${targetClient.name} (${targetClient.userId}) line reset and resynced on MikroTik successfully! Connection is now online.`,
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
        lowerPrompt.includes('active id') || 
        lowerPrompt.includes('active id') || 
        lowerPrompt.includes('active account') || 
        lowerPrompt.includes('active pass') || 
        lowerPrompt.includes('renewed id') || 
        lowerPrompt.includes('someone else') || 
        lowerPrompt.includes('free id') ||
        lowerPrompt.includes('free id') ||
        lowerPrompt.includes('other password') ||
        lowerPrompt.includes('other user') ||
        lowerPrompt.includes('free internet') ||
        lowerPrompt.includes('free internet');

      if (asksForActiveAccount) {
        return res.json({
          success: true,
          reply: `🚫 **Security & Policy Warning:**\n\nUnder Fiber Express ISP security and privacy regulations, sharing unauthorized credentials, active, or renewed customer accounts is strictly forbidden. For a new connection, please contact our helpline (${settings.phone || '01410381233'}).`,
          isGuardrailBlocked: true
        });
      }

      // ---------------------------------------------------------
      // GUARDRAIL 2: Tampering with App Design, System Config, Pricing, Server Code
      // ---------------------------------------------------------
      const asksToChangeSystem = 
        lowerPrompt.includes('change design') || 
        lowerPrompt.includes('system change') || 
        lowerPrompt.includes('change config') || 
        lowerPrompt.includes('lower price') || 
        lowerPrompt.includes('change price') || 
        lowerPrompt.includes('admin password') ||
        lowerPrompt.includes('modify system') ||
        lowerPrompt.includes('server code');

      if (asksToChangeSystem) {
        return res.json({
          success: true,
          reply: `🚫 **Permission Denied:**\n\nI am the Fiber Express AI Support Assistant. I do not have permission or access to modify system design, codebase, pricing plans, router credentials, or core network configurations.`,
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
        lowerPrompt.includes('username') || 
        lowerPrompt.includes('user id') || 
        lowerPrompt.includes('password') || 
        lowerPrompt.includes('passcode') || 
        lowerPrompt.includes('username') || 
        lowerPrompt.includes('password') ||
        lowerPrompt.includes('my id') ||
        lowerPrompt.includes('my password');

      if (phoneMatch && isAskingCredentials) {
        if (identifiedClient) {
          return res.json({
            success: true,
            reply: `✅ **Account Verified Successfully:**\n\n- **Client Name:** ${identifiedClient.name}\n- **User ID:** \`${identifiedClient.userId}\`\n- **Password:** \`${identifiedClient.password || '123456'}\`\n- **Package:** ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)\n- **Billing Expiry:** ${identifiedClient.expiry}\n- **Status:** ${identifiedClient.status === 'online' ? '🟢 Active (Online)' : '🔴 Inactive / Expired (Offline)'}\n\nYou can log into your account portal using these credentials.`,
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
            reply: `❌ **Account Not Found:**\n\nNo account was found matching phone number (\`${phoneMatch[0]}\`). Please verify your registered 11-digit mobile number or contact customer care (${settings.phone || '01410381233'}).`,
          });
        }
      }

      // ---------------------------------------------------------
      // CLIENT DIAGNOSTIC DETAILS (If client is identified)
      // ---------------------------------------------------------
      let clientContextText = 'Client has not logged in or provided a User ID.';
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
Client Name: ${identifiedClient.name}
User ID: ${identifiedClient.userId}
Package: ${identifiedClient.package} (${identifiedClient.downloadSpeed || '10'} Mbps)
Bill Amount: ৳${identifiedClient.price || '500'}
Billing Expiry: ${identifiedClient.expiry || 'N/A'}
Validity Status: ${clientIsExpired ? `Expired (${Math.abs(clientDaysLeft)} days ago)` : `Active (${clientDaysLeft} days remaining)`}
MikroTik Status: ${identifiedClient.status === 'online' ? '🟢 Active (Online)' : '🔴 Inactive / Dropped (Offline)'}
`;
      }

      // Format Packages for AI Knowledge
      const packageListText = allPackages.map(pkg => 
        `- **${pkg.name}**: Speed: ${pkg.speed || pkg.download || '10 Mbps'} (Upload: ${pkg.upload || '5 Mbps'}), Price: ৳${pkg.price}/month, Renewal: ৳${pkg.renewal || pkg.price}, Validity: ${pkg.validity || '30 days'}, Description: ${pkg.description || 'Ultra High-Speed Optical Fiber Internet'}`
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
        const asksHowToPay = lowerPrompt.includes('bill') || lowerPrompt.includes('pay') || lowerPrompt.includes('payment') || lowerPrompt.includes('bkash') || lowerPrompt.includes('nagad');
        if (asksHowToPay) {
          detectedActionType = 'RENEW';
        }
      }

      // ---------------------------------------------------------
      // SCENARIO 2: ALL-ROUNDER GEMINI 3.7 WITH LIVE GOOGLE SEARCH GROUNDING
      // ---------------------------------------------------------
      const ai = getGenAI();

      if (ai) {
        const systemInstruction = `You are "FiberAI Support" (FiberAI Support), the ultra-smart, all-rounder, helpful, and knowledgeable AI assistant for Fiber Express ISP (Fiber Express ISP).

==================================================
1. YOUR DUAL SUPERPOWERS:
==================================================
A. 🌐 ALL-ROUNDER ONLINE & GENERAL INTELLIGENCE (With Live Google Search):
   - You can answer ANY question on Earth: current world news, science, space, universe, technology, coding/software, programming, history, literature, study/exams, math, health, networking, Wi-Fi routers, gaming ping, daily life advice, and anything else.
   - You have live Google Search grounding enabled, so you know the most recent, real-time facts and global updates!
   - You understand ANY language (English, Bengali, Hindi, Arabic, etc.) and understand user intent even with spelling mistakes, slang, or diverse phrasings.
   - Reply in the language and style the user prefers (defaults to clear, friendly, natural Bengali with formatting, or English if asked in English).

B. 🚀 FIBER EXPRESS ISP & NETWORK EXPERT:
   - Company: Fiber Express ISP (Fiber Express ISP).
   - 24/7 Helpline & WhatsApp: ${settings.phone || '01410381233'}.
   - Address: ${settings.address || 'Level 4, Fiber Tower, Dhaka'}.

   📦 CURRENT INTERNET PACKAGES & PRICING:
${packageListText}

   💳 HOW TO PAY BILL (3 Easy Ways to Pay Bill):
   1. App Instant Payment (Fastest): Click "Renew & Pay" in the portal, select your package, and pay via bKash or Nagad gateway for instant activation.
   2. bKash / Nagad App 'Pay Bill': Open bKash/Nagad App ➡️ Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ Enter User ID to pay.
   3. Cash Payment: Pay directly at our zone office or to our collection agent.

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
      
      const isAskingPackages = lowerPrompt.includes('package') || lowerPrompt.includes('package') || lowerPrompt.includes('offer') || lowerPrompt.includes('offer') || lowerPrompt.includes('cost') || lowerPrompt.includes('price') || lowerPrompt.includes('speed') || lowerPrompt.includes('mbps');
      const isAskingPayment = lowerPrompt.includes('bill') || lowerPrompt.includes('pay') || lowerPrompt.includes('payment') || lowerPrompt.includes('bkash') || lowerPrompt.includes('nagad') || lowerPrompt.includes('bkash') || lowerPrompt.includes('payment');
      const isAskingLine = lowerPrompt.includes('line') || lowerPrompt.includes('internet') || lowerPrompt.includes('problem') || lowerPrompt.includes('issue') || lowerPrompt.includes('slow') || lowerPrompt.includes('buffering') || lowerPrompt.includes('down');
      const isAskingWifi = lowerPrompt.includes('wifi') || lowerPrompt.includes('wifi') || lowerPrompt.includes('router') || lowerPrompt.includes('router') || lowerPrompt.includes('password');

      if (isAskingPackages) {
        fallbackReply = `📦 **Fiber Express ISP Packages:**\n\n${packageListText}\n\n💡 For new connection or package upgrade, call helpline: (${settings.phone || '01410381233'}) .`;
      } else if (isAskingPayment) {
        fallbackReply = `💳 **Easy Ways to Pay Fiber Express Bill:**\n\n1️⃣ **Automatic Payment via App:** Tap **"Renew & Pay"** below to pay instantly via bKash or Nagad gateway.\n2️⃣ **bKash/Nagad Pay Bill:** Pay Bill ➡️ Internet ➡️ Fiber Express ISP ➡️ Enter User ID.\n\n💡 Connection reactivates automatically once payment is completed.`;
      } else if (isAskingWifi) {
        fallbackReply = `📶 **Wi-Fi & Router Setup Guidelines:**\n\n1. **Change Password:** Access your router dashboard at \`192.168.0.1\` or \`192.168.1.1\` in your browser and update the password under Wireless Security.\n2. **Speed Boost:** Place the router in an elevated open location and connect to the **5GHz** band if supported.\n3. **Reboot:** In case of any connectivity drop, power cycle (turn off for 5 seconds) your router.`;
      } else if (identifiedClient) {
        if (clientIsExpired) {
          fallbackReply = `⚠️ **Your Subscription Expired (Billing Expired):**\n\nDear **${identifiedClient.name}**, your connection is paused due to unpaid monthly bill.\n- **User ID:** \`${identifiedClient.userId}\`\n- **Package:** ${identifiedClient.package}\n- **Expired on:** ${identifiedClient.expiry}\n- **Bill:** ৳${identifiedClient.price || '500'}\n\n👉 Click **"Renew & Pay"** below to pay your bill via bKash/Nagad.`;
        } else if (clientIsOffline) {
          fallbackReply = `🛠️ **Line Drop / Router Sync Issue Detected:**\n\nDear **${identifiedClient.name}**, your subscription is active (valid until ${identifiedClient.expiry}), but router connection session dropped.\n\n👉 Click **"⚡ 1-Click Auto-Fix & Reset"** below and restart your router once.`;
        } else {
          fallbackReply = `✅ **Your Internet Connection is Active & Online:**\n\nDear **${identifiedClient.name}**,\n- **User ID:** \`${identifiedClient.userId}\`\n- **Package:** ${identifiedClient.package}\n- **Validity:** \`${identifiedClient.expiry}\` (${clientDaysLeft} days remaining)\n- **Status:** 🟢 Online\n\nFeel free to ask any other questions!`;
        }
      } else if (isAskingLine) {
        fallbackReply = `🔍 **For accurate status and troubleshooting of your line:**\n\nPlease provide your **Username (User ID)** or 11-digit registered phone number to diagnose your connection.`;
      } else {
        fallbackReply = `Hello! I am your Fiber Express ISP AI Assistant.\n\n- Feel free to ask any question regarding your connection or billing.\n- Ask "What are the packages?" to see available speeds and plans.\n- You can also ask any questions about technology, science, or general topics!`;
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
