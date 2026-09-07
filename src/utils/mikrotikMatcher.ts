import { Client, MikrotikRouter } from '../types';

/**
 * Robustly and intelligently matches a subscriber (Client) to a MikroTik Router.
 * Handles exact router name, ID, IP address, partial name matching (e.g. after renaming),
 * branch/model identifier matching (RB4011, CCR2004, Branch-1, Jatrabari),
 * connection type heuristics (Hotspot/Mobile vs PPPoE), and default/fallback routing.
 */
export const matchClientToRouter = (
  client: Client,
  router: MikrotikRouter,
  allRouters: MikrotikRouter[] = []
): boolean => {
  if (!client || !router) return false;

  const cRouter = (client.router || '').trim().toLowerCase();
  const rName = (router.name || '').trim().toLowerCase();
  const rId = (router.id || '').trim().toLowerCase();
  const rIp = (router.ip || '').trim().toLowerCase();

  // 1. Direct match by router name, ID, or IP
  if (cRouter && (cRouter === rName || cRouter === rId || cRouter === rIp)) {
    return true;
  }

  // 2. Exact match on clean sanitized name (ignoring extra spaces, dashes, parentheses)
  const sanitize = (str: string) => str.replace(/[^a-z0-9]/g, '');
  if (cRouter && sanitize(cRouter) === sanitize(rName)) {
    return true;
  }

  // 3. Substring matching if client specifies a router
  if (cRouter && (rName.includes(cRouter) || cRouter.includes(rName))) {
    return true;
  }

  // 4. Match common router model or branch keywords
  // e.g. "Jatrabari Branch-1 Hotspot Router (RB4011)" vs "Branch-1 Hotspot Router" or "RB4011"
  const keywords = ['branch-1', 'branch-2', 'branch-3', 'jatrabari', 'uttara', 'mirpur', 'dhanmondi', 'gulshan', 'rb4011', 'ccr2004', 'ccr1036', '4011', '2004', '1036'];
  for (const kw of keywords) {
    if (rName.includes(kw) && cRouter.includes(kw)) {
      return true;
    }
  }

  // 5. Hotspot vs PPPoE smart mode routing:
  const isHotspotRouter = router.mode === 'Hotspot' || rName.includes('hotspot') || rName.includes('4011');
  const isHotspotClient = client.deviceType === 'Mobile' ||
    (client.package && /hotspot|voucher|pass|daily|hour|mini|mobile/i.test(client.package));

  if (isHotspotRouter && isHotspotClient) {
    // Check if client is explicitly pinned to a DIFFERENT specific router
    const explicitlyOther = allRouters.some(
      (other) =>
        other.id !== router.id &&
        cRouter &&
        (cRouter === other.name.toLowerCase() || cRouter === other.id.toLowerCase() || cRouter === other.ip.toLowerCase())
    );
    if (!explicitlyOther) return true;
  }

  // 6. PPPoE / Broadband router matching:
  const isPppoeRouter = router.mode === 'PPPoE' || rName.includes('pppoe') || rName.includes('ccr2004');
  const isPppoeClient = client.deviceType === 'Router' ||
    (client.package && /pppoe|fiber|monthly|broadband|mbps/i.test(client.package));

  if (isPppoeRouter && isPppoeClient && !isHotspotClient) {
    const explicitlyOther = allRouters.some(
      (other) =>
        other.id !== router.id &&
        cRouter &&
        (cRouter === other.name.toLowerCase() || cRouter === other.id.toLowerCase() || cRouter === other.ip.toLowerCase())
    );
    if (!explicitlyOther) return true;
  }

  // 7. Default or Core router fallback (for clients with no router or 'main router' / 'core' / 'default')
  if (router.isDefault || router.mode === 'Core' || router.id === 'mk-01') {
    if (!client.router || cRouter === 'main router' || cRouter === 'core' || cRouter === 'core mikrotik gateway' || cRouter === 'default') {
      return true;
    }
  }

  // 8. If only 1 router exists in the entire system, all clients belong to it
  if (allRouters.length === 1) {
    return true;
  }

  return false;
};
