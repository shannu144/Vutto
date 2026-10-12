import React from 'react';
import type { Bid } from '../../types';
import { TrendingUp } from 'lucide-react';

interface BidPriceChartProps {
  bids: Bid[];
  startingPrice: number;
}

export const BidPriceChart: React.FC<BidPriceChartProps> = ({ bids, startingPrice }) => {
  if (bids.length < 2) {
    return (
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-center text-xs text-slate-500">
        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-slate-600" />
        <span>Price progression curve will appear after 2+ bids</span>
      </div>
    );
  }

  // Reverse chronological to chronological for graphing
  const sortedBids = [...bids].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const dataPoints = [
    { label: 'Start', amount: startingPrice },
    ...sortedBids.map((b, i) => ({
      label: `#${i + 1}`,
      amount: b.amount,
      bidder: b.bidder?.name || 'Bidder',
      time: new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  ];

  const minAmount = startingPrice * 0.95;
  const maxAmount = Math.max(...dataPoints.map((d) => d.amount)) * 1.05;
  const range = maxAmount - minAmount || 1;

  const width = 420;
  const height = 110;
  const paddingX = 25;
  const paddingY = 15;

  const getX = (index: number) => paddingX + (index / (dataPoints.length - 1)) * (width - 2 * paddingX);
  const getY = (amount: number) => height - paddingY - ((amount - minAmount) / range) * (height - 2 * paddingY);

  const points = dataPoints.map((d, i) => `${getX(i)},${getY(d.amount)}`).join(' ');

  return (
    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-bold flex items-center space-x-1.5 text-slate-300 uppercase tracking-wider text-[10px]">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>Price Escalation Curve</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-mono font-bold">
          +${(dataPoints[dataPoints.length - 1].amount - startingPrice).toLocaleString()} Gain
        </span>
      </div>

      <div className="relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
          {/* Subtle grid line */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Sparkline curve */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Area fill */}
          <polygon
            fill="rgba(16, 185, 129, 0.08)"
            points={`${getX(0)},${height - paddingY} ${points} ${getX(dataPoints.length - 1)},${height - paddingY}`}
          />

          {/* Points */}
          {dataPoints.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.amount)}
              r={i === dataPoints.length - 1 ? '4.5' : '2.5'}
              className={i === dataPoints.length - 1 ? 'fill-emerald-400 stroke-slate-900 stroke-2' : 'fill-slate-500'}
            />
          ))}
        </svg>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>${startingPrice.toLocaleString()}</span>
          <span>${dataPoints[dataPoints.length - 1].amount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
