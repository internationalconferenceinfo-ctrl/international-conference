import React from "react";
import { AuditLog } from "../shared/types";
import { Activity } from "lucide-react";

interface AuditLogsProps {
  auditLogs?: AuditLog[];
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ auditLogs = [] }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">System Audit Logs</h1>
        <p className="text-xs text-slate-500">Security log trail recording admin actions and updates</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No system audit logs found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-slate-900">{log.action}</h3>
                  <p className="text-[10px] text-slate-500">{typeof log.details === "string" ? log.details : JSON.stringify(log.details ?? "")}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-700 block">{log.actor} ({log.role})</span>
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
