import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Server,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Layers,
  Cpu,
  Thermometer,
  ShieldAlert,
  Link as LinkIcon,
  Unlink,
  Eye,
  Radio,
  Clock,
  HardDrive,
  UserCheck,
  ChevronRight,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Power,
  RotateCcw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  OLTConfig,
  ONUInfo,
  OLTAlert,
  OLTBrand,
  OLTProtocol,
  CustomerOnuMapping,
  DEFAULT_OPTICAL_THRESHOLDS,
  OLTRole,
} from '../../lib/olt/types';
import {
  fetchOltListApi,
  saveOltApi,
  deleteOltApi,
  testOltConnectionApi,
  fetchOnuListApi,
  mapClientToOnuApi,
  rebootOnuApi,
  generateOltAlerts,
} from '../../lib/olt/oltService';
import { OLTAdapter } from '../../lib/olt/adapters/OLTAdapter';
import { Client, ToastMessage } from '../../types';

interface OltManagementProps {
  clients: Client[];
  showToast?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  userRole?: OLTRole;
}

export const OltManagement: React.FC<OltManagementProps> = ({
  clients = [],
  showToast,
  userRole = 'Admin',
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'onus' | 'mapping' | 'alerts'>('dashboard');

  // Core Data States
  const [olts, setOlts] = useState<OLTConfig[]>([]);
  const [onus, setOnus] = useState<ONUInfo[]>([]);
  const [alerts, setAlerts] = useState<OLTAlert[]>([]);
  const [mappings, setMappings] = useState<CustomerOnuMapping[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Auto Refresh Polling
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(30);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOltFilter, setSelectedOltFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Selected OLT for Details Modal
  const [viewOltDetails, setViewOltDetails] = useState<OLTConfig | null>(null);
  const [oltDetailsData, setOltDetailsData] = useState<any | null>(null);
  const [loadingOltDetails, setLoadingOltDetails] = useState<boolean>(false);

  // OLT Add/Edit Modal
  const [isOltModalOpen, setIsOltModalOpen] = useState<boolean>(false);
  const [editingOlt, setEditingOlt] = useState<Partial<OLTConfig> | null>(null);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Mapping Modal State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [targetOnuForMapping, setTargetOnuForMapping] = useState<ONUInfo | null>(null);
  const [selectedClientIdForMapping, setSelectedClientIdForMapping] = useState<string>('');

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);

    try {
      const fetchedOlts = await fetchOltListApi();
      setOlts(fetchedOlts);

      // Fetch ONUs
      const fetchedOnus = await fetchOnuListApi();
      setOnus(fetchedOnus);

      // Generate Live Alerts
      const liveAlerts = generateOltAlerts(fetchedOlts, fetchedOnus);
      setAlerts(liveAlerts);
    } catch (err) {
      console.warn('Error loading OLT data', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling Effect
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, refreshIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalSec, loadData]);

  // Handle OLT Details Click
  const handleOpenOltDetails = async (olt: OLTConfig) => {
    setViewOltDetails(olt);
    setLoadingOltDetails(true);
    try {
      const res = await fetch(`/api/olt/details/${encodeURIComponent(olt.id)}`, {
        headers: {
          'X-Admin-Token': sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || '',
        },
      });
      const data = await res.json();
      if (data.success && data.details) {
        setOltDetailsData(data.details);
      }
    } catch (e) {
      console.warn('Failed to load OLT details', e);
    } finally {
      setLoadingOltDetails(false);
    }
  };

  // Test OLT Connection Modal Handler
  const handleTestConnection = async () => {
    if (!editingOlt?.ip) {
      setTestResult({ success: false, message: 'Please enter an IP address first.' });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);

    const tempConfig: OLTConfig = {
      id: editingOlt.id || 'temp',
      name: editingOlt.name || 'Test OLT',
      brand: editingOlt.brand || 'Huawei',
      model: editingOlt.model || 'Generic Model',
      ip: editingOlt.ip,
      managementPort: Number(editingOlt.managementPort) || 161,
      protocol: editingOlt.protocol || 'SNMPv2c',
      username: editingOlt.username || 'admin',
      password: editingOlt.password || '',
      snmpCommunityRead: editingOlt.snmpCommunityRead || 'public',
      timeoutMs: Number(editingOlt.timeoutMs) || 4000,
      enabled: editingOlt.enabled !== false,
      status: 'untested',
    };

    const res = await testOltConnectionApi(tempConfig);
    setTestingConnection(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: res.message || `Connection verified! Responsive in ${res.latencyMs || 20}ms.`,
      });
      if (showToast) showToast('OLT Connection Test Passed!', 'success');
    } else {
      setTestResult({
        success: false,
        message: res.error || res.message || 'Connection test failed.',
      });
      if (showToast) showToast('OLT Connection Failed', 'error');
    }
  };

  // Save OLT Handler
  const handleSaveOlt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOlt?.name || !editingOlt?.ip) {
      if (showToast) showToast('OLT Name and IP are required.', 'error');
      return;
    }

    const res = await saveOltApi(editingOlt);
    if (res.success) {
      if (showToast) showToast(res.message || 'OLT saved successfully.', 'success');
      setIsOltModalOpen(false);
      setEditingOlt(null);
      setTestResult(null);
      loadData(true);
    } else {
      if (showToast) showToast(res.error || 'Failed to save OLT.', 'error');
    }
  };

  // Delete OLT Handler
  const handleDeleteOlt = async (id: string, name: string) => {
    if (userRole === 'Support' || userRole === 'Viewer') {
      if (showToast) showToast('Permission denied: Viewer role cannot delete OLTs.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete OLT "${name}"?`)) return;

    const res = await deleteOltApi(id);
    if (res.success) {
      if (showToast) showToast('OLT deleted successfully.', 'success');
      loadData(true);
    } else {
      if (showToast) showToast(res.error || 'Failed to delete OLT.', 'error');
    }
  };

  // Customer Mapping Submit
  const handleSaveMapping = async () => {
    if (!targetOnuForMapping || !selectedClientIdForMapping) {
      if (showToast) showToast('Please select a customer to bind.', 'error');
      return;
    }

    const client = clients.find((c) => c.id === selectedClientIdForMapping);
    const res = await mapClientToOnuApi({
      clientId: selectedClientIdForMapping,
      clientName: client?.name,
      userId: client?.userId,
      oltId: targetOnuForMapping.oltId,
      oltName: targetOnuForMapping.oltName,
      slot: targetOnuForMapping.slot,
      ponPort: targetOnuForMapping.ponPort,
      onuId: targetOnuForMapping.id,
      serialNumber: targetOnuForMapping.serialNumber,
      macAddress: targetOnuForMapping.macAddress,
    });

    if (res.success) {
      if (showToast) showToast(`ONU ${targetOnuForMapping.serialNumber} bound to ${client?.name || client?.userId}`, 'success');
      setIsMappingModalOpen(false);
      setTargetOnuForMapping(null);
      loadData(true);
    } else {
      if (showToast) showToast(res.error || 'Failed to map customer.', 'error');
    }
  };

  // ONU Reboot Handler
  const handleRebootOnu = async (onu: ONUInfo) => {
    if (userRole === 'Support' || userRole === 'Viewer') {
      if (showToast) showToast('Permission denied: Viewer role cannot reboot ONUs.', 'error');
      return;
    }
    if (!window.confirm(`Reboot ONU ${onu.id} (${onu.serialNumber})?`)) return;

    const res = await rebootOnuApi(onu.oltId, onu.id, onu.serialNumber);
    if (res.success) {
      if (showToast) showToast(res.message || 'ONU reboot command executed.', 'success');
    } else {
      if (showToast) showToast(res.error || 'Failed to reboot ONU.', 'error');
    }
  };

  // Calculations for Stat Cards
  const stats = useMemo(() => {
    const totalOlts = olts.length;
    const onlineOlts = olts.filter((o) => o.status === 'online').length;
    const offlineOlts = olts.filter((o) => o.status === 'offline').length;

    let totalPon = 0;
    let onlinePon = 0;
    olts.forEach((o) => {
      const pCount = o.totalPonPorts || 0;
      totalPon += pCount;
      if (o.status === 'online') {
        onlinePon += o.onlinePonPorts || 0;
      }
    });

    const totalOnus = onus.length;
    const onlineOnus = onus.filter((o) => o.status === 'online').length;
    const offlineOnus = onus.filter((o) => o.status === 'offline').length;
    const losCount = onus.filter((o) => o.status === 'los' || o.losStatus).length;
    const lowRxCount = onus.filter(
      (o) => o.status === 'power_low' || (o.rxPower !== null && o.rxPower <= DEFAULT_OPTICAL_THRESHOLDS.warningMinRx)
    ).length;

    return {
      totalOlts,
      onlineOlts,
      offlineOlts,
      totalPon,
      onlinePon,
      offlinePon: totalPon - onlinePon,
      totalOnus,
      onlineOnus,
      offlineOnus,
      losCount,
      lowRxCount,
    };
  }, [olts, onus]);

  // Chart Data for Recharts
  const onuStatusDistributionData = useMemo(() => {
    return [
      { name: 'Online', value: stats.onlineOnus, color: '#10B981' },
      { name: 'Offline', value: stats.offlineOnus, color: '#64748B' },
      { name: 'Low Optical RX', value: stats.lowRxCount, color: '#F59E0B' },
      { name: 'Loss of Signal (LOS)', value: stats.losCount, color: '#EF4444' },
    ];
  }, [stats]);

  const ponTrafficChartData = useMemo(() => {
    return onus
      .filter((o) => o.trafficRxMbps !== null || o.trafficTxMbps !== null)
      .map((o) => ({
        name: o.id,
        download: o.trafficRxMbps || 0,
        upload: o.trafficTxMbps || 0,
      }));
  }, [onus]);

  const opticalPowerTrendData = useMemo(() => {
    return [
      { time: '00:00', normal: 48, warning: 3, los: 1 },
      { time: '04:00', normal: 49, warning: 2, los: 1 },
      { time: '08:00', normal: 52, warning: 4, los: 1 },
      { time: '12:00', normal: 54, warning: 3, los: 2 },
      { time: '16:00', normal: 50, warning: 5, los: 1 },
      { time: '20:00', normal: 51, warning: 3, los: 1 },
    ];
  }, []);

  // Filtered ONUs
  const filteredOnus = useMemo(() => {
    return onus.filter((o) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.serialNumber.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.macAddress.toLowerCase().includes(q) ||
        (o.mappedClientName && o.mappedClientName.toLowerCase().includes(q)) ||
        (o.mappedUserId && o.mappedUserId.toLowerCase().includes(q));

      // OLT Filter
      const matchesOlt = selectedOltFilter === 'all' || o.oltId === selectedOltFilter;

      // Status Filter
      let matchesStatus = true;
      if (selectedStatusFilter === 'online') matchesStatus = o.status === 'online';
      else if (selectedStatusFilter === 'offline') matchesStatus = o.status === 'offline';
      else if (selectedStatusFilter === 'los') matchesStatus = o.status === 'los' || o.losStatus;
      else if (selectedStatusFilter === 'low_rx')
        matchesStatus = o.status === 'power_low' || (o.rxPower !== null && o.rxPower <= DEFAULT_OPTICAL_THRESHOLDS.warningMinRx);

      return matchesSearch && matchesOlt && matchesStatus;
    });
  }, [onus, searchQuery, selectedOltFilter, selectedStatusFilter]);

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen text-slate-100 font-sans space-y-6">
      {/* Top Header / Breadcrumbs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>INFRASTRUCTURE</span>
            <span>/</span>
            <span className="text-cyan-400 font-bold">OPTICAL LINE TERMINAL (OLT)</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Server className="w-5 h-5 text-cyan-400" />
            OLT &amp; Passive Optical Network (PON) Operations
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Polling Toggle */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-slate-400">Auto Refresh:</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                autoRefresh ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </button>
            {autoRefresh && (
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs px-1 py-0.5"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Add OLT Button */}
          {(userRole === 'Super Admin' || userRole === 'Admin') && (
            <button
              onClick={() => {
                setEditingOlt({
                  brand: 'Huawei',
                  model: 'SmartAX MA5800',
                  managementPort: 161,
                  protocol: 'SNMPv2c',
                  snmpCommunityRead: 'public',
                  timeoutMs: 4000,
                  enabled: true,
                });
                setTestResult(null);
                setIsOltModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add OLT Device</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Module Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Main OLT Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'devices'
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>OLT Devices &amp; Adapters ({olts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('onus')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'onus'
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>PON Ports &amp; ONU/ONTs ({onus.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'mapping'
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Customer Binding &amp; Chain</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Alerts &amp; Optical Diagnostics ({alerts.length})</span>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MAIN OLT DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Stat 1: Total OLTs */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>TOTAL OLTS</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">{stats.totalOlts}</span>
                <span className="text-[10px] text-emerald-400 font-mono">{stats.onlineOlts} Online</span>
              </div>
            </div>

            {/* Stat 2: Total PON Ports */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>PON PORTS</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">{stats.totalPon}</span>
                <span className="text-[10px] text-emerald-400 font-mono">{stats.onlinePon} Active</span>
              </div>
            </div>

            {/* Stat 3: Total ONUs */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>TOTAL ONUS</span>
                <Radio className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">{stats.totalOnus}</span>
                <span className="text-[10px] text-emerald-400 font-mono">{stats.onlineOnus} Online</span>
              </div>
            </div>

            {/* Stat 4: Offline ONUs */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>OFFLINE ONUS</span>
                <WifiOff className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-300 font-mono tabular-nums">{stats.offlineOnus}</span>
                <span className="text-[10px] text-slate-400 font-mono">Inactive</span>
              </div>
            </div>

            {/* Stat 5: Low Optical RX */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>LOW OPTICAL RX</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">{stats.lowRxCount}</span>
                <span className="text-[10px] text-amber-300/80 font-mono">&le; -25.0 dBm</span>
              </div>
            </div>

            {/* Stat 6: Loss of Signal (LOS) */}
            <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>FIBER LOS</span>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-400 font-mono tabular-nums">{stats.losCount}</span>
                <span className="text-[10px] text-red-400/80 font-mono">Cut/Unplugged</span>
              </div>
            </div>
          </div>

          {/* Interactive Charts & Telemetry Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: ONU Status Distribution */}
            <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>ONU Status Distribution</span>
                <span className="text-[10px] text-slate-500 font-mono">Optical Node Health</span>
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={onuStatusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {onuStatusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-700/50">
                {onuStatusDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-200 tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: PON Port Traffic RX / TX */}
            <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl space-y-3 lg:col-span-2">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>PON Ports Traffic Utilization (Mbps)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Aggregate Throughput</span>
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ponTrafficChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="download" name="Download Traffic (Mbps)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="upload" name="Upload Traffic (Mbps)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* OLT Devices Overview Grid */}
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                Active OLT Hardware Devices &amp; Physical Status
              </h2>
              <button
                onClick={() => setActiveTab('devices')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Devices</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {olts.map((olt) => (
                <div
                  key={olt.id}
                  className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl space-y-3 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{olt.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded">
                          {olt.brand}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        <span>IP: {olt.ip}</span> &middot; <span>Port: {olt.managementPort}</span> &middot; <span>{olt.protocol}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          olt.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${olt.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        {olt.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <button
                        onClick={() => handleOpenOltDetails(olt)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 p-1.5 rounded-lg text-xs cursor-pointer"
                        title="View System Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* System Metrics Bars */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>CPU Load</span>
                        <span className="text-slate-200">{olt.cpuUsage !== null && olt.cpuUsage !== undefined ? `${olt.cpuUsage}%` : 'N/A'}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full"
                          style={{ width: `${olt.cpuUsage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>RAM Memory</span>
                        <span className="text-slate-200">{olt.memoryUsage !== null && olt.memoryUsage !== undefined ? `${olt.memoryUsage}%` : 'N/A'}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${olt.memoryUsage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Temperature</span>
                        <span className="text-slate-200">{olt.temperature !== null && olt.temperature !== undefined ? `${olt.temperature}°C` : 'N/A'}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            olt.temperature && olt.temperature > 60 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((olt.temperature || 0) * 1.2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-1">
                    <span>Model: {olt.model || 'N/A'}</span>
                    <span>Uptime: {olt.uptime || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OLT DEVICES & CONFIGURATION */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Configured OLT Hardware Drivers &amp; Adapters</h2>
              <p className="text-xs text-slate-400">Adapter-based architecture supporting Huawei, ZTE, VSOL, BDCOM, FiberHome, and Generic OLTs.</p>
            </div>
            {(userRole === 'Super Admin' || userRole === 'Admin') && (
              <button
                onClick={() => {
                  setEditingOlt({
                    brand: 'Huawei',
                    model: 'SmartAX MA5800',
                    managementPort: 161,
                    protocol: 'SNMPv2c',
                    snmpCommunityRead: 'public',
                    timeoutMs: 4000,
                    enabled: true,
                  });
                  setTestResult(null);
                  setIsOltModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add OLT</span>
              </button>
            )}
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">OLT Name</th>
                    <th className="py-3 px-4">Brand / Model</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Management Port</th>
                    <th className="py-3 px-4">Protocol</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-200">
                  {olts.map((olt) => (
                    <tr key={olt.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{olt.name}</div>
                        {olt.notes && <div className="text-[10px] text-slate-500 font-sans">{olt.notes}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-300 font-bold">
                          {olt.brand}
                        </span>
                        <span className="ml-1 text-slate-400 text-[11px]">{olt.model}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400">{olt.ip}</td>
                      <td className="py-3 px-4">{olt.managementPort}</td>
                      <td className="py-3 px-4 text-slate-300">{olt.protocol}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            olt.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {olt.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenOltDetails(olt)}
                          className="bg-slate-700 hover:bg-slate-600 text-cyan-300 px-2.5 py-1 rounded text-[11px] cursor-pointer"
                        >
                          Details
                        </button>
                        {(userRole === 'Super Admin' || userRole === 'Admin') && (
                          <>
                            <button
                              onClick={() => {
                                setEditingOlt(olt);
                                setTestResult(null);
                                setIsOltModalOpen(true);
                              }}
                              className="bg-slate-700 hover:bg-slate-600 text-amber-300 px-2 py-1 rounded text-[11px] cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteOlt(olt.id, olt.name)}
                              className="bg-slate-700 hover:bg-red-600/30 text-red-400 px-2 py-1 rounded text-[11px] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 inline" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {olts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        No OLT devices configured yet. Click "Add OLT Device" to connect your first OLT.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PON PORTS & ONU/ONT MANAGEMENT */}
      {activeTab === 'onus' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Customer, Serial, MAC, ONU ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* OLT Filter */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <span>OLT:</span>
                <select
                  value={selectedOltFilter}
                  onChange={(e) => setSelectedOltFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded text-xs px-2 py-1 text-slate-200"
                >
                  <option value="all">All OLTs</option>
                  {olts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <span>Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded text-xs px-2 py-1 text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="low_rx">Low Optical RX (&le; -25 dBm)</option>
                  <option value="los">Fiber LOS (Loss of Signal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ONUs Data Table */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">ONU ID / Location</th>
                    <th className="py-3 px-4">PON Serial Number</th>
                    <th className="py-3 px-4">Optical RX Power</th>
                    <th className="py-3 px-4">Optical TX Power</th>
                    <th className="py-3 px-4">Distance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Mapped Customer</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-200">
                  {filteredOnus.map((onu) => {
                    const opticalStatus = OLTAdapter.evaluateOpticalPower(onu.rxPower);
                    return (
                      <tr key={`${onu.oltId}_${onu.id}_${onu.serialNumber}`} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{onu.id}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">{onu.oltName}</div>
                        </td>

                        <td className="py-3 px-4 font-bold text-cyan-300">
                          <div>{onu.serialNumber}</div>
                          <div className="text-[10px] text-slate-500">MAC: {onu.macAddress || 'N/A'}</div>
                        </td>

                        {/* Optical RX Power */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              opticalStatus === 'normal'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : opticalStatus === 'warning'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : opticalStatus === 'critical'
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                                : opticalStatus === 'los'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {OLTAdapter.formatOpticalPower(onu.rxPower)}
                          </span>
                        </td>

                        {/* Optical TX Power */}
                        <td className="py-3 px-4 text-slate-300">
                          {OLTAdapter.formatOpticalPower(onu.txPower)}
                        </td>

                        {/* Distance */}
                        <td className="py-3 px-4 text-slate-300">
                          {onu.distanceMeters !== null && onu.distanceMeters !== undefined ? `${onu.distanceMeters} m` : 'N/A'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              onu.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : onu.status === 'power_low'
                                ? 'bg-amber-500/10 text-amber-400'
                                : onu.status === 'los'
                                ? 'bg-red-500/20 text-red-400 font-black'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {onu.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Mapped Customer */}
                        <td className="py-3 px-4 font-sans">
                          {onu.mappedClientName ? (
                            <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{onu.mappedClientName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono italic">Unassigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setTargetOnuForMapping(onu);
                              setSelectedClientIdForMapping(onu.mappedClientId || '');
                              setIsMappingModalOpen(true);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-cyan-300 px-2 py-1 rounded text-[11px] cursor-pointer"
                            title="Bind to Customer Account"
                          >
                            <LinkIcon className="w-3 h-3 inline mr-1" />
                            <span>Bind</span>
                          </button>

                          {(userRole === 'Super Admin' || userRole === 'Admin') && (
                            <button
                              onClick={() => handleRebootOnu(onu)}
                              className="bg-slate-700 hover:bg-slate-600 text-amber-300 px-2 py-1 rounded text-[11px] cursor-pointer"
                              title="Reboot ONU via OLT driver"
                            >
                              <RotateCcw className="w-3 h-3 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOnus.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                        No ONUs found matching current search/filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER BINDING & CHAIN */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Full Subscriber Fiber Chain Mapping</h2>
              <p className="text-xs text-slate-400">
                Customer &rarr; Package &rarr; MikroTik Account &rarr; OLT &rarr; PON Port &rarr; ONU Serial &rarr; Optical Power State.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">Subscriber Name</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">MikroTik Account</th>
                    <th className="py-3 px-4">Connected OLT</th>
                    <th className="py-3 px-4">PON Port</th>
                    <th className="py-3 px-4">ONU Serial Number</th>
                    <th className="py-3 px-4">Optical RX Power</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-200">
                  {clients.map((client) => {
                    const mappedOnu = onus.find(
                      (o) => o.mappedClientId === client.id || o.mappedUserId === client.userId
                    );
                    return (
                      <tr key={client.id} className="hover:bg-slate-700/30 transition-colors font-sans">
                        <td className="py-3 px-4 font-bold text-white">
                          <div>{client.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Phone: {client.phone}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-xs text-cyan-300 font-mono">
                            {client.package}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">{client.userId}</td>

                        <td className="py-3 px-4 font-mono">
                          {mappedOnu ? (
                            <span className="text-cyan-400 font-bold">{mappedOnu.oltName}</span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">N/A (Unbound)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {mappedOnu ? mappedOnu.id : 'N/A'}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                          {mappedOnu ? mappedOnu.serialNumber : 'N/A'}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {mappedOnu ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                mappedOnu.rxPower && mappedOnu.rxPower > DEFAULT_OPTICAL_THRESHOLDS.warningMinRx
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {OLTAdapter.formatOpticalPower(mappedOnu.rxPower)}
                            </span>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS & DIAGNOSTICS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">System Fiber Alerts &amp; Real-time Optical Warnings</h2>
              <p className="text-xs text-slate-400">Automated detection of Fiber LOS cuts, low power degradation, and OLT system events.</p>
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-950/40 border-red-800/60 text-red-200'
                    : alert.severity === 'warning'
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{alert.title}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                        {alert.oltName}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-sans opacity-90">{alert.message}</p>
                    <div className="text-[10px] font-mono opacity-60 mt-2">
                      Timestamp: {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="bg-slate-800/80 border border-slate-700/60 p-8 text-center rounded-xl text-slate-400 font-sans">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-white">All Optical Lines Nominal</p>
                <p className="text-xs mt-1">No fiber cuts, LOS issues, or low power warnings detected.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OLT ADD / EDIT MODAL */}
      {isOltModalOpen && editingOlt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                {editingOlt.id ? 'Edit OLT Device Configuration' : 'Add New OLT Device'}
              </h3>
              <button
                onClick={() => setIsOltModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveOlt} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">OLT Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core OLT 01"
                    value={editingOlt.name || ''}
                    onChange={(e) => setEditingOlt({ ...editingOlt, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Brand Adapter *</label>
                  <select
                    value={editingOlt.brand || 'Huawei'}
                    onChange={(e) => setEditingOlt({ ...editingOlt, brand: e.target.value as OLTBrand })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="Huawei">Huawei</option>
                    <option value="ZTE">ZTE</option>
                    <option value="VSOL">VSOL</option>
                    <option value="BDCOM">BDCOM</option>
                    <option value="FiberHome">FiberHome</option>
                    <option value="Generic">Generic / Other OLT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. MA5800-X7"
                    value={editingOlt.model || ''}
                    onChange={(e) => setEditingOlt({ ...editingOlt, model: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">IP Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.100.10"
                    value={editingOlt.ip || ''}
                    onChange={(e) => setEditingOlt({ ...editingOlt, ip: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={editingOlt.managementPort || 161}
                    onChange={(e) => setEditingOlt({ ...editingOlt, managementPort: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Protocol</label>
                  <select
                    value={editingOlt.protocol || 'SNMPv2c'}
                    onChange={(e) => setEditingOlt({ ...editingOlt, protocol: e.target.value as OLTProtocol })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="SNMPv2c">SNMPv2c</option>
                    <option value="SNMPv3">SNMPv3</option>
                    <option value="SSH">SSH</option>
                    <option value="Telnet">Telnet</option>
                    <option value="REST">REST API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Read Community</label>
                  <input
                    type="text"
                    value={editingOlt.snmpCommunityRead || 'public'}
                    onChange={(e) => setEditingOlt({ ...editingOlt, snmpCommunityRead: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={editingOlt.username || 'admin'}
                    onChange={(e) => setEditingOlt({ ...editingOlt, username: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={editingOlt.password || ''}
                    onChange={(e) => setEditingOlt({ ...editingOlt, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              {/* Test Connection Box */}
              {testResult && (
                <div
                  className={`p-3 rounded border font-sans text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/50 border-red-800 text-red-300'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 px-3.5 py-2 rounded font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {testingConnection ? 'Testing Socket...' : 'Test Connection'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOltModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded transition-all cursor-pointer"
                  >
                    Save OLT
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER BINDING MODAL */}
      {isMappingModalOpen && targetOnuForMapping && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <LinkIcon className="w-4 h-4 text-cyan-400" />
              Bind ONU {targetOnuForMapping.serialNumber} to Customer
            </h3>

            <div className="text-xs font-mono space-y-1 text-slate-300 bg-slate-800/80 p-3 rounded border border-slate-700">
              <div>OLT: {targetOnuForMapping.oltName}</div>
              <div>ONU Location: {targetOnuForMapping.id}</div>
              <div>Serial Number: {targetOnuForMapping.serialNumber}</div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-mono">Select Subscriber *</label>
              <select
                value={selectedClientIdForMapping}
                onChange={(e) => setSelectedClientIdForMapping(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
              >
                <option value="">-- Choose Subscriber --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.userId}) - {c.package}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(false)}
                className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded text-xs cursor-pointer"
              >
                Bind Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OLT DETAILS MODAL */}
      {viewOltDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  {viewOltDetails.name}
                </h3>
                <div className="text-xs font-mono text-slate-400">
                  {viewOltDetails.brand} &middot; {viewOltDetails.model} &middot; IP: {viewOltDetails.ip}
                </div>
              </div>
              <button
                onClick={() => setViewOltDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                &times;
              </button>
            </div>

            {loadingOltDetails ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                Querying OLT hardware details via adapter...
              </div>
            ) : oltDetailsData ? (
              <div className="space-y-4 text-xs font-mono">
                {/* System Hardware Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <div>CPU Load: <span className="text-cyan-300 font-bold">{oltDetailsData.system.cpuUsage !== null ? `${oltDetailsData.system.cpuUsage}%` : 'N/A'}</span></div>
                  <div>RAM Memory: <span className="text-cyan-300 font-bold">{oltDetailsData.system.memoryUsage !== null ? `${oltDetailsData.system.memoryUsage}%` : 'N/A'}</span></div>
                  <div>Chassis Temp: <span className="text-cyan-300 font-bold">{oltDetailsData.system.temperature !== null ? `${oltDetailsData.system.temperature}°C` : 'N/A'}</span></div>
                  <div>Uptime: <span className="text-cyan-300 font-bold">{oltDetailsData.system.uptime || 'N/A'}</span></div>
                  <div>Firmware: <span className="text-cyan-300 font-bold">{oltDetailsData.system.firmware || 'N/A'}</span></div>
                  <div>Power Status: <span className="text-emerald-400 font-bold">{oltDetailsData.system.powerSupplyStatus || 'N/A'}</span></div>
                </div>

                {/* PON Ports Breakdown Table */}
                <div>
                  <h4 className="font-bold text-slate-300 mb-2">PON Ports Operational Summary</h4>
                  <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-700">
                        <tr>
                          <th className="py-2 px-3">Port</th>
                          <th className="py-2 px-3">Admin</th>
                          <th className="py-2 px-3">Oper</th>
                          <th className="py-2 px-3">ONUs (Total / Online)</th>
                          <th className="py-2 px-3">TX Power</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {oltDetailsData.ponPorts.map((p: any) => (
                          <tr key={p.portName}>
                            <td className="py-2 px-3 font-bold text-white">{p.portName}</td>
                            <td className="py-2 px-3 text-emerald-400 uppercase">{p.adminStatus}</td>
                            <td className="py-2 px-3 text-emerald-400 uppercase">{p.operStatus}</td>
                            <td className="py-2 px-3">{p.totalOnu} / <span className="text-emerald-400 font-bold">{p.onlineOnu}</span></td>
                            <td className="py-2 px-3">{OLTAdapter.formatOpticalPower(p.txPowerDbm)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 font-sans">
                Could not retrieve system details for this OLT. Check IP or management connectivity.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
