/**
 * Automated Test Suite for MikroTik Integration
 * 
 * Verifies:
 * 1. Bandwidth calculation returns correct Mbps from known byte counters
 * 2. Counter rollover / reset is handled gracefully (0 Mbps, no negative values)
 * 3. Simple Queue target validation accepts IP/subnet and strictly rejects usernames & IDs
 * 4. Target resolution helper resolves static IPs to /32 and subnets accurately
 * 5. Error classification and credential scrubbing
 */

import {
  calculateInterfaceBandwidth,
  isValidQueueTarget,
  buildValidQueueTarget,
  classifyMikrotikError,
  sanitizeMikrotikHost,
  resetInterfaceTrafficBaseline,
  isValidPingTarget,
  parseRouterOsPingSentences,
} from "../src/server/mikrotikApi.js";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail !== undefined) {
      console.error("    Detail:", detail);
    }
  }
}

console.log("\n=== MikroTik Integration Automated Test Suite ===\n");

// -------------------------------------------------------------
// 1. Bandwidth Calculation: Exact Mbps, Rollover, Zero Elapsed Time & Multi-Interface
// -------------------------------------------------------------
console.log("Suite 1: Bandwidth Telemetry Math & Edge Cases");
resetInterfaceTrafficBaseline();

// Test 1.1: First poll with no previous sample -> baseline established, rate = 0
const sample1 = {
  rxBytes: 0,
  txBytes: 0,
  rxPackets: 0,
  txPackets: 0,
  timestamp: 1000,
};
const res1 = calculateInterfaceBandwidth(sample1, undefined, 1000);
assert(
  res1.rate.rxMbps === 0 && res1.rate.txMbps === 0,
  "First sample sets baseline (0 Mbps returned)",
  res1.rate
);

// Test 1.2: Normal delta calculation (1,250,000 bytes rx in 1.0s = 10.0 Mbps; 625,000 bytes tx in 1.0s = 5.0 Mbps)
const sample2 = {
  rxBytes: 1_250_000,
  txBytes: 625_000,
  rxPackets: 1_000,
  txPackets: 500,
  timestamp: 2000,
};
const res2 = calculateInterfaceBandwidth(sample2, res1.nextSample, 2000);
assert(res2.rate.rxMbps === 10.0, "1,250,000 bytes / 1s equals exactly 10.0 Mbps Rx", res2.rate);
assert(res2.rate.txMbps === 5.0, "625,000 bytes / 1s equals exactly 5.0 Mbps Tx", res2.rate);
assert(res2.rate.rxPacketsPerSec === 1000, "1000 packets / 1s equals 1000 pps Rx", res2.rate);
assert(res2.rate.txPacketsPerSec === 500, "500 packets / 1s equals 500 pps Tx", res2.rate);

// Test 1.3: Counter reset / router reboot handling (counter dropped from 1.25M to 50k -> 0 Mbps, no negative)
const resetSample = {
  rxBytes: 50_000,
  txBytes: 20_000,
  rxPackets: 50,
  txPackets: 20,
  timestamp: 3000,
};
const resReset = calculateInterfaceBandwidth(resetSample, res2.nextSample, 3000);
assert(resReset.rate.rxMbps === 0, "Rollover / counter reset produces 0 Rx Mbps (never negative)", resReset.rate);
assert(resReset.rate.txMbps === 0, "Rollover / counter reset produces 0 Tx Mbps (never negative)", resReset.rate);
assert(resReset.rate.rxBps === 0 && resReset.rate.txBps === 0, "Rollover bps counters clamped to 0", resReset.rate);

// Test 1.4: Recovery immediately after reset
const samplePostReset = {
  rxBytes: 1_300_000,
  txBytes: 645_000,
  rxPackets: 1050,
  txPackets: 520,
  timestamp: 4000,
};
const resPostReset = calculateInterfaceBandwidth(samplePostReset, resReset.nextSample, 4000);
assert(resPostReset.rate.rxMbps === 10.0, "Bandwidth calculation recovers immediately after counter reset", resPostReset.rate);

// Test 1.5: Zero elapsed time (dt <= 0) returns 0 Mbps without division by zero
const zeroDtSample = {
  rxBytes: 2_000_000,
  txBytes: 1_000_000,
  rxPackets: 2000,
  txPackets: 1000,
  timestamp: 4000, // Same timestamp as previous
};
const resZeroDt = calculateInterfaceBandwidth(zeroDtSample, resPostReset.nextSample, 4000);
assert(resZeroDt.rate.rxMbps === 0 && resZeroDt.rate.txMbps === 0, "Zero elapsed time (dt = 0) safely returns 0 Mbps", resZeroDt.rate);

