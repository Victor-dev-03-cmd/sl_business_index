'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from './SessionContext'; // Import the hook
import CategoriesMenu from './CategoriesMenu';
import AuthButton from './AuthButton';
import LogoLink from './LogoLink';
import NotificationBell from './NotificationBell';
import LiveCounter from './LiveCounter';
import { Menu } from 'lucide-react';

export default function Navbar() {
  const { user } = useSession(); // Consume the session from the context
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch categories (can still be done on the client)
      try {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        if (!catError) setCategories(catData || []);
      } catch (err) {
        console.error('Error fetching categories in Navbar:', err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username, full_name, role, avatar_url')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          
          setFullUserData({
            ...user,
            ...profileData,
          });
        } catch (err) {
          console.error('Error fetching profile in Navbar:', err);
          setFullUserData(user); // Fallback to basic user data
        }
      } else {
        setFullUserData(null);
      }
    };

    fetchUserProfile();
  }, [user]); // Re-run this effect whenever the user object changes

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-transparent transition-colors">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <div className="flex items-center justify-center flex-shrink-0">
          <LogoLink />
        </div>

        <nav className="hidden md:flex flex-grow justify-center items-center space-x-8">
          <Link href="/" className="text-gray-600 hover:text-[#2a7db4] transition-colors">
            Home
          </Link>
          <CategoriesMenu initialCategories={categories} />
          {(!fullUserData || (fullUserData.role !== 'vendor' && fullUserData.role !== 'admin' && fullUserData.role !== 'ceo')) && (
            <Link href="/register-business" className="text-gray-600 hover:text-[#2a7db4] transition-colors">
              Register Business
            </Link>
          )}
          <Link href="/about" className="text-gray-600 hover:text-[#2a7db4] transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-[#2a7db4] transition-colors">
            Contact
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block">
            <LiveCounter />
          </div>
          <NotificationBell />
          <AuthButton user={fullUserData} />
          <button className="md:hidden p-2 text-gray-700">
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}