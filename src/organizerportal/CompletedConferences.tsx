import React, { useState } from "react";
import { Conference } from "../shared/types";
import { Calendar, Trash2 } from "lucide-react";

interface CompletedConferencesProps {
  conferences: Conference[];
  onDeleteConferences?: (ids: string[]) => void;
}

export const CompletedConferences: React.FC<CompletedConferencesProps> = ({
  conferences,
  onDeleteConferences,
}) => {
  const completed = conferences.filter((c) => c.liveStatus === "Completed" || c.status === "Completed");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === completed.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(completed.map((c) => c.id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteConferences?.(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Completed Conferences</h1>
          <p className="text-xs text-slate-500">Past conferences. Completed items cannot be edited; only deletion is allowed.</p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {completed.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No completed conferences.</div>
        ) : (
          <div>
            <div className="bg-slate-50 border-b border-slate-100 p-3.5 px-4 flex items-center gap-3 text-xs font-bold text-slate-500">
              <input
                type="checkbox"
                checked={selectedIds.length === completed.length && completed.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Select All ({completed.length})</span>
            </div>
            <div className="divide-y divide-slate-100">
              {completed.map((conf) => (
                <div key={conf.id} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(conf.id)}
                    onChange={() => toggleSelect(conf.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-purple-500 shrink-0" />
                      <span>{conf.title}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">{conf.startDate} - {conf.endDate} • {conf.city}, {conf.country}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedConferences;
