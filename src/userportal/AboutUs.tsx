import React from "react";
import { aboutUsContent } from "../content/aboutUs";
import { Globe, Award, ShieldCheck, Users } from "lucide-react";

export const AboutUs: React.FC = () => {
  return (
    <section id="about" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold uppercase tracking-wider">
          <Globe className="h-3.5 w-3.5" />
          <span>{aboutUsContent.missionBadge || "About Us"}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {aboutUsContent.title}
        </h2>
        <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
          <p>{aboutUsContent.paragraph1}</p>
          <p>{aboutUsContent.paragraph2}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 font-bold">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg mb-1">{aboutUsContent.stat1Value}</h3>
          <p className="text-xs text-slate-500 leading-normal">{aboutUsContent.stat1Label}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 font-bold">
            <Globe className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg mb-1">{aboutUsContent.stat2Value}</h3>
          <p className="text-xs text-slate-500 leading-normal">{aboutUsContent.stat2Label}</p>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
