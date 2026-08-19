import React from "react";
import { Conference } from "../shared/types";
import { Clock } from "lucide-react";

interface PendingConferencesProps {
  conferences: Conference[];
  onView?: (conf: Conference) => void;
}

export const PendingConferences: React.FC<PendingConferencesProps> = ({ conferences, onView }) => {
  const pending = conferences.filter((c) => c.status === "Pending Review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Pending Review</h1>
        <p className="text-xs text-slate-500">Conferences awaiting review by the admin team</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {pending.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No pending conferences.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((conf) => (
              <div key={conf.id} onClick={() => onView?.(conf)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{conf.title}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">{conf.startDate} • {conf.city}, {conf.country}</p>
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
