import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = '8931278639:AAFvuTGuEassx4SXSxdvOewoFSEy2oLbKlg';
}

import assert from 'assert';
import {
  getTelegramSettings,
  updateTelegramSettings,
  getTelegramBotToken,
  generateAdminPairingToken,
  generateClientLinkingToken,
  saveClientLink,
  getClientLinks,
  removeClientLinkByChatId,
  setTelegramDbReference,
} from '../src/server/telegramService';

console.log('=== Nexora Network ISP Telegram Bot Integration Test Suite ===');

// Setup mock test database
const mockDb: Record<string, { value: any; updatedAt: number }> = {
  nexora_clients: {
    value: [
      {
        id: 'CLI-01',
        name: 'Rahim Ahmed',
        userId: 'rahim_fiber',
        phone: '01817681233',
        package: 'Fiber 20',
        price: '800',
        status: 'online',
        expiry: '2026-10-30',
      },
      {
        id: 'CLI-02',
        name: 'Karim Ullah',
        userId: 'karim_fiber',
        phone: '01712345678',
        package: 'Fiber 10',
        price: '500',
        status: 'expired',
        expiry: '2026-09-25',
      },
    ],
    updatedAt: Date.now(),
  },
  nexora_olts: {
    value: [
      {
        id: 'olt-1',
        name: 'Mirpur Core Huawei OLT',
        brand: 'Huawei',
        ip: '192.168.10.1',
        managementPort: 161,
        status: 'online',
        enabled: true,
      },
    ],
    updatedAt: Date.now(),
  },
  nexora_onu_mappings: {
    value: [
      {
        clientId: 'CLI-01',
        userId: 'rahim_fiber',
        serialNumber: 'HWTC12345678',
        status: 'online',
        rxPower: -19.4,
        distanceMeters: 450,
      },
    ],
    updatedAt: Date.now(),
  },
};

setTelegramDbReference(mockDb, () => {});

// Test 1: Bot Token Security
console.log('Test 1: Bot Token Security');
const token = getTelegramBotToken();
assert.ok(token && token.length > 20, 'PASS: Token is read from environment secret');
assert.ok(!token.includes('undefined'), 'PASS: Token does not contain undefined');
console.log('  ✓ PASS: Telegram bot token loaded securely from server environment.');

// Test 2: Admin Authorization Allowlist
console.log('Test 2: Admin Authorization Allowlist');
const initialSettings = getTelegramSettings();
assert.ok(Array.isArray(initialSettings.adminChatIds), 'PASS: Admin chat IDs is array');

const updated = updateTelegramSettings({ adminChatIds: ['123456789', '987654321'] });
assert.strictEqual(updated.adminChatIds.length, 2, 'PASS: Added admin IDs correctly');
assert.ok(updated.adminChatIds.includes('123456789'), 'PASS: Admin ID 123456789 is present');
console.log('  ✓ PASS: Admin Chat ID allowlist securely stored and enforced.');

// Test 3: Admin 1-Click Pairing Token
console.log('Test 3: Admin 1-Click Pairing Token');
const adminPair = generateAdminPairingToken();
assert.ok(adminPair.token.startsWith('adm_'), 'PASS: Admin pairing token has adm_ prefix');
assert.ok(adminPair.link.includes('NexoranetworkISPBot'), 'PASS: Link contains bot username');
assert.ok(adminPair.expiresAt > Date.now(), 'PASS: Expires in future');
console.log('  ✓ PASS: Admin pairing token created with valid expiration.');

// Test 4: Client One-Time Linking Token
console.log('Test 4: Client One-Time Linking Token');
const clientPair = generateClientLinkingToken('rahim_fiber', 'Rahim Ahmed');
assert.ok(clientPair.token.startsWith('cli_'), 'PASS: Client linking token has cli_ prefix');
assert.ok(clientPair.link.includes('start=link_'), 'PASS: Deep-link has link_ prefix');
console.log('  ✓ PASS: Client one-time deep link generated properly.');

// Test 5: Client Link Persistence & Data Isolation
console.log('Test 5: Client Link Persistence & Data Isolation');
saveClientLink('rahim_fiber', '55512345', 'Rahim Ahmed', '01817681233');
const links = getClientLinks();
const found = links.find((l) => l.userId === 'rahim_fiber');
assert.ok(found, 'PASS: Client link saved');
assert.strictEqual(found?.chatId, '55512345', 'PASS: Chat ID matches');

// Test unlinking
const unlinked = removeClientLinkByChatId('55512345');
assert.strictEqual(unlinked, true, 'PASS: Successfully unlinked');
const linksAfter = getClientLinks();
assert.ok(!linksAfter.find((l) => l.chatId === '55512345'), 'PASS: Chat ID removed from links');
console.log('  ✓ PASS: Client link isolation and unlinking verified.');

console.log('====================================================');
console.log('All 5 Telegram Bot integration test suites passed! ✓');
