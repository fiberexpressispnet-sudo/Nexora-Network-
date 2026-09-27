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
 * Builds SNMP v2c GET Request Packet
 */
export function buildSnmpGetPacket(community: string, oidStr: string, requestId = 1001): Buffer {
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

  // PDU: GetRequest (0xA0)
  const pduBody = Buffer.concat([reqIdBuf, errStatusBuf, errIdxBuf, varBindListBuf]);
  const pduBuf = Buffer.concat([
    Buffer.from([0xa0, pduBody.length]),
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

/**
 * Sends a real SNMP v2c UDP Query to OLT IP and parses ASN.1 response
 */
export function snmpGetReal(
  host: string,
  community: string,
  oidStr: string,
  port = 161,
  timeoutMs = 3000
): Promise<{ success: boolean; oid?: string; value?: any; rawText?: string; error?: string }> {
  return new Promise((resolve) => {
    const client = dgram.createSocket('udp4');
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.close();
        resolve({ success: false, error: `SNMP UDP query timed out after ${timeoutMs}ms (${host}:${port})` });
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
          // Parse ASN.1 SNMP Response
          // Primitive parsing for scalar or string values
          const msgStr = msg.toString('latin1');
          const valueOffset = msg.length - 20;

          // Attempt string or integer extraction from buffer
          let parsedValue: any = null;
          let strVal = '';

          for (let i = 0; i < msg.length - 2; i++) {
            // Check for INTEGER (0x02)
            if (msg[i] === 0x02 && msg[i + 1] <= 8) {
              let val = 0;
              const len = msg[i + 1];
              for (let k = 0; k < len; k++) {
                val = (val << 8) | msg[i + 2 + k];
              }
              if (parsedValue === null) parsedValue = val;
            }
            // Check for OCTET STRING (0x04)
            if (msg[i] === 0x04 && msg[i + 1] > 2 && msg[i + 1] < 128) {
              const strLen = msg[i + 1];
              if (i + 2 + strLen <= msg.length) {
                const subStr = msg.subarray(i + 2, i + 2 + strLen).toString('utf8');
                if (subStr.trim().length > 0) {
                  strVal = subStr.trim();
                }
              }
            }
          }

          resolve({
            success: true,
            oid: oidStr,
            value: parsedValue ?? strVal,
            rawText: strVal || (parsedValue !== null ? String(parsedValue) : msgStr),
          });
        } catch (e: any) {
          resolve({ success: false, error: `ASN.1 parsing error: ${e.message}` });
        }
      }
    });

    try {
      const packet = buildSnmpGetPacket(community, oidStr);
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
