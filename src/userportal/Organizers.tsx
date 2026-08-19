import React from "react";
import { OrganizerProfile } from "../shared/types";
import { Building2, Globe, MapPin, CheckCircle, ArrowRight } from "lucide-react";

interface OrganizersProps {
  organizers: OrganizerProfile[];
  onSelectOrganizer?: (org: OrganizerProfile) => void;
}

export const Organizers: React.FC<OrganizersProps> = ({ organizers, onSelectOrganizer }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Verified Organizers</h1>
          <p className="text-xs text-slate-500">Discover top academic and professional conference organizers worldwide</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizers.map((org) => (
          <div
            key={org.id}
            onClick={() => onSelectOrganizer?.(org)}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center p-1">
                  {org.logo ? (
                    <img src={org.logo} alt={org.organizationName} className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                      {org.organizationName}
                    </h3>
                    {org.isVerified && <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{org.contactPerson}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{org.aboutOrganization || "No description provided."}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{org.city}, {org.country}</span>
              </span>
              <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Organizers;
