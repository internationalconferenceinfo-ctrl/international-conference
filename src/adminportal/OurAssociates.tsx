import React from "react";
import { Handshake } from "lucide-react";

export const OurAssociates: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Our Associates</h1>
        <p className="text-xs text-slate-500">Approve, add, or edit academic institutions and research alliances</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
        <Handshake className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
        Associates management settings.
      </div>
    </div>
  );
};

export default OurAssociates;
