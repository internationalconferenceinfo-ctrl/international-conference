import React from "react";
import { Conference } from "../shared/types";
import { LayoutDashboard, CheckCircle2, Clock, XCircle, Calendar } from "lucide-react";

interface OrganizerDashboardProps {
  conferences?: Conference[];
  organizerId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  conferences = [],
  organizerId,
  onNavigateTab,
}) => {
  const myConferences = conferences.filter((c) => !organizerId || c.organizerId === organizerId);
  const approved = myConferences.filter((c) => c.status === "Approved" && c.liveStatus !== "Completed");
  const pending = myConferences.filter((c) => c.status === "Pending Review");
  const rejected = myConferences.filter((c) => c.status === "Rejected");
  const completed = myConferences.filter((c) => c.liveStatus === "Completed" || c.status === "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">Organizer Overview</h1>
        <p className="text-xs text-slate-500">Track and manage your submitted academic conferences</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab?.("approved")}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Approved</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{approved.length}</p>
        </div>

        <div
          onClick={() => onNavigateTab?.("pending")}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-amber-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Pending Review</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pending.length}</p>
        </div>

        <div
          onClick={() => onNavigateTab?.("rejected")}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-rose-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Rejected</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{rejected.length}</p>
        </div>

        <div
          onClick={() => onNavigateTab?.("completed")}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Completed</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{completed.length}</p>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
