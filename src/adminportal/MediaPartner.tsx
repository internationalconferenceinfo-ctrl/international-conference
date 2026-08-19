import React from "react";
import { Newspaper } from "lucide-react";

export const MediaPartner: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Media Partners</h1>
        <p className="text-xs text-slate-500">Approve, add, or edit global publication and journal partners</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
        <Newspaper className="h-8 w-8 text-purple-500 mx-auto mb-2" />
        Media partner management settings.
      </div>
    </div>
  );
};

export default MediaPartner;
