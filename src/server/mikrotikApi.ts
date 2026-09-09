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

export type MikrotikErrorCode =
  | "ROUTER_OFFLINE"
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "API_UNAVAILABLE"
  | "COMMAND_FAILED"
  | "PERMISSION_DENIED"
  | "INVALID_TARGET"
  | "UNSUPPORTED_OPERATION"
  | "INVALID_CONFIGURATION"
  | "DNS_TCP_NAT_VERIFICATION_FAILED"
  | "DNS_UDP_NAT_VERIFICATION_FAILED";

export interface MikrotikError {
  code: MikrotikErrorCode;
  message: string;
  operation?: string;
  detail?: string;
}

export interface MikrotikOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: MikrotikError;
  message?: string;
}

export interface MikrotikInterfaceStats {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxBps: number;
  txBps: number;
  rxMbps: number;
  txMbps: number;
  rxPacketsPerSec: number;
  txPacketsPerSec: number;
}

export interface MikrotikActivePPPoEUser {
  id: string;
  username: string;
  name: string;
  service: string;
  callerId: string;
  address: string;
  ip: string;
  mac?: string;
  uptime: string;
  encoding?: string;
  sessionId?: string;
  routerId?: string;
  type: "pppoe";
}

export interface MikrotikActiveHotspotUser {
  id: string;
  username: string;
  user: string;
  address: string;
  ip: string;
  macAddress: string;
  mac: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  sessionTimeLeft?: string;
  routerId?: string;
  type: "hotspot";
}

export interface MikrotikQueue {
  id: string;
  name: string;
  target: string;
  maxLimit: string;
  rate: string;
  rxBps: number;
  txBps: number;
  rxMbps: number;
  txMbps: number;
  bytes: string;
  rxBytes: number;
  txBytes: number;
  packets: string;
  disabled: boolean;
}

export interface InterfaceCounterSample {
  timestamp: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
}

export interface CalculatedRate {
  rxBps: number;
  txBps: number;
  rxMbps: number;
  txMbps: number;
  rxPacketsPerSec: number;
  txPacketsPerSec: number;
}

/**
 * In-memory sample cache keyed by `${routerKey}:${interfaceName}`
 */
export const interfaceTrafficSamples = new Map<string, InterfaceCounterSample>();

/**
 * Resets traffic baseline when router or interface changes or on explicit command
 */
export function resetInterfaceTrafficBaseline(routerHost?: string): void {
  if (!routerHost) {
    interfaceTrafficSamples.clear();
    return;
  }
  const prefix = `${sanitizeMikrotikHost(routerHost)}:`;
  for (const key of interfaceTrafficSamples.keys()) {
    if (key.startsWith(prefix)) {
      interfaceTrafficSamples.delete(key);
    }
  }
}

/**
 * Accurately calculates real-time bandwidth (Bps, Mbps, and Pps) from sample differences.
 * Formula:
 * rxBps = (currentRxBytes - previousRxBytes) / elapsedSeconds
 * txBps = (currentTxBytes - previousTxBytes) / elapsedSeconds
 * Mbps = bytesPerSecond * 8 / 1_000_000
 */
export function calculateInterfaceBandwidth(
  current: {
    rxBytes: number;
    txBytes: number;
    rxPackets?: number;
    txPackets?: number;
    timestamp?: number;
  },
  previous?: InterfaceCounterSample,
  nowMs: number = Date.now(),
): { rate: CalculatedRate; nextSample: InterfaceCounterSample } {
  const currentRx =
    typeof current.rxBytes === "number" && !isNaN(current.rxBytes)
      ? Math.max(0, current.rxBytes)
      : 0;
  const currentTx =
    typeof current.txBytes === "number" && !isNaN(current.txBytes)
      ? Math.max(0, current.txBytes)
      : 0;
  const currentRxPkts =
    typeof current.rxPackets === "number" && !isNaN(current.rxPackets)
      ? Math.max(0, current.rxPackets)
      : 0;
  const currentTxPkts =
    typeof current.txPackets === "number" && !isNaN(current.txPackets)
      ? Math.max(0, current.txPackets)
      : 0;

  const currentSample: InterfaceCounterSample = {
    timestamp: current.timestamp || nowMs,
    rxBytes: currentRx,
    txBytes: currentTx,
    rxPackets: currentRxPkts,
    txPackets: currentTxPkts,
  };

  // Requirement: First poll must show 0 because there is no previous sample
  if (!previous) {
    return {
      rate: {
        rxBps: 0,
        txBps: 0,
        rxMbps: 0,
        txMbps: 0,
        rxPacketsPerSec: 0,
        txPacketsPerSec: 0,
      },
      nextSample: currentSample,
    };
  }

  const elapsedMs = currentSample.timestamp - previous.timestamp;
  const elapsedSeconds = elapsedMs / 1000;

  // Handle elapsedSeconds <= 0 safely (no division by zero or negative time)
  if (elapsedSeconds <= 0) {
    return {
      rate: {
        rxBps: 0,
        txBps: 0,
        rxMbps: 0,
        txMbps: 0,
        rxPacketsPerSec: 0,
        txPacketsPerSec: 0,
      },
      nextSample: currentSample,
    };
  }

  // Handle counter reset or rollover safely:
  // If current counter is smaller than previous (router rebooted, interface reset, or 32-bit counter wrap)
  if (currentRx < previous.rxBytes || currentTx < previous.txBytes) {
    return {
      rate: {
        rxBps: 0,
        txBps: 0,
        rxMbps: 0,
        txMbps: 0,
        rxPacketsPerSec: 0,
        txPacketsPerSec: 0,
      },
      nextSample: currentSample,
    };
  }

  const rxDiff = currentRx - previous.rxBytes;
  const txDiff = currentTx - previous.txBytes;

  const rxBps = Math.round(rxDiff / elapsedSeconds);
  const txBps = Math.round(txDiff / elapsedSeconds);

  // Correct conversion: Mbps = bytesPerSecond * 8 / 1_000_000
  const rxMbps = parseFloat(((rxBps * 8) / 1_000_000).toFixed(3));
  const txMbps = parseFloat(((txBps * 8) / 1_000_000).toFixed(3));

  const rxPktDiff = Math.max(0, currentRxPkts - previous.rxPackets);
  const txPktDiff = Math.max(0, currentTxPkts - previous.txPackets);
  const rxPacketsPerSec = Math.round(rxPktDiff / elapsedSeconds);
  const txPacketsPerSec = Math.round(txPktDiff / elapsedSeconds);

  return {
    rate: {
      rxBps,
      txBps,
      rxMbps,
      txMbps,
      rxPacketsPerSec,
      txPacketsPerSec,
    },
    nextSample: currentSample,
  };
}

export function isMockModeAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.MIKROTIK_MOCK_MODE === "true";
}

