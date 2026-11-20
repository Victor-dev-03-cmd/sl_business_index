'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Building2,
  Eye, EyeOff, Fingerprint, LoaderCircle, LockKeyhole, Mail, ShieldCheck,
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import BrandLogo from '@/app/components/BrandLogo';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'login' | 'signup';
type BusyAction = 'google' | 'passkey' | 'email' | null;

function safeInternalPath(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') ||
      path.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(path)) return '/';
  return path;
}

function GoogleG() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.35 12.24c0-.69-.06-1.35-.18-1.98H12v3.75h5.24a4.49 4.49 0 0 1-1.95 2.94v2.44h3.15c1.85-1.7 2.91-4.2 2.91-7.15Z"/>
      <path fill="#34A853" d="M12 21.75c2.63 0 4.85-.87 6.47-2.36l-3.15-2.44c-.87.58-1.98.92-3.32.92-2.55 0-4.7-1.72-5.47-4.04H3.28v2.52A9.76 9.76 0 0 0 12 21.75Z"/>
      <path fill="#FBBC05" d="M6.53 13.77a5.86 5.86 0 0 1 0-3.54V7.71H3.28a9.75 9.75 0 0 0 0 8.58l3.25-2.52Z"/>
      <path fill="#EA4335" d="M12 6.19c1.43 0 2.71.49 3.72 1.45l2.79-2.8A9.42 9.42 0 0 0 12 2.25a9.76 9.76 0 0 0-8.72 5.46l3.25 2.52c.77-2.32 2.92-4.04 5.47-4.04Z"/>
    </svg>
  );
}

