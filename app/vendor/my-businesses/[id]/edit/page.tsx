import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import EditBusinessForm from './EditBusinessForm';

export default async function EditBusinessPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch business details
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !business) {
    notFound();
  }

  // Check if the user is the owner
  if (business.owner_id !== user.id) {
    // In a real app, you might want to show a 403 Forbidden page
    redirect('/vendor/my-businesses');
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
    </div>
  );
}
