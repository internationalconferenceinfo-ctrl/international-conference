import React from "react";
import { OrganizerProfile as ProfileType } from "../shared/types";
import { Building2, Globe, MapPin, Mail, User } from "lucide-react";

interface OrganizerProfileProps {
  profile?: ProfileType;
}

export const OrganizerProfileComponent: React.FC<OrganizerProfileProps> = ({ profile }) => {
  if (!profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
        No profile loaded.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="h-16 w-16 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
          {profile.logo ? (
            <img src={profile.logo} alt={profile.organizationName} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-slate-400" />
          )}
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">{profile.organizationName}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>{profile.contactPerson}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
          <p className="font-semibold text-slate-800">{profile.email}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Location</span>
          <p className="font-semibold text-slate-800">{profile.city}, {profile.country}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Website</span>
          <p className="font-semibold text-blue-600 truncate">{profile.organizationWebsite || "N/A"}</p>
        </div>
      </div>
    </div>
  );
};

export default OrganizerProfileComponent;
