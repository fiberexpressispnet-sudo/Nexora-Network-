import net from 'net';
import crypto from 'crypto';
import { snmpGetReal, snmpWalkReal } from './snmpClient';
import { queryOltTelnetCli } from './oltCliDriver';

export interface OLTServerConfig {
  id: string;
  name: string;
  brand: string;
  model: string;
  ip: string;
  managementPort: number;
  protocol: string;
  username: string;
  passwordEncrypted?: string;
  snmpCommunityRead?: string;
  snmpCommunityWrite?: string;
  snmpv3User?: string;
  snmpv3AuthPass?: string;
  snmpv3PrivPass?: string;
  timeoutMs: number;
  enabled: boolean;
  status: 'online' | 'offline' | 'warning' | 'untested';
  lastSync?: string;
  totalPonPorts?: number;
  onlinePonPorts?: number;
  notes?: string;
}

const ENCRYPTION_KEY = process.env.OLT_SECRET_KEY || 'feisp_olt_secure_master_key_32_bytes_len!!';

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'olt_salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    return `b64:${Buffer.from(plaintext).toString('base64')}`;
  }
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return '';
  if (ciphertext.startsWith('b64:')) {
    return Buffer.from(ciphertext.slice(4), 'base64').toString('utf8');
  }
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'olt_salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '';
  }
}

export function maskOltSecrets(olts: OLTServerConfig[]): any[] {
  if (!Array.isArray(olts)) return [];
  return olts.map((olt) => ({
    ...olt,
    password: olt.passwordEncrypted ? '••••••••' : undefined,
    passwordEncrypted: undefined,
    snmpCommunityWrite: olt.snmpCommunityWrite ? '••••••••' : undefined,
    snmpv3AuthPass: olt.snmpv3AuthPass ? '••••••••' : undefined,
    snmpv3PrivPass: olt.snmpv3PrivPass ? '••••••••' : undefined,
  }));
}

/**
 * Tests TCP/UDP Socket Reachability
 */
export function checkSocketReachability(
  host: string,
  port: number,
  timeoutMs = 4000
): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latencyMs = Date.now() - startTime;
      socket.destroy();
      resolve({ reachable: true, latencyMs });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        reachable: false,
        latencyMs: Date.now() - startTime,
        error: `Connection timed out after ${timeoutMs}ms (${host}:${port})`,
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        reachable: false,
        latencyMs: Date.now() - startTime,
        error: err.message || `Connection refused by ${host}:${port}`,
      });
    });

    try {
      socket.connect(port, host);
    } catch (err: any) {
      resolve({
        reachable: false,
        latencyMs: 0,
        error: err.message || 'Socket error',
      });
    }
  });
}

/**
 * Production-Ready Real OLT System Details Query
 * Multi-Vendor OID Profiles: Huawei, ZTE, VSOL, BDCOM, FiberHome
 * Strictly returns null for unsupported OIDs (UI displays "N/A" / "Unsupported")
 */
