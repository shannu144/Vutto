import React from 'react';
import { useAuth, PRESET_ACCOUNTS } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, Wallet, ChevronDown } from 'lucide-react';

interface NavbarProps {
  activeTab: 'auctions' | 'my-bids' | 'admin';
  setActiveTab: (tab: 'auctions' | 'my-bids' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, switchPreset } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('auctions')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-xl font-black text-black tracking-tighter">V</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-wider">VUTTO</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  LIVE AUCTIONS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Production Motorcycle Auction Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={() => setActiveTab('auctions')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'auctions'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Live Auctions
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('my-bids')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'my-bids'
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                My Bids
              </button>
            )}

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin & Ops</span>
            </button>
          </nav>

          {/* Right Controls: Real-time status, Demo user switcher, Balance */}
          <div className="flex items-center space-x-3">
            
            {/* Live Socket Connection Status */}
            <div
              title={isConnected ? 'Real-time WebSocket Connected' : 'Reconnecting to Live Auction Stream...'}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs"
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-400 text-[11px] font-medium hidden md:inline">Live Sync</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-400 text-[11px] font-medium hidden md:inline">Offline</span>
                </>
              )}
            </div>

            {/* Quick Demo Account Switcher */}
            <div className="relative group">
              <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">
                  {user?.name.slice(0, 2).toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || 'Switch Demo'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="absolute right-0 mt-1 w-60 py-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Demo Account
                </div>
                {PRESET_ACCOUNTS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => switchPreset(preset.key)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      user?.email === preset.email ? 'text-amber-400 font-semibold bg-amber-500/10' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-[10px] text-slate-500">{preset.email}</div>
                    </div>
                    {user?.email === preset.email && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Buyer Balance Badge */}
            {user && (
              <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <Wallet className="w-3.5 h-3.5" />
                <span>${user.balance.toLocaleString()}</span>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
