import { OLTAdapter } from './OLTAdapter';
import { OLTConfig, OLTTestResult, PonPortInfo, ONUInfo } from '../types';

export class BDCOMAdapter extends OLTAdapter {
  constructor(config: OLTConfig) {
    super('BDCOM', config);
  }

  async testConnection(): Promise<OLTTestResult> {
    if (!this.config.ip || !this.config.enabled) {
      return {
        success: false,
        message: 'OLT IP address is missing or device is disabled.',
        error: 'Disabled or empty IP',
      };
    }

    try {
      const response = await fetch('/api/olt/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
        },
        body: JSON.stringify({
          brand: 'BDCOM',
          model: this.config.model,
          ip: this.config.ip,
          managementPort: this.config.managementPort,
          protocol: this.config.protocol,
          username: this.config.username,
          password: this.config.password,
          snmpCommunityRead: this.config.snmpCommunityRead,
          timeoutMs: this.config.timeoutMs,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          message: data.message || `Successfully connected to BDCOM OLT (${this.config.ip})`,
          latencyMs: data.latencyMs || 20,
          systemInfo: {
            brand: 'BDCOM',
            model: data.systemInfo?.model || this.config.model || 'P3310C EPON OLT',
            serialNumber: data.systemInfo?.serialNumber || null,
            firmware: data.systemInfo?.firmware || null,
            hardwareVersion: data.systemInfo?.hardwareVersion || null,
            uptime: data.systemInfo?.uptime || null,
            totalPonPorts: data.systemInfo?.totalPonPorts ?? null,
            cpuUsage: data.systemInfo?.cpuUsage ?? null,
            memoryUsage: data.systemInfo?.memoryUsage ?? null,
            temperature: data.systemInfo?.temperature ?? null,
          },
        };
      } else {
        return {
          success: false,
          message: data.error || `Failed to connect to BDCOM OLT at ${this.config.ip}:${this.config.managementPort}`,
          error: data.error,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Network error connecting to BDCOM OLT (${this.config.ip}): ${err.message}`,
        error: err.message,
      };
    }
  }

  async fetchSystemDetails() {
    try {
      const res = await fetch(`/api/olt/details/${encodeURIComponent(this.config.id)}`, {
        headers: {
          'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
        },
      });
      const data = await res.json();
      if (data.success && data.details) return data.details.system;
    } catch (e) {
      console.warn('Failed to fetch BDCOM system details', e);
    }
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

  async fetchPonPorts(): Promise<PonPortInfo[]> {
    try {
      const res = await fetch(`/api/olt/details/${encodeURIComponent(this.config.id)}`, {
        headers: {
          'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
        },
      });
      const data = await res.json();
      if (data.success && data.details?.ponPorts) return data.details.ponPorts;
    } catch (e) {
      console.warn('Failed to fetch BDCOM PON ports', e);
    }
    return [];
  }

  async fetchOnuList(slotPort?: string): Promise<ONUInfo[]> {
    try {
      const url = `/api/olt/onu-list?oltId=${encodeURIComponent(this.config.id)}${slotPort ? `&slotPort=${encodeURIComponent(slotPort)}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.onus)) return data.onus;
    } catch (e) {
      console.warn('Failed to fetch BDCOM ONU list', e);
    }
    return [];
  }
}