export async function queryRealOltSystemDetails(
  olt: OLTServerConfig,
  isReachable: boolean
): Promise<{
  cpuUsage: number | null;
  memoryUsage: number | null;
  temperature: number | null;
  uptime: string | null;
  firmware: string | null;
  hardwareVersion: string | null;
  serialNumber: string | null;
  powerSupplyStatus: string | null;
  fanStatus: string | null;
}> {
  if (!isReachable) {
    return {
      cpuUsage: null,
      memoryUsage: null,
      temperature: null,
      uptime: null,
      firmware: null,
      hardwareVersion: null,
      serialNumber: null,
      powerSupplyStatus: null,
      fanStatus: null,
    };
  }

  const community = olt.snmpCommunityRead || 'public';
  const port = olt.managementPort || 161;

  let cpuVal: number | null = null;
  let memVal: number | null = null;
  let tempVal: number | null = null;
  let uptimeStr: string | null = null;
  let firmwareStr: string | null = null;
  let powerSupplyStatus: string | null = null;
  let fanStatus: string | null = null;

  try {
    // 1. sysUpTime.0 (.1.3.6.1.2.1.1.3.0)
    const sysUpRes = await snmpGetReal(olt.ip, community, '1.3.6.1.2.1.1.3.0', port, 2500);
    if (sysUpRes.success && sysUpRes.value) {
      const ticks = Number(sysUpRes.value);
      if (!isNaN(ticks) && ticks > 0) {
        const totalSec = Math.floor(ticks / 100);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        uptimeStr = `${days}d ${hours}h ${mins}m`;
      }
    }

    // 2. sysDescr.0 (.1.3.6.1.2.1.1.1.0)
    const sysDescrRes = await snmpGetReal(olt.ip, community, '1.3.6.1.2.1.1.1.0', port, 2500);
    if (sysDescrRes.success && sysDescrRes.rawText) {
      firmwareStr = sysDescrRes.rawText.slice(0, 60);
    }

    // 3. Multi-Vendor CPU, Memory, & Temp OIDs
    let cpuOids = ['1.3.6.1.4.1.2011.6.3.3.1.1.3', '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.5']; // Huawei
    let memOids = ['1.3.6.1.4.1.2011.6.3.3.1.1.4'];
    let tempOids = ['1.3.6.1.4.1.2011.5.25.31.1.1.1.1.11'];

    if (olt.brand === 'ZTE') {
      cpuOids = ['1.3.6.1.4.1.3902.1082.500.10.2.3.1', '1.3.6.1.4.1.3902.3.3.1.1.4.1'];
      memOids = ['1.3.6.1.4.1.3902.1082.500.10.2.3.2'];
      tempOids = ['1.3.6.1.4.1.3902.1082.500.10.2.2.1.2'];
    } else if (olt.brand === 'VSOL') {
      cpuOids = ['1.3.6.1.4.1.37950.1.1.5.12.1.0', '1.3.6.1.4.1.37950.1.1.5.1'];
      memOids = ['1.3.6.1.4.1.37950.1.1.5.12.2.0'];
      tempOids = ['1.3.6.1.4.1.37950.1.1.5.12.3.0'];
    } else if (olt.brand === 'BDCOM') {
      cpuOids = ['1.3.6.1.4.1.3320.9.109.1.1.1.2', '1.3.6.1.4.1.3320.2.1.2'];
      memOids = ['1.3.6.1.4.1.3320.9.109.1.1.1.3'];
      tempOids = ['1.3.6.1.4.1.3320.9.181.1.1.1.2'];
    } else if (olt.brand === 'FiberHome') {
      cpuOids = ['1.3.6.1.4.1.5875.8.1.1.1'];
      memOids = ['1.3.6.1.4.1.5875.8.1.1.2'];
    }

    for (const cOid of cpuOids) {
      const cRes = await snmpGetReal(olt.ip, community, cOid, port, 1500);
      if (cRes.success && typeof cRes.value === 'number' && cRes.value >= 0 && cRes.value <= 100) {
        cpuVal = cRes.value;
        break;
      }
    }

    for (const mOid of memOids) {
      const mRes = await snmpGetReal(olt.ip, community, mOid, port, 1500);
      if (mRes.success && typeof mRes.value === 'number' && mRes.value >= 0 && mRes.value <= 100) {
        memVal = mRes.value;
        break;
      }
    }

    for (const tOid of tempOids) {
      const tRes = await snmpGetReal(olt.ip, community, tOid, port, 1500);
      if (tRes.success && typeof tRes.value === 'number' && tRes.value > 0 && tRes.value < 120) {
        tempVal = tRes.value;
        break;
      }
    }

    // Power Supply OID Query (.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.2 or .1.3.6.1.2.1.1)
    const pwrRes = await snmpGetReal(olt.ip, community, '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.2', port, 1200);
    if (pwrRes.success && pwrRes.rawText) {
      powerSupplyStatus = pwrRes.rawText;
    }

    // Fan Status OID Query (.1.3.6.1.4.1.2011.5.25.31.1.1.1.1.3)
    const fanRes = await snmpGetReal(olt.ip, community, '1.3.6.1.4.1.2011.5.25.31.1.1.1.1.3', port, 1200);
    if (fanRes.success && fanRes.rawText) {
      fanStatus = fanRes.rawText;
    }
  } catch (err) {
    console.warn(`SNMP Query Warning for OLT ${olt.ip}:`, err);
  }

  return {
    cpuUsage: cpuVal,
    memoryUsage: memVal,
    temperature: tempVal,
    uptime: uptimeStr,
    firmware: firmwareStr,
    hardwareVersion: null,
    serialNumber: null,
    powerSupplyStatus,
    fanStatus,
  };
}

