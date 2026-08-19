import React from "react";
import { Conference, OrganizerProfile } from "../shared/types";
import { LayoutDashboard, Clock, CheckCircle2, Building2, Calendar } from "lucide-react";

interface AdminDashboardProps {
  conferences?: Conference[];
  organizers?: OrganizerProfile[];
  onNavigateTab?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  conferences = [],
  organizers = [],
  onNavigateTab,
}) => {
  const pending = conferences.filter((c) => c.status === "Pending Review");
  const approved = conferences.filter((c) => c.status === "Approved" && c.liveStatus !== "Completed");
  const completed = conferences.filter((c) => c.liveStatus === "Completed" || c.status === "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">Admin Dashboard Overview</h1>
        <p className="text-xs text-slate-500">System metrics and pending tasks requiring admin attention</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigateTab?.("pending")} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-amber-400 cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Pending Review</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pending.length}</p>
        </div>

        <div onClick={() => onNavigateTab?.("conferences")} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-400 cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Active Approved</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{approved.length}</p>
        </div>

        <div onClick={() => onNavigateTab?.("organizers")} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-400 cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Organizers</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{organizers.length}</p>
        </div>

        <div onClick={() => onNavigateTab?.("completed")} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-400 cursor-pointer">
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

export default AdminDashboard;
