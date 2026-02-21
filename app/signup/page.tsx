'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Chrome } from 'lucide-react'; // Example icon for Google

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
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      alert('Sign up successful! Please check your email to confirm your account.');
      router.push('/login');
    }
    setLoading(false);
  };

  // Example function for social login
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="flex justify-center">
          <Link href="/">
            <Image src="/logo.svg" alt="Logo" width={150} height={50} />
          </Link>
        </div>
        <h1 className="text-2xl text-center text-gray-700">Create Your Account</h1>
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-sm text-gray-700 sr-only">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Username"
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm text-gray-700 sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-gray-700 sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full px-4 py-3 text-gray-700 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 text-sm font-bold text-white bg-green-700 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative px-2 text-sm text-gray-500 bg-white">Or continue with</div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center w-full px-4 py-3 space-x-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            <Chrome size={20} />
            <span className="font-medium">Google</span>
          </button>
        </div>

        <div className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-green-700 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
