import net from 'net';

export interface CliOnuRecord {
  id: string; // e.g. "0/1:1"
  slot: string;
  ponPort: string;
  onuIndex: number;
  serialNumber: string;
  macAddress: string;
  vendor: string;
  name: string;
  status: 'online' | 'offline' | 'los' | 'power_low';
  rxPower: number | null; // dBm
  txPower: number | null; // dBm
  temperature: number | null; // °C
  voltage: number | null; // V
  distanceMeters: number | null;
  uptime: string | null;
  trafficRxMbps: number | null;
  trafficTxMbps: number | null;
}

/**
 * Connects to OLT via Telnet Socket (Port 23) and executes CLI commands
 */
export function queryOltTelnetCli(
  host: string,
  port = 23,
  user = 'admin',
  pass = 'admin',
  brand = 'Huawei',
  timeoutMs = 5000
): Promise<{ success: boolean; rawOutput: string; onus: CliOnuRecord[]; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let rawOutput = '';
    let stage: 'connect' | 'user_sent' | 'pass_sent' | 'command_sent' | 'done' = 'connect';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        const parsed = parseOltCliOutput(rawOutput, brand);
        resolve({
          success: rawOutput.length > 20,
          rawOutput,
          onus: parsed,
          error: rawOutput.length < 20 ? `Telnet query timeout after ${timeoutMs}ms (${host}:${port})` : undefined,
        });
      }
    }, timeoutMs);

    socket.setTimeout(timeoutMs);

    socket.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        socket.destroy();
        resolve({ success: false, rawOutput, onus: [], error: err.message });
      }
    });

    socket.on('data', (chunk) => {
      const dataStr = chunk.toString('utf8');
      rawOutput += dataStr;

      const lower = dataStr.toLowerCase();

      // Stage 1: Send Username
      if (stage === 'connect' && (lower.includes('user') || lower.includes('login') || lower.includes('name'))) {
        stage = 'user_sent';
        socket.write(`${user}\r\n`);
      }
      // Stage 2: Send Password
      else if ((stage === 'user_sent' || stage === 'connect') && lower.includes('password')) {
        stage = 'pass_sent';
        socket.write(`${pass}\r\n`);
      }
      // Stage 3: Send Brand Command
      else if ((stage === 'pass_sent' || stage === 'user_sent') && (dataStr.includes('>') || dataStr.includes('#') || lower.includes('olt'))) {
        stage = 'command_sent';
        let cmd = 'display onu info 0';
        if (brand === 'ZTE') cmd = 'show gpon onu state';
        else if (brand === 'VSOL') cmd = 'show pon onu information';
        else if (brand === 'BDCOM') cmd = 'show epon active-onu';
        else if (brand === 'FiberHome') cmd = 'show onu state';

        socket.write(`${cmd}\r\n`);

        // Second command for optical power
        setTimeout(() => {
          let optCmd = 'display optical-info 0';
          if (brand === 'ZTE') optCmd = 'show gpon onu detail-info';
          else if (brand === 'VSOL') optCmd = 'show optical-power';
          else if (brand === 'BDCOM') optCmd = 'show epon optical-transceiver-diagnostics';

          socket.write(`${optCmd}\r\n`);
        }, 800);
      }
    });

    try {
      socket.connect(port, host);
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, rawOutput: '', onus: [], error: err.message });
      }
    }
  });
}

/**
 * Parses raw OLT CLI Telnet/SSH response string for real ONUs, Serial Numbers, Statuses, Distances, & RX/TX Powers.
 * Strictly parses real values from CLI response without inventing fake or random data.
 */
