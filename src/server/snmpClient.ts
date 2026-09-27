import dgram from 'dgram';

/**
 * Encodes an OID string like "1.3.6.1.2.1.1.1.0" into BER ASN.1 bytes
 */
export function encodeOid(oidStr: string): Buffer {
  const parts = oidStr.replace(/^\./, '').split('.').map(Number);
  if (parts.length < 2) return Buffer.from([0x2b, 0x06]);

  const bytes: number[] = [40 * parts[0] + parts[1]];

  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val < 128) {
      bytes.push(val);
    } else {
      const octets: number[] = [];
      octets.push(val & 0x7f);
      val >>= 7;
      while (val > 0) {
        octets.push((val & 0x7f) | 0x80);
        val >>= 7;
      }
      bytes.push(...octets.reverse());
    }
  }

  return Buffer.from(bytes);
}

/**
 * Decodes BER ASN.1 OID bytes into string
 */
export function decodeOid(buffer: Buffer, offset = 0, length?: number): string {
  const len = length ?? buffer.length - offset;
  if (len < 1) return '';

  const parts: number[] = [];
  const first = buffer[offset];
  parts.push(Math.floor(first / 40));
  parts.push(first % 40);

  let i = offset + 1;
  const end = offset + len;
  while (i < end) {
    let val = 0;
    let byte: number;
    do {
      byte = buffer[i++];
      val = (val << 7) | (byte & 0x7f);
    } while (byte & 0x80 && i < end);
    parts.push(val);
  }

  return parts.join('.');
}

/**
 * Builds SNMP Request Packet (pduType 0xA0 for GET, 0xA1 for GETNEXT)
 */
export function buildSnmpPacket(community: string, oidStr: string, pduType = 0xa0, requestId = 1001): Buffer {
  const communityBuf = Buffer.from(community, 'utf8');
  const oidBuf = encodeOid(oidStr);

  // VarBind: SEQUENCE { OID, NULL }
  const oidValBuf = Buffer.concat([
    Buffer.from([0x06, oidBuf.length]),
    oidBuf,
    Buffer.from([0x05, 0x00]), // NULL
  ]);
  const varBindBuf = Buffer.concat([
    Buffer.from([0x30, oidValBuf.length]),
    oidValBuf,
  ]);

  // VarBindList: SEQUENCE { VarBind }
  const varBindListBuf = Buffer.concat([
    Buffer.from([0x30, varBindBuf.length]),
    varBindBuf,
  ]);

  // Request ID (INTEGER)
  const reqIdBuf = Buffer.from([0x02, 0x04, (requestId >> 24) & 0xff, (requestId >> 16) & 0xff, (requestId >> 8) & 0xff, requestId & 0xff]);
  // Error Status (INTEGER 0)
  const errStatusBuf = Buffer.from([0x02, 0x01, 0x00]);
  // Error Index (INTEGER 0)
  const errIdxBuf = Buffer.from([0x02, 0x01, 0x00]);

  // PDU: GetRequest (0xA0) or GetNextRequest (0xA1)
  const pduBody = Buffer.concat([reqIdBuf, errStatusBuf, errIdxBuf, varBindListBuf]);
  const pduBuf = Buffer.concat([
    Buffer.from([pduType, pduBody.length]),
    pduBody,
  ]);

  // SNMP Version: INTEGER 1 (SNMPv2c)
  const versionBuf = Buffer.from([0x02, 0x01, 0x01]);

  // Community: OCTET STRING
  const commBuf = Buffer.concat([
    Buffer.from([0x04, communityBuf.length]),
    communityBuf,
  ]);

  // Message: SEQUENCE { version, community, PDU }
  const msgBody = Buffer.concat([versionBuf, commBuf, pduBuf]);
  return Buffer.concat([
    Buffer.from([0x30, msgBody.length]),
    msgBody,
  ]);
}

export interface SnmpResult {
  success: boolean;
  oid?: string;
  value?: any;
  rawText?: string;
  error?: string;
}

/**
 * Sends a single SNMP GET query (pduType 0xA0)
 */
