import React, { useState, useEffect } from 'react';
import type { Auction, Bid } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCountdown } from '../../hooks/useCountdown';
import { api } from '../../services/api';
import { soundEffects } from '../../utils/soundEffects';
import { BidPriceChart } from './BidPriceChart';
import confetti from 'canvas-confetti';
import {
  X,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
  MapPin,
  Gauge,
  Calendar,
  AlertCircle,
  Trophy,
  CheckCircle2,
  DollarSign,
  Info,
  Heart,
  Bot,
  Sliders,
} from 'lucide-react';

interface LiveAuctionRoomModalProps {
  auction: Auction;
  onClose: () => void;
  onRefreshAuctions: () => void;
}

export const LiveAuctionRoomModal: React.FC<LiveAuctionRoomModalProps> = ({
  auction: initialAuction,
  onClose,
  onRefreshAuctions,
}) => {
  const { user, refreshUser } = useAuth();
  const { socket, joinAuction, leaveAuction } = useSocket();

  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bids, setBids] = useState<Bid[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>(initialAuction.bike.primaryImage);
  const [biddingTab, setBiddingTab] = useState<'direct' | 'autobid'>('direct');
  const [customBidAmount, setCustomBidAmount] = useState<number | string>('');
  const [autoBidMaxAmount, setAutoBidMaxAmount] = useState<number | string>('');
  const [currentAutoBid, setCurrentAutoBid] = useState<{ maxAmount: number } | null>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLive = auction.status === 'LIVE';
  const isUpcoming = auction.status === 'UPCOMING';
  const isEnded = auction.status === 'ENDED';
  const isCurrentUserLeading = user && auction.currentWinnerId === user.id;

  const countdown = useCountdown(isUpcoming ? auction.startTime : auction.endTime);

  const bikeImages: string[] = (() => {
    try {
      return JSON.parse(auction.bike.imagesJson || '[]');
    } catch {
      return [auction.bike.primaryImage];
    }
  })();

  const bikeSpecs: Record<string, string> = (() => {
    try {
      return JSON.parse(auction.bike.specsJson || '{}');
    } catch {
      return {};
    }
  })();

  const loadFullDetails = async () => {
    try {
      const [full, autoBidData] = await Promise.all([
        api.getAuctionById(auction.id),
        user ? api.getAutoBid(auction.id).catch(() => null) : Promise.resolve(null),
      ]);
      setAuction(full);
      if (full.bids) {
        setBids(full.bids);
      }
      if (autoBidData && autoBidData.maxAmount > 0) {
        setCurrentAutoBid(autoBidData);
        setAutoBidMaxAmount(autoBidData.maxAmount);
      }
    } catch (err) {
      console.error('Failed to load auction details', err);
    }
  };

  useEffect(() => {
    loadFullDetails();
    joinAuction(auction.id);

    if (socket) {
      const handleBidPlaced = (data: any) => {
        if (data.auctionId === auction.id) {
          setAuction((prev) => ({
            ...prev,
            currentBid: data.amount,
            currentWinnerId: data.bidderId,
            winner: { id: data.bidderId, name: data.bidderName, email: '' },
            endTime: data.endTime,
            isReserveMet: data.isReserveMet,
          }));

          const newBid: Bid = {
            id: data.bidId,
            auctionId: data.auctionId,
            bidderId: data.bidderId,
            amount: data.amount,
            timestamp: data.timestamp,
            isWinning: true,
            bidder: {
              id: data.bidderId,
              name: data.bidderName,
              email: '',
            },
          };

          setBids((prev) => [newBid, ...prev.map((b) => ({ ...b, isWinning: false }))]);

          // Play audio and trigger celebration
          if (user && data.bidderId === user.id) {
            soundEffects.playBidSound();
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      };

      const handleAuctionExtended = (data: any) => {
        if (data.auctionId === auction.id) {
          setAuction((prev) => ({
            ...prev,
            endTime: data.newEndTime,
            antiSnipingExtensionsCount: data.antiSnipingExtensionsCount,
          }));
          setSuccessMessage(data.message);
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      };

      const handleStatusChanged = (data: any) => {
        if (data.auctionId === auction.id) {
          setAuction((prev) => ({
            ...prev,
            status: data.status,
            currentWinnerId: data.winnerId || prev.currentWinnerId,
            currentBid: data.finalBid || prev.currentBid,
          }));
          onRefreshAuctions();
        }
      };

      socket.on('bid:placed', handleBidPlaced);
      socket.on('auction:extended', handleAuctionExtended);
      socket.on('auction:status_changed', handleStatusChanged);

      return () => {
        leaveAuction(auction.id);
        socket.off('bid:placed', handleBidPlaced);
        socket.off('auction:extended', handleAuctionExtended);
        socket.off('auction:status_changed', handleStatusChanged);
      };
    }
  }, [auction.id, socket, user?.id]);

  const minNextBid = auction.currentBid > 0 ? auction.currentBid + auction.minIncrement : auction.startingPrice;

  const handlePlaceBid = async (amount: number) => {
    if (!user) {
      setErrorMessage('Please select or log in to a buyer account first.');
      return;
    }
    if (amount < minNextBid) {
      setErrorMessage(`Bid must be at least $${minNextBid.toLocaleString()}`);
      return;
    }
    if (user.balance < amount) {
      setErrorMessage(`Insufficient balance ($${user.balance.toLocaleString()}) to place a $${amount.toLocaleString()} bid.`);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await api.placeBid(auction.id, amount);
      soundEffects.playBidSound();
      setSuccessMessage(`Bid of $${amount.toLocaleString()} placed successfully!`);
      setCustomBidAmount('');
      await refreshUser();
      onRefreshAuctions();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to place bid';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetAutoBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please select a buyer account first.');
      return;
    }
    const max = Number(autoBidMaxAmount);
    if (!max || max < minNextBid) {
      setErrorMessage(`Auto-bid budget must be at least $${minNextBid.toLocaleString()}`);
      return;
    }
    if (user.balance < max) {
      setErrorMessage(`Insufficient balance ($${user.balance.toLocaleString()}) for maximum budget of $${max.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.setAutoBid(auction.id, max);
      setCurrentAutoBid({ maxAmount: max });
      soundEffects.playBidSound();
      setSuccessMessage(`Proxy Auto-Bid active! System will counter-bid up to $${max.toLocaleString()}`);
      await refreshUser();
      onRefreshAuctions();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to configure auto-bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAutoBid = async () => {
    try {
      await api.deleteAutoBid(auction.id);
      setCurrentAutoBid(null);
      setAutoBidMaxAmount('');
      setSuccessMessage('Proxy auto-bid cancelled.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleToggleWatch = async () => {
    try {
      const res = await api.toggleWatchlist(auction.id);
      setIsWatched(res.isWatched);
    } catch (err) {
      console.error('Watchlist toggle failed', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
                isLive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : isUpcoming
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isLive && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>}
              <span>{auction.status} AUCTION</span>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">VIN: {auction.bike.vin}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleWatch}
              title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
              className={`p-2 rounded-xl border transition ${
                isWatched
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWatched ? 'fill-rose-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Visuals, Specs, Inspection & Price Chart */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            <div className="relative h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
              <img
                src={selectedImage}
                alt={auction.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-amber-400 flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Condition: {auction.bike.conditionScore.toFixed(1)} / 10 Verified</span>
              </div>
            </div>

            {bikeImages.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-1">
                {bikeImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition ${
                      selectedImage === img ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Price Escalation Curve */}
            <BidPriceChart bids={bids} startingPrice={auction.startingPrice} />

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <h2 className="text-xl font-black text-white">{auction.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <span>{auction.bike.year}</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> <span>{auction.bike.engineCc} cc Engine</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><Gauge className="w-3.5 h-3.5 text-slate-400" /> <span>{auction.bike.mileage.toLocaleString()} mi</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> <span>{auction.bike.location}</span></span>
              </div>

              {/* 5-Point Inspection Verification Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">5-Point Certified Inspection</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Powertrain</span>
                    <span className="text-emerald-400 font-bold">10/10 PASS</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Chassis & Frame</span>
                    <span className="text-emerald-400 font-bold">10/10 PASS</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Braking & ABS</span>
                    <span className="text-emerald-400 font-bold">9.8/10 PASS</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Electrical & ECU</span>
                    <span className="text-emerald-400 font-bold">10/10 PASS</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Tires & Suspension</span>
                    <span className="text-emerald-400 font-bold">9.5/10 PASS</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Clean Title / VIN</span>
                    <span className="text-emerald-400 font-bold">VERIFIED</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-3">{auction.bike.inspectionSummary}</p>
              </div>

              {Object.keys(bikeSpecs).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Technical Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(bikeSpecs).map(([key, value]) => (
                      <div key={key} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60">
                        <span className="text-slate-400 capitalize block text-[10px]">{key}</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Live Bidding Room & Proxy Auto-Bidding */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className={`w-4 h-4 ${countdown.isUrgent && isLive ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>{isUpcoming ? 'Auction Starts In' : 'Time Remaining'}</span>
                </div>
                <div
                  className={`text-lg font-mono font-bold ${
                    countdown.isUrgent && isLive ? 'text-red-400 animate-pulse' : 'text-amber-400'
                  }`}
                >
                  {countdown.isEnded ? 'Auction Concluded' : countdown.formatted}
                </div>
              </div>

              <div className="py-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {isEnded ? 'Final Winning Amount' : 'Current Highest Bid'}
                </span>
                <div className="text-3xl font-black text-emerald-400 mt-1 flex items-baseline space-x-2">
                  <span>${auction.currentBid.toLocaleString()}</span>
                  <span className="text-xs font-normal text-slate-400">USD</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Current Leader:</span>
                    <span className="font-bold text-white">
                      {auction.winner?.name || 'No bids placed yet'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                    {auction.isReserveMet ? (
                      <span className="text-emerald-400 font-semibold flex items-center space-x-0.5">
                        <CheckCircle2 className="w-3 h-3" /> <span>Reserve Met</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/80 font-medium">Reserve Not Met</span>
                    )}
                  </div>
                </div>

                {user && isLive && (
                  <div className="mt-3">
                    {isCurrentUserLeading ? (
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-medium">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        <span>You are currently the highest bidder!</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center space-x-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span>Minimum next bid: <strong className="text-white">${minNextBid.toLocaleString()}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Anti-Sniping Protection Notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start space-x-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Anti-Sniping (Soft-Close) Active:</strong> Any bid submitted within the final 60 seconds automatically extends the auction by 60 seconds.
                  {auction.antiSnipingExtensionsCount > 0 && (
                    <div className="mt-1 font-bold text-amber-400">
                      ⚡ Extended {auction.antiSnipingExtensionsCount} time(s) so far.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bidding Panel with Direct vs Proxy Auto-Bid Switcher */}
            {isLive ? (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                
                {/* Mode Selector Tabs */}
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setBiddingTab('direct')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      biddingTab === 'direct'
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Direct Bidding</span>
                  </button>

                  <button
                    onClick={() => setBiddingTab('autobid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      biddingTab === 'autobid'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Proxy Auto-Bid</span>
                    {currentAutoBid && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/40 text-rose-200 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/40 text-emerald-200 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Direct Bid Mode */}
                {biddingTab === 'direct' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        auction.minIncrement,
                        auction.minIncrement * 2,
                        auction.minIncrement * 5,
                      ].map((inc, i) => {
                        const target = minNextBid + (i > 0 ? inc - auction.minIncrement : 0);
                        return (
                          <button
                            key={inc}
                            disabled={isSubmitting}
                            onClick={() => handlePlaceBid(target)}
                            className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50"
                          >
                            +${inc.toLocaleString()}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              (${target.toLocaleString()})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customBidAmount) {
                          handlePlaceBid(Number(customBidAmount));
                        }
                      }}
                      className="flex space-x-2"
                    >
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="number"
                          step={auction.minIncrement}
                          min={minNextBid}
                          placeholder={`Custom bid (min $${minNextBid.toLocaleString()})`}
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !customBidAmount}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-black font-extrabold text-xs transition shadow-lg shadow-amber-500/20"
                      >
                        {isSubmitting ? 'Submitting...' : 'Bid'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Proxy Auto-Bid Mode */}
                {biddingTab === 'autobid' && (
                  <form onSubmit={handleSetAutoBid} className="space-y-3">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Proxy Auto-Bidding:</strong> Specify your maximum ceiling budget. The platform will automatically submit minimum increment counter-bids on your behalf whenever other users bid.
                    </p>

                    {currentAutoBid && (
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-purple-300">Active Auto-Bid Budget</div>
                          <div className="text-white font-extrabold text-base">
                            Up to ${currentAutoBid.maxAmount.toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelAutoBid}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        min={minNextBid}
                        step={auction.minIncrement}
                        placeholder={`Set Max Budget (e.g. $${(minNextBid + 5000).toLocaleString()})`}
                        value={autoBidMaxAmount}
                        onChange={(e) => setAutoBidMaxAmount(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !autoBidMaxAmount}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                      {currentAutoBid ? 'Update Auto-Bid Budget' : 'Activate Proxy Auto-Bidding'}
                    </button>
                  </form>
                )}

              </div>
            ) : isEnded ? (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h4 className="font-bold text-white text-sm">Auction Concluded</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Sold to <strong className="text-white">{auction.winner?.name || 'Highest Bidder'}</strong> for ${auction.currentBid.toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h4 className="font-bold text-white text-sm">Upcoming Auction</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Bidding opens automatically at {new Date(auction.startTime).toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Live Bid History Stream */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">Live Bid Log</span>
                <span className="text-slate-500">{bids.length} bids recorded</span>
              </div>

              <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-56">
                {bids.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No bids recorded yet. Be the first to bid!</p>
                ) : (
                  bids.map((bid, idx) => (
                    <div
                      key={bid.id || idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        bid.isWinning
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {bid.isWinning && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                        <div>
                          <span className="font-bold text-white">{bid.bidder?.name || 'Bidder'}</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="font-black text-sm">
                        ${bid.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
