import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoriesMenu from './CategoriesMenu';
import AuthButton from './AuthButton';
import LogoLink from './LogoLink';
import NotificationBell from './NotificationBell';
import LiveCounter from './LiveCounter';
import { Menu } from 'lucide-react';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullUserData = null;
  let categories = [];
  
  if (user) {
    // If the user is logged in, fetch their profile from the 'profiles' table
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, role') // Fetch the user's role
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile in Navbar:', profileError);
        fullUserData = { ...user, role: 'customer' };
      } else {
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

  // Fetch categories for the menu
  try {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (!catError) {
      categories = catData || [];
    }
  } catch (err) {
    console.error('Error fetching categories in Navbar:', err);
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-transparent transition-colors">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        {/* Left: Logo Section */}
        <div className="flex items-center justify-center flex-shrink-0">
          <LogoLink />
        </div>

        {/* Center: Navigation Menus */}
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

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block">
            <LiveCounter />
          </div>
          <NotificationBell />

          {/* Pass the combined user data (now with role) to the client component */}
          <AuthButton user={fullUserData} />

          <button className="md:hidden p-2 text-gray-700">
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
