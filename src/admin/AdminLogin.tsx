import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles, Key, Eye, EyeOff } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { DEMO_ADMIN } from '../constants/auth';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const { adminLogin, showToast, setActiveView } = useShop();
  const [email, setEmail] = useState(DEMO_ADMIN.email);
  const [password, setPassword] = useState(DEMO_ADMIN.password);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const success = await adminLogin(email, password);
      if (success) {
        showToast('Welcome back, Administrator');
        onSuccess();
      } else {
        setErrorMessage('Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Brand Card */}
        <div className="bg-[#FAF8F5] border border-[#E0D5C3] shadow-xl rounded-2xl overflow-hidden text-left">
          {/* Header Banner */}
          <div className="bg-[#181614] text-[#FAF8F5] px-8 py-10 text-center relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#C5A880]/20 border border-[#C5A880]/40 mb-4 text-[#C5A880]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-wide text-white">
              Lariel Essentials
            </h1>
            <p className="font-serif italic text-sm text-[#C5A880] mt-1">
              Content Management & Administration System
            </p>
            <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-neutral-300 text-[11px] tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-[#C5A880]" />
              <span>Executive Portal</span>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-8">
            {errorMessage && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <span className="font-semibold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-neutral-700 mb-1.5 font-sans">
                  Administrator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@larielextravaganza.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-neutral-700 mb-1.5 font-sans">
                  Security Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Credentials Helper Pill */}
              <div className="p-3 bg-[#F2ECE4] border border-[#E2D8CA] rounded-xl flex items-center justify-between text-xs text-neutral-700">
                <div className="flex items-center space-x-2">
                  <Key className="w-3.5 h-3.5 text-[#A58860]" />
                  <span className="text-[11px] font-medium">Demo: {DEMO_ADMIN.email} / {DEMO_ADMIN.password}</span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] font-semibold text-[#A58860] hover:underline"
                >
                  Use Demo
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white font-medium text-xs tracking-widest uppercase rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#E8DEC8] flex items-center justify-between text-xs text-neutral-500">
              <button
                onClick={() => setActiveView('home')}
                className="hover:text-neutral-900 transition-colors flex items-center space-x-1"
              >
                <span>← Return to Storefront</span>
              </button>
              <span>Role: Super Admin</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Lariel Essentials Haute Couture · Internal Management Suite
        </p>
      </div>
    </div>
  );
};
