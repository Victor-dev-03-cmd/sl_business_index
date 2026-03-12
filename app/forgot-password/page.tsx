'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
        
        <div className="relative z-10 max-w-md w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-10 flex justify-center">
              <Image
                src="/sl-logo.png"
                alt="Logo"
                width={180}
                height={50}
                className="brightness-0 invert"
              />
            </div>
            <h1 className="text-4xl font-normal text-white mb-6">Security & Recovery.</h1>
            <p className="text-brand-sand/80 text-sm leading-relaxed">
              We&apos;ll help you get back into your account securely. Just enter your email and follow the instructions.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Link href="/login" className="inline-flex items-center text-gray-400 hover:text-brand-dark text-xs uppercase tracking-widest transition-colors mb-8">
              <ArrowLeft size={14} className="mr-2" /> Back to Login
            </Link>
            
            <h2 className="text-2xl font-normal text-gray-900 mb-2">Password Recovery</h2>
            <p className="text-gray-400 text-sm">Enter your email address to receive a reset link.</p>
          </div>

          {success ? (
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
              <h3 className="text-emerald-900 font-bold mb-2">Check your Email</h3>
              <p className="text-emerald-700 text-sm mb-6">
                We&apos;ve sent a password reset link to <span className="font-bold">{email}</span>.
              </p>
              <Link 
                href="/login"
                className="block w-full py-3 bg-emerald-600 text-white rounded-[6px] text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                Return to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. victor@example.com"
                    className="w-full pl-11 pr-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all text-sm"
                  />
                </div>
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
                {loading ? 'Processing...' : 'Send Recovery Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
