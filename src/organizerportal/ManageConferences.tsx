import React from "react";
import { Conference } from "../shared/types";
import { Edit2, Eye, Trash2, Calendar, MapPin } from "lucide-react";

interface ManageConferencesProps {
  conferences: Conference[];
  onEdit?: (conf: Conference) => void;
  onDelete?: (confId: string) => void;
  onView?: (conf: Conference) => void;
}

export const ManageConferences: React.FC<ManageConferencesProps> = ({
  conferences,
  onEdit,
  onDelete,
  onView,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Conferences</h1>
        <p className="text-xs text-slate-500">Edit and oversee all your conference submissions</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {conferences.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No conferences found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conferences.map((conf) => (
              <div key={conf.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h3 className="font-bold text-xs text-slate-900">{conf.title}</h3>
                  <p className="text-[10px] text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <span>{conf.startDate}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-rose-500" />
                      <span>{conf.city}, {conf.country}</span>
                    </span>
                    <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {conf.status}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => onView?.(conf)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
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
