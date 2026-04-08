'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Upload, 
  Image as ImageIcon, 
  Type, 
  Facebook, 
  Instagram, 
  Send, 
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Business {
  id: string;
  name: string;
}

interface PromotionUploadFormProps {
  businesses: Business[];
  onSuccess: () => void;
}

export default function PromotionUploadForm({ businesses, onSuccess }: PromotionUploadFormProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businesses[0].id || '');
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBusinessId) {
      toast.error('Please select a business');
      return;
    }
    if (!imageFile) {
      toast.error('Please upload an image');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one social media platform');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${selectedBusinessId}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotions')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promotions')
        .getPublicUrl(filePath);

      // 3. Save to promotions table
      const { error: insertError } = await supabase
        .from('promotions')
        .insert({
          vendor_id: user.id,
          business_id: selectedBusinessId,
          image_url: publicUrl,
          caption,
          social_platforms: selectedPlatforms,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success('Promotion submitted for admin approval!');
      
      // Reset form
      setCaption('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedPlatforms([]);
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading promotion:', error);
      toast.error(error.message || 'Failed to submit promotion');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded border border-gray-300 shadow-sm space-y-6">
      <h2 className="text-lg text-brand-dark font-bold">New Image Promotion</h2>
      
      <div>
        <label className="block text-sm text-brand-dark mb-2">Target Business</label>
        <select 
          value={selectedBusinessId}
          onChange={(e) => setSelectedBusinessId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white"
        >
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-brand-dark mb-2">Promotion Image</label>
        {imagePreview ? (
          <div className="relative aspect-video rounded border border-gray-200 overflow-hidden group">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload promotion image</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm text-brand-dark mb-2">Caption / Message</label>
        <div className="relative">
          <Type className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
          <textarea 
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a catchy caption for your social media post..."
            rows={4}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm text-brand-dark">Select Platforms</label>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => togglePlatform('facebook')}
            className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${selectedPlatforms.includes('facebook') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Facebook size={18} />
            <span className="text-xs font-medium">Facebook</span>
          </button>
          <button 
            type="button"
            onClick={() => togglePlatform('instagram')}
            className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${selectedPlatforms.includes('instagram') ? 'bg-pink-50 border-pink-200 text-pink-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Instagram size={18} />
            <span className="text-xs font-medium">Instagram</span>
          </button>
        </div>
      </div>

      <button 
        type="submit"
        disabled={uploading}
        className="w-full py-3 bg-brand-dark text-white rounded transition-colors flex items-center justify-center gap-2 shadow font-medium disabled:opacity-50"
      >
        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        {uploading ? 'Uploading...' : 'Submit for Approval'}
      </button>
    </form>
  );
}
