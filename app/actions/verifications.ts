'use server';

import { createClient } from '@/lib/supabase/server';
import { postToFacebook } from '@/lib/facebook';

export async function approveVerificationAction(
  verificationId: string,
  businessId: string,
  ownerId: string,
  businessName: string
) {
  const supabase = await createClient();

  // 1. Verify that the current user is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'ceo'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }

  try {
    // 2. Update Verification Status
    const { error: verificationError } = await supabase
      .from('verifications')
      .update({ status: 'approved' })
      .eq('id', verificationId);

    if (verificationError) throw verificationError;

    // 3. Update Business Verified Status
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ is_verified: true })
      .eq('id', businessId);

    if (businessError) throw businessError;

    // 4. Update Profile Verification Status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verification_status: 'verified' })
      .eq('id', ownerId);

    if (profileError) {
      console.error('Error updating profile status:', profileError);
    }

    // 5. Trigger Facebook Marketing
    const profileLink = `https://slbusinessindex.com/business/${businessId}`;
    const fbResult = await postToFacebook({
      name: businessName,
      profileLink,
    });

    if (fbResult.success) {
      // 6. Update is_marketed to true
      const { error: marketError } = await supabase
        .from('businesses')
        .update({ is_marketed: true })
        .eq('id', businessId);

      if (marketError) {
        console.error('Error updating is_marketed flag:', marketError);
      }
    } else {
      console.error('Facebook marketing post failed:', fbResult.error);
      // We don't throw an error here to not break the verification flow as requested
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in approveVerificationAction:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

export async function rejectVerificationAction(verificationId: string, ownerId: string) {
  const supabase = await createClient();

  // 1. Verify that the current user is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'ceo'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }

  try {
    // 2. Update Verification Status
    const { error: verificationError } = await supabase
      .from('verifications')
      .update({ status: 'rejected' })
      .eq('id', verificationId);

    if (verificationError) throw verificationError;

    // 3. Update Profile Verification Status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verification_status: 'unverified' })
      .eq('id', ownerId);

    if (profileError) {
      console.error('Error updating profile status:', profileError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in rejectVerificationAction:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}
