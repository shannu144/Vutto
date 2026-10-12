import React from 'react';
import type { Auction } from '../../types';
import { useCountdown } from '../../hooks/useCountdown';
import { Clock, Gauge, MapPin, ShieldCheck, Flame, Trophy } from 'lucide-react';

interface AuctionCardProps {
  auction: Auction;
  onSelect: (auction: Auction) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction, onSelect }) => {
  const isLive = auction.status === 'LIVE';
  const isUpcoming = auction.status === 'UPCOMING';
  const isEnded = auction.status === 'ENDED';

  const countdown = useCountdown(isUpcoming ? auction.startTime : auction.endTime);

  return (
    <div
      onClick={() => onSelect(auction)}
      className="group relative bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col"
    >
      {/* Image & Badges Header */}
      <div className="relative h-56 overflow-hidden bg-slate-950">
        <img
          src={auction.bike.primaryImage}
          alt={`${auction.bike.year} ${auction.bike.make} ${auction.bike.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center space-x-2">
          {isLive && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg shadow-red-950/50">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE AUCTION</span>
            </span>
          )}
          {isUpcoming && (
            <span className="px-3 py-1 rounded-full bg-blue-600/90 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              UPCOMING
            </span>
          )}
          {isEnded && (
            <span className="px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              ENDED
            </span>
          )}

          {auction.antiSnipingExtensionsCount > 0 && isLive && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold tracking-tight">
              +{auction.antiSnipingExtensionsCount} EXT
            </span>
          )}
        </div>

        {/* Condition Score Badge */}
        <div className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 text-xs font-semibold text-amber-400">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>{auction.bike.conditionScore.toFixed(1)} / 10</span>
        </div>

        {/* Floating Timer Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Clock className={`w-3.5 h-3.5 ${countdown.isUrgent && isLive ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isUpcoming ? 'Starts in:' : 'Time Left:'}</span>
          </div>
          <span
            className={`font-bold ${
              countdown.isUrgent && isLive ? 'text-red-400 animate-pulse' : 'text-slate-100'
            }`}
          >
            {countdown.isEnded ? 'Auction Ended' : countdown.formatted}
          </span>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">{auction.bike.year}</span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Gauge className="w-3 h-3" />
              <span>{auction.bike.mileage.toLocaleString()} mi</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{auction.bike.location}</span>
            </span>
          </div>

          <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {auction.title}
          </h3>

          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {auction.bike.inspectionSummary}
          </p>
        </div>

        {/* Pricing & Bidding Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {isEnded ? 'Winning Bid' : 'Current Highest Bid'}
            </div>
            <div className="text-xl font-black text-emerald-400 mt-0.5 flex items-center space-x-1">
              <span>${auction.currentBid.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              +{auction.minIncrement} min inc • {auction._count?.bids || 0} bids
            </div>
          </div>

          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 ${
              isLive
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 group-hover:scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isLive ? (
              <>
                <Flame className="w-3.5 h-3.5 fill-black" />
                <span>Bid Live</span>
              </>
            ) : isEnded ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Result</span>
              </>
            ) : (
              <span>Inspect</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
