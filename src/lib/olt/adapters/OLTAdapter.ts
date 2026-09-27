import {
  OLTBrand,
  OLTConfig,
  OLTTestResult,
  PonPortInfo,
  ONUInfo,
  OLTAlert,
  DEFAULT_OPTICAL_THRESHOLDS,
  OpticalPowerStatus,
} from '../types';

export abstract class OLTAdapter {
  public brand: OLTBrand;
  public model: string;
  protected config: OLTConfig;

  constructor(brand: OLTBrand, config: OLTConfig) {
    this.brand = brand;
    this.model = config.model || 'Generic Model';
    this.config = config;
  }

  /**
   * Tests connection to the OLT using configured management protocol
   */
  abstract testConnection(): Promise<OLTTestResult>;

  /**
   * Fetches full system details from the OLT
   */
  abstract fetchSystemDetails(): Promise<{
    cpuUsage: number | null;
    memoryUsage: number | null;
    temperature: number | null;
    uptime: string | null;
    firmware: string | null;
    hardwareVersion: string | null;
    serialNumber: string | null;
    powerSupplyStatus: string | null;
    fanStatus: string | null;
  }>;

  /**
   * Fetches list of PON ports and their operational states
   */
  abstract fetchPonPorts(): Promise<PonPortInfo[]>;

  /**
   * Fetches list of connected ONUs/ONTs
   */
  abstract fetchOnuList(slotPort?: string): Promise<ONUInfo[]>;

  /**
   * Evaluates Optical RX power against configurable thresholds
   */
  public static evaluateOpticalPower(
    rxPowerDbm: number | null,
    thresholds = DEFAULT_OPTICAL_THRESHOLDS
  ): OpticalPowerStatus {
    if (rxPowerDbm === null || rxPowerDbm === undefined) return 'unknown';
    if (rxPowerDbm <= thresholds.losMinRx || rxPowerDbm <= -35.0) return 'los';
    if (rxPowerDbm <= thresholds.criticalMinRx) return 'critical';
    if (rxPowerDbm <= thresholds.warningMinRx) return 'warning';
    return 'normal';
  }

  /**
   * Formats Optical Power for display or returns "N/A"
   */
  public static formatOpticalPower(rxPowerDbm: number | null): string {
    if (rxPowerDbm === null || rxPowerDbm === undefined || isNaN(rxPowerDbm)) {
      return 'N/A';
    }
    return `${rxPowerDbm.toFixed(1)} dBm`;
  }
}
