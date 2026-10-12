import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { AlertCircle, Clock, Trophy, X, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-slideIn ${
            toast.type === 'alert'
              ? 'bg-rose-950/90 border-rose-600/60 text-rose-100 shadow-rose-950/50'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-600/60 text-amber-100 shadow-amber-950/50'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-600/60 text-emerald-100 shadow-emerald-950/50'
              : 'bg-slate-900/90 border-slate-700 text-slate-100'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'alert' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'warning' && <Clock className="w-5 h-5 text-amber-400 animate-spin" />}
            {toast.type === 'success' && <Trophy className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-blue-400" />}
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
            <p className="text-xs mt-1 leading-relaxed opacity-90">{toast.message}</p>
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
