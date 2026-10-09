'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const router = useRouter();

  const strength = getStrength(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setNoSession(true);
      }
      setSessionLoading(false);
    });

    // Also catch PASSWORD_RECOVERY events fired by the client-side Supabase JS
    // (handles any implicit-flow edge cases)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNoSession(false);
        setSessionLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      toast.success('Password updated successfully!');
      // Sign out the recovery session so the user must log in fresh
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login?reset=success'), 2000);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-white">
      {/* Left Side: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[120px] -mr-64 -mt-64" />

        <div className="relative z-10 max-w-md w-full text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-10 flex justify-center">
              <Image src="/logo.png" alt="Logo" width={180} height={50} className="brightness-0 invert" />
            </div>
            <h1 className="text-4xl font-normal text-white mb-6">Reset Your Security.</h1>
            <p className="text-brand-sand/80 text-sm leading-relaxed">
              Choose a strong, unique password to keep your account safe and secure.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Update Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Image src="/logo.png" alt="Logo" width={140} height={45} />
            </Link>
          </div>

          <div className="mb-10">
            <Link
              href="/login"
              className="inline-flex items-center text-gray-400 hover:text-brand-dark text-xs uppercase tracking-widest transition-colors mb-8"
            >
              <ArrowLeft size={14} className="mr-2" /> Back to Login
            </Link>
            <h2 className="text-2xl font-normal text-gray-900 mb-2">Create New Password</h2>
            <p className="text-gray-400 text-sm">Enter your new secure password below.</p>
          </div>

          {sessionLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-dark border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Validating recovery session...</p>
            </div>
          ) : noSession ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-amber-50 border border-amber-100 p-8 rounded-[6px] text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
              </div>
              <h3 className="text-amber-900 font-bold mb-2">Session Expired or Invalid</h3>
              <p className="text-amber-700 text-sm mb-6">
                Your password reset link may have expired. Links are valid for one hour — please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="block w-full py-3 bg-brand-dark text-white rounded-[6px] text-sm font-bold hover:bg-brand-blue transition-colors"
              >
                Request New Link
              </Link>
            </motion.div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 p-8 rounded-[6px] text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <h3 className="text-emerald-900 font-bold mb-2">Password Updated!</h3>
              <p className="text-emerald-700 text-sm mb-6">
                Your password has been reset. Redirecting you to sign in...
              </p>
              <Link
                href="/login?reset=success"
                className="block w-full py-3 bg-emerald-600 text-white rounded-[6px] text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                Sign In Now
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1 px-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-medium ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score <= 3 ? 'text-amber-500' : 'text-emerald-600'
                    }`}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3.5 text-gray-900 bg-gray-50 border rounded-[6px] focus:outline-none focus:ring-1 focus:bg-white transition-all text-sm ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 focus:ring-red-300'
                        : 'border-gray-100 focus:ring-brand-dark'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] text-red-500 px-1">Passwords do not match.</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[11px] p-3 rounded-[6px] border border-red-100 text-center font-normal">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-brand-dark text-white font-normal rounded-[6px] hover:bg-brand-blue shadow-lg shadow-brand-dark/10 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
