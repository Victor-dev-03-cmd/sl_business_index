'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Chrome, ArrowLeft } from 'lucide-react';

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
        <div className="hidden lg:flex lg:w-1/2 bg-green-900 relative overflow-hidden items-start justify-center pt-24 p-12">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-800 rounded-full -ml-32 -mt-32 opacity-30"></div>

          <div className="relative z-10 max-w-md">
            <Link href="/" className="inline-flex items-center text-green-200 hover:text-white mb-6 transition-colors text-sm font-medium">
              <ArrowLeft className="mr-2" size={16} /> Back to Home
            </Link>

            <div className="mb-4">
              <Image
                  src="/logo.svg"
                  alt="Logo"
                  width={160}
                  height={50}
                  className="brightness-0 invert opacity-90"
              />
            </div>

            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              Grow Your Business <br /> With Us.
            </h1>
            <p className="text-green-100 text-base leading-relaxed opacity-80">
              Create an account to list your business, manage your profile, and generate AI-powered social media posts to attract more customers.
            </p>

            <div className="mt-8 flex gap-8 text-white border-t border-green-800 pt-8">
              <div>
                <p className="font-bold text-xl">Join</p>
                <p className="text-green-300 text-xs uppercase tracking-wider">The Index</p>
              </div>
              <div>
                <p className="font-bold text-xl">Get</p>
                <p className="text-green-300 text-xs uppercase tracking-wider">Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sign Up Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12 md:px-12">
          <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-100">

            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <Link href="/">
                <Image src="/logo.svg" alt="Logo" width={140} height={45} />
              </Link>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
              <p className="text-gray-500 text-sm">Join the largest business directory in Sri Lanka.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5 ml-1">Username</label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. victor_lxs"
                    className="w-full px-4 py-3 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5 ml-1">Email Address</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. victor@example.com"
                    className="w-full px-4 py-3 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5 ml-1">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:bg-white transition-all text-sm"
                />
              </div>

              {error && (
                  <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 text-center">
                    {error}
                  </div>
              )}

              <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 focus:ring-4 focus:ring-green-100 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Get Started'}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative px-4 text-[10px] font-bold uppercase text-gray-400 bg-white tracking-[0.2em]">
                OR
              </div>
            </div>

            <button
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all shadow-sm text-sm"
            >
              <Chrome size={18} className="mr-3 text-red-500" />
              Sign up with Google
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-green-700 font-bold hover:underline ml-1">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
