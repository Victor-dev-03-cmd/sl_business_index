'use client';

import React from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { notFound, useRouter, useParams } from 'next/navigation';
import EditBusinessForm from './EditBusinessForm';
import Link from 'next/link';
import { Images, ChevronRight } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: user, isLoading: userLoading } = useUser();

  const { data: business, isLoading: businessLoading, error: businessError } = useQuery({
    queryKey: ['edit-business', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (userLoading || (id && businessLoading)) {
    return (
      <div className="flex h-[calc(100dvh-160px)] items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-dark" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (businessError || !business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-160px)]">
        <p className="text-red-500 mb-4">Error loading business details. It may not exist.</p>
        <button 
          onClick={() => router.push('/vendor/my-businesses')}
          className="px-4 py-2 bg-brand-dark text-white rounded text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Check if the user is the owner
  if (business.owner_id !== user.id) {
    router.push('/vendor/my-businesses');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Business Details</h1>
        <p className="text-gray-500 mt-1">Update your business information, location, and images.</p>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <EditBusinessForm business={business} />
      </div>
      <Link href={"/vendor/gallery-services?business="+encodeURIComponent(id)} className="mt-6 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-orange-300"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600"><Images size={22}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">Gallery &amp; Services</span><span className="mt-1 block text-sm text-neutral-500">Manage photos and service details on your public profile.</span></span><ChevronRight size={19}/></Link>
    </div>
  );
}
