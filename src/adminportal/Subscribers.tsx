import React from "react";
import { SubscriberItem } from "../shared/types";
import { Mail } from "lucide-react";

interface SubscribersProps {
  subscribers?: SubscriberItem[];
}

export const Subscribers: React.FC<SubscribersProps> = ({ subscribers = [] }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Email Subscribers</h1>
        <p className="text-xs text-slate-500">Subscribed users for conference alert newsletters</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {subscribers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No email subscribers found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subscribers.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>{s.email}</span>
                </span>
                <span className="text-slate-400 text-[10px]">{s.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscribers;
