import { OLTConfig } from './types';
import { OLTAdapter } from './adapters/OLTAdapter';
import { HuaweiAdapter } from './adapters/HuaweiAdapter';
import { ZTEAdapter } from './adapters/ZTEAdapter';
import { VSOLAdapter } from './adapters/VSOLAdapter';
import { BDCOMAdapter } from './adapters/BDCOMAdapter';
import { FiberHomeAdapter } from './adapters/FiberHomeAdapter';
import { GenericOLTAdapter } from './adapters/GenericOLTAdapter';

export function createOLTAdapter(config: OLTConfig): OLTAdapter {
  switch (config.brand) {
    case 'Huawei':
      return new HuaweiAdapter(config);
    case 'ZTE':
      return new ZTEAdapter(config);
    case 'VSOL':
      return new VSOLAdapter(config);
    case 'BDCOM':
      return new BDCOMAdapter(config);
    case 'FiberHome':
      return new FiberHomeAdapter(config);
    case 'Generic':
    case 'Other':
    default:
      return new GenericOLTAdapter(config);
  }
}
