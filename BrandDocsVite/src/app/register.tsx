import { Link, useNavigate } from "react-router";
import { EyeOff, Eye } from "lucide-react";
import { useState } from "react";

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-transparent pt-8 pb-12 px-2">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <svg
          width="48"
          height="56"
          viewBox="0 0 48 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M28 0H8C3.58172 0 0 3.58172 0 8V48C0 52.4183 3.58172 56 8 56H40C44.4183 56 48 52.4183 48 48V20L28 0Z"
            fill="#F09B36"
          />
          <path
            d="M28 0V16C28 18.2091 29.7909 20 32 20H48L28 0Z"
            fill="#FFC47B"
          />
          <rect x="12" y="18" width="12" height="4" rx="2" fill="white" />
          <rect x="12" y="28" width="16" height="4" rx="2" fill="white" />
          <rect x="12" y="38" width="20" height="4" rx="2" fill="white" />
        </svg>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-2">
          Create your account
        </h1>
        <p className="text-sm text-gray-800/80 max-w-64 mx-auto leading-relaxed">
          Start creating professional business documents in minutes.
        </p>
      </div>

      {/* Form */}
      <form className="w-full space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <input
            type="text"
            placeholder="Full Name"
            className="w-full h-12 px-5 rounded-full border border-gray-300 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F09B36] focus:border-[#F09B36] transition-colors"
          />
        </div>
        
        <div>
          <input
            type="email"
            placeholder="Business Email"
            className="w-full h-12 px-5 rounded-full border border-gray-300 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F09B36] focus:border-[#F09B36] transition-colors"
          />
        </div>

        {/* Mobile Number */}
        <div className="relative flex items-center h-12 rounded-full border border-gray-300 bg-transparent focus-within:ring-1 focus-within:ring-[#F09B36] focus-within:border-[#F09B36] transition-colors overflow-hidden pr-2">
          <div className="flex items-center h-full px-4 pr-3 border-r border-gray-300 cursor-pointer hover:bg-black/5 transition-colors shrink-0">
            <span className="text-base mr-2">🇺🇸</span>
            <span className="text-sm font-medium text-gray-700 mr-1">+1</span>
            {/* <ChevronDown className="w-3 h-3 text-gray-500" /> */}
          </div>
          <input
            type="tel"
            placeholder="Mobile Number"
            className="w-full h-full px-4 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full h-12 pl-5 pr-12 rounded-full border border-gray-300 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F09B36] focus:border-[#F09B36] transition-colors"
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <Eye className="w-5 h-5 stroke-[1.5]" />
            ) : (
              <EyeOff className="w-5 h-5 stroke-[1.5]" />
            )}
          </button>
        </div>

        {/* Confirm Password */}
        <div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="w-full h-12 px-5 rounded-full border border-gray-300 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F09B36] focus:border-[#F09B36] transition-colors"
          />
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-2 pt-1 pb-2">
          <div className="flex items-center h-5">
            <input
              id="terms"
              type="checkbox"
              className="w-4 h-4 rounded-sm border-gray-300 text-[#F09B36] focus:ring-[#F09B36] accent-[#F09B36] cursor-pointer"
            />
          </div>
          <label htmlFor="terms" className="text-[13px] text-gray-800 pt-[1px]">
            I agree to the <Link to="#" className="underline hover:text-black">Terms</Link> & <Link to="#" className="underline hover:text-black">Privacy Policy</Link>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          onClick={() => navigate("/dashboard")}
          className="w-full h-12 bg-[#EFA037] hover:bg-[#E49126] text-white rounded-full font-medium text-[15px]"
        >
          Create Account
        </button>
      </form>

      {/* Divider */}
      <div className="w-full flex items-center gap-4 my-6">
        <div className="h-px bg-gray-300 flex-1"></div>
        <span className="text-xs text-gray-500 font-medium">OR</span>
        <div className="h-px bg-gray-300 flex-1"></div>
      </div>

      {/* Social Logins */}
      <div className="w-full space-y-3">
        <button className="w-full h-[46px] bg-white rounded-full flex items-center justify-center gap-3 border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:bg-gray-50 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.72 17.58V20.34H19.29C21.37 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
            <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.72 17.58C14.73 18.24 13.48 18.63 12 18.63C9.13 18.63 6.69 16.69 5.81 14.12H2.12V16.98C3.95 20.61 7.72 23 12 23Z" fill="#34A853"/>
            <path d="M5.81 14.12C5.58 13.46 5.46 12.74 5.46 12C5.46 11.26 5.58 10.54 5.81 9.88V7.02H2.12C1.36 8.52 0.93 10.21 0.93 12C0.93 13.79 1.36 15.48 2.12 16.98L5.81 14.12Z" fill="#FBBC05"/>
            <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.36 3.86C17.45 2.07 14.97 1 12 1C7.72 1 3.95 3.39 2.12 7.02L5.81 9.88C6.69 7.31 9.13 5.38 12 5.38Z" fill="#EA4335"/>
          </svg>
          <span className="text-[15px] font-medium text-gray-800">Continue with Google</span>
        </button>

        <button className="w-full h-[46px] bg-white rounded-full flex items-center justify-center gap-3 border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:bg-gray-50 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.126 12.062c.018-2.617 2.138-3.86 2.234-3.92-1.218-1.782-3.117-2.022-3.805-2.05-1.62-.164-3.16.955-3.985.955-.826 0-2.086-.94-3.43-.913-1.737.025-3.34 1.01-4.237 2.564-1.815 3.14-.464 7.785 1.306 10.345.864 1.25 1.887 2.65 3.224 2.602 1.284-.047 1.777-.826 3.33-.826 1.554 0 1.996.826 3.33.801 1.385-.025 2.268-1.272 3.125-2.527 1.002-1.464 1.415-2.88 1.436-2.953-.032-.014-2.766-1.062-2.783-4.077h.001ZM14.933 5.632c.706-.855 1.183-2.046 1.053-3.235-1.026.042-2.262.684-2.99 1.564-.582.696-1.155 1.905-.998 3.08 1.15-.09 2.226-.554 2.935-1.409h.001Z" fill="#000000"/>
          </svg>
          <span className="text-[15px] font-medium text-gray-800">Continue with Apple</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-[13px] text-gray-700">
        Already have an account?{" "}
        <Link to="/login" className="text-[#EFA037] font-medium hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