export function parseOltCliOutput(raw: string, brand: string): CliOnuRecord[] {
  if (!raw || raw.length < 10) return [];

  const onus: CliOnuRecord[] = [];
  const lines = raw.split(/\r?\n/);

  // Regex patterns for vendor serial numbers & MACs
  const snRegex = /(HWTC|ZTEG|VSOL|BDCM|FHTT|CATA|EPON|GPON)[0-9A-F]{8,12}/gi;
  const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g;
  const dbmRegex = /(-?[0-9]{1,2}\.[0-9]{1,2})\s*(dBm)?/gi;
  const portIndexRegex = /([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{1,2}):([0-9]{1,3})/;// e.g. 0/1/2:3

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Show') || trimmed.startsWith('Display') || trimmed.includes('----')) {
      continue;
    }

    const matchedSn = trimmed.match(snRegex);
    const matchedMac = trimmed.match(macRegex);

    // Strictly skip line if no real Serial Number or MAC is found
    if (!matchedSn && !matchedMac) {
      continue;
    }

    const sn = matchedSn ? matchedSn[0].toUpperCase() : '';
    const mac = matchedMac ? matchedMac[0] : 'N/A';

    if (!sn) continue; // Must have valid Serial Number

    // Parse actual Slot / PON Port / ONU ID from line if available
    let slot = 'N/A';
    let ponPort = 'N/A';
    let onuIdx = 0;
    let onuIdStr = sn;

    const portMatch = trimmed.match(portIndexRegex);
    if (portMatch) {
      slot = `${portMatch[1]}/${portMatch[2]}`;
      ponPort = portMatch[3];
      onuIdx = parseInt(portMatch[4], 10);
      onuIdStr = `${slot}/${ponPort}:${onuIdx}`;
    }

    // Parse RX Power
    const matchedDbm = [...trimmed.matchAll(dbmRegex)];
    let rxPower: number | null = null;
    let txPower: number | null = null;

    if (matchedDbm.length > 0) {
      const parsedVal = parseFloat(matchedDbm[0][1]);
      if (!isNaN(parsedVal) && parsedVal < 0 && parsedVal > -45) {
        rxPower = parsedVal;
      }
      if (matchedDbm.length > 1) {
        const parsedTx = parseFloat(matchedDbm[1][1]);
        if (!isNaN(parsedTx) && parsedTx > -10 && parsedTx < 20) {
          txPower = parsedTx;
        }
      }
    }

    // Parse Status
    let status: 'online' | 'offline' | 'los' | 'power_low' = 'online';
    const lower = trimmed.toLowerCase();
    if (lower.includes('los') || lower.includes('losi') || lower.includes('power_lost') || (rxPower !== null && rxPower <= -35)) {
      status = 'los';
    } else if (lower.includes('offline') || lower.includes('down') || lower.includes('deregistered')) {
      status = 'offline';
    } else if (rxPower !== null && rxPower <= -25) {
      status = 'power_low';
    }

    // Parse Distance in meters if provided in output
    let distanceMeters: number | null = null;
    const distMatch = trimmed.match(/([0-9]{2,5})\s*(m|meter|meters)/i);
    if (distMatch) {
      distanceMeters = parseInt(distMatch[1], 10);
    }

    // Parse Temperature in Celsius if provided in output
    let temperature: number | null = null;
    const tempMatch = trimmed.match(/([0-9]{2}\.?[0-9]?)\s*(c|deg|degree)/i);
    if (tempMatch) {
      const parsedTemp = parseFloat(tempMatch[1]);
      if (!isNaN(parsedTemp) && parsedTemp > 0 && parsedTemp < 100) {
        temperature = parsedTemp;
      }
    }

    onus.push({
      id: onuIdStr,
      slot,
      ponPort,
      onuIndex: onuIdx,
      serialNumber: sn,
      macAddress: mac,
      vendor: brand,
      name: `ONU ${onuIdStr}`,
      status,
      rxPower,
      txPower,
      temperature,
      voltage: null, // Strictly null unless returned by CLI
      distanceMeters,
      uptime: null, // Strictly null unless returned by CLI
      trafficRxMbps: null,
      trafficTxMbps: null,
    });
  }

  return onus;
}
