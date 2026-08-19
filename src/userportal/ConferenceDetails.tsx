import React from "react";
import { Conference } from "../shared/types";
import { Calendar, MapPin, Globe, ExternalLink, Mail, CheckCircle, Clock } from "lucide-react";

interface ConferenceDetailsProps {
  conference: Conference;
  onClose?: () => void;
}

export const ConferenceDetails: React.FC<ConferenceDetailsProps> = ({ conference, onClose }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl max-w-4xl mx-auto">
      {conference.bannerImage && (
        <div className="h-64 sm:h-80 w-full overflow-hidden bg-slate-100 relative">
          <img src={conference.bannerImage} alt={conference.title} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          <span className="absolute bottom-4 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {conference.category}
          </span>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{conference.title}</h1>
          {conference.shortTitle && <p className="text-xs font-bold text-slate-400 mt-1">{conference.shortTitle}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Dates</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>{conference.startDate} - {conference.endDate}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Location</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>{conference.city}, {conference.country}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Type</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
              <span>{conference.attendanceType || "Offline"}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Timezone</span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>{conference.timeZone || "UTC"}</span>
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{conference.description}</p>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          {conference.registrationLink && (
            <a
              href={conference.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-md"
            >
              <span>Register Now</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {conference.conferenceWebsite && (
            <a
              href={conference.conferenceWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              <span>Official Website</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferenceDetails;
