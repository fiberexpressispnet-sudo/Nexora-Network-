import {
  OLTConfig,
  ONUInfo,
  OLTAlert,
  CustomerOnuMapping,
  DEFAULT_OPTICAL_THRESHOLDS,
  OLTTestResult,
} from './types';
import { createOLTAdapter } from './adapterFactory';

export async function fetchOltListApi(): Promise<OLTConfig[]> {
  try {
    const res = await fetch('/api/olt/list', {
      headers: {
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.olts)) {
      return data.olts;
    }
  } catch (err) {
    console.warn('Failed to fetch OLT list from server', err);
  }
  return [];
}

export async function saveOltApi(olt: Partial<OLTConfig>): Promise<{ success: boolean; message?: string; olt?: OLTConfig; error?: string }> {
  try {
    const res = await fetch('/api/olt/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
      body: JSON.stringify(olt),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message, olt: data.olt };
    }
    return { success: false, error: data.error || 'Failed to save OLT configuration' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error saving OLT' };
  }
}

export async function deleteOltApi(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/olt/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testOltConnectionApi(olt: OLTConfig): Promise<OLTTestResult> {
  const adapter = createOLTAdapter(olt);
  return adapter.testConnection();
}

export async function fetchOnuListApi(oltId?: string, slotPort?: string): Promise<ONUInfo[]> {
  try {
    const params = new URLSearchParams();
    if (oltId) params.append('oltId', oltId);
    if (slotPort) params.append('slotPort', slotPort);

    const res = await fetch(`/api/olt/onu-list?${params.toString()}`, {
      headers: {
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.onus)) {
      return data.onus;
    }
  } catch (err) {
    console.warn('Failed to fetch ONU list from server', err);
  }
  return [];
}

export async function mapClientToOnuApi(mappingData: {
  clientId: string;
  clientName?: string;
  userId?: string;
  oltId?: string;
  oltName?: string;
  slot?: string;
  ponPort?: string;
  onuId?: string;
  serialNumber: string;
  macAddress?: string;
}): Promise<{ success: boolean; message?: string; mapping?: CustomerOnuMapping; error?: string }> {
  try {
    const res = await fetch('/api/olt/map-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
      body: JSON.stringify(mappingData),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message, mapping: data.mapping };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rebootOnuApi(oltId: string, onuId: string, serialNumber: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/olt/reboot-onu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
      },
      body: JSON.stringify({ oltId, onuId, serialNumber }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates live system alerts for OLTs and ONUs based on real states and optical power
 */
export function generateOltAlerts(olts: OLTConfig[], onus: ONUInfo[]): OLTAlert[] {
  const alerts: OLTAlert[] = [];
  const now = new Date().toISOString();

  // OLT level alerts
  olts.forEach((olt) => {
    if (olt.status === 'offline') {
      alerts.push({
        id: `alt_olt_off_${olt.id}`,
        oltId: olt.id,
        oltName: olt.name,
        type: 'olt_offline',
        severity: 'critical',
        title: 'OLT Disconnected / Offline',
        message: `OLT "${olt.name}" (${olt.ip}) failed management heartbeat. System is offline.`,
        timestamp: olt.lastSync || now,
        acknowledged: false,
      });
    } else if (olt.cpuUsage && olt.cpuUsage > 85) {
      alerts.push({
        id: `alt_olt_cpu_${olt.id}`,
        oltId: olt.id,
        oltName: olt.name,
        type: 'high_cpu',
        severity: 'warning',
        title: 'High OLT CPU Load',
        message: `OLT "${olt.name}" CPU utilization is at ${olt.cpuUsage}%.`,
        timestamp: now,
        acknowledged: false,
      });
    } else if (olt.temperature && olt.temperature > 65) {
      alerts.push({
        id: `alt_olt_temp_${olt.id}`,
        oltId: olt.id,
        oltName: olt.name,
        type: 'high_temp',
        severity: 'warning',
        title: 'High OLT Temperature',
        message: `OLT "${olt.name}" chassis temperature reached ${olt.temperature}°C. Check cooling/fans.`,
        timestamp: now,
        acknowledged: false,
      });
    }
  });

  // ONU level alerts
  onus.forEach((onu) => {
    if (onu.status === 'los') {
      alerts.push({
        id: `alt_los_${onu.oltId}_${onu.serialNumber}`,
        oltId: onu.oltId,
        oltName: onu.oltName || 'OLT',
        type: 'los',
        severity: 'critical',
        title: 'Fiber Loss of Signal (LOS)',
        message: `ONU ${onu.id} (${onu.serialNumber}) detected total signal loss (LOS). Fiber cable may be severed.`,
        timestamp: now,
        acknowledged: false,
        onuSn: onu.serialNumber,
        clientId: onu.mappedClientId || undefined,
      });
    } else if (onu.status === 'power_low' || (onu.rxPower !== null && onu.rxPower <= DEFAULT_OPTICAL_THRESHOLDS.warningMinRx)) {
      alerts.push({
        id: `alt_rx_low_${onu.oltId}_${onu.serialNumber}`,
        oltId: onu.oltId,
        oltName: onu.oltName || 'OLT',
        type: 'low_rx_power',
        severity: onu.rxPower && onu.rxPower <= DEFAULT_OPTICAL_THRESHOLDS.criticalMinRx ? 'critical' : 'warning',
        title: 'Low Optical RX Power',
        message: `ONU ${onu.id} (${onu.serialNumber}${onu.mappedClientName ? ` - ${onu.mappedClientName}` : ''}) RX power is ${onu.rxPower ? onu.rxPower.toFixed(1) : 'N/A'} dBm (Threshold: -25.0 dBm).`,
        timestamp: now,
        acknowledged: false,
        onuSn: onu.serialNumber,
        clientId: onu.mappedClientId || undefined,
      });
    } else if (onu.status === 'offline') {
      alerts.push({
        id: `alt_onu_off_${onu.oltId}_${onu.serialNumber}`,
        oltId: onu.oltId,
        oltName: onu.oltName || 'OLT',
        type: 'onu_offline',
        severity: 'info',
        title: 'ONU Client Offline',
        message: `ONU ${onu.id} (${onu.serialNumber}) went offline at ${onu.lastOffline || 'recently'}.`,
        timestamp: now,
        acknowledged: false,
        onuSn: onu.serialNumber,
        clientId: onu.mappedClientId || undefined,
      });
    }
  });

  return alerts;
}