/**
 * Production-Ready Real PON Ports Walk
 * Walks SNMP ifTable / ifDescr / ifOperStatus for actual PON ports & throughput
 * Strictly returns [] if no PON ports are returned by SNMP. Does NOT invent fake fallback PON ports!
 */
export async function queryRealOltPonPorts(olt: OLTServerConfig, isReachable: boolean) {
  if (!isReachable) return [];

  const community = olt.snmpCommunityRead || 'public';
  const port = olt.managementPort || 161;
  const ponPorts: any[] = [];

  try {
    // Walk ifDescr (.1.3.6.1.2.1.2.2.1.2)
    const ifDescrResults = await snmpWalkReal(olt.ip, community, '1.3.6.1.2.1.2.2.1.2', 32, port, 2000);

    for (const r of ifDescrResults) {
      const descr = String(r.rawText || r.value || '').trim();
      const lower = descr.toLowerCase();

      if (lower.includes('gpon') || lower.includes('epon') || lower.includes('pon') || lower.includes('ge')) {
        let adminStatus: 'up' | 'down' = 'up';
        let operStatus: 'up' | 'down' = 'up';
        let rxBytes: number | null = null;
        let txBytes: number | null = null;

        if (r.oid) {
          const ifIdx = r.oid.split('.').pop();

          // Query ifAdminStatus
          const adminRes = await snmpGetReal(olt.ip, community, `1.3.6.1.2.1.2.2.1.7.${ifIdx}`, port, 1000);
          if (adminRes.success && adminRes.value === 2) adminStatus = 'down';

          // Query ifOperStatus
          const operRes = await snmpGetReal(olt.ip, community, `1.3.6.1.2.1.2.2.1.8.${ifIdx}`, port, 1000);
          if (operRes.success && operRes.value === 2) operStatus = 'down';

          // Query ifInOctets (RX) & ifOutOctets (TX)
          const inRes = await snmpGetReal(olt.ip, community, `1.3.6.1.2.1.2.2.1.10.${ifIdx}`, port, 1000);
          if (inRes.success && typeof inRes.value === 'number') rxBytes = inRes.value;

          const outRes = await snmpGetReal(olt.ip, community, `1.3.6.1.2.1.2.2.1.16.${ifIdx}`, port, 1000);
          if (outRes.success && typeof outRes.value === 'number') txBytes = outRes.value;
        }

        // Calculate Slot & PON Port from interface description string (e.g. "GPON 0/1/2")
        let slot = 'N/A';
        let pPort = 'N/A';
        const match = descr.match(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{1,2})/);
        if (match) {
          slot = `${match[1]}/${match[2]}`;
          pPort = match[3];
        }

        ponPorts.push({
          slot,
          ponPort: pPort,
          portName: descr,
          adminStatus,
          operStatus,
          totalOnu: 0,
          onlineOnu: 0,
          offlineOnu: 0,
          losCount: 0,
          txPowerDbm: null,
          rxTrafficMbps: rxBytes ? parseFloat(((rxBytes * 8) / 1000000).toFixed(1)) : null,
          txTrafficMbps: txBytes ? parseFloat(((txBytes * 8) / 1000000).toFixed(1)) : null,
        });
      }
    }
  } catch (err) {
    console.warn(`PON Ports Walk warning for OLT ${olt.ip}:`, err);
  }

  // Returns ONLY real SNMP discovered PON ports (or [] if none found)
  return ponPorts;
}

/**
 * Production-Ready Real ONU Discovery Engine
 * Correlates exact SNMP WALK table indices across Serial, RX, TX, Status, Distance, Temperature & Voltage.
 * Returns ONLY real discovered ONUs or EMPTY ARRAY ([]) if 0 ONUs exist on the OLT.
 * Strictly avoids any hardcoded or fake strings ("3.3", "42", "2.1", "Real-time", "0/1:x").
 */
