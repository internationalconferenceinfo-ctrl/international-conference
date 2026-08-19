import React from "react";
import { LogIn } from "lucide-react";

interface LoginProps {
  onLoginClick?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginClick }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto font-bold">
        <LogIn className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Sign In to Your Account</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Access the organizer dashboard to submit, manage, and track your global conferences.
      </p>
      <button
        onClick={onLoginClick}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
      >
        Open Sign In Modal
      </button>
    </div>
  );
};

export default Login;
