'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Chrome, ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          full_name: username,
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Save profile data to profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            full_name: username,
            role: 'customer',
          });
        
        if (profileError) {
          console.error('Error saving profile:', profileError);
        }
      }
      // Redirect to the OTP confirmation page with the email as a query param
      router.push(`/auth/confirm-otp?email=${encodeURIComponent(email)}`);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
      <div className="flex min-h-screen bg-white">
        {/* Left Side: Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-950 relative overflow-hidden items-center justify-center p-12">
          {/* Professional Background Effects */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-ambient-float"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px] -ml-48 -mb-48 animate-ambient-float" style={{ animationDelay: '2s' }}></div>

          <div className="relative z-10 max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="inline-flex items-center text-emerald-400 hover:text-white mb-10 transition-colors text-xs uppercase tracking-widest font-normal">
                <ArrowLeft className="mr-2" size={14} /> Back to Home
              </Link>

              <div className="mb-10">
                <Image
                    src="/logo.png"
                    alt="Logo"
                    width={180}
                    height={50}
                    className="brightness-0 invert opacity-100"
                />
              </div>

              <h1 className="text-4xl font-normal text-white mb-6 leading-tight tracking-tight">
                Scale Your <br />
                <span className="text-emerald-400">Business Today.</span>
              </h1>
              
              <p className="text-emerald-100/60 text-base leading-relaxed mb-10 font-normal">
                Join the largest business ecosystem in Sri Lanka. List your service, connect with locals, and grow your brand.
              </p>

              {/* Benefits List */}
              <div className="space-y-4 mb-12">
                {[
                  "Premium Business Listing Placement",
                  "Real-time Dashboard & Analytics",
                  "AI-Powered Social Media Tools",
                  "Direct Customer Lead Generation"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 text-emerald-100/80">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-normal">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-12 text-white border-t border-emerald-500/10 pt-10">
                <div>
                  <p className="text-2xl font-normal text-emerald-400">Join</p>
                  <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mt-1">The Index</p>
                </div>
                <div>
                  <p className="text-2xl font-normal text-emerald-400">Get</p>
                  <p className="text-emerald-100/40 text-[10px] uppercase tracking-widest mt-1">Verified</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Sign Up Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12 md:px-12">
          <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[6px] shadow-2xl shadow-emerald-950/5 border border-gray-100">

            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Link href="/">
                <Image src="/logo.png" alt="Logo" width={140} height={45} />
              </Link>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-2xl font-normal text-gray-900 mb-2 tracking-tight">Create Account</h2>
              <p className="text-gray-400 text-sm font-normal">Join the most advanced business directory in Sri Lanka.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">Username</label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. victor_lxs"
                    className="w-full px-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition-all text-sm font-normal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">Email Address</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. victor@example.com"
                    className="w-full px-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition-all text-sm font-normal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition-all text-sm font-normal"
                />
              </div>

              {error && (
                  <div className="bg-red-50 text-red-600 text-[11px] p-3 rounded-[6px] border border-red-100 text-center font-normal">
                    {error}
                  </div>
              )}

              <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-emerald-600 text-white font-normal rounded-[6px] hover:bg-emerald-700 shadow-lg shadow-emerald-900/10 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {loading ? 'Creating Account...' : 'Get Started'}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative px-4 text-[9px] font-normal uppercase text-gray-300 bg-white tracking-[0.3em]">
                Secure OAuth
              </div>
            </div>

            <button
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center w-full py-4 px-6 bg-white border border-gray-100 rounded-[6px] text-gray-600 font-normal hover:bg-gray-50 transition-all shadow-sm text-sm"
            >
              <Chrome size={18} className="mr-3 text-emerald-600" />
              Sign up with Google
            </button>

            <div className="mt-10 text-center">
              <p className="text-sm text-gray-400 font-normal">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 font-normal hover:text-emerald-700 ml-1 transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
