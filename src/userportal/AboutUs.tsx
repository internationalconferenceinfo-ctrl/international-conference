import React, { useEffect, useState } from "react";
import { aboutUsContent } from "../content/aboutUs";
import { fetchFromSupabase } from "../database/supabase";
import { Globe, Award } from "lucide-react";

interface AboutUsDatabaseRow {
  id: string;
  mission_badge: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  image_url?: string;
  updated_at?: string;
}

interface AboutUsDisplayContent {
  missionBadge: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  imageUrl: string;
}

export const AboutUs: React.FC = () => {
  // Start with your old hard-coded content.
  // This remains as a fallback if Supabase is unavailable.
  const [content, setContent] = useState<AboutUsDisplayContent>({
    missionBadge: aboutUsContent.missionBadge,
    title: aboutUsContent.title,
    paragraph1: aboutUsContent.paragraph1,
    paragraph2: aboutUsContent.paragraph2,
    stat1Value: aboutUsContent.stat1Value,
    stat1Label: aboutUsContent.stat1Label,
    stat2Value: aboutUsContent.stat2Value,
    stat2Label: aboutUsContent.stat2Label,
    imageUrl: aboutUsContent.imageUrl,
  });

  useEffect(() => {
    const loadAboutUs = async () => {
      try {
       const data = await fetchFromSupabase<AboutUsDatabaseRow[]>(
        "about_us",
        true
      );

        if (!data || !Array.isArray(data) || data.length === 0) {
          return;
        }

        // Prefer the permanent primary record.
        const row = data.find((item) => item.id === "primary") || data[0];

        setContent({
          missionBadge:
            row.mission_badge || aboutUsContent.missionBadge,

          title:
            row.title || aboutUsContent.title,

          paragraph1:
            row.paragraph1 || aboutUsContent.paragraph1,

          paragraph2:
            row.paragraph2 || aboutUsContent.paragraph2,

          stat1Value:
            row.stat1_value || aboutUsContent.stat1Value,

          stat1Label:
            row.stat1_label || aboutUsContent.stat1Label,

          stat2Value:
            row.stat2_value || aboutUsContent.stat2Value,

          stat2Label:
            row.stat2_label || aboutUsContent.stat2Label,

          imageUrl:
            row.image_url || aboutUsContent.imageUrl,
        });
      } catch (error) {
        console.error("Failed to load About Us content:", error);

        // No action required.
        // Existing aboutUsContent remains visible as fallback.
      }
    };

    loadAboutUs();
  }, []);

  return (
    <section
      id="about"
      className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
    >
      {/* LEFT SIDE */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold uppercase tracking-wider">
          <Globe className="h-3.5 w-3.5" />

          <span>
            {content.missionBadge || "About Us"}
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {content.title}
        </h2>

        <div className="space-y-4 text-slate-600 leading-relaxed text-sm">
          <p>{content.paragraph1}</p>
          <p>{content.paragraph2}</p>
        </div>
      </div>

      {/* RIGHT SIDE - STATISTICS */}
      <div className="grid grid-cols-2 gap-4">

        {/* STAT 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 font-bold">
            <Award className="h-5 w-5" />
          </div>

          <h3 className="font-extrabold text-slate-900 text-lg mb-1">
            {content.stat1Value}
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            {content.stat1Label}
          </p>
        </div>

        {/* STAT 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 font-bold">
            <Globe className="h-5 w-5" />
          </div>

          <h3 className="font-extrabold text-slate-900 text-lg mb-1">
            {content.stat2Value}
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            {content.stat2Label}
          </p>
        </div>

      </div>
    </section>
  );
};

export default AboutUs;