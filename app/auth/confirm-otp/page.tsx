'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';

function OTPConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError("Email not found. Please try signing up again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh(); // This is the crucial line to refresh the server components
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg text-center">
        <div className="flex justify-center">
          <KeyRound className="w-12 h-12 text-green-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Enter Verification Code</h1>
        <p className="text-gray-600">
          An 8-digit code has been sent to <span className="font-semibold">{email}</span>.
        </p>
        
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label htmlFor="otp" className="sr-only">
              OTP
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={8}
              placeholder="_ _ _ _ _ _ _ _"
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono text-gray-800 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-green-700 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Account'}
            </button>
          </div>
        </form>

        <div className="text-sm text-center text-gray-600">
          Didn't receive the code?{' '}
          <button className="font-medium text-primary hover:underline">
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrap the component in Suspense because useSearchParams requires it.
export default function OTPConfirmPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OTPConfirmPage />
    </Suspense>
  );
}
