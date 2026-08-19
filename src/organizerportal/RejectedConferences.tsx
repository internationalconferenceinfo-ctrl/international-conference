import React from "react";
import { Conference } from "../shared/types";
import { XCircle, Edit2 } from "lucide-react";

interface RejectedConferencesProps {
  conferences: Conference[];
  onEdit?: (conf: Conference) => void;
}

export const RejectedConferences: React.FC<RejectedConferencesProps> = ({ conferences, onEdit }) => {
  const rejected = conferences.filter((c) => c.status === "Rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Rejected Conferences</h1>
        <p className="text-xs text-slate-500">Conferences that need updates before approval</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {rejected.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No rejected conferences.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rejected.map((conf) => (
              <div key={conf.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{conf.title}</span>
                  </h3>
                </div>
                <button
                  onClick={() => onEdit?.(conf)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit & Resubmit</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RejectedConferences;
