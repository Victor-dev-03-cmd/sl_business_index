import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoriesMenu from './CategoriesMenu';
import AuthButton from './AuthButton';
import LogoLink from './LogoLink';
import NotificationBell from './NotificationBell';
import { Menu } from 'lucide-react';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullUserData = null;
  if (user) {
    // If the user is logged in, fetch their profile from the 'profiles' table
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('username, full_name, role') // Fetch the user's role
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile in Navbar:', error);
        // Still pass the user object even if profile fetch fails
        fullUserData = { ...user, role: 'customer' };
      } else {
        // Combine the user auth data with the profile data
        fullUserData = { 
          ...user, 
          username: profileData?.username,
          full_name: profileData?.full_name,
          role: profileData?.role 
        };
      }
    } catch (err) {
      console.error('Catch error in Navbar profile fetch:', err);
      fullUserData = { ...user, role: 'customer' };
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 shadow-md border-b border-transparent dark:border-gray-800 transition-colors">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        {/* Left: Logo Section */}
        <div className="flex items-center justify-center flex-shrink-0">
          <LogoLink />
        </div>

        {/* Center: Navigation Menus */}
        <nav className="hidden md:flex flex-grow justify-center items-center space-x-8">
          <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-500 transition-colors">
            Home
          </Link>
          <CategoriesMenu />
          <Link href="/register-business" className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-500 transition-colors">
            Register Business
          </Link>
          <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-500 transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-500 transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-4">

          <NotificationBell />

          {/* Pass the combined user data (now with role) to the client component */}
          <AuthButton user={fullUserData} />

          <button className="md:hidden p-2 text-gray-700 dark:text-gray-300">
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
