import React from "react";
import { privacyPolicyContent } from "../content/privacyPolicy";

export const PrivacyPolicy: React.FC = () => {
  return (
    <section className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900 font-display">{privacyPolicyContent.title}</h1>
      <p className="text-sm text-slate-500 font-medium">Last updated: {privacyPolicyContent.lastUpdated}</p>
      {privacyPolicyContent.intro && (
        <p className="text-sm text-slate-600 leading-relaxed font-medium">{privacyPolicyContent.intro}</p>
      )}
      <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
        {privacyPolicyContent.sections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800">{sec.title}</h2>
            <p>{sec.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PrivacyPolicy;
