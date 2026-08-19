import React from "react";
import { Download } from "lucide-react";

export const DatabaseBackup: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Database Backup & Export</h1>
        <p className="text-xs text-slate-500">Download complete database backups in JSON or Excel formats</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
        <Download className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        Database backup and export module.
      </div>
    </div>
  );
};

export default DatabaseBackup;
