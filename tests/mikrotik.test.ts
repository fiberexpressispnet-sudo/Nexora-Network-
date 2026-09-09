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

console.log("\n=== MikroTik Integration Automated Tests ===\n");

// -------------------------------------------------------------
// 1. Bandwidth Calculation: Exact Mbps from known byte counters
// -------------------------------------------------------------
console.log("Suite 1: Real Bandwidth Calculation");
resetInterfaceTrafficBaseline();

// Sample 1: 0 bytes at T=1000
const sample1 = {
  rxBytes: 0,
  txBytes: 0,
  rxPackets: 0,
  txPackets: 0,
  timestamp: 1000,
};

// First poll with no previous sample -> baseline established, rate = 0
const res1 = calculateInterfaceBandwidth(sample1, undefined, 1000);
assert(
  res1.rate.rxMbps === 0 && res1.rate.txMbps === 0,
  "First sample sets baseline (0 Mbps returned)",
  res1.rate
);

// Sample 2: 1,250,000 bytes rx in 1.0 second (1,250,000 * 8 = 10,000,000 bits = 10.0 Mbps)
//           625,000 bytes tx in 1.0 second (625,000 * 8 = 5,000,000 bits = 5.0 Mbps)
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

// -------------------------------------------------------------
// 2. Counter Rollover & Reset Safety (No Negative Mbps)
// -------------------------------------------------------------
console.log("\nSuite 2: Counter Rollover & Reset Handling");

// Router rebooted or interface reset -> counter dropped from 1,250,000 to 50,000
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

// Next sample after reset: regular progression from 50,000 to 1,300,000 (+1,250,000 in 1s)
const samplePostReset = {
  rxBytes: 1_300_000,
  txBytes: 645_000,
  rxPackets: 1050,
  txPackets: 520,
  timestamp: 4000,
};

const resPostReset = calculateInterfaceBandwidth(samplePostReset, resReset.nextSample, 4000);
assert(resPostReset.rate.rxMbps === 10.0, "Bandwidth calculation recovers immediately after counter reset", resPostReset.rate);

// -------------------------------------------------------------
// 3. Simple Queue Target Validation
// -------------------------------------------------------------
console.log("\nSuite 3: Simple Queue Target Validation");

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

// -------------------------------------------------------------
// 4. Target Resolution Helper (buildValidQueueTarget)
// -------------------------------------------------------------
console.log("\nSuite 4: Target Resolution Helper (buildValidQueueTarget)");

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
// 5. Error Classification & Security
// -------------------------------------------------------------
console.log("\nSuite 5: Error Classification & Security");

const authErr = classifyMikrotikError("RouterOS Authentication Failed (Challenge Rejected)");
assert(authErr.code === "AUTH_FAILED", "Classifies authentication errors");

const timeoutErr = classifyMikrotikError("Socket connection timed out after 5000ms");
assert(timeoutErr.code === "ROUTER_OFFLINE", "Classifies timeout errors as ROUTER_OFFLINE");

const connErr = classifyMikrotikError("connect ECONNREFUSED 192.168.88.1:8728");
assert(connErr.code === "API_UNAVAILABLE", "Classifies connection refused as API_UNAVAILABLE");

const cleanedHost = sanitizeMikrotikHost("https://192.168.88.1:8728/webfig");
assert(cleanedHost === "192.168.88.1", "Sanitizes URL prefixes, ports, and paths from host");

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
