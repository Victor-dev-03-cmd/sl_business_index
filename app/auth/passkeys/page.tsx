'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, KeyRound, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react';
import BrandLogo from '@/app/components/BrandLogo';
import { supabase } from '@/lib/supabaseClient';

type SavedPasskey = { id: string; friendly_name?: string | null; created_at?: string };

function authMessage(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'code' in cause && cause.code === 'passkey_disabled') {
    return 'Passkeys are not enabled for SL Business Index yet. You can still use Google or Email login.';
  }
  return cause instanceof Error ? cause.message : 'Unable to complete the passkey request.';
}

export default function ManagePasskeys() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passkeys, setPasskeys] = useState<SavedPasskey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPasskeys = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.passkey.list();
    if (listError) throw listError;
    setPasskeys((data || []).map(key => ({
      id: key.id, friendly_name: key.friendly_name, created_at: key.created_at,
    })));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userError || !data.user) {
          setSignedIn(false);
          return;
        }
        setSignedIn(true);
        await refreshPasskeys();
      } catch (cause) {
        if (!cancelled) setError(authMessage(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshPasskeys]);

  async function register() {
    setError(null);
    setMessage(null);
    if (!window.isSecureContext || typeof window.PublicKeyCredential === 'undefined') {
      setError('This browser does not support passkeys. Try a modern browser on a secure device.');
      return;
    }
    setSaving(true);
    try {
      const { error: registerError } = await supabase.auth.registerPasskey();
      if (registerError) throw registerError;
      await refreshPasskeys();
      setMessage('Passkey created. Next time you can sign in using your device fingerprint, face recognition, or PIN.');
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove(passkeyId: string) {
    if (!window.confirm('Remove this passkey? You will no longer be able to sign in using it.')) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: removeError } = await supabase.auth.passkey.delete({ passkeyId });
      if (removeError) throw removeError;
      await refreshPasskeys();
      setMessage('Passkey removed.');
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F6F8F6] px-4 py-10 text-[#193A30] sm:px-6">
      <div className="mx-auto max-w-[620px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-[#628372] hover:text-[#193A30]"><ArrowLeft size={16}/> Back to SL Business Index</Link>
        <div className="rounded-[24px] border border-[#E0E8E3] bg-white p-6 shadow-[0_18px_50px_rgba(18,50,38,0.055)] sm:p-10">
          <div className="mb-9"><BrandLogo tone="light" /></div>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF6F0]"><Fingerprint size={30} strokeWidth={1.7} className="text-[#25714F]"/></div>
          <h1 className="text-[29px] font-semibold tracking-[-0.04em]">Your passkeys</h1>
          <p className="mt-2 text-[14px] leading-7 text-[#71867A]">Use your fingerprint, Face ID, or device PIN to sign in without entering a password. Passkeys are stored securely by your device or passkey manager.</p>

          {error && <p role="alert" className="mt-6 rounded-xl border border-[#F0CDC8] bg-[#FFF5F3] px-4 py-3 text-[13px] text-[#9A3B30]">{error}</p>}
          {message && <p role="status" className="mt-6 rounded-xl border border-[#C6E3D3] bg-[#F2FAF5] px-4 py-3 text-[13px] text-[#26724B]">{message}</p>}

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-[13px] text-[#728379]"><LoaderCircle className="animate-spin" size={18}/> Checking your account…</div>
          ) : !signedIn ? (
            <div className="mt-7 rounded-xl bg-[#F5F8F5] p-5">
              <p className="mb-4 text-[13px] leading-6 text-[#536E5F]">Sign in with Google or Email first to register a passkey to your existing SLBI account.</p>
              <Link href="/login?next=%2Fauth%2Fpasskeys" className="inline-flex min-h-11 items-center rounded-xl bg-[#193A30] px-5 text-[13px] font-semibold text-white">Sign in to continue</Link>
            </div>
          ) : (
            <div className="mt-8">
              <button type="button" disabled={saving} onClick={register} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#193A30] px-5 text-[14px] font-semibold text-white hover:bg-[#285A46] disabled:opacity-60">
                {saving ? <LoaderCircle size={18} className="animate-spin"/> : <KeyRound size={19}/>}
                Create a passkey
              </button>
              <div className="mt-8 border-t border-[#E6EEE8] pt-6">
                <h2 className="text-[15px] font-semibold">Saved passkeys</h2>
                {passkeys.length === 0 ? (
                  <p className="mt-3 text-[13px] leading-6 text-[#84938A]">No passkeys registered yet. Create your first passkey to make future sign-ins easier.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {passkeys.map(passkey => (
                      <li key={passkey.id} className="flex items-center gap-3 rounded-xl border border-[#E4ECE6] px-4 py-3">
                        <ShieldCheck className="shrink-0 text-[#327D58]" size={19}/>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{passkey.friendly_name || 'Your passkey'}</p>
                          <p className="mt-1 text-[11px] text-[#8B9991]">{passkey.created_at ? 'Added ' + new Date(passkey.created_at).toLocaleDateString() : 'Registered device'}</p>
                        </div>
                        <button type="button" disabled={saving} onClick={() => remove(passkey.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#A45B56] hover:bg-[#FFF0EE] disabled:opacity-60" aria-label="Remove passkey"><Trash2 size={17}/></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-7 text-[12px] leading-6 text-[#83928A]">Keep Google or Email sign-in available as a backup in case your device changes.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