export function snmpGetReal(
  host: string,
  community: string,
  oidStr: string,
  port = 161,
  timeoutMs = 3000
): Promise<SnmpResult> {
  return sendSnmpUDP(host, community, oidStr, 0xa0, port, timeoutMs);
}

/**
 * Sends a single SNMP GETNEXT query (pduType 0xA1)
 */
export function snmpGetNextReal(
  host: string,
  community: string,
  oidStr: string,
  port = 161,
  timeoutMs = 3000
): Promise<SnmpResult> {
  return sendSnmpUDP(host, community, oidStr, 0xa1, port, timeoutMs);
}

function sendSnmpUDP(
  host: string,
  community: string,
  oidStr: string,
  pduType: number,
  port = 161,
  timeoutMs = 3000
): Promise<SnmpResult> {
  return new Promise((resolve) => {
    const client = dgram.createSocket('udp4');
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.close();
        resolve({ success: false, error: `SNMP query timeout after ${timeoutMs}ms (${host}:${port})` });
      }
    }, timeoutMs);

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        client.close();
        resolve({ success: false, error: err.message });
      }
    });

    client.on('message', (msg) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        client.close();

        try {
          let returnedOid = oidStr;
          let parsedVal: any = null;
          let strVal = '';

          // Find OID in response buffer (Tag 0x06)
          for (let i = 0; i < msg.length - 4; i++) {
            if (msg[i] === 0x06) {
              const oidLen = msg[i + 1];
              if (oidLen > 0 && i + 2 + oidLen <= msg.length) {
                returnedOid = decodeOid(msg, i + 2, oidLen);
                break;
              }
            }
          }

          // Find Values (INTEGER 0x02, OCTET STRING 0x04, Gauge/Counter 0x41/0x42, Timeticks 0x43)
          for (let i = 10; i < msg.length - 1; i++) {
            const tag = msg[i];
            const len = msg[i + 1];

            if ((tag === 0x02 || tag === 0x41 || tag === 0x42 || tag === 0x43) && len > 0 && len <= 8) {
              let num = 0;
              for (let k = 0; k < len; k++) {
                num = (num << 8) | msg[i + 2 + k];
              }
              if (parsedVal === null) parsedVal = num;
            } else if (tag === 0x04 && len > 0 && len < 256) {
              if (i + 2 + len <= msg.length) {
                const s = msg.subarray(i + 2, i + 2 + len).toString('utf8').trim();
                if (s.length > 0) {
                  strVal = s;
                }
              }
            }
          }

          resolve({
            success: true,
            oid: returnedOid,
            value: parsedVal ?? strVal,
            rawText: strVal || (parsedVal !== null ? String(parsedVal) : ''),
          });
        } catch (e: any) {
          resolve({ success: false, error: `ASN.1 decode error: ${e.message}` });
        }
      }
    });

    try {
      const reqId = Math.floor(Math.random() * 65535) + 1;
      const packet = buildSnmpPacket(community, oidStr, pduType, reqId);
      client.send(packet, 0, packet.length, port, host, (err) => {
        if (err && !resolved) {
          resolved = true;
          clearTimeout(timer);
          client.close();
          resolve({ success: false, error: err.message });
        }
      });
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        client.close();
        resolve({ success: false, error: err.message });
      }
    }
  });
}

/**
 * Performs a REAL SNMP WALK over an OID sub-tree (e.g. ONU Table)
 */
export async function snmpWalkReal(
  host: string,
  community: string,
  rootOid: string,
  maxIterations = 64,
  port = 161,
  timeoutMs = 2500
): Promise<SnmpResult[]> {
  const results: SnmpResult[] = [];
  let currentOid = rootOid;
  const cleanRoot = rootOid.replace(/^\./, '');

  for (let i = 0; i < maxIterations; i++) {
    const res = await snmpGetNextReal(host, community, currentOid, port, timeoutMs);
    if (!res.success || !res.oid) break;

    const cleanResOid = res.oid.replace(/^\./, '');
    if (!cleanResOid.startsWith(cleanRoot)) {
      break; // Reached end of sub-tree
    }

    if (cleanResOid === currentOid.replace(/^\./, '')) {
      break; // Prevent infinite loop if OLT loops on same OID
    }

    results.push(res);
    currentOid = res.oid;
  }

  return results;
}