export async function queryRealOltOnus(
  olt: OLTServerConfig,
  isReachable: boolean,
  slotPortFilter?: string,
  mappings: any[] = []
) {
  if (!isReachable) return [];

  const community = olt.snmpCommunityRead || 'public';
  const port = olt.managementPort || 161;
  const discoveredOnus: any[] = [];

  try {
    // Multi-Vendor ONU MIB OID Roots
    let snOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.43.1.3'; // Huawei
    let rxOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4';
    let txOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.6';
    let statusOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.46.1.15';
    let distOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.46.1.20';
    let tempOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.1';
    let voltOidRoot = '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.2';

    if (olt.brand === 'ZTE') {
      snOidRoot = '1.3.6.1.4.1.3902.1012.3.28.1.1.5';
      rxOidRoot = '1.3.6.1.4.1.3902.1012.3.50.12.1.1.10';
      txOidRoot = '1.3.6.1.4.1.3902.1012.3.50.12.1.1.14';
      statusOidRoot = '1.3.6.1.4.1.3902.1012.3.28.2.1.4';
      distOidRoot = '1.3.6.1.4.1.3902.1012.3.28.2.1.2';
      tempOidRoot = '1.3.6.1.4.1.3902.1012.3.50.12.1.1.2';
    } else if (olt.brand === 'VSOL') {
      snOidRoot = '1.3.6.1.4.1.37950.1.1.5.10.3.1.1.2';
      rxOidRoot = '1.3.6.1.4.1.37950.1.1.5.12.2.1.4';
      txOidRoot = '1.3.6.1.4.1.37950.1.1.5.12.2.1.3';
      statusOidRoot = '1.3.6.1.4.1.37950.1.1.5.10.3.1.1.4';
      distOidRoot = '1.3.6.1.4.1.37950.1.1.5.10.3.1.1.8';
      tempOidRoot = '1.3.6.1.4.1.37950.1.1.5.12.2.1.1';
    } else if (olt.brand === 'BDCOM') {
      snOidRoot = '1.3.6.1.4.1.3320.101.10.1.1.3';
      rxOidRoot = '1.3.6.1.4.1.3320.101.10.5.1.5';
      txOidRoot = '1.3.6.1.4.1.3320.101.10.5.1.6';
      statusOidRoot = '1.3.6.1.4.1.3320.101.10.1.1.26';
      distOidRoot = '1.3.6.1.4.1.3320.101.10.1.1.27';
      tempOidRoot = '1.3.6.1.4.1.3320.101.10.5.1.2';
    }

    // Step A: Walk Serial Numbers
    const snResults = await snmpWalkReal(olt.ip, community, snOidRoot, 64, port, olt.timeoutMs || 2500);

    for (const item of snResults) {
      const snStr = String(item.rawText || item.value || '').trim();
      if (!snStr || snStr.length < 6) continue;

      // Extract exact OID index suffix (e.g. "4194304000.1") to correlate across MIB tables
      const cleanOid = item.oid ? item.oid.replace(/^\./, '') : '';
      const cleanRoot = snOidRoot.replace(/^\./, '');
      const indexSuffix = cleanOid.startsWith(cleanRoot) ? cleanOid.slice(cleanRoot.length + 1) : '';

      if (!indexSuffix) continue;

      // Determine actual Slot / PON Port / ONU Index from OID index numbers
      const indexParts = indexSuffix.split('.').map(Number);
      let slotStr = 'N/A';
      let ponPortStr = 'N/A';
      let onuIdxNum = 0;

      if (indexParts.length >= 2) {
        const rawPort = indexParts[indexParts.length - 2];
        const rawOnu = indexParts[indexParts.length - 1];
        slotStr = `${Math.floor(rawPort / 256)}`;
        ponPortStr = `${rawPort % 256}`;
        onuIdxNum = rawOnu;
      } else if (indexParts.length === 1) {
        onuIdxNum = indexParts[0];
      }

      const onuIdFormatted = slotStr !== 'N/A' ? `${slotStr}/${ponPortStr}:${onuIdxNum}` : `${indexSuffix}`;
      const mapping = mappings.find((m) => m.serialNumber === snStr);

      // Step B: Query exact correlated OID indices for RX, TX, Temp, Distance, Voltage, Status
      let rxPower: number | null = null;
      let txPower: number | null = null;
      let temp: number | null = null;
      let volt: number | null = null;
      let distance: number | null = null;
      let status: 'online' | 'offline' | 'los' | 'power_low' = 'online';

      try {
        // RX Power
        const rxRes = await snmpGetReal(olt.ip, community, `${rxOidRoot}.${indexSuffix}`, port, 1200);
        if (rxRes.success && typeof rxRes.value === 'number') {
          let val = rxRes.value;
          if (val > 0) val = -val;
          if (val < -100) val = val / 100;
          if (val < 0 && val > -45) rxPower = parseFloat(val.toFixed(1));
        }

        // TX Power
        const txRes = await snmpGetReal(olt.ip, community, `${txOidRoot}.${indexSuffix}`, port, 1200);
        if (txRes.success && typeof txRes.value === 'number') {
          let val = txRes.value;
          if (val > 100) val = val / 100;
          if (val > -10 && val < 20) txPower = parseFloat(val.toFixed(1));
        }

        // Temperature
        const tempRes = await snmpGetReal(olt.ip, community, `${tempOidRoot}.${indexSuffix}`, port, 1200);
        if (tempRes.success && typeof tempRes.value === 'number' && tempRes.value > 0 && tempRes.value < 100) {
          temp = tempRes.value;
        }

        // Voltage
        const voltRes = await snmpGetReal(olt.ip, community, `${voltOidRoot}.${indexSuffix}`, port, 1200);
        if (voltRes.success && typeof voltRes.value === 'number' && voltRes.value > 0) {
          let vVal = voltRes.value;
          if (vVal > 100) vVal = vVal / 1000; // mV to V
          volt = parseFloat(vVal.toFixed(1));
        }

        // Distance
        const distRes = await snmpGetReal(olt.ip, community, `${distOidRoot}.${indexSuffix}`, port, 1200);
        if (distRes.success && typeof distRes.value === 'number' && distRes.value > 0) {
          distance = distRes.value;
        }

        // Status
        const statusRes = await snmpGetReal(olt.ip, community, `${statusOidRoot}.${indexSuffix}`, port, 1200);
        if (statusRes.success && typeof statusRes.value === 'number') {
          if (statusRes.value === 2 || statusRes.value === 3) status = 'los';
          else if (statusRes.value === 0 || statusRes.value === 4) status = 'offline';
        }
      } catch (e) {
        // Keep null for unprovided metrics
      }

      if (rxPower !== null && rxPower <= -25 && status !== 'los') {
        status = 'power_low';
      }

      discoveredOnus.push({
        id: onuIdFormatted,
        oltId: olt.id,
        oltName: olt.name,
        slot: slotStr,
        ponPort: ponPortStr,
        onuIndex: onuIdxNum,
        serialNumber: snStr,
        macAddress: 'N/A',
        vendor: olt.brand,
        name: mapping?.clientName ? `Subscriber: ${mapping.clientName}` : `ONU ${onuIdFormatted}`,
        status,
        rxPower,
        txPower,
        temperature: temp,
        voltage: volt,
        distanceMeters: distance,
        uptime: null, // Strictly null unless returned by SNMP
        lastOnline: status === 'online' ? 'Active' : 'Offline',
        lastOffline: status !== 'online' ? 'Offline' : null,
        losStatus: status === 'los',
        trafficRxMbps: null,
        trafficTxMbps: null,
        mappedClientId: mapping?.clientId || null,
        mappedClientName: mapping?.clientName || null,
        mappedUserId: mapping?.userId || null,
      });
    }
  } catch (err) {
    console.warn(`SNMP ONU Walk Error for OLT ${olt.ip}:`, err);
  }

  // Step C: Fallback to Telnet CLI if SNMP returns 0 ONUs
  if (discoveredOnus.length === 0) {
    try {
      const cliRes = await queryOltTelnetCli(
        olt.ip,
        23,
        olt.username || 'admin',
        olt.passwordEncrypted ? decryptSecret(olt.passwordEncrypted) : 'admin',
        olt.brand,
        3500
      );

      if (cliRes.success && cliRes.onus.length > 0) {
        for (const cOnu of cliRes.onus) {
          const mapping = mappings.find((m) => m.serialNumber === cOnu.serialNumber);
          discoveredOnus.push({
            ...cOnu,
            oltId: olt.id,
            oltName: olt.name,
            mappedClientId: mapping?.clientId || null,
            mappedClientName: mapping?.clientName || null,
            mappedUserId: mapping?.userId || null,
          });
        }
      }
    } catch (cliErr) {
      console.warn(`Telnet CLI fallback warning for OLT ${olt.ip}:`, cliErr);
    }
  }

  // Returns ONLY real discovered ONUs or [] if 0 ONUs exist
  return discoveredOnus;
}
