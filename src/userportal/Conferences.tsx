import React from "react";
import { Conference } from "../shared/types";
import { Calendar, MapPin, Globe, ArrowRight, Search, Filter } from "lucide-react";
import { getConferenceSlug } from "../shared/utils/slugUtils";

interface ConferencesProps {
  conferences: Conference[];
  onSelectConference?: (conf: Conference) => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (val: string) => void;
  categories?: string[];
}

export const Conferences: React.FC<ConferencesProps> = ({
  conferences,
  onSelectConference,
  searchTerm = "",
  onSearchChange,
  selectedCategory = "All",
  onCategoryChange,
  categories = [],
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by conference title, location, or keywords..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange?.(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conferences.map((conf) => {
          const confSlug = getConferenceSlug(conf, conferences);
          const confUrl = `/conference/${confSlug}`;
          return (
            <div
              key={conf.id}
              onClick={() => {
                window.open(confUrl, "_blank");
              }}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                  {conf.bannerImage ? (
                    <img
                      src={conf.bannerImage}
                      alt={conf.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Globe className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {conf.category}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {conf.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{conf.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>{conf.startDate}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    <span>{conf.city}, {conf.country}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {conf.attendanceType || "Offline"}
                  </span>
                  <a
                    href={confUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Conferences;
