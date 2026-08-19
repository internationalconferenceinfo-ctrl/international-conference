import React from "react";
import { termsOfServiceContent } from "../content/termsOfService";

export const TermsOfService: React.FC = () => {
  return (
    <section className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900 font-display">{termsOfServiceContent.title}</h1>
      <p className="text-sm text-slate-500 font-medium">Last updated: {termsOfServiceContent.lastUpdated}</p>
      {termsOfServiceContent.intro && (
        <p className="text-sm text-slate-600 leading-relaxed font-medium">{termsOfServiceContent.intro}</p>
      )}
      <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
        {termsOfServiceContent.sections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800">{sec.title}</h2>
            <p>{sec.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TermsOfService;
