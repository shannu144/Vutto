import React, { useState, useEffect } from 'react';
import type { Auction } from '../../types';
import { api } from '../../services/api';
import { Trophy, Clock, ExternalLink, ArrowUpRight } from 'lucide-react';

interface MyBidsViewProps {
  onSelectAuction: (auction: Auction) => void;
}

export const MyBidsView: React.FC<MyBidsViewProps> = ({ onSelectAuction }) => {
  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBids = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMyBids();
      setBids(data);
    } catch (err) {
      console.error('Failed to load my bids', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBids();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">MY BIDDING ACTIVITY</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track your bids across all live and concluded motorcycle auctions.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
          {bids.length} Total Bids Placed
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading bidding history...</div>
      ) : bids.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-base">No Bids Yet</h4>
          <p className="text-xs max-w-sm mx-auto">
            You haven't participated in any auctions yet. Browse active live auctions and place your first bid!
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Motorcycle</th>
                  <th className="px-6 py-3">Auction Status</th>
                  <th className="px-6 py-3">Your Bid</th>
                  <th className="px-6 py-3">Current Leader</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bids.map((b) => {
                  const isWinning = b.isWinning;
                  const isAuctionEnded = b.auction.status === 'ENDED';
                  const won = isAuctionEnded && isWinning;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>{b.auction.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {b.auction.bike.make} {b.auction.bike.model} ({b.auction.bike.year})
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.auction.status === 'LIVE'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.auction.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-black text-sm text-emerald-400">
                        ${b.amount.toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        {won ? (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <Trophy className="w-3.5 h-3.5" /> <span>You Won!</span>
                          </span>
                        ) : isWinning ? (
                          <span className="text-amber-400 font-bold flex items-center space-x-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> <span>Currently Leading</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Outbid (${b.auction.currentBid.toLocaleString()})
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {new Date(b.timestamp).toLocaleDateString()} {new Date(b.timestamp).toLocaleTimeString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onSelectAuction(b.auction)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold inline-flex items-center space-x-1 transition"
                        >
                          <span>View Room</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
