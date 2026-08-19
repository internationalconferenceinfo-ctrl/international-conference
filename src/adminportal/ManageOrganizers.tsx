import React from "react";
import { OrganizerProfile } from "../shared/types";
import { Building2, CheckCircle, Ban, Trash2 } from "lucide-react";

interface ManageOrganizersProps {
  organizers: OrganizerProfile[];
  onVerify?: (id: string) => void;
  onToggleSuspend?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ManageOrganizers: React.FC<ManageOrganizersProps> = ({
  organizers,
  onVerify,
  onToggleSuspend,
  onDelete,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Organizers</h1>
        <p className="text-xs text-slate-500">Verify, suspend, or manage registered organizer accounts</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {organizers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No registered organizers.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {organizers.map((org) => (
              <div key={org.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {org.logo ? (
                      <img src={org.logo} alt={org.organizationName} className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{org.organizationName}</span>
                      {org.isVerified && <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    </h3>
                    <p className="text-[10px] text-slate-500">{org.email} • {org.city}, {org.country}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerify?.(org.id)}
                    className={`px-3 py-1.5 font-bold rounded-xl text-xs transition-colors ${
                      org.isVerified ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {org.isVerified ? "Verified" : "Verify"}
                  </button>
                  <button
                    onClick={() => onToggleSuspend?.(org.id)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(org.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
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

export default ManageOrganizers;
