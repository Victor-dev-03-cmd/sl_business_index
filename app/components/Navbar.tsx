'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from './SessionContext';
import CategoriesMenu from './CategoriesMenu';
import AuthButton from './AuthButton';
import LogoLink from './LogoLink';
import NotificationBell from './NotificationBell';
import LiveCounter from './LiveCounter';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user } = useSession();
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
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
          setFullUserData({ ...user, ...profileData });
        } catch (err) {
          console.error('Error fetching profile in Navbar:', err);
          setFullUserData(user);
        }
      } else {
        setFullUserData(null);
      }
    };
    fetchUserProfile();
  }, [user]);

  const navLinks = [
    { href: '/', text: 'Home' },
    ...(!fullUserData || (fullUserData.role !== 'vendor' && fullUserData.role !== 'admin' && fullUserData.role !== 'ceo')
      ? [{ href: '/register-business', text: 'Register Business' }]
      : []),
    { href: '/about', text: 'About' },
    { href: '/contact', text: 'Contact' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-transparent transition-colors">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <LogoLink />
          </div>

          {/* Center: Desktop Navigation */}
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

          {/* Right: Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:block">
              <LiveCounter />
            </div>
            {/* Show NotificationBell only if user is logged in */}
            {fullUserData && <NotificationBell />}
            <AuthButton user={fullUserData} />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-700"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between h-20 px-4 border-b">
                <span className="font-bold text-lg">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-700"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </div>
              <nav className="flex flex-col p-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-lg font-medium text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    {link.text}
                  </Link>
                ))}
                <div className="px-4 pt-2">
                   <CategoriesMenu initialCategories={categories} isMobile={true} />
                </div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}