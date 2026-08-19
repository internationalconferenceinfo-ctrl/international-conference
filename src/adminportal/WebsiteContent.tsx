import React from "react";
import { FileText } from "lucide-react";

export const WebsiteContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Website Content</h1>
        <p className="text-xs text-slate-500">Edit static content pages: About Us, Privacy Policy, Terms of Service</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs">
        <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
        Website static content editor module.
      </div>
    </div>
  );
};

export default WebsiteContent;
