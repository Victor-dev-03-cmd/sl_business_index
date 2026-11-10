'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/app/components/BrandLogo';
import { Chrome, ArrowLeft, Check, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';

function safeInternalPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') ||
      value.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return '/';
  }
  return value;
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [challengeVersion, setChallengeVersion] = useState(0);
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get('next') || searchParams.get('redirect'));
  const isPasswordReset = searchParams.get('reset') === 'success';
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!turnstileToken) {
      setError('Please complete the security check.');
      setLoading(false);
      return;
    }

    try {
      // The protected Next.js Proxy checks server-readable Supabase cookies.
      // Authenticate through a same-origin Route Handler so the browser receives
      // Set-Cookie BEFORE making a full document request to a protected page.
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      const result: { error?: string; authenticated?: boolean; browserSessionRequired?: boolean } =
        await response.json();
      if (!response.ok || result.authenticated !== true) {
        setError(result.error || 'Sign-in could not be completed. Please try again.');
        setTurnstileToken(null);
        setChallengeVersion(v => v + 1);
        return;
      }

      if (result.browserSessionRequired) {
        // Some Supabase SSR versions return a valid server-side session without
        // emitting a new Set-Cookie. Persist it via the shared createBrowserClient
        // before loading a page protected by server-side getClaims(). Turnstile
        // and credentials were already checked by our same-origin endpoint.
        // No session/token is ever echoed from the server into the page.
        const { data: browserData, error: browserError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (browserError || !browserData.session) {
          setError('Your credentials were accepted, but the browser session could not be saved. Please retry.');
          setTurnstileToken(null);
          setChallengeVersion(v => v + 1);
          return;
        }
        const { data: saved, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !saved.session?.access_token) {
          setError('The browser could not confirm its saved login session. Please try again.');
          setTurnstileToken(null);
          setChallengeVersion(v => v + 1);
          return;
        }
      }

      // Check the server-side cookie, not just browser-local state, before
      // navigating to a Proxy-protected route. This avoids silently looping.
      const verifyServerSession = async (): Promise<{ authenticated?: boolean; reason?: string }> => {
        const check = await fetch('/api/auth/session-status', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!check.ok) return { authenticated: false, reason: 'session_check_unavailable' };
        return check.json();
      };

      let serverSession = await verifyServerSession();
      if (!serverSession.authenticated) {
        // A valid server-side password login can still race with the browser's
        // cookie storage. Use the official SSR browser client to persist it,
        // then check whether the server can actually authenticate the request.
        const { data: retry, error: retryError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (!retryError && retry.session) {
          serverSession = await verifyServerSession();
        }
      }
      if (!serverSession.authenticated) {
        setError(
          serverSession.reason === 'cookie_missing'
            ? 'Sign-in succeeded, but your browser did not send the login cookie. Check cookie settings for this site.'
            : 'Sign-in succeeded, but the server could not verify the saved session. Please try a private window.'
        );
        setTurnstileToken(null);
        setChallengeVersion(v => v + 1);
        return;
      }

      // Full navigation avoids prefetch / client router racing with cookie writes.
      window.location.assign(next);
    } catch {
      setError('Unable to connect to the authentication service. Please try again.');
      setTurnstileToken(null);
      setChallengeVersion(v => v + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12 md:px-12">
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[6px] shadow-2xl shadow-brand-dark/5 border border-gray-300">

        {/* Mobile Logo */}
        <div className="lg:hidden flex justify-center mb-8">
          <Link href="/" onContextMenu={handleContextMenu}>
            <BrandLogo tone="light" />
          </Link>
        </div>

        {isPasswordReset && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-[6px] mb-6 text-sm"
          >
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Password updated.</span> Sign in with your new credentials below.
            </span>
          </motion.div>
        )}

        <div className="mb-10 text-center lg:text-left">
          <h2 className="text-2xl font-normal text-gray-900 mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-gray-400 text-sm font-normal">Sign in to manage your local business presence.</p>
        </div>

        <form onSubmit={handleLogIn} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em] block ml-1">Email Address</label>
            <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. victor@example.com"
                className="w-full px-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all text-sm font-normal"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-normal text-gray-400 uppercase tracking-[0.2em]">Password</label>
              <Link href="/forgot-password"  className="text-[10px] text-brand-blue hover:text-brand-dark font-normal uppercase tracking-wider">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 text-gray-900 bg-gray-50 border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all text-sm font-normal pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
              <div className="bg-red-50 text-red-600 text-[11px] p-3 rounded-[6px] border border-red-100 text-center font-normal">
                {error}
              </div>
          )}

          <Turnstile
            key={challengeVersion}
            siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
            options={{ theme: 'light', size: 'flexible' }}
          />

          <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-brand-dark text-white font-normal rounded-[6px] hover:bg-brand-blue shadow-lg shadow-brand-dark/10 transition-all transform active:scale-[0.98] disabled:opacity-50 text-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
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
          <Chrome size={18} className="mr-3 text-brand-blue" />
          Continue with Google
        </button>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400 font-normal">
            Don&apos;t have an account?
            <Link href="/signup" className="text-brand-blue font-normal hover:text-brand-dark ml-1 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LogIn() {
  return (
      <div className="flex min-h-[100dvh] bg-white">
        {/* Left Side: Branding Panel (English & Optimized Spacing) */}
        <div className="hidden lg:flex lg:w-1/2 bg-brand-dark relative overflow-hidden items-center justify-center p-12">
          {/* Professional Background Effects */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/10    rounded-full blur-[120px] -mr-64 -mt-64 animate-ambient-float"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-blue/5 rounded-full blur-[100px] -ml-48 -mb-48 animate-ambient-float" style={{ animationDelay: '2s' }}></div>

          <div className="relative z-10 max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="inline-flex items-center text-brand-sand hover:text-white mb-10 transition-colors text-xs uppercase tracking-widest font-normal">
                <ArrowLeft className="mr-2" size={14} /> Back to Home
              </Link>

              <div className="mb-10">
                <BrandLogo tone="dark" />
              </div>

              <h1 className="text-4xl font-normal text-white mb-6 leading-tight tracking-tight">
                Empowering <br />
                <span className="text-brand-sand">Local Commerce.</span>
              </h1>
              
              <p className="text-white text-base leading-relaxed mb-10 font-normal">
                Connect with the heart of Sri Lankan commerce. Join the island&apos;s most advanced digital business directory.
              </p>

              {/* Benefits List */}
              <div className="space-y-4 mb-12">
                {[
                  "Verified Local Business Listings",
                  "Advanced Real-time Map Navigation",
                  "AI-Powered Search Intelligence",
                  "Direct WhatsApp Connectivity"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 text-brand-sand">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-green-700">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-normal">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-12 text-white border-t border-brand-gold/10 pt-10">
                <div>
                  <p className="text-2xl font-normal text-brand-sand">1,200+</p>
                  <p className="text-brand-sand/40 text-[10px] uppercase tracking-widest mt-1">Verified Brands</p>
                </div>
                <div>
                  <p className="text-2xl font-normal text-brand-sand">25</p>
                  <p className="text-brand-sand/40 text-[10px] uppercase tracking-widest mt-1">Islandwide Districts</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
  );
}
