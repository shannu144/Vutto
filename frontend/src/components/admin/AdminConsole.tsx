import React, { useState, useEffect } from 'react';
import type { Auction, SystemOverview } from '../../types';
import { api } from '../../services/api';
import {
  Activity,
  Cpu,
  Database,
  PlusCircle,
  Play,
  Square,
  AlertOctagon,
  Bot,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface AdminConsoleProps {
  auctions: Auction[];
  onRefreshAuctions: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  auctions,
  onRefreshAuctions,
}) => {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '2024 Ducati Streetfighter V4 SP2',
    startingPrice: 28000,
    reservePrice: 34000,
    minIncrement: 500,
    durationMinutes: 30,
    make: 'Ducati',
    model: 'Streetfighter V4 SP2',
    year: 2024,
    engineCc: 1103,
    mileage: 450,
    vin: 'ZDM14AEW2PB992100',
    conditionScore: 9.9,
    location: 'Miami, FL',
    primaryImage: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
    inspectionSummary: 'Track-ready naked superbike with carbon wheels, dry clutch, Brembo Stylema R calipers, and Rizoma billet aluminum components.',
  });

  const loadSystemOverview = async () => {
    try {
      const data = await api.getSystemOverview();
      setOverview(data);
      setIsBotRunning(data.botSimulation.isRunning);
    } catch (err: any) {
      console.error('Failed to load system overview', err);
    }
  };

  useEffect(() => {
    loadSystemOverview();
    const interval = setInterval(loadSystemOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBot = async () => {
    try {
      setIsLoading(true);
      const res = await api.toggleBotSimulation(!isBotRunning);
      setIsBotRunning(res.isRunning);
      setMessage({
        type: 'success',
        text: res.isRunning
          ? 'Live Bidding Bot Simulation ACTIVATED! Bids will stream automatically across live auctions.'
          : 'Bidding Bot Simulation STOPPED.',
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle bot simulation' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNow = async (id: string) => {
    try {
      await api.startAuction(id);
      setMessage({ type: 'success', text: 'Auction manually transitioned to LIVE state.' });
      onRefreshAuctions();
      loadSystemOverview();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleEndEarly = async (id: string) => {
    try {
      await api.endAuction(id);
      setMessage({ type: 'success', text: 'Auction concluded early and settled.' });
      onRefreshAuctions();
      loadSystemOverview();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelAuction(id, 'Admin cancellation');
      setMessage({ type: 'success', text: 'Auction marked as CANCELLED.' });
      onRefreshAuctions();
      loadSystemOverview();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const startTime = now;
      const endTime = new Date(now.getTime() + formData.durationMinutes * 60 * 1000);

      await api.createAuction({
        title: formData.title,
        startingPrice: Number(formData.startingPrice),
        reservePrice: Number(formData.reservePrice),
        minIncrement: Number(formData.minIncrement),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        antiSnipingSeconds: 60,
        bike: {
          make: formData.make,
          model: formData.model,
          year: Number(formData.year),
          engineCc: Number(formData.engineCc),
          mileage: Number(formData.mileage),
          vin: formData.vin,
          conditionScore: Number(formData.conditionScore),
          inspectionSummary: formData.inspectionSummary,
          location: formData.location,
          primaryImage: formData.primaryImage,
          images: [formData.primaryImage],
          specs: {
            engine: `${formData.engineCc}cc Desmosedici Stradale`,
            horsepower: '208 HP @ 13,000 rpm',
            dryClutch: 'STM-EVO SBK 9-disc dry clutch',
            weight: '177 kg dry',
          },
        },
      });

      setMessage({ type: 'success', text: 'New motorcycle auction published and initialized successfully!' });
      setShowCreateModal(false);
      onRefreshAuctions();
      loadSystemOverview();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertOctagon className="w-4 h-4 text-rose-400" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-xl font-black text-white tracking-wide">OPERATIONAL OBSERVABILITY & ADMIN CONSOLE</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time auction lifecycle management, bot simulation, Prometheus metrics, and audit telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleBot}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg ${
              isBotRunning
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 ring-2 ring-red-400/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{isBotRunning ? 'Stop Bidding Bots' : 'Activate Live Bidding Bots'}</span>
            {isBotRunning && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Motorcycle</span>
          </button>

          <button
            onClick={() => {
              loadSystemOverview();
              onRefreshAuctions();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Observability Telemetry Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Live Auctions</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {overview?.auctions.live ?? 0}
            <span className="text-xs text-slate-500 font-normal ml-2">/ {overview?.auctions.total ?? 0} Total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {overview?.auctions.upcoming ?? 0} upcoming • {overview?.auctions.ended ?? 0} ended
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bids Processed</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {overview?.bids.total ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {overview?.users.total ?? 0} registered bidders
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Server Memory (RSS)</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2">
            {overview?.system.memoryRssMb ?? 0} MB
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Heap: {overview?.system.memoryHeapUsedMb ?? 0} MB • {overview?.system.nodeVersion}
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Observability APIs</span>
            <ExternalLink className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <a
              href="/metrics"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-900/60 transition"
            >
              /metrics (Prometheus)
            </a>
            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition"
            >
              /health
            </a>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Uptime: {Math.floor((overview?.system.uptimeSeconds ?? 0) / 60)} min
          </div>
        </div>

      </div>

      {/* Auction Lifecycle Management Table */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Auction Lifecycle Controls</h3>
          </div>
          <span className="text-xs text-slate-400">{auctions.length} Total Auctions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Motorcycle</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Current Bid</th>
                <th className="px-6 py-3">Reserve</th>
                <th className="px-6 py-3">End Time</th>
                <th className="px-6 py-3 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {auctions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{a.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      VIN: {a.bike.vin} • {a.bike.mileage.toLocaleString()} mi
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.status === 'LIVE'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : a.status === 'UPCOMING'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-bold text-emerald-400">
                    ${a.currentBid.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    ${a.reservePrice.toLocaleString()} {a.isReserveMet ? '✓' : ''}
                  </td>

                  <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                    {new Date(a.endTime).toLocaleTimeString()}
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    {a.status === 'UPCOMING' && (
                      <button
                        onClick={() => handleStartNow(a.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Start Now</span>
                      </button>
                    )}

                    {a.status === 'LIVE' && (
                      <button
                        onClick={() => handleEndEarly(a.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] inline-flex items-center space-x-1"
                      >
                        <Square className="w-3 h-3 fill-white" />
                        <span>End Early</span>
                      </button>
                    )}

                    {a.status !== 'ENDED' && a.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancel(a.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-[11px]"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-white text-sm">System Audit Trails & Observability Logs</h3>
          </div>
          <span className="text-xs text-slate-500">Immutable operations log</span>
        </div>

        <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
          {overview?.recentLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className="text-amber-400 font-bold">[{log.action}]</span>
                <span className="text-slate-300 truncate max-w-md">{log.details}</span>
              </div>
              <span className="text-slate-500 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Motorcycle Auction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">List New Motorcycle for Auction</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAuction} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Auction Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Make</label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Engine CC</label>
                  <input
                    type="number"
                    required
                    value={formData.engineCc}
                    onChange={(e) => setFormData({ ...formData, engineCc: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Mileage (mi)</label>
                  <input
                    type="number"
                    required
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">VIN Number</label>
                  <input
                    type="text"
                    required
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Condition Score (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    required
                    value={formData.conditionScore}
                    onChange={(e) => setFormData({ ...formData, conditionScore: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Starting Price ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.startingPrice}
                    onChange={(e) => setFormData({ ...formData, startingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Reserve Price ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.reservePrice}
                    onChange={(e) => setFormData({ ...formData, reservePrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.primaryImage}
                  onChange={(e) => setFormData({ ...formData, primaryImage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Mechanical Inspection Summary</label>
                <textarea
                  rows={2}
                  value={formData.inspectionSummary}
                  onChange={(e) => setFormData({ ...formData, inspectionSummary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-black"
                >
                  Publish Auction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
