import React from "react";
import { Conference } from "../shared/types";
import { Edit2, Eye, Trash2 } from "lucide-react";

interface ManageConferencesProps {
  conferences: Conference[];
  onDelete?: (id: string) => void;
  onEdit?: (conf: Conference) => void;
}

export const ManageConferences: React.FC<ManageConferencesProps> = ({ conferences, onDelete, onEdit }) => {
  const activeApproved = conferences.filter((c) => c.status === "Approved" && c.liveStatus !== "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Approved Conferences</h1>
        <p className="text-xs text-slate-500">Overview of all active approved conferences currently live on the platform</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {activeApproved.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No active approved conferences found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeApproved.map((conf) => (
              <div key={conf.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{conf.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">{conf.startDate} • {conf.city}, {conf.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit?.(conf)} className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete?.(conf.id)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
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

export default ManageConferences;
