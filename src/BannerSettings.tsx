import React from "react";
import { Banner } from "./shared/types";
import { Image as ImageIcon } from "lucide-react";

interface BannerSettingsProps {
  banners: Banner[];
}

export const BannerSettings: React.FC<BannerSettingsProps> = ({ banners }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Banner Settings</h1>
        <p className="text-xs text-slate-500">Manage home page hero banner slides and carousel ordering</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <p className="text-xs text-slate-600">Configured homepage hero banners ({banners.length})</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="h-32 w-full overflow-hidden">
                <img src={b.image} alt="Banner" className="w-full h-full object-contain" />
              </div>
              <div className="p-3 text-[10px] font-bold text-slate-700">
                Order #{b.order}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerSettings;
