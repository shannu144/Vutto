import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { LiveTicker } from './components/auction/LiveTicker';
import { AuctionCard } from './components/auction/AuctionCard';
import { LiveAuctionRoomModal } from './components/auction/LiveAuctionRoomModal';
import { AdminConsole } from './components/admin/AdminConsole';
import { MyBidsView } from './components/auction/MyBidsModal';
import { ToastContainer } from './components/common/ToastContainer';
import { api } from './services/api';
import type { Auction } from './types';
import { Search, SlidersHorizontal, Flame, ShieldCheck } from 'lucide-react';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auctions' | 'my-bids' | 'admin'>('auctions');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAuctions = async () => {
    try {
      const data = await api.getAuctions(
        statusFilter === 'ALL' ? undefined : statusFilter,
        searchQuery || undefined
      );
      setAuctions(data.auctions);
    } catch (err) {
      console.error('Failed to load auctions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const interval = setInterval(loadAuctions, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  const liveCount = auctions.filter((a) => a.status === 'LIVE').length;
  const upcomingCount = auctions.filter((a) => a.status === 'UPCOMING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Live Bid Stream Ticker */}
      <LiveTicker />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'auctions' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Hero / Header Banner */}
            <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 p-8 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>Real-Time Motorcycle Auctions</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Bid Live on Verified Used Motorcycles.
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Experience sub-second real-time bidding with anti-sniping protection, authenticated mechanical condition scores, and transparent auction telemetry.
                </p>

                {/* Quick Stats Pill */}
                <div className="flex flex-wrap items-center gap-4 mt-6 text-xs">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="font-bold text-white">{liveCount} Live Right Now</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-slate-300">{upcomingCount} Upcoming</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-300">100% Inspected & VIN Verified</span>
                  </div>
                </div>
              </div>

              {/* Background ambient glow */}
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
              
              {/* Status Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { key: 'ALL', label: 'All Motorcycles' },
                  { key: 'LIVE', label: `Live Now (${liveCount})` },
                  { key: 'UPCOMING', label: 'Upcoming' },
                  { key: 'ENDED', label: 'Completed' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search make, model, VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

            </div>

            {/* Auctions Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-96 rounded-2xl bg-slate-900/50 animate-pulse border border-slate-800"></div>
                ))}
              </div>
            ) : auctions.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                <SlidersHorizontal className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="font-bold text-white text-base">No Auctions Found</h4>
                <p className="text-xs max-w-sm mx-auto">
                  No motorcycle auctions match your current filter. Try clearing your search or switching status filters.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-amber-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    onSelect={(a) => setSelectedAuction(a)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* My Bids Tab */}
        {activeTab === 'my-bids' && (
          <MyBidsView onSelectAuction={(a) => setSelectedAuction(a)} />
        )}

        {/* Admin & Observability Tab */}
        {activeTab === 'admin' && (
          <AdminConsole
            auctions={auctions}
            onRefreshAuctions={loadAuctions}
          />
        )}

      </main>

      {/* Live Auction Modal Room */}
      {selectedAuction && (
        <LiveAuctionRoomModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onRefreshAuctions={loadAuctions}
        />
      )}

      {/* Global Notifications Toast Container */}
      <ToastContainer />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-300">VUTTO</span>
            <span>•</span>
            <span>Production-grade Bike Auction Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <a href="/health" target="_blank" rel="noreferrer" className="hover:text-amber-400">
              Health Check
            </a>
            <a href="/metrics" target="_blank" rel="noreferrer" className="hover:text-amber-400">
              Prometheus Telemetry
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
