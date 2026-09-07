import net from "net";
import tls from "tls";
import crypto from "crypto";
import dns from "dns";

export interface MikrotikConnParams {
  host: string;
  port: number;
  username: string;
  password?: string;
  timeoutMs?: number;
  useSsl?: boolean;
  isDemo?: boolean;
}

export interface RouterResourceInfo {
  identity: string;
  version: string;
  isVersion6: boolean;
  uptime: string;
  cpuLoad: string;
  ramUsage: string;
  totalRam: string;
  freeRam: string;
  hotspotStatus: "Active" | "Disabled" | "Not Configured";
  hotspotServer: string;
  hotspotInterface: string;
  addressPool: string;
  subnet: string;
  dhcpServer: string;
  currentPrimaryDns: string;
  currentSecondaryDns: string;
  allowRemoteRequests: boolean;
  redirectUdpPort53Active: boolean;
  redirectTcpPort53Active: boolean;
}

export interface DiagnosticCheckItem {
  name: string;
  status: "passed" | "failed" | "warning" | "pending";
  detail: string;
}

export interface DiagnosticResult {
  host: string;
  cleanHost: string;
  resolvedIp?: string;
  isPrivate: boolean;
  dnsOk: boolean;
  port8728Open: boolean;
  port8729Open: boolean;
  restApiOpen: boolean;
  authSuccess: boolean;
  connected: boolean;
  protocolUsed?:
    | "Socket API (8728)"
    | "Socket SSL (8729)"
    | "RouterOS v7 REST API"
    | "Simulation";
  routerInfo?: {
    identity?: string;
    version?: string;
    uptime?: string;
    cpuLoad?: string;
    ramUsage?: string;
    boardName?: string;
  };
  checks: DiagnosticCheckItem[];
  recommendations: string[];
  terminalScript: string;
}

/**
 * Encodes a string word into RouterOS API length-prefixed bytes
 */
