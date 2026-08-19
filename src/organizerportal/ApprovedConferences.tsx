import React from "react";
import { Conference } from "../shared/types";
import { CheckCircle2, Calendar, MapPin } from "lucide-react";

interface ApprovedConferencesProps {
  conferences: Conference[];
  onView?: (conf: Conference) => void;
}

export const ApprovedConferences: React.FC<ApprovedConferencesProps> = ({ conferences, onView }) => {
  const approved = conferences.filter((c) => c.status === "Approved" && c.liveStatus !== "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Approved Conferences</h1>
        <p className="text-xs text-slate-500">Conferences approved by admin and listed publicly</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {approved.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No approved conferences.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approved.map((conf) => (
              <div key={conf.id} onClick={() => onView?.(conf)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{conf.title}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 flex items-center gap-3 mt-1">
                    <span>{conf.startDate}</span>
                    <span>{conf.city}, {conf.country}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedConferences;
