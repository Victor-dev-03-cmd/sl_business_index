export interface Business {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  image_url?: string;
  latitude: number;
  longitude: number;
  distanceText?: string;
  durationText?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  owner_name?: string;
  owner_id?: string;
  logo_url?: string;
}
