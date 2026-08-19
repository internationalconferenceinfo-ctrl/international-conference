import React from "react";
import { UserFeedback } from "../shared/types";
import { Star, MessageSquare } from "lucide-react";

interface FeedbacksProps {
  feedbacks?: UserFeedback[];
}

export const Feedbacks: React.FC<FeedbacksProps> = ({ feedbacks = [] }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">User Feedbacks</h1>
        <p className="text-xs text-slate-500">Review testimonials submitted by visitors and organizers</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {feedbacks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">No user feedback submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900">{fb.name}</h3>
                  <div className="flex items-center text-amber-400 text-xs">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="ml-1 font-bold text-slate-700">{fb.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{fb.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedbacks;
