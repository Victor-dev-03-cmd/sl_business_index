import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoriesMenu from './CategoriesMenu';
import { Bell, Menu } from 'lucide-react';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        {/* Left: Logo Section - Modified Alignment */}
        <div className="relative flex-shrink-0 h-full" style={{ width: '180px' }}>
          {/* changed top-1/2 to top-[52%] to nudge it down by 0.5 */}
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

        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-all relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="px-5 py-2.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-shadow shadow-md hover:shadow-lg"
              >
                Sign Out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-green-700">
                Authorized
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm text-white bg-green-700 rounded-lg hover:bg-green-800 transition-shadow shadow-md hover:shadow-lg"
              >
                Register Business
              </Link>
            </>
          )}

          <button className="md:hidden p-2">
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
