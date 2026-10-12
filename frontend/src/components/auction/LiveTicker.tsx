import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Flame, ArrowUpRight } from 'lucide-react';

export const LiveTicker: React.FC = () => {
  const { recentTickerBids } = useSocket();

  if (recentTickerBids.length === 0) {
    return (
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="font-semibold text-slate-300">LIVE BID STREAM:</span>
          <span>Waiting for real-time bids. Place a bid or activate Bot Simulator in Admin to watch live flow.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border-b border-amber-500/20 px-4 py-2 overflow-hidden flex items-center text-xs">
      <div className="flex items-center space-x-1 text-amber-400 font-bold uppercase tracking-wider shrink-0 pr-3 border-r border-slate-700">
        <Flame className="w-4 h-4 fill-amber-500" />
        <span>LIVE BIDS</span>
      </div>
      <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar pl-4 whitespace-nowrap">
        {recentTickerBids.slice(0, 8).map((bid) => (
          <div
            key={bid.bidId}
            className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 animate-fadeIn"
          >
            <span className="font-semibold text-white">{bid.bidderName}</span>
            <span className="text-slate-400">bid</span>
            <span className="font-bold text-emerald-400">${bid.amount.toLocaleString()}</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
          </div>
        ))}
      </div>
    </div>
  );
};
