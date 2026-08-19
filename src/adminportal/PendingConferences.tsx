import React from "react";
import { Conference } from "../shared/types";
import { Check, X, Clock } from "lucide-react";

interface PendingConferencesProps {
  conferences: Conference[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const PendingConferences: React.FC<PendingConferencesProps> = ({ conferences, onApprove, onReject }) => {
  const pending = conferences.filter((c) => c.status === "Pending Review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Pending Conferences</h1>
        <p className="text-xs text-slate-500">Review new conference submissions and grant approval or issue feedback</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {pending.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No pending submissions awaiting review.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((conf) => (
              <div key={conf.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{conf.title}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">{conf.startDate} • {conf.city}, {conf.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApprove?.(conf.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => onReject?.(conf.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingConferences;
