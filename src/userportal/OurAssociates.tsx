import React from "react";
import { Handshake, Building2, Globe } from "lucide-react";

export const OurAssociates: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Our Associates</h1>
          <p className="text-xs text-slate-500">Academic institutions, research councils, and strategic alliance partners</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto font-bold">
          <Handshake className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Institutional & Research Alliances</h2>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Partnering with prestigious universities and international research councils to elevate academic standards worldwide.
        </p>
      </div>
    </div>
  );
};

export default OurAssociates;