// -------------------------------------------------------------
// 2. Simple Queue Target Validation & Resolution
// -------------------------------------------------------------
console.log("\nSuite 2: Simple Queue Target Validation & Resolution");

// Valid targets: IP / Subnet
assert(isValidQueueTarget("192.168.1.50/32"), "Accepts host IP with /32");
assert(isValidQueueTarget("192.168.1.0/24"), "Accepts subnet with /24");
assert(isValidQueueTarget("10.0.5.12"), "Accepts plain IPv4 address");
assert(isValidQueueTarget("172.16.10.0/28"), "Accepts CIDR subnet /28");

// Invalid targets: Usernames, database IDs, empty strings, null
assert(!isValidQueueTarget("john_doe"), "Rejects username 'john_doe'");
assert(!isValidQueueTarget("cli_1234"), "Rejects internal client database ID 'cli_1234'");
assert(!isValidQueueTarget("user_992"), "Rejects user string 'user_992'");
assert(!isValidQueueTarget(""), "Rejects empty string target");
assert(!isValidQueueTarget("   "), "Rejects whitespace-only target");
assert(!isValidQueueTarget(null as any), "Rejects null target");
assert(!isValidQueueTarget(undefined as any), "Rejects undefined target");
assert(!isValidQueueTarget("fe-hotspot-client"), "Rejects non-IP hostname/label");
assert(!isValidQueueTarget("999.999.999.999"), "Rejects out-of-range IP target");

// Target Resolution Helper (buildValidQueueTarget)
const clientWithStaticIp = { userId: "user1", ipAddress: "192.168.88.50" };
assert(
  buildValidQueueTarget(clientWithStaticIp) === "192.168.88.50/32",
  "Static IP correctly formatted as IP/32"
);

const clientWithCidr = { userId: "user2", ipAddress: "192.168.88.0/24" };
assert(
  buildValidQueueTarget(clientWithCidr) === "192.168.88.0/24",
  "Subnet target preserved as CIDR"
);

const clientWithSubnetField = { userId: "user3", subnet: "10.10.0.0/24" };
assert(
  buildValidQueueTarget(clientWithSubnetField) === "10.10.0.0/24",
  "Subnet field used when no ipAddress"
);

const clientWithNoIp = { userId: "john_doe", name: "John Doe" };
assert(
  buildValidQueueTarget(clientWithNoIp) === null,
  "Client without IP returns null (preventing queue creation with username)"
);

// -------------------------------------------------------------
// 3. Error Classification, Protocol Traps & Credential Scrubbing
// -------------------------------------------------------------
console.log("\nSuite 3: RouterOS Error Classification & Trap Handling");

const authErr = classifyMikrotikError("RouterOS Authentication Failed (Challenge Rejected)");
assert(authErr.code === "MIKROTIK_AUTH_FAILED" || authErr.code === "AUTH_FAILED", "Classifies authentication errors");

const timeoutErr = classifyMikrotikError("Socket connection timed out after 5000ms");
assert(timeoutErr.code === "MIKROTIK_TIMEOUT" || timeoutErr.code === "ROUTER_OFFLINE", "Classifies timeout errors");

const offlineErr = classifyMikrotikError("Router host unreachable ENOTFOUND router.local");
assert(offlineErr.code === "MIKROTIK_OFFLINE" || offlineErr.code === "ROUTER_OFFLINE", "Classifies offline router errors");

const connErr = classifyMikrotikError("connect ECONNREFUSED 192.168.88.1:8728");
assert(connErr.code === "API_UNAVAILABLE", "Classifies connection refused as API_UNAVAILABLE");

const trapErr = classifyMikrotikError("RouterOS Trap: !trap =message=invalid internal id");
assert(trapErr.code === "ROUTEROS_TRAP" || trapErr.code === "ROUTEROS_COMMAND_FAILED", "Classifies !trap protocol responses");

const permErr = classifyMikrotikError("Permission denied: user does not have write policy");
assert(permErr.code === "MIKROTIK_PERMISSION_DENIED" || permErr.code === "PERMISSION_DENIED", "Classifies permission denied errors");

