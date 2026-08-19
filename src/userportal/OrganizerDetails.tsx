import React from "react";
import { OrganizerProfile, Conference } from "../shared/types";
import { Building2, Globe, MapPin, CheckCircle, Mail, ExternalLink, Calendar } from "lucide-react";
import { getConferenceSlug } from "../shared/utils/slugUtils";

interface OrganizerDetailsProps {
  organizer: OrganizerProfile;
  conferences?: Conference[];
  onClose?: () => void;
  onSelectConference?: (conf: Conference) => void;
}

export const OrganizerDetails: React.FC<OrganizerDetailsProps> = ({
  organizer,
  conferences = [],
  onClose,
  onSelectConference,
}) => {
  const orgConferences = conferences.filter((c) => c.organizerId === organizer.id);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center p-2">
            {organizer.logo ? (
              <img src={organizer.logo} alt={organizer.organizationName} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{organizer.organizationName}</h1>
              {organizer.isVerified && <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{organizer.city}, {organizer.country}</span>
            </p>
          </div>
        </div>

        {organizer.organizationWebsite && (
          <a
            href={organizer.organizationWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>Visit Website</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Organization</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{organizer.aboutOrganization || "No description provided."}</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Hosted Conferences ({orgConferences.length})</span>
        </h3>

        {orgConferences.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No conferences listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orgConferences.map((conf) => {
              const confSlug = getConferenceSlug(conf, conferences);
              const confUrl = `/conference/${confSlug}`;
              return (
                <a
                  key={conf.id}
                  href={confUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 block group"
                >
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate mb-1">{conf.title}</h4>
                  <p className="text-[10px] text-slate-500">{conf.startDate} • {conf.city}, {conf.country}</p>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetails;
