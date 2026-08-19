import React from "react";
import { Conference, Category } from "../shared/types";
import { Globe, ArrowRight, Search } from "lucide-react";

interface HomeProps {
  conferences?: Conference[];
  categories?: Category[];
  onSelectConference?: (conf: Conference) => void;
  onExploreClick?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  conferences = [],
  categories = [],
  onSelectConference,
  onExploreClick,
}) => {
  return (
    <div className="space-y-12">
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold uppercase tracking-wider">
            <Globe className="h-3.5 w-3.5" />
            <span>The Premier Global Conference Directory</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight font-display">
            Discover & Connect with Verified Academic Events
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            Access thousands of indexed, peer-reviewed international conferences, symposiums, and summits across AI, Medicine, Fintech, and Engineering.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onExploreClick}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <span>Explore Conferences</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
