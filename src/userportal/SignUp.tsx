import React from "react";
import { UserPlus } from "lucide-react";

interface SignUpProps {
  onSignUpClick?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSignUpClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
      <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto font-bold">
        <UserPlus className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Register as an Organizer</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Join our global network of verified academic, industrial, and medical conference organizers.
      </p>
      <button
        onClick={onSignUpClick}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
      >
        Open Organizer Registration
      </button>
    </div>
  );
};

export default SignUp;