function LoginExperience({ mode }: { mode: AuthMode }) {
  const isLogin = mode === 'login';
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get('next') || searchParams.get('redirect'));
  const [emailMode, setEmailMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [canUseWebAuthn, setCanUseWebAuthn] = useState(true);

  useEffect(() => {
    setCanUseWebAuthn(window.isSecureContext && typeof window.PublicKeyCredential !== 'undefined');
  }, []);

  // Returning visitors with a verified server-readable session should not
  // have to choose a login method again simply because they opened /login.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active || !data.session) return;
        const response = await fetch('/api/auth/session-status', {
          credentials: 'same-origin', cache: 'no-store',
        });
        if (!active || !response.ok) return;
        const state: { authenticated?: boolean } = await response.json();
        if (active && state.authenticated) window.location.replace(next);
      } catch {
        // An unavailable session check must not block manual login.
      }
    })();
    return () => { active = false; };
  }, [next]);

  const resetCaptcha = () => {
    setTurnstileToken(null);
    setCaptchaVersion(value => value + 1);
  };

  async function verifyBrowserSession() {
    const response = await fetch('/api/auth/session-status', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result: { authenticated?: boolean } = await response.json();
    return result.authenticated === true;
  }

  async function continueToAccount() {
    if (!(await verifyBrowserSession())) {
      setError('Sign-in succeeded, but your browser did not confirm the session. Please check your cookie settings and retry.');
      return;
    }
    window.location.assign(next);
  }

  async function handleGoogle() {
    if (busy) return;
    // PKCE verifier cookies are origin-scoped. Start OAuth on the canonical
    // production hostname, not a preview or www origin which would send the
    // provider callback to a different host and lose the verifier cookie.
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'slbusinessindex.com' || hostname.endsWith('.vercel.app')) {
      const target = new URL(isLogin ? '/login' : '/signup', 'https://www.slbusinessindex.com');
      if (next !== '/') target.searchParams.set('next', next);
      window.location.assign(target.toString());
      return;
    }
    setError(null);
    setBusy('google');
    try {
      // Avoid a needless ?next=%2F query on the default callback, so the
      // exact production URL allowlist entry matches without a wildcard.
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (next !== '/') callbackUrl.searchParams.set('next', next);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });
      if (oauthError) throw oauthError;
      // Supabase navigates to the identity provider on success.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in could not be started.');
      setBusy(null);
    }
  }

  async function handlePasskey() {
    if (busy) return;
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'slbusinessindex.com' || hostname.endsWith('.vercel.app')) {
      const target = new URL(isLogin ? '/login' : '/signup', 'https://www.slbusinessindex.com');
      if (next !== '/') target.searchParams.set('next', next);
      window.location.assign(target.toString());
      return;
    }
    setError(null);
    if (!canUseWebAuthn) {
      setError('This browser or device does not support passkeys. Please continue with Google or Email.');
      return;
    }
    setBusy('passkey');
    try {
      const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
      if (passkeyError) throw passkeyError;
      if (!data.session) throw new Error('No session was created. Please try again.');
      await continueToAccount();
    } catch (cause) {
      const errorCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      setError(errorCode === 'passkey_disabled'
        ? 'Passkey sign-in is not yet enabled for this site. Please use Google or Email for now.'
        : cause instanceof Error ? cause.message : 'Could not complete passkey sign-in.');
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!turnstileToken) {
      setError('Please complete the security verification.');
      return;
    }
    if (!isLogin && !fullName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setBusy('email');
    try {
      if (!isLogin) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: fullName.trim(), full_name: fullName.trim() },
            captchaToken: turnstileToken,
          },
        });
        if (signUpError) throw signUpError;
        router.push('/auth/confirm-otp?email=' + encodeURIComponent(email.trim()));
        return;
      }

      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, turnstileToken }),
      });
      const result: { authenticated?: boolean; browserSessionRequired?: boolean; error?: string } =
        await response.json();
      if (!response.ok || result.authenticated !== true) {
        throw new Error(result.error || 'Unable to sign in. Please retry.');
      }
      if (result.browserSessionRequired) {
        // The protected routes require server-readable cookies, not only local state.
        const { data, error: browserError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (browserError || !data.session) {
          throw new Error('Sign-in succeeded, but the browser could not save the session.');
        }
      }
      await continueToAccount();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete authentication.');
      resetCaptcha();
    } finally {
      setBusy(null);
    }
  }

  const inputClass = 'h-[50px] w-full rounded-xl border border-[#DFE6E2] bg-[#F7F9F8] px-4 text-[14px] text-[#18382F] outline-none placeholder:text-[#9AA9A3] transition-colors focus:border-[#287A5C] focus:bg-white focus:ring-4 focus:ring-[#287A5C]/10';
  const actionClass = 'flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl border border-[#DDE6E1] bg-white px-4 text-[14px] font-semibold text-[#1B392F] shadow-[0_3px_9px_rgba(25,60,45,0.035)] transition hover:border-[#A4BAAC] hover:bg-[#F8FAF9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#287A5C]/20 disabled:cursor-wait disabled:opacity-60';

  return (
    <div className="min-h-[100dvh] bg-[#F6F7F5] font-sans text-[#18382F] lg:bg-white">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1700px] grid-cols-1 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <aside className="relative hidden min-h-[100dvh] flex-col justify-between overflow-hidden bg-[#183A31] px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-52 top-[11%] h-[560px] w-[560px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-[19%] h-[400px] w-[400px] rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-44 h-[420px] w-[420px] rounded-full bg-[#EAA663]/10 blur-[100px]" />
          <Link href="/" className="relative z-10 w-fit" aria-label="SL Business Index home"><BrandLogo tone="dark" /></Link>
          <div className="relative z-10 max-w-[530px] py-14">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#EED1A1] uppercase">
              <BadgeCheck size={15} /> Sri Lanka's business network
            </div>
            <h1 className="max-w-[540px] text-[clamp(2.7rem,4vw,4.7rem)] font-semibold leading-[1.08] tracking-[-0.055em]">
              Your next opportunity <span className="text-[#F2B574]">starts here.</span>
            </h1>
            <p className="mt-7 max-w-[420px] text-[15px] leading-8 text-white/70">
              Find trusted local businesses, grow your visibility and keep every connection in one place.
            </p>
            <div className="mt-12 grid max-w-[450px] gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-[13px] text-white/85"><Building2 size={19} className="text-[#F2B574]" /> One account for discovery and business tools</div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-[13px] text-white/85"><ShieldCheck size={19} className="text-[#F2B574]" /> Secure access, without extra steps</div>
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-between text-[12px] text-white/50">
            <span>© {new Date().getFullYear()} SL Business Index</span>
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">Explore website <ArrowUpRight size={14}/></Link>
          </div>
        </aside>

        <main className="flex min-h-[100dvh] items-center justify-center px-4 py-7 sm:px-8 sm:py-12 lg:px-10 xl:px-16">
          <div className="w-full max-w-[456px] rounded-[24px] border border-[#E8EDEA] bg-white px-5 py-7 shadow-[0_18px_45px_rgba(18,50,38,0.06)] sm:px-9 sm:py-9 lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
            <div className="mb-8 flex justify-center lg:mb-10"><Link href="/" aria-label="SL Business Index home"><BrandLogo tone="light" /></Link></div>
            <div className="mb-8 text-center">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#BE7B3E]">{isLogin ? 'WELCOME BACK' : 'GET STARTED'}</div>
              <h2 className="text-[29px] font-semibold tracking-[-0.045em] text-[#15372C] sm:text-[33px]">{isLogin ? 'Sign in to your account' : 'Create your account'}</h2>
              <p className="mt-2 text-[13px] leading-6 text-[#7D8E87]">{isLogin ? 'A simpler way to connect with local businesses.' : 'Join Sri Lanka’s growing business community.'}</p>
            </div>

            {searchParams.get('reset') === 'success' && isLogin && (
              <div role="status" className="mb-4 rounded-xl border border-[#C7E2D2] bg-[#F0FAF4] px-4 py-3 text-[13px] text-[#276144]">Password updated. Sign in with your new password.</div>
            )}
            {error && <div role="alert" className="mb-5 rounded-xl border border-[#F4CECA] bg-[#FFF5F3] px-4 py-3 text-[13px] leading-5 text-[#9A3B30]">{error}</div>}

            {!emailMode ? (
              <div className="space-y-3">
                <button type="button" onClick={handleGoogle} disabled={busy !== null} className={actionClass}>
                  {busy === 'google' ? <LoaderCircle size={20} className="animate-spin" /> : <GoogleG />}
                  Continue with Google
                </button>
                <button type="button" onClick={handlePasskey} disabled={busy !== null} className={actionClass}>
                  {busy === 'passkey' ? <LoaderCircle size={20} className="animate-spin" /> : <Fingerprint size={22} strokeWidth={1.8} className="text-[#2A7A5C]" />}
                  Continue with Passkey
                </button>
                <button type="button" onClick={() => { setEmailMode(true); setError(null); }} disabled={busy !== null} className={actionClass}>
                  <Mail size={20} strokeWidth={1.8} className="text-[#2A7A5C]" />
                  Continue with Email
                </button>
                <p className="pt-3 text-center text-[12px] leading-5 text-[#82938B]">
                  {isLogin ? 'New to passkeys? Sign in first, then set one up from your account.' : 'To create your first passkey, sign up with Google or Email, then add it to your account.'}
                </p>
              </div>
            ) : (
              <div>
                <button type="button" className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#427A62] hover:text-[#15372C]" onClick={() => { setEmailMode(false); setError(null); }}>
                  <ArrowLeft size={16} /> All sign-in options
                </button>
                <form onSubmit={handleEmail} className="space-y-4">
                  {!isLogin && (
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667A70]">Your name</span>
                      <input className={inputClass} value={fullName} onChange={event => setFullName(event.target.value)} type="text" name="name" autoComplete="name" required maxLength={150} placeholder="Enter your full name"/>
                    </label>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667A70]">Email address</span>
                    <input className={inputClass} value={email} onChange={event => setEmail(event.target.value)} type="email" name="email" autoComplete="email" required placeholder="you@example.com"/>
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667A70]">
                      Password
                      {isLogin && <Link href="/forgot-password" className="text-[#267552] hover:underline">Forgot password?</Link>}
                    </span>
                    <span className="relative block">
                      <input className={inputClass + ' pr-12'} value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} name="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={isLogin ? undefined : 6} placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}/>
                      <button type="button" className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#81928A] hover:text-[#15372C]" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                    </span>
                  </label>
                  <div className="min-h-[66px] overflow-hidden rounded-lg">
                    <Turnstile key={captchaVersion} siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!} onSuccess={setTurnstileToken} onError={() => setTurnstileToken(null)} onExpire={() => setTurnstileToken(null)} options={{ theme: 'light', size: 'flexible' }}/>
                  </div>
                  <button type="submit" disabled={busy !== null} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#183A31] px-4 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(24,58,49,0.16)] transition hover:bg-[#245844] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#287A5C]/25 disabled:opacity-60">
                    {busy === 'email' ? <LoaderCircle className="animate-spin" size={18} /> : null}
                    {isLogin ? 'Sign In' : 'Create Account'}
                    {busy !== 'email' && <ArrowRight size={17}/>}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-8 border-t border-[#E8EEEA] pt-6 text-center">
              <p className="text-[13px] text-[#77877F]">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <Link href={isLogin ? '/signup' : '/login'} className="font-bold text-[#25734F] hover:underline">
                  {isLogin ? 'Create an account' : 'Sign in'}
                </Link>
              </p>
              <p className="mt-5 text-[11px] leading-5 text-[#9AA69F]">
                By continuing, you agree to our <Link href="/terms-of-service" className="text-[#507965] hover:underline">Terms</Link> and <Link href="/privacy-policy" className="text-[#507965] hover:underline">Privacy Policy</Link>.
              </p>
              <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#81938A] hover:text-[#183A31] lg:hidden"><ArrowLeft size={14} /> Back to website</Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#9AA69F]"><LockKeyhole size={12}/> Secured by SLBI Authentication</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AuthExperience({ mode }: { mode: AuthMode }) {
  return <Suspense fallback={<div className="min-h-[100dvh] bg-[#F6F7F5]" />}><LoginExperience mode={mode}/></Suspense>;
}