function encodeWord(word: string): Buffer {
  const buf = Buffer.from(word, "utf8");
  const len = buf.length;
  let lenBuf: Buffer;

  if (len < 0x80) {
    lenBuf = Buffer.from([len]);
  } else if (len < 0x4000) {
    lenBuf = Buffer.from([(len >> 8) | 0x80, len & 0xff]);
  } else if (len < 0x200000) {
    lenBuf = Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
  } else if (len < 0x10000000) {
    lenBuf = Buffer.from([
      (len >> 24) | 0xe0,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  } else {
    lenBuf = Buffer.from([
      0xf0,
      (len >> 24) & 0xff,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  }

  return Buffer.concat([lenBuf, buf]);
}

/**
 * Encodes a sentence (array of words) ending with a zero byte (0x00)
 */
function encodeSentence(words: string[]): Buffer {
  const parts = words.map((w) => encodeWord(w));
  parts.push(Buffer.from([0x00]));
  return Buffer.concat(parts);
}

/**
 * Decodes length-prefixed sentence responses from RouterOS API socket buffer
 */
function decodeSentenceResponse(
  buffer: Buffer,
): { words: string[]; bytesRead: number }[] {
  const results: { words: string[]; bytesRead: number }[] = [];
  let offset = 0;
  let currentSentence: string[] = [];

  while (offset < buffer.length) {
    if (offset >= buffer.length) break;
    let b = buffer[offset++];
    let wordLen = 0;

    if (b === 0x00) {
      results.push({ words: currentSentence, bytesRead: offset });
      currentSentence = [];
      continue;
    }

    if ((b & 0x80) === 0) {
      wordLen = b;
    } else if ((b & 0xc0) === 0x80) {
      if (offset >= buffer.length) break;
      wordLen = ((b & 0x3f) << 8) | buffer[offset++];
    } else if ((b & 0xe0) === 0xc0) {
      if (offset + 1 >= buffer.length) break;
      wordLen = ((b & 0x1f) << 16) | (buffer[offset++] << 8) | buffer[offset++];
    } else if ((b & 0xf0) === 0xe0) {
      if (offset + 2 >= buffer.length) break;
      wordLen =
        ((b & 0x0f) << 24) |
        (buffer[offset++] << 16) |
        (buffer[offset++] << 8) |
        buffer[offset++];
    } else if (b === 0xf0) {
      if (offset + 3 >= buffer.length) break;
      wordLen =
        (buffer[offset++] << 24) |
        (buffer[offset++] << 16) |
        (buffer[offset++] << 8) |
        buffer[offset++];
    }

    if (offset + wordLen > buffer.length) {
      break;
    }

    const word = buffer.toString("utf8", offset, offset + wordLen);
    offset += wordLen;
    currentSentence.push(word);
  }

  return results;
}

/**
 * Checks if a host/IP is in private/LAN subnets (RFC 1918)
 */
export function isPrivateIp(host: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === "localhost" || clean === "127.0.0.1") return true;
  if (clean.startsWith("10.")) return true;
  if (clean.startsWith("192.168.")) return true;

  const parts = clean.split(".");
  if (parts.length === 4) {
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes input hostname or IP address
 */
export function sanitizeMikrotikHost(host: string): string {
  if (!host) return "";
  let clean = String(host).trim();
  clean = clean.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (clean.includes(":")) {
    clean = clean.split(":")[0];
  }
  return clean;
}

/**
 * Probes whether a plain TCP port is listening with timeout
 */
export function probePort(
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      cleanup();
      resolve(true);
    });

    socket.on("timeout", () => {
      cleanup();
      resolve(false);
    });

    socket.on("error", () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Probes whether a TLS/SSL port is listening with timeout
 */
export function probeTlsPort(
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let socket: tls.TLSSocket;

    const cleanup = () => {
      if (!settled) {
        settled = true;
        try {
          if (socket) socket.destroy();
        } catch {
          // ignore
        }
      }
    };

    try {
      socket = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: false,
          timeout: timeoutMs,
        },
        () => {
          cleanup();
          resolve(true);
        },
      );

      socket.on("timeout", () => {
        cleanup();
        resolve(false);
      });

      socket.on("error", () => {
        cleanup();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Query RouterOS v7 REST API (v7.1+) as alternative or fallback
 */
export async function queryMikrotikRest(
  params: MikrotikConnParams,
  endpoint: string,
  method = "GET",
  body?: any,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const isSsl = params.useSsl || params.port === 443 || params.port === 8729;
  const protocol = isSsl ? "https" : "http";
  let restPort = params.port;
  if (params.port === 8728) restPort = 80;
  else if (params.port === 8729) restPort = 443;

  const url = `${protocol}://${params.host}:${restPort}/rest/${endpoint.replace(/^\//, "")}`;
  const authHeader =
    "Basic " +
    Buffer.from(`${params.username}:${params.password || ""}`).toString(
      "base64",
    );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs || 6000);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        error: `RouterOS REST HTTP ${res.status}: ${text || res.statusText}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err: any) {
    clearTimeout(timer);
    return { success: false, error: err.message || "REST API network error" };
  }
}

/**
 * Primary Real Socket API connector for RouterOS 6.x and RouterOS 7.x
 * Supports both modern plain login (RouterOS 6.43+, 7.x) and legacy MD5 challenge (< 6.43)
 * Supports Port 8728 (plain) and Port 8729 (TLS / SSL)
 */
export async function queryMikrotikSocket(
  params: MikrotikConnParams,
  commandWords: string[],
): Promise<{ success: boolean; sentences: string[][]; error?: string }> {
  return new Promise((resolve) => {
    // Only return simulated data if explicitly requested in Demo / Simulator Mode
    if (params.isDemo || params.host === "demo.mikrotik.local") {
      const cmd = commandWords[0] || "";
      let sentences: string[][] = [["!done"]];

      if (cmd.includes("/system/resource/print")) {
        sentences = [
          [
            "!re",
            "=uptime=18d 04:12:35",
            "=version=7.14.2 (stable)",
            "=cpu-load=8",
            "=free-memory=924843008",
            "=total-memory=1073741824",
            "=board-name=RB3011UiAS",
          ],
          ["!done"],
        ];
      } else if (cmd.includes("/ip/hotspot/active/print")) {
        let userArg = "";
        for (const w of commandWords) {
          if (w.startsWith("?user=")) userArg = w.substring(6);
        }
        if (userArg) {
          sentences = [
            [
              "!re",
              "=.id=*123",
              `=user=${userArg}`,
              "=address=192.168.88.45",
              "=uptime=00:45:00",
              "=mac-address=12:34:56:78:90:AB",
            ],
            ["!done"],
          ];
        } else {
          sentences = [
            [
              "!re",
              "=.id=*1",
              "=user=user01",
              "=address=192.168.88.15",
              "=uptime=03:45:12",
              "=mac-address=AA:BB:CC:DD:EE:01",
            ],
            [
              "!re",
              "=.id=*2",
              "=user=user02",
              "=address=192.168.88.16",
              "=uptime=12:15:33",
              "=mac-address=AA:BB:CC:DD:EE:02",
            ],
            [
              "!re",
              "=.id=*4",
              "=user=user04",
              "=address=192.168.88.18",
              "=uptime=01:10:05",
              "=mac-address=AA:BB:CC:DD:EE:04",
            ],
            [
              "!re",
              "=.id=*5",
              "=user=hotspot_9281",
              "=address=192.168.88.45",
              "=uptime=00:45:00",
              "=mac-address=12:34:56:78:90:AB",
            ],
            ["!done"],
          ];
        }
      } else if (cmd.includes("/ppp/active/print")) {
        sentences = [
          [
            "!re",
            "=.id=*p1",
            "=name=user01",
            "=service=pppoe",
            "=caller-id=00:11:22:33:44:55",
            "=address=10.10.10.15",
            "=uptime=04:12:00",
          ],
          [
            "!re",
            "=.id=*p2",
            "=name=user03",
            "=service=pppoe",
            "=caller-id=00:11:22:33:44:56",
            "=address=10.10.10.16",
            "=uptime=14:20:10",
          ],
          ["!done"],
        ];
      } else if (
        cmd.includes("/ip/hotspot/user/print") ||
        cmd.includes("/ppp/secret/print")
      ) {
        sentences = [
          [
            "!re",
            "=.id=*u1",
            "=name=user01",
            "=password=123456",
            "=profile=default",
            "=disabled=no",
          ],
          ["!done"],
        ];
      } else {
        sentences = [["!done"]];
      }

      return resolve({ success: true, sentences });
    }

    const timeout = params.timeoutMs || 8000;
    const isSsl = params.useSsl || params.port === 8729;
    const isPrivate = isPrivateIp(params.host);

    let socket: net.Socket;
    let isResolved = false;
    let rxBuffer = Buffer.alloc(0);
    const receivedSentences: string[][] = [];
    let authenticated = false;
    let authStage: "INIT_LOGIN" | "CHALLENGE_SENT" | "AUTHED" = "INIT_LOGIN";

    let connectTimer: NodeJS.Timeout | null = null;

    const finish = (result: {
      success: boolean;
      sentences: string[][];
      error?: string;
    }) => {
      if (!isResolved) {
        isResolved = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        try {
          socket.destroy();
        } catch {
          // ignore
        }
        resolve(result);
      }
    };

    // Explicit connection timer to timeout initial TCP/TLS handshake if host is unreachable
    connectTimer = setTimeout(() => {
      let errMsg = `Connection timed out (${timeout / 1000}s) connecting to ${params.host}:${params.port}. Check router firewall or public IP accessibility.`;
      if (isPrivate) {
        errMsg = `[LAN Private IP Notice] Cannot reach ${params.host}:${params.port} from Cloud Server. ${params.host} is a local/private subnet IP. Cloud-hosted billing servers cannot reach private home/office LAN IPs across the internet. Please enable MikroTik Cloud DDNS (free) or configure Port Forwarding (8728) on your Public WAN IP.`;
      }
      finish({
        success: false,
        sentences: [],
        error: errMsg,
      });
    }, timeout);

    try {
      if (isSsl) {
        socket = tls.connect({
          host: params.host,
          port: params.port,
          rejectUnauthorized: false, // Allows self-signed certificates on MikroTik
          timeout: timeout,
        });
      } else {
        socket = new net.Socket();
      }
    } catch (err: any) {
      return finish({
        success: false,
        sentences: [],
        error: `Socket init error: ${err.message}`,
      });
    }

    socket.setTimeout(timeout);

    socket.on("timeout", () => {
      let errMsg = `Connection timed out (${timeout / 1000}s) connecting to ${params.host}:${params.port}. Check router firewall or public IP accessibility.`;
      if (isPrivate) {
        errMsg = `[LAN Private IP Notice] Cannot reach ${params.host}:${params.port} from Cloud Server. ${params.host} is a local/private subnet IP. Cloud-hosted billing servers cannot reach private home/office LAN IPs across the internet. Please enable MikroTik Cloud DDNS (free) or configure Port Forwarding (8728) on your Public WAN IP.`;
      }
      finish({
        success: false,
        sentences: [],
        error: errMsg,
      });
    });

    socket.on("error", (err: any) => {
      let msg = err.message || "Socket error";
      if (err.code === "ECONNREFUSED") {
        msg = `Connection refused at ${params.host}:${params.port}. Make sure API is enabled: "/ip service enable api" (port 8728) in MikroTik Terminal.`;
      } else if (err.code === "ENOTFOUND") {
        msg = `Hostname "${params.host}" could not be resolved by DNS. Check domain spelling.`;
      } else if (err.code === "ETIMEDOUT") {
        msg = `Network timeout to ${params.host}:${params.port}.`;
      }

      if (isPrivate && !msg.includes("LAN Private IP Notice")) {
        msg = `[LAN Private IP Notice] ${msg}. ${params.host} is a private network address. A cloud server cannot reach your local LAN without MikroTik Cloud DDNS or Port Forwarding on your WAN IP.`;
      }
      finish({ success: false, sentences: [], error: msg });
    });

    const onConnected = () => {
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
      // Modern RouterOS (6.43+ and 7.x): Send direct credentials
      const directLoginBuf = encodeSentence([
        "/login",
        `=name=${params.username}`,
        `=password=${params.password || ""}`,
      ]);
      socket.write(directLoginBuf);
    };

    if (isSsl) {
      socket.on("secureConnect", onConnected);
    } else {
      socket.connect(params.port, params.host, onConnected);
    }

    socket.on("data", (data) => {
      rxBuffer = Buffer.concat([rxBuffer, data]);
      const decoded = decodeSentenceResponse(rxBuffer);

      if (decoded.length > 0) {
        const lastBytes = decoded[decoded.length - 1].bytesRead;
        rxBuffer = rxBuffer.slice(lastBytes);

        for (const item of decoded) {
          const sentence = item.words;
          if (sentence.length === 0) continue;

          const replyType = sentence[0];

          if (authStage === "INIT_LOGIN") {
            let challenge = "";
            for (const w of sentence) {
              if (w.startsWith("=ret=")) {
                challenge = w.substring(5);
              }
            }

            if (replyType === "!done") {
              if (challenge) {
                // Legacy RouterOS (< 6.43) returned an MD5 challenge
                authStage = "CHALLENGE_SENT";
                const md5 = crypto.createHash("md5");
                const zero = Buffer.from([0x00]);
                const pass = Buffer.from(params.password || "", "utf8");
                const chal = Buffer.from(challenge, "hex");

                md5.update(zero);
                md5.update(pass);
                md5.update(chal);
                const respHex = md5.digest("hex");

                const challengeReply = encodeSentence([
                  "/login",
                  `=name=${params.username}`,
                  `=response=00${respHex}`,
                ]);
                socket.write(challengeReply);
              } else {
                // Modern RouterOS (6.43+ and 7.x) direct login SUCCESS
                authStage = "AUTHED";
                authenticated = true;
                const cmdBuf = encodeSentence(commandWords);
                socket.write(cmdBuf);
              }
            } else if (replyType === "!trap") {
              let trapMsg = "Invalid MikroTik username or password.";
              for (const w of sentence) {
                if (w.startsWith("=message=")) {
                  trapMsg = `MikroTik Authentication Error: ${w.substring(9)}`;
                }
              }
              finish({ success: false, sentences: [], error: trapMsg });
            }
          } else if (authStage === "CHALLENGE_SENT") {
            if (replyType === "!done") {
              authStage = "AUTHED";
              authenticated = true;
              const cmdBuf = encodeSentence(commandWords);
              socket.write(cmdBuf);
            } else if (replyType === "!trap") {
              finish({
                success: false,
                sentences: [],
                error: "RouterOS Authentication Failed (Challenge Rejected).",
              });
            }
          } else if (authenticated) {
            if (replyType === "!re") {
              receivedSentences.push(sentence);
            } else if (replyType === "!done") {
              receivedSentences.push(sentence);
              finish({
                success: true,
                sentences: receivedSentences,
              });
            } else if (replyType === "!trap") {
              let trapMsg = "RouterOS Command Execution Failed.";
              for (const w of sentence) {
                if (w.startsWith("=message=")) {
                  trapMsg = `RouterOS Command Error: ${w.substring(9)}`;
                }
              }
              finish({
                success: false,
                sentences: receivedSentences,
                error: trapMsg,
              });
            }
          }
        }
      }
    });
  });
}

/**
 * Executes a MikroTik API command with a robust retry mechanism
 */
export async function queryMikrotikSocketWithRetry(
  params: MikrotikConnParams,
  commandWords: string[],
  retries = 2,
  delayMs = 1000,
): Promise<{
  success: boolean;
  sentences: string[][];
  error?: string;
  attempts: number;
}> {
  let lastError = "";
  const actualRetries = params.isDemo ? 1 : retries;

  for (let attempt = 1; attempt <= actualRetries; attempt++) {
    const result = await queryMikrotikSocket(params, commandWords);
    if (result.success) {
      return { ...result, attempts: attempt };
    }
    lastError = result.error || "Unknown connection error";
    // Avoid unnecessary retries if the host is completely unreachable, private IP, or refused
    if (
      lastError.includes("LAN Private IP Notice") ||
      lastError.includes("ECONNREFUSED") ||
      lastError.includes("ENOTFOUND") ||
      lastError.includes("timed out")
    ) {
      break;
    }
    if (attempt < actualRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return {
    success: false,
    sentences: [],
    error: lastError,
    attempts: actualRetries,
  };
}

/**
 * Fallback Simulated RouterOS info for Staging / Demo mode
 */
export function getSimulatedRouterOS6Info(
  params: MikrotikConnParams,
  overrideDns?: { primary: string; secondary: string; redirectActive: boolean },
): RouterResourceInfo {
  const primary = overrideDns?.primary || "1.1.1.3";
  const secondary = overrideDns?.secondary || "1.0.0.3";
  const isRedirect = overrideDns?.redirectActive ?? true;

  return {
    identity: `MikroTik-RB3011UIAS (${params.host})`,
    version: "RouterOS v7.14.2 (stable)",
    isVersion6: false,
    uptime: "18 days, 04 hours, 12 mins",
    cpuLoad: "8%",
    ramUsage: "142 MB / 1024 MB",
    totalRam: "1024 MB",
    freeRam: "882 MB",
    hotspotStatus: "Active",
    hotspotServer: "hs-server1",
    hotspotInterface: "bridge-hotspot",
    addressPool: "hs-pool-1",
    subnet: "192.168.88.0/24",
    dhcpServer: "dhcp-hotspot",
    currentPrimaryDns: primary,
    currentSecondaryDns: secondary,
    allowRemoteRequests: true,
    redirectUdpPort53Active: isRedirect,
    redirectTcpPort53Active: isRedirect,
  };
}

/**
 * Full Diagnostic Engine: Probes DNS, Socket Port 8728, SSL Port 8729, REST API, Auth & Resources
 */
export async function diagnoseMikrotikConnection(
  params: MikrotikConnParams,
): Promise<DiagnosticResult> {
  const cleanHost = sanitizeMikrotikHost(params.host);
  const targetPort = Number(params.port) || 8728;
  const username = String(params.username || "").trim();
  const password = params.password ? String(params.password).trim() : "";
  const isPrivate = isPrivateIp(cleanHost);

  const checks: DiagnosticCheckItem[] = [];
  const recommendations: string[] = [];

  // Terminal setup script tailored to this user's config
  const terminalScript = `# ========================================================
# 1-CLICK MIKROTIK TERMINAL SCRIPT FOR CLOUD ISP BILLING
# Open WinBox -> New Terminal -> Paste all lines & Enter
# ========================================================

# 1. Enable API (Port 8728) and API-SSL (Port 8729)
/ip service enable api
/ip service set api port=8728
/ip service enable api-ssl
/ip service set api-ssl port=8729
/ip service enable www
/ip service enable www-ssl

# 2. Allow API in MikroTik Firewall Filter (Placed at top)
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728,8729,80,443 comment="Allow-ISP-Billing-API-Access" place-before=0

# 3. Enable FREE MikroTik Cloud DDNS (Generates a public domain name)
/ip cloud set ddns-enabled=yes update-time=yes
:delay 2s

# 4. Show your Global DDNS Domain Name to copy into the billing app:
/ip cloud print

# 5. (Recommended) Create dedicated API Admin User:
/user group add name=billing-api policy=api,read,write,test,password
/user add name=${username || "billingadmin"} password="${password || "Password123"}" group=billing-api comment="Billing API User"
`;

  // Step 1: DNS & IP Resolution
  let resolvedIp = cleanHost;
  let dnsOk = false;

  try {
    const lookupResult = await dns.promises.lookup(cleanHost);
    resolvedIp = lookupResult.address;
    dnsOk = true;
    checks.push({
      name: "DNS Resolution",
      status: "passed",
      detail: `Host "${cleanHost}" resolved successfully to IP ${resolvedIp}.`,
    });
  } catch (dnsErr: any) {
    // If it's already an IP address, DNS lookup might fail or not be necessary
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) {
      resolvedIp = cleanHost;
      dnsOk = true;
      checks.push({
        name: "IP Address Validation",
        status: "passed",
        detail: `Direct IPv4 address: ${cleanHost}.`,
      });
    } else {
      checks.push({
        name: "DNS Resolution",
        status: "failed",
        detail: `Could not resolve hostname "${cleanHost}": ${dnsErr.message}. Check domain spelling.`,
      });
      recommendations.push(
        'হোস্টনেম বা ডোমেইন ভুল হতে পারে। WinBox-এ "/ip cloud print" চালিয়ে আপনার সঠিক dns-name টি কপি করে দিন।',
      );
    }
  }

  // Step 2: Private Network IP check
  if (isPrivate) {
    checks.push({
      name: "Network Reachability (Private LAN IP)",
      status: "warning",
      detail: `${cleanHost} is a local/private subnet (192.168.x.x / 10.x.x.x / 172.16.x.x). Cloud servers cannot reach private LAN IPs directly without DDNS or Port Forwarding.`,
    });
    recommendations.push(
      `আপনার রাউটার আইপি (${cleanHost}) একটি লোকাল প্রাইভেট আইপি। ইন্টারনেটের ক্লাউড সার্ভার থেকে সরাসরি আপনার ঘরের/অফিসের লোকাল আইপিতে ঢোকা যায় না। সমাধান: MikroTik Terminal-এ "/ip cloud set ddns-enabled=yes" চালিয়ে প্রাপ্ত dns-name ব্যবহার করুন অথবা আপনার Public WAN IP দিন।`,
    );
  } else {
    checks.push({
      name: "Public Reachability",
      status: "passed",
      detail: `${cleanHost} is a public/routable address accessible across the internet.`,
    });
  }

  // Step 3: Concurrent Port Probes (8728, 8729, REST API)
  const [port8728Open, port8729Open, restApiOpen] = await Promise.all([
    probePort(cleanHost, 8728, 3000),
    probeTlsPort(cleanHost, 8729, 3000),
    probePort(
      cleanHost,
      targetPort === 443 || targetPort === 80 ? targetPort : 80,
      3000,
    ),
  ]);

  checks.push({
    name: "Port 8728 (API Socket)",
    status: port8728Open ? "passed" : "failed",
    detail: port8728Open
      ? "Port 8728 is OPEN and responding to TCP handshakes."
      : 'Port 8728 is CLOSED or filtered by firewall. Run "/ip service enable api" in WinBox.',
  });

  checks.push({
    name: "Port 8729 (API-SSL)",
    status: port8729Open ? "passed" : "warning",
    detail: port8729Open
      ? "Port 8729 (SSL) is OPEN."
      : "Port 8729 is closed (optional, used if SSL is required).",
  });

  if (targetPort !== 8728 && targetPort !== 8729) {
    const customPortOpen = await probePort(cleanHost, targetPort, 3000);
    checks.push({
      name: `Custom Port ${targetPort}`,
      status: customPortOpen ? "passed" : "failed",
      detail: customPortOpen
        ? `Configured port ${targetPort} is OPEN.`
        : `Configured port ${targetPort} is CLOSED.`,
    });
  }

  // Step 4: Authentication & Resource query
  let authSuccess = false;
  let connected = false;
  let protocolUsed: DiagnosticResult["protocolUsed"] = undefined;
  let routerInfo: DiagnosticResult["routerInfo"] = undefined;

  // Try Socket 8728 first
  if (port8728Open || !isPrivate) {
    try {
      const socketRes = await queryMikrotikSocket(
        {
          host: cleanHost,
          port: targetPort || 8728,
          username,
          password,
          timeoutMs: 5000,
          useSsl: targetPort === 8729,
        },
        ["/system/resource/print"],
      );

      if (socketRes.success) {
        authSuccess = true;
        connected = true;
        protocolUsed =
          targetPort === 8729 ? "Socket SSL (8729)" : "Socket API (8728)";

        let version = "RouterOS";
        let uptime = "Online";
        let cpu = "5%";
        let freeMem = "512 MB";
        let totalMem = "1024 MB";
        let board = "MikroTik";

        for (const w of socketRes.sentences.flat()) {
          if (w.startsWith("=version=")) version = w.substring(9);
          if (w.startsWith("=uptime=")) uptime = w.substring(8);
          if (w.startsWith("=cpu-load=")) cpu = `${w.substring(10)}%`;
          if (w.startsWith("=board-name=")) board = w.substring(12);
          if (w.startsWith("=free-memory="))
            freeMem = `${Math.round(parseInt(w.substring(13), 10) / 1048576)} MB`;
          if (w.startsWith("=total-memory="))
            totalMem = `${Math.round(parseInt(w.substring(14), 10) / 1048576)} MB`;
        }

        routerInfo = {
          identity: `${board} (${cleanHost})`,
          version,
          uptime,
          cpuLoad: cpu,
          ramUsage: `${freeMem} free / ${totalMem}`,
          boardName: board,
        };

        checks.push({
          name: "RouterOS API Authentication",
          status: "passed",
          detail: `Authenticated successfully as user "${username}". Hardware: ${board}, ${version}, Uptime: ${uptime}.`,
        });
      } else {
        checks.push({
          name: "RouterOS API Authentication",
          status: "failed",
          detail: socketRes.error || "Authentication rejected by MikroTik.",
        });
      }
    } catch (err: any) {
      checks.push({
        name: "RouterOS API Authentication",
        status: "failed",
        detail: `Socket error: ${err.message}`,
      });
    }
  }

  // Fallback: Try RouterOS v7 REST API if socket auth didn't succeed
  if (!connected && (restApiOpen || !port8728Open)) {
    try {
      const restRes = await queryMikrotikRest(
        {
          host: cleanHost,
          port: targetPort,
          username,
          password,
          timeoutMs: 4000,
        },
        "system/resource",
      );

      if (restRes.success && restRes.data) {
        authSuccess = true;
        connected = true;
        protocolUsed = "RouterOS v7 REST API";
        const d = restRes.data;
        routerInfo = {
          identity: `${d["board-name"] || "MikroTik"} (${cleanHost})`,
          version: d.version || "RouterOS v7",
          uptime: d.uptime || "Online",
          cpuLoad: `${d["cpu-load"] || 5}%`,
          ramUsage: `${Math.round((d["free-memory"] || 0) / 1048576)} MB free`,
          boardName: d["board-name"] || "MikroTik",
        };
        checks.push({
          name: "RouterOS v7 REST API",
          status: "passed",
          detail: `Successfully connected via RouterOS v7 REST API! Hardware: ${routerInfo.boardName}, Version: ${routerInfo.version}.`,
        });
      }
    } catch {
      // ignore
    }
  }

  if (!connected) {
    if (!port8728Open && !port8729Open && !restApiOpen) {
      recommendations.push(
        "রাউটারে API পোর্ট ওপেন নেই অথবা ফায়ারওয়ালে ব্লক করা আছে। WinBox ওপেন করে New Terminal-এ নিচে দেওয়া স্ক্রিপ্টটি পেস্ট করুন।",
      );
    } else if (!authSuccess) {
      recommendations.push(
        `API ইউজারনেম "${username}" অথবা পাসওয়ার্ড সঠিক নয়। WinBox -> System -> Users থেকে পাসওয়ার্ড চেক করুন অথবা নিচে দেওয়া স্ক্রিপ্ট দিয়ে নতুন ইউজার তৈরি করুন।`,
      );
    }
  }

  return {
    host: params.host,
    cleanHost,
    resolvedIp,
    isPrivate,
    dnsOk,
    port8728Open,
    port8729Open,
    restApiOpen,
    authSuccess,
    connected,
    protocolUsed,
    routerInfo,
    checks,
    recommendations,
    terminalScript,
  };
}
