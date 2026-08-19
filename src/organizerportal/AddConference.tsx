import React from "react";
import { PlusCircle } from "lucide-react";

interface AddConferenceProps {
  onAddClick?: () => void;
}

export const AddConference: React.FC<AddConferenceProps> = ({ onAddClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-sm">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto font-bold">
        <PlusCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Add New Conference</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Submit a new academic or industry conference for review and indexing in the global directory.
      </p>
      <button
        onClick={onAddClick}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
      >
        Open Conference Submission Form
      </button>
    </div>
  );
};

export default AddConference;