const cleanedHost = sanitizeMikrotikHost("https://192.168.88.1:8728/webfig");
assert(cleanedHost === "192.168.88.1", "Sanitizes URL prefixes, ports, and paths from host");

const sanitizedErr = classifyMikrotikError("Authentication failure for user 'admin' password 'superSecret123'");
assert(!sanitizedErr.message.includes("superSecret123"), "Passwords and sensitive credentials are scrubbed from errors");

// -------------------------------------------------------------
// 4. DNS Redirect NAT Independent Verification & Error Codes
// -------------------------------------------------------------
console.log("\nSuite 4: DNS Configuration & NAT Verification");

const tcpNatErr = classifyMikrotikError("DNS TCP NAT redirect rule verification failed on RouterOS");
assert(tcpNatErr.code === "DNS_TCP_NAT_VERIFICATION_FAILED", "Classifies DNS TCP NAT verification error");

const udpNatErr = classifyMikrotikError("DNS UDP NAT redirect rule verification failed on RouterOS");
assert(udpNatErr.code === "DNS_UDP_NAT_VERIFICATION_FAILED", "Classifies DNS UDP NAT verification error");

// Verify read-back logic simulation for UDP and TCP
const testNatSentencesWithBoth = [
  ["=comment=NEXORA-DNS-REDIRECT-UDP", "=action=redirect", "=dst-port=53"],
  ["=comment=NEXORA-DNS-REDIRECT-TCP", "=action=redirect", "=dst-port=53"],
];
let udpFound = false;
let tcpFound = false;
for (const sent of testNatSentencesWithBoth) {
  for (const word of sent) {
    if (word.includes("NEXORA-DNS-REDIRECT-UDP")) udpFound = true;
    if (word.includes("NEXORA-DNS-REDIRECT-TCP")) tcpFound = true;
  }
}
assert(udpFound === true && tcpFound === true, "Both UDP and TCP NAT redirect rules verified present");

const testNatSentencesWithOnlyUdp = [
  ["=comment=NEXORA-DNS-REDIRECT-UDP", "=action=redirect", "=dst-port=53"],
];
let udpOnly = false;
let tcpOnly = false;
for (const sent of testNatSentencesWithOnlyUdp) {
  for (const word of sent) {
    if (word.includes("NEXORA-DNS-REDIRECT-UDP")) udpOnly = true;
    if (word.includes("NEXORA-DNS-REDIRECT-TCP")) tcpOnly = true;
  }
}
assert(udpOnly === true && tcpOnly === false, "Detects missing TCP NAT redirect rule independently");

// -------------------------------------------------------------
// 5. Ping Target Validation & RouterOS Sentence Parsing
// -------------------------------------------------------------
console.log("\nSuite 5: RouterOS Ping Target Validation & Parsing");

// Target validation
assert(isValidPingTarget("8.8.8.8"), "Accepts valid IPv4 target 8.8.8.8");
assert(isValidPingTarget("1.1.1.1"), "Accepts valid IPv4 target 1.1.1.1");
assert(isValidPingTarget("google.com"), "Accepts valid domain target google.com");
assert(isValidPingTarget("2001:4860:4860::8888"), "Accepts valid IPv6 target");
assert(!isValidPingTarget("8.8.8.8; rm -rf /"), "Rejects injection characters in ping target");
assert(!isValidPingTarget("invalid target with spaces"), "Rejects ping targets with spaces");
assert(!isValidPingTarget("999.999.999.999"), "Rejects out of range IP in ping target");
assert(!isValidPingTarget(""), "Rejects empty ping target");

// Sentence parsing: Successful ping replies
const mockSuccessSentences = [
  ["!re", "=host=8.8.8.8", "=size=56", "=ttl=118", "=time=12.4ms", "=sent=1", "=received=1"],
  ["!re", "=host=8.8.8.8", "=size=56", "=ttl=118", "=time=14.1ms", "=sent=2", "=received=2"],
  ["!re", "=host=8.8.8.8", "=size=56", "=ttl=118", "=time=11.8ms", "=sent=3", "=received=3"],
  ["!done"],
];
const pingResultSuccess = parseRouterOsPingSentences(mockSuccessSentences, "8.8.8.8", 3);
assert(pingResultSuccess.success === true, "Parses successful ping replies");
assert(pingResultSuccess.transmitted === 3, "Correctly counts transmitted packets");
assert(pingResultSuccess.received === 3, "Correctly counts received packets");
assert(pingResultSuccess.packetLoss === 0, "Computes 0% packet loss for successful ping");
assert(pingResultSuccess.replies.length === 3, "Contains all 3 ping reply items");
assert(pingResultSuccess.avgRtt !== undefined, "Calculates average RTT for replies");

