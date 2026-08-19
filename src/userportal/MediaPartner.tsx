import React from "react";
import { Newspaper, Globe, ExternalLink } from "lucide-react";

export const MediaPartner: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Media Partners</h1>
          <p className="text-xs text-slate-500">Official publication outlets, scientific journals, and global press allies</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto font-bold">
          <Newspaper className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Global Media & Publishing Network</h2>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          We collaborate with international journal publishers, technology outlets, and media networks to maximize conference visibility.
        </p>
      </div>
    </div>
  );
};

export default MediaPartner;
