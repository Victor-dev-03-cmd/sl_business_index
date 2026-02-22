import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoriesMenu from './CategoriesMenu';
import AuthButton from './AuthButton'; // Import the client component
import { Bell, Menu } from 'lucide-react';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    // If the user is logged in, fetch their profile from the 'profiles' table
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('username, first_name')
      .eq('id', user.id)
      .single();

    if (profileData) {
      userProfile = profileData;
    }
  }

  // Combine the user auth data with the profile data
  const fullUserData = user ? { ...user, ...userProfile } : null;

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        {/* Left: Logo Section */}
        <div className="relative flex-shrink-0 h-full" style={{ width: '180px' }}>
          <Link href="/" className="absolute top-[65%] -translate-y-1/2 left-0 transition-transform active:scale-95">
            <Image
                src="/logo.svg"
                alt="SL Business Index Logo"
                width={180}
                height={60}
                className="drop-shadow-md object-contain"
                priority
            />
          </Link>
        </div>

        {/* Center: Navigation Menus */}
        <nav className="hidden md:flex flex-grow justify-center items-center space-x-8">
          <Link href="/" className="text-gray-600 hover:text-green-700 transition-colors">
            Home
          </Link>
          <CategoriesMenu />
          <Link href="/about" className="text-gray-600 hover:text-green-700 transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-green-700 transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-all relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {/* Pass the combined user data to the client component */}
          <AuthButton user={fullUserData} />

          <button className="md:hidden p-2">
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