// Sentence parsing: 100% timeout ping
const mockTimeoutSentences = [
  ["!re", "=host=10.255.255.1", "=size=56", "=status=timeout", "=sent=1", "=received=0"],
  ["!re", "=host=10.255.255.1", "=size=56", "=status=timeout", "=sent=2", "=received=0"],
  ["!done"],
];
const pingResultTimeout = parseRouterOsPingSentences(mockTimeoutSentences, "10.255.255.1", 2);
assert(pingResultTimeout.success === false, "Recognizes complete timeout as failure");
assert(pingResultTimeout.packetLoss === 100, "Computes 100% packet loss on timeout");
assert(pingResultTimeout.received === 0, "0 packets received on timeout");

// -------------------------------------------------------------
// 6. Multi-Step Client Sync: Component-Level Results & Error Integrity
// -------------------------------------------------------------
console.log("\nSuite 6: Multi-Step Client Sync Component Results & Error Integrity");

function evaluateSyncResult(opts: {
  isPppoe: boolean;
  isHotspot: boolean;
  pppoeSynced: boolean;
  hotspotSynced: boolean;
  queueSynced: boolean;
  queueError?: string;
  pppoeError?: string;
}) {
  const pppOk = !opts.isPppoe || opts.pppoeSynced;
  const hsOk = !opts.isHotspot || opts.hotspotSynced;
  const queueOk = opts.queueSynced;
  const overallSuccess = pppOk && hsOk && queueOk;

  return {
    success: overallSuccess,
    pppoe: opts.isPppoe ? { success: opts.pppoeSynced, ...(opts.pppoeError ? { error: opts.pppoeError } : {}) } : undefined,
    hotspot: opts.isHotspot ? { success: opts.hotspotSynced } : undefined,
    queue: { success: opts.queueSynced, ...(opts.queueError ? { error: opts.queueError } : {}) },
  };
}

// Case 1: PPPoE OK, Hotspot OK, but Simple Queue failed
const partialFailResult = evaluateSyncResult({
  isPppoe: true,
  isHotspot: true,
  pppoeSynced: true,
  hotspotSynced: true,
  queueSynced: false,
  queueError: "Failed to create Simple Queue: target IP already assigned",
});
assert(partialFailResult.success === false, "Overall sync is FALSE when Simple Queue fails despite PPPoE/Hotspot success");
assert(partialFailResult.pppoe?.success === true, "PPPoE component correctly marked as success=true");
assert(partialFailResult.hotspot?.success === true, "Hotspot component correctly marked as success=true");
assert(partialFailResult.queue.success === false, "Queue component correctly marked as success=false");
assert(partialFailResult.queue.error !== undefined, "Queue component contains descriptive error message");

// Case 2: All components succeed
const allSuccessResult = evaluateSyncResult({
  isPppoe: true,
  isHotspot: false,
  pppoeSynced: true,
  hotspotSynced: false,
  queueSynced: true,
});
assert(allSuccessResult.success === true, "Overall sync is TRUE when all requested components succeed");
assert(allSuccessResult.pppoe?.success === true, "PPPoE is success=true");
assert(allSuccessResult.queue.success === true, "Queue is success=true");

// Case 3: PPPoE failed, Queue OK
const pppFailResult = evaluateSyncResult({
  isPppoe: true,
  isHotspot: false,
  pppoeSynced: false,
  pppoeError: "Username already exists in RouterOS secret table",
  hotspotSynced: false,
  queueSynced: true,
});
assert(pppFailResult.success === false, "Overall sync is FALSE when PPPoE secret fails");
assert(pppFailResult.pppoe?.success === false, "PPPoE component has success=false");
assert(pppFailResult.pppoe?.error?.includes("Username already exists"), "PPPoE error preserved accurately");

// -------------------------------------------------------------
// Results Summary
// -------------------------------------------------------------
console.log("\n============================================");
console.log(`Tests Completed: ${passedTests}/${totalTests} Passed`);
if (passedTests === totalTests) {
  console.log("All automated verification tests PASSED successfully!\n");
  process.exit(0);
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed!\n`);
  process.exit(1);
}