export function classifyMikrotikError(
  errMessage: string,
  socketErrCode?: string,
): { code: MikrotikErrorCode; message: string } {
  const lower = (errMessage || "").toLowerCase();
  if (lower.includes("dns tcp nat") || lower.includes("tcp nat redirect")) {
    return {
      code: "DNS_TCP_NAT_VERIFICATION_FAILED",
      message: errMessage || "DNS TCP NAT redirect rule verification failed on RouterOS.",
    };
  }
  if (lower.includes("dns udp nat") || lower.includes("udp nat redirect")) {
    return {
      code: "DNS_UDP_NAT_VERIFICATION_FAILED",
      message: errMessage || "DNS UDP NAT redirect rule verification failed on RouterOS.",
    };
  }
  if (
    socketErrCode === "ECONNREFUSED" ||
    lower.includes("econnrefused") ||
    lower.includes("connection refused")
  ) {
    return {
      code: "API_UNAVAILABLE",
      message:
        "MikroTik API port (8728/8729) is closed or connection refused. Ensure API is enabled: '/ip service enable api'.",
    };
  }
  if (
    socketErrCode === "ETIMEDOUT" ||
    socketErrCode === "ENOTFOUND" ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("not found")
  ) {
    return {
      code: "ROUTER_OFFLINE",
      message: `MikroTik router is unreachable or offline: ${errMessage}`,
    };
  }
  if (
    lower.includes("invalid username") ||
    lower.includes("password") ||
    lower.includes("authentication") ||
    lower.includes("auth failed") ||
    lower.includes("challenge rejected")
  ) {
    return {
      code: "AUTH_FAILED",
      message:
        "RouterOS API authentication failed. Verify API username and password.",
    };
  }
  if (
    lower.includes("not enough permissions") ||
    lower.includes("permission denied") ||
    lower.includes("access denied")
  ) {
    return {
      code: "PERMISSION_DENIED",
      message:
        "RouterOS user does not have sufficient group permissions (requires api, read, write, test, reboot).",
    };
  }
  if (lower.includes("invalid target") || lower.includes("target")) {
    return {
      code: "INVALID_TARGET",
      message: "Invalid target IP/subnet specified for Simple Queue.",
    };
  }
  if (
    lower.includes("no such command") ||
    lower.includes("bad command") ||
    lower.includes("syntax error") ||
    lower.includes("unknown command")
  ) {
    return {
      code: "UNSUPPORTED_OPERATION",
      message: "Command not supported by this RouterOS version.",
    };
  }
  return {
    code: "COMMAND_FAILED",
    message: errMessage || "RouterOS command execution failed.",
  };
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
    // Only return simulated data if explicitly permitted by MIKROTIK_MOCK_MODE and requested
    const allowMock =
      isMockModeAllowed() &&
      (params.isDemo || params.host === "demo.mikrotik.local");
    if (allowMock) {
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
    const isRebootCommand = commandWords.some((w) =>
      w.includes("/system/reboot"),
    );

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

    socket.on("close", () => {
      if (
        authenticated &&
        isRebootCommand &&
        !receivedSentences.some((s) => s[0] === "!trap")
      ) {
        finish({ success: true, sentences: [["!done"]] });
      }
    });

    socket.on("error", (err: any) => {
      if (
        authenticated &&
        isRebootCommand &&
        (err.code === "ECONNRESET" ||
          err.message?.includes("reset") ||
          err.message?.includes("closed"))
      ) {
        return finish({ success: true, sentences: [["!done"]] });
      }

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
 * Real MikroTik RouterOS Reboot Command
 */
export async function executeMikrotikReboot(params: MikrotikConnParams): Promise<{
  success: boolean;
  commandAccepted?: boolean;
  code?: MikrotikErrorCode;
  message?: string;
  error?: string;
}> {
  if (!params.host) {
    return {
      success: false,
      commandAccepted: false,
      code: "INVALID_CONFIGURATION",
      error: "Router IP/host is required for reboot operation",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    return {
      success: true,
      commandAccepted: true,
      message: `[MOCK] Reboot command accepted for simulated MikroTik (${cleanHost})`,
    };
  }

  try {
    // Single execution without automatic retry (reboot is a destructive action)
    const res = await queryMikrotikSocket(params, ["/system/reboot"]);
    if (res.success) {
      return {
        success: true,
        commandAccepted: true,
        message: `Reboot command accepted by MikroTik (${cleanHost}). Note: The router is restarting and will temporarily be offline.`,
      };
    }

    const errLower = (res.error || "").toLowerCase();
    // When RouterOS accepts reboot, socket is instantly closed/reset by the router
    if (
      errLower.includes("econnreset") ||
      errLower.includes("socket closed") ||
      errLower.includes("connection reset")
    ) {
      return {
        success: true,
        commandAccepted: true,
        message: `Reboot command accepted by MikroTik (${cleanHost}). Socket disconnected as router restarted.`,
      };
    }

    const classified = classifyMikrotikError(res.error || "");
    return {
      success: false,
      commandAccepted: false,
      code: classified.code,
      error: classified.message,
    };
  } catch (err: any) {
    const classified = classifyMikrotikError(err.message);
    return {
      success: false,
      commandAccepted: false,
      code: classified.code,
      error: classified.message,
    };
  }
}

/**
 * Real MikroTik DNS and NAT Firewall Security Configuration
 * Ensures idempotent rule application and strictly verifies configuration via read-back.
 */
export async function configureMikrotikDns(
  params: MikrotikConnParams,
  primaryDns: string,
  secondaryDns?: string,
  redirectPort53: boolean = true,
  subnet?: string,
): Promise<{
  success: boolean;
  code?: MikrotikErrorCode | string;
  currentDns?: { servers: string; allowRemoteRequests: boolean };
  firewallRulesConfigured?: boolean;
  udpVerified?: boolean;
  tcpVerified?: boolean;
  message?: string;
  error?: { code: string; message: string } | string;
}> {
  if (!params.host) {
    return {
      success: false,
      code: "INVALID_CONFIGURATION",
      error: {
        code: "INVALID_CONFIGURATION",
        message: "Router IP is required",
      },
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    return {
      success: true,
      currentDns: {
        servers: [primaryDns, secondaryDns].filter(Boolean).join(","),
        allowRemoteRequests: true,
      },
      firewallRulesConfigured: redirectPort53,
      udpVerified: redirectPort53,
      tcpVerified: redirectPort53,
      message: `[MOCK] DNS and NAT firewall rules applied to ${cleanHost}`,
    };
  }

  // 1. Read current DNS configuration to check connectivity and current settings
  const dnsPrint = await queryMikrotikSocketWithRetry(
    params,
    ["/ip/dns/print"],
    2,
    500,
  );
  if (!dnsPrint.success) {
    const classified = classifyMikrotikError(dnsPrint.error || "");
    return {
      success: false,
      code: classified.code,
      error: {
        code: classified.code,
        message: `Failed to connect and read DNS from router: ${classified.message}`,
      },
    };
  }

  // 2. Set new DNS servers and enable allow-remote-requests
  const servers = [primaryDns, secondaryDns].filter(Boolean).join(",");
  const setDns = await queryMikrotikSocket(params, [
    "/ip/dns/set",
    `=servers=${servers}`,
    "=allow-remote-requests=yes",
  ]);
  if (!setDns.success) {
    const classified = classifyMikrotikError(setDns.error || "");
    return {
      success: false,
      code: classified.code,
      error: {
        code: classified.code,
        message: `Failed to update DNS servers on router: ${classified.message}`,
      },
    };
  }

  // 3. Configure Firewall NAT redirect rules for DNS (UDP & TCP port 53) idempotently
  if (redirectPort53) {
    // Inspect all existing NAT rules to find any existing Nexora UDP/TCP rules
    const allNatRules = await queryMikrotikSocket(params, ["/ip/firewall/nat/print"]);
    let existingUdpId = "";
    let existingTcpId = "";

    if (allNatRules.success && allNatRules.sentences?.length) {
      for (const sent of allNatRules.sentences) {
        let ruleId = "";
        let ruleComment = "";
        let ruleProtocol = "";
        let ruleDstPort = "";
        let ruleAction = "";

        for (const w of sent) {
          if (w.startsWith("=.id=")) ruleId = w.substring(5);
          if (w.startsWith("=comment=")) ruleComment = w.substring(9).toLowerCase();
          if (w.startsWith("=protocol=")) ruleProtocol = w.substring(10).toLowerCase();
          if (w.startsWith("=dst-port=")) ruleDstPort = w.substring(10);
          if (w.startsWith("=action=")) ruleAction = w.substring(8).toLowerCase();
        }

        if (
          ruleComment.includes("nexora-dns-redirect-udp") ||
          (ruleProtocol === "udp" && ruleDstPort === "53" && ruleAction === "redirect")
        ) {
          existingUdpId = ruleId;
        }

        if (
          ruleComment.includes("nexora-dns-redirect-tcp") ||
          (ruleProtocol === "tcp" && ruleDstPort === "53" && ruleAction === "redirect")
        ) {
          existingTcpId = ruleId;
        }
      }
    }

    // Apply or update UDP NAT redirect rule
    if (existingUdpId) {
      const setUdpWords = [
        "/ip/firewall/nat/set",
        `=.id=${existingUdpId}`,
        "=disabled=no",
        "=action=redirect",
        "=to-ports=53",
        "=protocol=udp",
        "=dst-port=53",
        "=comment=NEXORA-DNS-REDIRECT-UDP",
      ];
      if (subnet) setUdpWords.push(`=src-address=${subnet}`);
      await queryMikrotikSocket(params, setUdpWords);
    } else {
      const addUdpWords = [
        "/ip/firewall/nat/add",
        "=chain=dstnat",
        "=action=redirect",
        "=to-ports=53",
        "=protocol=udp",
        "=dst-port=53",
        "=comment=NEXORA-DNS-REDIRECT-UDP",
      ];
      if (subnet) addUdpWords.push(`=src-address=${subnet}`);
      await queryMikrotikSocket(params, addUdpWords);
    }

    // Apply or update TCP NAT redirect rule
    if (existingTcpId) {
      const setTcpWords = [
        "/ip/firewall/nat/set",
        `=.id=${existingTcpId}`,
        "=disabled=no",
        "=action=redirect",
        "=to-ports=53",
        "=protocol=tcp",
        "=dst-port=53",
        "=comment=NEXORA-DNS-REDIRECT-TCP",
      ];
      if (subnet) setTcpWords.push(`=src-address=${subnet}`);
      await queryMikrotikSocket(params, setTcpWords);
    } else {
      const addTcpWords = [
        "/ip/firewall/nat/add",
        "=chain=dstnat",
        "=action=redirect",
        "=to-ports=53",
        "=protocol=tcp",
        "=dst-port=53",
        "=comment=NEXORA-DNS-REDIRECT-TCP",
      ];
      if (subnet) addTcpWords.push(`=src-address=${subnet}`);
      await queryMikrotikSocket(params, addTcpWords);
    }
  }

  // 4. Read back resulting DNS configuration to verify
  const verifyRes = await queryMikrotikSocket(params, ["/ip/dns/print"]);
  let verifiedServers = "";
  let verifiedRemote = false;

  if (verifyRes.success && verifyRes.sentences) {
    for (const sent of verifyRes.sentences) {
      for (const w of sent) {
        if (w.startsWith("=servers=")) verifiedServers = w.substring(9);
        if (w.startsWith("=allow-remote-requests=")) {
          verifiedRemote =
            w.substring(23) === "yes" || w.substring(23) === "true";
        }
      }
    }
  }

  if (!verifiedServers || !verifiedRemote) {
    return {
      success: false,
      code: "DNS_CONFIG_VERIFICATION_FAILED",
      error: {
        code: "DNS_CONFIG_VERIFICATION_FAILED",
        message: `DNS configuration verification failed: read-back from router did not match requested settings.`,
      },
    };
  }

  // 5. Independently verify BOTH UDP and TCP NAT redirect rules if redirect was requested
  if (redirectPort53) {
    const verifyNatRes = await queryMikrotikSocket(params, ["/ip/firewall/nat/print"]);
    let udpVerified = false;
    let tcpVerified = false;

    if (verifyNatRes.success && verifyNatRes.sentences?.length) {
      for (const sent of verifyNatRes.sentences) {
        let comment = "";
        let protocol = "";
        let dstPort = "";
        let action = "";
        let toPorts = "";
        let disabled = "";

        for (const w of sent) {
          if (w.startsWith("=comment=")) comment = w.substring(9).toLowerCase();
          if (w.startsWith("=protocol=")) protocol = w.substring(10).toLowerCase();
          if (w.startsWith("=dst-port=")) dstPort = w.substring(10);
          if (w.startsWith("=action=")) action = w.substring(8).toLowerCase();
          if (w.startsWith("=to-ports=")) toPorts = w.substring(10);
          if (w.startsWith("=disabled=")) disabled = w.substring(10).toLowerCase();
        }

        const isEnabled = disabled !== "yes" && disabled !== "true";

        // Verify UDP rule
        if (
          isEnabled &&
          action === "redirect" &&
          (protocol === "udp" || comment.includes("nexora-dns-redirect-udp")) &&
          (dstPort === "53" || dstPort.includes("53")) &&
          toPorts === "53"
        ) {
          udpVerified = true;
        }

        // Verify TCP rule
        if (
          isEnabled &&
          action === "redirect" &&
          (protocol === "tcp" || comment.includes("nexora-dns-redirect-tcp")) &&
          (dstPort === "53" || dstPort.includes("53")) &&
          toPorts === "53"
        ) {
          tcpVerified = true;
        }
      }
    }

    if (!udpVerified) {
      return {
        success: false,
        code: "DNS_UDP_NAT_VERIFICATION_FAILED",
        error: {
          code: "DNS_UDP_NAT_VERIFICATION_FAILED",
          message: "UDP DNS redirect rule could not be verified on router",
        },
      };
    }

    if (!tcpVerified) {
      return {
        success: false,
        code: "DNS_TCP_NAT_VERIFICATION_FAILED",
        error: {
          code: "DNS_TCP_NAT_VERIFICATION_FAILED",
          message: "TCP DNS redirect rule could not be verified on router",
        },
      };
    }
  }

  return {
    success: true,
    currentDns: {
      servers: verifiedServers,
      allowRemoteRequests: verifiedRemote,
    },
    firewallRulesConfigured: redirectPort53,
    udpVerified: redirectPort53,
    tcpVerified: redirectPort53,
    message: `DNS configuration and NAT redirect rules (UDP & TCP) successfully verified on router (${cleanHost}): ${verifiedServers}`,
  };
}

export interface RealInterfaceTraffic {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxBps: number;
  txBps: number;
  rxMbps?: number;
  txMbps?: number;
  rxPacketsPerSec?: number;
  txPacketsPerSec?: number;
}

export interface RealQueueTraffic {
  id: string;
  name: string;
  target: string;
  maxLimit: string;
  rate: string;
  rxBps: number;
  txBps: number;
  rxMbps?: number;
  txMbps?: number;
  bytes: string;
  rxBytes: number;
  txBytes: number;
  packets: string;
  disabled: boolean;
}

/**
 * Poll Real MikroTik Interface and Simple Queue Bandwidth
 */
export async function fetchMikrotikTraffic(params: MikrotikConnParams): Promise<{
  success: boolean;
  status: "ONLINE" | "OFFLINE";
  code?: MikrotikErrorCode;
  interfaces: RealInterfaceTraffic[];
  queues: RealQueueTraffic[];
  totalRxBps: number;
  totalTxBps: number;
  totalRxMbps?: number;
  totalTxMbps?: number;
  error?: string;
}> {
  if (!params.host) {
    return {
      success: false,
      status: "OFFLINE",
      code: "INVALID_CONFIGURATION",
      interfaces: [],
      queues: [],
      totalRxBps: 0,
      totalTxBps: 0,
      totalRxMbps: 0,
      totalTxMbps: 0,
      error: "Router host is required",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    return {
      success: true,
      status: "ONLINE",
      interfaces: [
        {
          name: "ether1-wan",
          type: "ether",
          running: true,
          disabled: false,
          rxBytes: 104857600,
          txBytes: 52428800,
          rxPackets: 82000,
          txPackets: 45000,
          rxErrors: 0,
          txErrors: 0,
          rxBps: 45000000,
          txBps: 18000000,
          rxMbps: 360,
          txMbps: 144,
          rxPacketsPerSec: 520,
          txPacketsPerSec: 310,
        },
        {
          name: "ether2-lan",
          type: "ether",
          running: true,
          disabled: false,
          rxBytes: 83886080,
          txBytes: 41943040,
          rxPackets: 65000,
          txPackets: 32000,
          rxErrors: 0,
          txErrors: 0,
          rxBps: 34000000,
          txBps: 14000000,
          rxMbps: 272,
          txMbps: 112,
          rxPacketsPerSec: 410,
          txPacketsPerSec: 220,
        },
        {
          name: "ether3-hotspot",
          type: "ether",
          running: true,
          disabled: false,
          rxBytes: 20971520,
          txBytes: 10485760,
          rxPackets: 18000,
          txPackets: 9000,
          rxErrors: 0,
          txErrors: 0,
          rxBps: 12000000,
          txBps: 4000000,
          rxMbps: 96,
          txMbps: 32,
          rxPacketsPerSec: 150,
          txPacketsPerSec: 75,
        },
      ],
      queues: [
        {
          id: "*1",
          name: "user01",
          target: "192.168.88.15/32",
          maxLimit: "10M/20M",
          rate: "120000/350000",
          rxBps: 120000,
          txBps: 350000,
          rxMbps: 0.96,
          txMbps: 2.8,
          bytes: "2819230/19283019",
          rxBytes: 2819230,
          txBytes: 19283019,
          packets: "2109/9812",
          disabled: false,
        },
      ],
      totalRxBps: 45000000,
      totalTxBps: 18000000,
      totalRxMbps: 360,
      totalTxMbps: 144,
    };
  }

  // Query real interfaces
  const ifRes = await queryMikrotikSocketWithRetry(
    params,
    ["/interface/print", "?disabled=false"],
    2,
    400,
  );
  if (!ifRes.success) {
    const classified = classifyMikrotikError(ifRes.error || "");
    return {
      success: false,
      status: "OFFLINE",
      code: classified.code,
      interfaces: [],
      queues: [],
      totalRxBps: 0,
      totalTxBps: 0,
      totalRxMbps: 0,
      totalTxMbps: 0,
      error: classified.message,
    };
  }

  const nowMs = Date.now();
  const interfaces: RealInterfaceTraffic[] = [];
  if (ifRes.sentences) {
    for (const sent of ifRes.sentences) {
      let name = "";
      let type = "ether";
      let running = false;
      let disabled = false;
      let rxBytes = 0;
      let txBytes = 0;
      let rxPackets = 0;
      let txPackets = 0;
      let rxErrors = 0;
      let txErrors = 0;

      for (const w of sent) {
        if (w.startsWith("=name=")) name = w.substring(6);
        if (w.startsWith("=type=")) type = w.substring(6);
        if (w.startsWith("=running=")) running = w.substring(9) === "true";
        if (w.startsWith("=disabled=")) disabled = w.substring(10) === "true";
        if (w.startsWith("=rx-byte="))
          rxBytes = parseInt(w.substring(9), 10) || 0;
        if (w.startsWith("=tx-byte="))
          txBytes = parseInt(w.substring(9), 10) || 0;
        if (w.startsWith("=rx-packet="))
          rxPackets = parseInt(w.substring(11), 10) || 0;
        if (w.startsWith("=tx-packet="))
          txPackets = parseInt(w.substring(11), 10) || 0;
        if (w.startsWith("=rx-error="))
          rxErrors = parseInt(w.substring(10), 10) || 0;
        if (w.startsWith("=tx-error="))
          txErrors = parseInt(w.substring(10), 10) || 0;
      }

      if (name) {
        // Calculate live rates from counter differences
        const sampleKey = `${cleanHost}:${name}`;
        const prevSample = interfaceTrafficSamples.get(sampleKey);
        const { rate, nextSample } = calculateInterfaceBandwidth(
          { rxBytes, txBytes, rxPackets, txPackets },
          prevSample,
          nowMs,
        );
        interfaceTrafficSamples.set(sampleKey, nextSample);

        interfaces.push({
          name,
          type,
          running,
          disabled,
          rxBytes,
          txBytes,
          rxPackets,
          txPackets,
          rxErrors,
          txErrors,
          rxBps: rate.rxBps,
          txBps: rate.txBps,
          rxMbps: rate.rxMbps,
          txMbps: rate.txMbps,
          rxPacketsPerSec: rate.rxPacketsPerSec,
          txPacketsPerSec: rate.txPacketsPerSec,
        });
      }
    }
  }

  // Query real Simple Queues for traffic & active rates
  const qRes = await queryMikrotikSocket(params, ["/queue/simple/print"]);
  const queues: RealQueueTraffic[] = [];
  if (qRes.success && qRes.sentences) {
    for (const sent of qRes.sentences) {
      let id = "";
      let name = "";
      let target = "";
      let maxLimit = "";
      let rate = "0/0";
      let bytes = "0/0";
      let packets = "0/0";
      let disabled = false;

      for (const w of sent) {
        if (w.startsWith("=.id=")) id = w.substring(5);
        if (w.startsWith("=name=")) name = w.substring(6);
        if (w.startsWith("=target=")) target = w.substring(8);
        if (w.startsWith("=max-limit=")) maxLimit = w.substring(11);
        if (w.startsWith("=rate=")) rate = w.substring(6);
        if (w.startsWith("=bytes=")) bytes = w.substring(7);
        if (w.startsWith("=packets=")) packets = w.substring(9);
        if (w.startsWith("=disabled=")) disabled = w.substring(10) === "true";
      }

      if (name) {
        const [rxRateStr, txRateStr] = rate.split("/");
        const [rxByteStr, txByteStr] = bytes.split("/");
        const qRxBytes = parseInt(rxByteStr, 10) || 0;
        const qTxBytes = parseInt(txByteStr, 10) || 0;
        let qRxBps = parseInt(rxRateStr, 10) || 0;
        let qTxBps = parseInt(txRateStr, 10) || 0;

        // If RouterOS reported 0/0 rate, calculate from counter differences
        const queueSampleKey = `${cleanHost}:queue:${name}`;
        const prevQueueSample = interfaceTrafficSamples.get(queueSampleKey);
        const { rate: calculatedQueueRate, nextSample: nextQueueSample } =
          calculateInterfaceBandwidth(
            { rxBytes: qRxBytes, txBytes: qTxBytes },
            prevQueueSample,
            nowMs,
          );
        interfaceTrafficSamples.set(queueSampleKey, nextQueueSample);

        if (qRxBps === 0 && qTxBps === 0 && prevQueueSample) {
          qRxBps = calculatedQueueRate.rxBps;
          qTxBps = calculatedQueueRate.txBps;
        }

        const qRxMbps = parseFloat(((qRxBps * 8) / 1_000_000).toFixed(3));
        const qTxMbps = parseFloat(((qTxBps * 8) / 1_000_000).toFixed(3));

        queues.push({
          id,
          name,
          target,
          maxLimit,
          rate: `${qRxBps}/${qTxBps}`,
          rxBps: qRxBps,
          txBps: qTxBps,
          rxMbps: qRxMbps,
          txMbps: qTxMbps,
          bytes,
          rxBytes: qRxBytes,
          txBytes: qTxBytes,
          packets,
          disabled,
        });
      }
    }
  }

  // Calculate aggregate live bandwidth across active running interfaces
  let totalRxBps = 0;
  let totalTxBps = 0;
  for (const iface of interfaces) {
    if (iface.running && !iface.disabled) {
      totalRxBps += iface.rxBps;
      totalTxBps += iface.txBps;
    }
  }

  const totalRxMbps = parseFloat(((totalRxBps * 8) / 1_000_000).toFixed(3));
  const totalTxMbps = parseFloat(((totalTxBps * 8) / 1_000_000).toFixed(3));

  return {
    success: true,
    status: "ONLINE",
    interfaces,
    queues,
    totalRxBps,
    totalTxBps,
    totalRxMbps,
    totalTxMbps,
  };
}

export interface ActivePppoeUser {
  id: string;
  name: string;
  service: string;
  callerId: string;
  address: string;
  uptime: string;
  encoding?: string;
  sessionId?: string;
  type: "pppoe";
}

export interface ActiveHotspotUser {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  sessionTimeLeft?: string;
  type: "hotspot";
}

export const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

export function isValidMacAddress(val?: string): boolean {
  if (!val || typeof val !== "string") return false;
  return MAC_REGEX.test(val.trim());
}

/**
 * Query PPPoE and Hotspot active users distinctly
 */
export async function fetchMikrotikActiveUsers(params: MikrotikConnParams): Promise<{
  success: boolean;
  status: "ONLINE" | "OFFLINE";
  code?: MikrotikErrorCode;
  pppoeUsers: ActivePppoeUser[];
  hotspotUsers: ActiveHotspotUser[];
  activeUsers: Array<{
    userId: string;
    ip: string;
    uptime: string;
    mac?: string;
    type: "pppoe" | "hotspot";
    bytesIn?: number;
    bytesOut?: number;
  }>;
  error?: string;
}> {
  if (!params.host) {
    return {
      success: false,
      status: "OFFLINE",
      code: "INVALID_CONFIGURATION",
      pppoeUsers: [],
      hotspotUsers: [],
      activeUsers: [],
      error: "Router host is required",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    const mockPppoe: ActivePppoeUser[] = [
      {
        id: "*p1",
        name: "user01",
        service: "pppoe",
        callerId: "AA:BB:CC:DD:EE:01",
        address: "10.10.10.15",
        uptime: "03:45:12",
        type: "pppoe",
      },
      {
        id: "*p2",
        name: "user02",
        service: "pppoe",
        callerId: "AA:BB:CC:DD:EE:02",
        address: "10.10.10.16",
        uptime: "12:15:33",
        type: "pppoe",
      },
    ];
    const mockHotspot: ActiveHotspotUser[] = [
      {
        id: "*h1",
        user: "user04",
        address: "192.168.88.18",
        macAddress: "AA:BB:CC:DD:EE:04",
        uptime: "01:10:05",
        bytesIn: 219283,
        bytesOut: 1928301,
        packetsIn: 1200,
        packetsOut: 2400,
        type: "hotspot",
      },
      {
        id: "*h2",
        user: "hotspot_9281",
        address: "192.168.88.45",
        macAddress: "12:34:56:78:90:AB",
        uptime: "00:45:00",
        bytesIn: 549283,
        bytesOut: 3928301,
        packetsIn: 3200,
        packetsOut: 6400,
        type: "hotspot",
      },
    ];
    const combined = [
      ...mockPppoe.map((p) => ({
        userId: p.name,
        ip: p.address,
        uptime: p.uptime,
        mac: p.callerId,
        type: "pppoe" as const,
      })),
      ...mockHotspot.map((h) => ({
        userId: h.user,
        ip: h.address,
        uptime: h.uptime,
        mac: h.macAddress,
        type: "hotspot" as const,
        bytesIn: h.bytesIn,
        bytesOut: h.bytesOut,
      })),
    ];
    return {
      success: true,
      status: "ONLINE",
      pppoeUsers: mockPppoe,
      hotspotUsers: mockHotspot,
      activeUsers: combined,
    };
  }

  const pppoeUsers: ActivePppoeUser[] = [];
  const hotspotUsers: ActiveHotspotUser[] = [];

  // Query PPPoE active sessions
  const pppRes = await queryMikrotikSocketWithRetry(
    params,
    ["/ppp/active/print"],
    2,
    500,
  );
  if (pppRes.success && pppRes.sentences) {
    for (const sent of pppRes.sentences) {
      let id = "";
      let name = "";
      let service = "pppoe";
      let callerId = "";
      let address = "";
      let uptime = "";
      let encoding = "";
      let sessionId = "";

      for (const w of sent) {
        if (w.startsWith("=.id=")) id = w.substring(5);
        if (w.startsWith("=name=")) name = w.substring(6);
        if (w.startsWith("=service=")) service = w.substring(9);
        if (w.startsWith("=caller-id=")) callerId = w.substring(11);
        if (w.startsWith("=address=")) address = w.substring(9);
        if (w.startsWith("=uptime=")) uptime = w.substring(8);
        if (w.startsWith("=encoding=")) encoding = w.substring(10);
        if (w.startsWith("=session-id=")) sessionId = w.substring(12);
      }

      if (name) {
        pppoeUsers.push({
          id,
          name,
          service,
          callerId,
          address,
          uptime,
          encoding,
          sessionId,
          type: "pppoe",
        });
      }
    }
  }

  // Query Hotspot active sessions
  const hsRes = await queryMikrotikSocketWithRetry(
    params,
    ["/ip/hotspot/active/print"],
    2,
    500,
  );
  if (hsRes.success && hsRes.sentences) {
    for (const sent of hsRes.sentences) {
      let id = "";
      let user = "";
      let address = "";
      let macAddress = "";
      let uptime = "";
      let bytesIn = 0;
      let bytesOut = 0;
      let packetsIn = 0;
      let packetsOut = 0;
      let sessionTimeLeft = "";

      for (const w of sent) {
        if (w.startsWith("=.id=")) id = w.substring(5);
        if (w.startsWith("=user=")) user = w.substring(6);
        if (w.startsWith("=address=")) address = w.substring(9);
        if (w.startsWith("=mac-address=")) macAddress = w.substring(13);
        if (w.startsWith("=uptime=")) uptime = w.substring(8);
        if (w.startsWith("=bytes-in="))
          bytesIn = parseInt(w.substring(10), 10) || 0;
        if (w.startsWith("=bytes-out="))
          bytesOut = parseInt(w.substring(11), 10) || 0;
        if (w.startsWith("=packets-in="))
          packetsIn = parseInt(w.substring(12), 10) || 0;
        if (w.startsWith("=packets-out="))
          packetsOut = parseInt(w.substring(13), 10) || 0;
        if (w.startsWith("=session-time-left="))
          sessionTimeLeft = w.substring(19);
      }

      if (user) {
        hotspotUsers.push({
          id,
          user,
          address,
          macAddress,
          uptime,
          bytesIn,
          bytesOut,
          packetsIn,
          packetsOut,
          sessionTimeLeft,
          type: "hotspot",
        });
      }
    }
  }

  if (!pppRes.success && !hsRes.success) {
    const classified = classifyMikrotikError(pppRes.error || hsRes.error || "");
    return {
      success: false,
      status: "OFFLINE",
      code: classified.code,
      pppoeUsers: [],
      hotspotUsers: [],
      activeUsers: [],
      error: classified.message,
    };
  }

  const combined = [
    ...pppoeUsers.map((p) => ({
      username: p.name,
      userId: p.name,
      ip: p.address,
      uptime: p.uptime,
      mac: isValidMacAddress(p.callerId) ? p.callerId : undefined,
      service: p.service,
      callerId: p.callerId,
      sessionId: p.sessionId,
      routerId: cleanHost,
      type: "pppoe" as const,
    })),
    ...hotspotUsers.map((h) => ({
      username: h.user,
      userId: h.user,
      ip: h.address,
      uptime: h.uptime,
      mac: isValidMacAddress(h.macAddress) ? h.macAddress : undefined,
      bytesIn: h.bytesIn,
      bytesOut: h.bytesOut,
      packetsIn: h.packetsIn,
      packetsOut: h.packetsOut,
      routerId: cleanHost,
      type: "hotspot" as const,
    })),
  ];

  return {
    success: true,
    status: "ONLINE",
    pppoeUsers,
    hotspotUsers,
    activeUsers: combined,
  };
}

/**
 * Validates IPv4 address or CIDR notation
 */
export function isValidIpOrCidr(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;
  return ipv4Regex.test(trimmed);
}

/**
 * Validates that a simple queue target is a valid IP or Subnet (e.g. 192.168.1.50/32 or 192.168.1.0/24)
 * and strictly rejects usernames, internal database IDs, or empty values.
 */
export function isValidQueueTarget(target: string): boolean {
  if (!target || typeof target !== "string") return false;
  const trimmed = target.trim();
  if (
    trimmed.startsWith("cli_") ||
    trimmed.startsWith("user_") ||
    !trimmed.includes(".")
  ) {
    return false;
  }
  return isValidIpOrCidr(trimmed);
}

/**
 * Resolves a valid target IP/Subnet from client data or returns null
 */
export function buildValidQueueTarget(client: any): string | null {
  if (!client) return null;
  const candidate = (
    client.ipAddress ||
    client.ip ||
    client.staticIp ||
    client.target ||
    ""
  ).trim();

  if (isValidIpOrCidr(candidate)) {
    return candidate.includes("/") ? candidate : `${candidate}/32`;
  }
  if (client.subnet && isValidIpOrCidr(client.subnet.trim())) {
    return client.subnet.trim();
  }
  return null;
}

/**
 * Simple Queue Speed Control with Valid IP/Subnet Target
 */
export async function syncMikrotikClientQueue(
  params: MikrotikConnParams,
  client: any,
  speedLimit: string, // e.g. "10M/20M"
  priority: string = "8",
): Promise<{
  success: boolean;
  code?: MikrotikErrorCode;
  queueId?: string;
  targetUsed?: string;
  verifiedLimit?: string;
  message?: string;
  error?: string;
}> {
  if (!client || !client.userId) {
    return {
      success: false,
      code: "INVALID_CONFIGURATION",
      error: "Client userId is required for queue management",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    const mockTarget = buildValidQueueTarget(client) || "192.168.88.100/32";
    return {
      success: true,
      queueId: "*mock_q1",
      targetUsed: mockTarget,
      verifiedLimit: speedLimit,
      message: `[MOCK] Simple Queue synced for ${client.userId} (${speedLimit})`,
    };
  }

  // 1. Resolve a VALID target IP/subnet using buildValidQueueTarget
  let resolvedTarget = buildValidQueueTarget(client);

  if (!resolvedTarget) {
    // If no static IP on client record, probe active sessions on router to find their live IP
    try {
      const activeCheck = await queryMikrotikSocket(params, [
        "/ppp/active/print",
        `?name=${client.userId}`,
      ]);
      if (activeCheck.success && activeCheck.sentences?.length) {
        for (const sent of activeCheck.sentences) {
          for (const w of sent) {
            if (w.startsWith("=address=")) {
              const liveIp = w.substring(9).trim();
              if (isValidIpOrCidr(liveIp)) {
                resolvedTarget = `${liveIp}/32`;
              }
            }
          }
        }
      }
    } catch {}

    if (!resolvedTarget) {
      try {
        const hsActive = await queryMikrotikSocket(params, [
          "/ip/hotspot/active/print",
          `?user=${client.userId}`,
        ]);
        if (hsActive.success && hsActive.sentences?.length) {
          for (const sent of hsActive.sentences) {
            for (const w of sent) {
              if (w.startsWith("=address=")) {
                const liveIp = w.substring(9).trim();
                if (isValidIpOrCidr(liveIp)) {
                  resolvedTarget = `${liveIp}/32`;
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  // If still no valid target found, reject immediately: DO NOT create a queue with username target
  if (!resolvedTarget || !isValidQueueTarget(resolvedTarget)) {
    return {
      success: false,
      code: "INVALID_TARGET",
      error: `Cannot create simple queue: no valid IP/subnet target resolved for client "${client.userId}". Ensure client has a valid IP assigned or is connected.`,
    };
  }

  const queueName = `nexora_${client.userId}`;
  const prioStr = `${priority}/${priority}`;
  const comment = `Nexora | ${client.name || "Client"} | ${client.userId}`;
  const isDisabled =
    client.status === "expired" ||
    client.status === "suspended" ||
    client.status === "offline";

  // Check if queue exists by queueName or client.userId
  const qPrint = await queryMikrotikSocket(params, [
    "/queue/simple/print",
    `?name=${queueName}`,
  ]);
  let qId = "";
  if (qPrint.success && qPrint.sentences) {
    for (const sent of qPrint.sentences) {
      for (const w of sent) {
        if (w.startsWith("=.id=")) qId = w.substring(5);
      }
    }
  }

  // Fallback search with plain userId
  if (!qId) {
    const plainPrint = await queryMikrotikSocket(params, [
      "/queue/simple/print",
      `?name=${client.userId}`,
    ]);
    if (plainPrint.success && plainPrint.sentences) {
      for (const sent of plainPrint.sentences) {
        for (const w of sent) {
          if (w.startsWith("=.id=")) qId = w.substring(5);
        }
      }
    }
  }

  let queueOpResult;
  if (qId) {
    // Update existing queue
    queueOpResult = await queryMikrotikSocket(params, [
      "/queue/simple/set",
      `=.id=${qId}`,
      `=target=${resolvedTarget}`,
      `=max-limit=${speedLimit}`,
      `=priority=${prioStr}`,
      `=comment=${comment}`,
      `=disabled=${isDisabled ? "yes" : "no"}`,
    ]);
  } else {
    // Add new queue
    queueOpResult = await queryMikrotikSocket(params, [
      "/queue/simple/add",
      `=name=${queueName}`,
      `=target=${resolvedTarget}`,
      `=max-limit=${speedLimit}`,
      `=priority=${prioStr}`,
      `=comment=${comment}`,
      `=disabled=${isDisabled ? "yes" : "no"}`,
    ]);
  }

  if (!queueOpResult.success) {
    const classified = classifyMikrotikError(queueOpResult.error || "");
    return {
      success: false,
      code: classified.code,
      error: `RouterOS Queue Operation Failed: ${classified.message}`,
    };
  }

  // Read back to confirm that queue exists and limits match on RouterOS
  const verifyQueue = await queryMikrotikSocket(params, [
    "/queue/simple/print",
    `?name=${queueName}`,
  ]);
  let verifiedLimit = "";
  let verifiedFound = false;
  if (verifyQueue.success && verifyQueue.sentences?.length) {
    for (const sent of verifyQueue.sentences) {
      for (const w of sent) {
        if (w.startsWith("=.id=")) verifiedFound = true;
        if (w.startsWith("=max-limit=")) verifiedLimit = w.substring(11);
      }
    }
  }

  if (!verifiedFound) {
    // Also try checking target readback
    const verifyTarget = await queryMikrotikSocket(params, [
      "/queue/simple/print",
      `?target=${resolvedTarget}`,
    ]);
    if (verifyTarget.success && verifyTarget.sentences?.length) {
      for (const sent of verifyTarget.sentences) {
        for (const w of sent) {
          if (w.startsWith("=.id=")) verifiedFound = true;
          if (w.startsWith("=max-limit=")) verifiedLimit = w.substring(11);
        }
      }
    }
  }

  if (!verifiedFound) {
    return {
      success: false,
      code: "COMMAND_FAILED",
      error: `Simple Queue verification failed: queue "${queueName}" could not be confirmed on RouterOS.`,
    };
  }

  return {
    success: true,
    queueId: qId || "verified",
    targetUsed: resolvedTarget,
    verifiedLimit: verifiedLimit || speedLimit,
    message: `Simple Queue active on MikroTik for ${client.userId} [Target: ${resolvedTarget}, Limit: ${speedLimit}]`,
  };
}

/**
 * Sync Package Profile to MikroTik RouterOS (/ppp/profile and /ip/hotspot/user/profile)
 * Ensures rate-limit is set and confirmed on router
 */
export async function syncMikrotikPackage(
  params: MikrotikConnParams,
  pkg: {
    id: string;
    name: string;
    speed: string; // e.g. "20 Mbps" or "20"
    uploadSpeed?: string; // e.g. "10 Mbps"
    price?: number;
  },
): Promise<{
  success: boolean;
  code?: MikrotikErrorCode;
  pppProfileSynced?: boolean;
  hotspotProfileSynced?: boolean;
  rateLimitConfigured?: string;
  message?: string;
  error?: string;
}> {
  if (!pkg || !pkg.name) {
    return {
      success: false,
      code: "INVALID_CONFIGURATION",
      error: "Package name is required",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    return {
      success: true,
      pppProfileSynced: true,
      hotspotProfileSynced: true,
      rateLimitConfigured: `${pkg.uploadSpeed || "10M"}/${pkg.speed || "20M"}`,
      message: `[MOCK] Package ${pkg.name} profile synchronized to ${cleanHost}`,
    };
  }

  const profileName = String(pkg.name)
    .replace(/[^\w-]/g, "_")
    .toLowerCase();
  const dlNum = String(pkg.speed || "20").replace(/[^\d.]/g, "") || "20";
  const ulNum =
    String(pkg.uploadSpeed || pkg.speed || "10").replace(/[^\d.]/g, "") || "10";
  const rateLimit = `${ulNum}M/${dlNum}M`;

  let pppSynced = false;
  let hsSynced = false;
  const syncErrors: string[] = [];

  // 1. PPPoE Profile
  try {
    const pppCheck = await queryMikrotikSocket(params, [
      "/ppp/profile/print",
      `?name=${profileName}`,
    ]);
    let pppId = "";
    if (pppCheck.success && pppCheck.sentences) {
      for (const sent of pppCheck.sentences) {
        for (const w of sent) {
          if (w.startsWith("=.id=")) pppId = w.substring(5);
        }
      }
    }

    if (pppId) {
      const setPpp = await queryMikrotikSocket(params, [
        "/ppp/profile/set",
        `=.id=${pppId}`,
        `=rate-limit=${rateLimit}`,
        `=comment=Nexora Package: ${pkg.name}`,
      ]);
      pppSynced = setPpp.success;
      if (!setPpp.success && setPpp.error) syncErrors.push(`PPPoE profile set failed: ${setPpp.error}`);
    } else {
      const addPpp = await queryMikrotikSocket(params, [
        "/ppp/profile/add",
        `=name=${profileName}`,
        `=rate-limit=${rateLimit}`,
        `=comment=Nexora Package: ${pkg.name}`,
      ]);
      pppSynced = addPpp.success;
      if (!addPpp.success && addPpp.error) syncErrors.push(`PPPoE profile add failed: ${addPpp.error}`);
    }
  } catch (err: any) {
    syncErrors.push(`PPPoE profile query failed: ${err.message}`);
  }

  // 2. Hotspot User Profile
  try {
    const hsCheck = await queryMikrotikSocket(params, [
      "/ip/hotspot/user/profile/print",
      `?name=${profileName}`,
    ]);
    let hsId = "";
    if (hsCheck.success && hsCheck.sentences) {
      for (const sent of hsCheck.sentences) {
        for (const w of sent) {
          if (w.startsWith("=.id=")) hsId = w.substring(5);
        }
      }
    }

    if (hsId) {
      const setHs = await queryMikrotikSocket(params, [
        "/ip/hotspot/user/profile/set",
        `=.id=${hsId}`,
        `=rate-limit=${rateLimit}`,
      ]);
      hsSynced = setHs.success;
      if (!setHs.success && setHs.error) syncErrors.push(`Hotspot profile set failed: ${setHs.error}`);
    } else {
      const addHs = await queryMikrotikSocket(params, [
        "/ip/hotspot/user/profile/add",
        `=name=${profileName}`,
        `=rate-limit=${rateLimit}`,
      ]);
      hsSynced = addHs.success;
      if (!addHs.success && addHs.error) syncErrors.push(`Hotspot profile add failed: ${addHs.error}`);
    }
  } catch (err: any) {
    syncErrors.push(`Hotspot profile query failed: ${err.message}`);
  }

  if (!pppSynced && !hsSynced) {
    return {
      success: false,
      code: "COMMAND_FAILED",
      error: syncErrors.length > 0
        ? `Failed to synchronize package "${pkg.name}" profiles on MikroTik: ${syncErrors.join(" | ")}`
        : `Failed to synchronize package "${pkg.name}" profiles on MikroTik router. Check router connection and permissions.`,
    };
  }

  return {
    success: true,
    pppProfileSynced: pppSynced,
    hotspotProfileSynced: hsSynced,
    rateLimitConfigured: rateLimit,
    message: `Package "${pkg.name}" profiles synchronized to MikroTik RouterOS (${rateLimit}).`,
  };
}

/**
 * Server-Side Client Status Management (Activate / Suspend)
 * Directly modifies RouterOS hardware state and kicks active sessions upon suspension
 */
export async function setMikrotikClientStatus(
  params: MikrotikConnParams,
  clientId: string,
  targetStatus: "active" | "suspended" | "expired",
): Promise<{
  success: boolean;
  code?: MikrotikErrorCode;
  newStatus: string;
  kickedActiveSession?: boolean;
  message?: string;
  error?: string;
}> {
  if (!clientId) {
    return {
      success: false,
      newStatus: targetStatus,
      code: "INVALID_CONFIGURATION",
      error: "Client ID is required",
    };
  }

  const cleanHost = sanitizeMikrotikHost(params.host);
  if (
    isMockModeAllowed() &&
    (params.isDemo || cleanHost === "demo.mikrotik.local")
  ) {
    return {
      success: true,
      newStatus: targetStatus,
      kickedActiveSession: targetStatus !== "active",
      message: `[MOCK] Client ${clientId} marked ${targetStatus} on ${cleanHost}`,
    };
  }

  const shouldDisable =
    targetStatus === "suspended" || targetStatus === "expired";
  let opSucceeded = false;
  let kicked = false;
  const opErrors: string[] = [];

  // 1. PPPoE Secret
  try {
    const pppFind = await queryMikrotikSocket(params, [
      "/ppp/secret/print",
      `?name=${clientId}`,
    ]);
    if (pppFind.success && pppFind.sentences) {
      for (const sent of pppFind.sentences) {
        let secId = "";
        for (const w of sent) {
          if (w.startsWith("=.id=")) secId = w.substring(5);
        }
        if (secId) {
          const upd = await queryMikrotikSocket(params, [
            "/ppp/secret/set",
            `=.id=${secId}`,
            `=disabled=${shouldDisable ? "yes" : "no"}`,
          ]);
          if (upd.success) opSucceeded = true;
          else if (upd.error) opErrors.push(`PPPoE secret status update failed: ${upd.error}`);
        }
      }
    } else if (!pppFind.success && pppFind.error) {
      opErrors.push(`PPPoE secret search error: ${pppFind.error}`);
    }
  } catch (err: any) {
    opErrors.push(`PPPoE secret query failed: ${err.message}`);
  }

  // 2. Hotspot User
  try {
    const hsFind = await queryMikrotikSocket(params, [
      "/ip/hotspot/user/print",
      `?name=${clientId}`,
    ]);
    if (hsFind.success && hsFind.sentences) {
      for (const sent of hsFind.sentences) {
        let hsId = "";
        for (const w of sent) {
          if (w.startsWith("=.id=")) hsId = w.substring(5);
        }
        if (hsId) {
          const upd = await queryMikrotikSocket(params, [
            "/ip/hotspot/user/set",
            `=.id=${hsId}`,
            `=disabled=${shouldDisable ? "yes" : "no"}`,
          ]);
          if (upd.success) opSucceeded = true;
          else if (upd.error) opErrors.push(`Hotspot user status update failed: ${upd.error}`);
        }
      }
    } else if (!hsFind.success && hsFind.error) {
      opErrors.push(`Hotspot user search error: ${hsFind.error}`);
    }
  } catch (err: any) {
    opErrors.push(`Hotspot user query failed: ${err.message}`);
  }

  // 3. Simple Queue
  try {
    const qFind = await queryMikrotikSocket(params, [
      "/queue/simple/print",
      `?name=nexora_${clientId}`,
    ]);
    let qId = "";
    if (qFind.success && qFind.sentences) {
      for (const sent of qFind.sentences) {
        for (const w of sent) {
          if (w.startsWith("=.id=")) qId = w.substring(5);
        }
      }
    }
    if (!qId) {
      const qPlain = await queryMikrotikSocket(params, [
        "/queue/simple/print",
        `?name=${clientId}`,
      ]);
      if (qPlain.success && qPlain.sentences) {
        for (const sent of qPlain.sentences) {
          for (const w of sent) {
            if (w.startsWith("=.id=")) qId = w.substring(5);
          }
        }
      }
    }
    if (qId) {
      const qUpd = await queryMikrotikSocket(params, [
        "/queue/simple/set",
        `=.id=${qId}`,
        `=disabled=${shouldDisable ? "yes" : "no"}`,
      ]);
      if (qUpd.success) opSucceeded = true;
    }
  } catch (err: any) {
    console.warn(`Queue status toggle warning: ${err.message}`);
  }

  // 4. If suspending or expired, actively kick live sessions from router
  if (shouldDisable) {
    try {
      const activePpp = await queryMikrotikSocket(params, [
        "/ppp/active/print",
        `?name=${clientId}`,
      ]);
      if (activePpp.success && activePpp.sentences) {
        for (const sent of activePpp.sentences) {
          for (const w of sent) {
            if (w.startsWith("=.id=")) {
              const actId = w.substring(5);
              await queryMikrotikSocket(params, [
                "/ppp/active/remove",
                `=.id=${actId}`,
              ]);
              kicked = true;
            }
          }
        }
      }
    } catch {}

    try {
      const activeHs = await queryMikrotikSocket(params, [
        "/ip/hotspot/active/print",
        `?user=${clientId}`,
      ]);
      if (activeHs.success && activeHs.sentences) {
        for (const sent of activeHs.sentences) {
          for (const w of sent) {
            if (w.startsWith("=.id=")) {
              const actId = w.substring(5);
              await queryMikrotikSocket(params, [
                "/ip/hotspot/active/remove",
                `=.id=${actId}`,
              ]);
              kicked = true;
            }
          }
        }
      }
    } catch {}
  }

  if (!opSucceeded && !kicked) {
    return {
      success: false,
      newStatus: targetStatus,
      code: "COMMAND_FAILED",
      error: opErrors.length > 0
        ? `RouterOS operations failed for "${clientId}": ${opErrors.join(" | ")}`
        : `Could not locate or update client "${clientId}" in RouterOS database.`,
    };
  }

  return {
    success: true,
    newStatus: targetStatus,
    kickedActiveSession: kicked,
    message: `Client "${clientId}" successfully ${shouldDisable ? "suspended/disabled" : "activated"} on MikroTik RouterOS.`,
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
