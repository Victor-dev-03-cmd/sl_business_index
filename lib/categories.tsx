import { Hotel, Car, Utensils, Home, Briefcase, Heart, User, Factory, Wrench, Clapperboard, Plane, Palette, Stethoscope, Building, Landmark, Banknote, Bus, Hammer, Phone, Dog, Tv, ShoppingCart, Dumbbell, Rss, Tractor, Laptop, School, Baby, Building2, HeartPulse, Plug, Siren, Shield, HardHat, PiggyBank } from 'lucide-react';
import React from 'react';

export interface Category {
  name: string;
  icon: React.ReactNode;
  image?: string;
  keywords?: string[];
}

export const categories: Category[] = [
  { name: 'Hotels & Restaurants', icon: <Hotel size={16} />, image: '/icons/Hotels & Restaurants.png', keywords: ['hotel', 'stay', 'room', 'resort', 'resthouse', 'accommodation', 'villa', 'restaurant', 'dining', 'food'] },
  { name: 'Vehicles & Automative', icon: <Car size={16} />, image: '/icons/Vehicles & Automative.png', keywords: ['car', 'bike', 'garage', 'repair', 'spare parts', 'tyre', 'wash'] },
  { name: 'Food & Dining', icon: <Utensils size={16} />, image: '/icons/Food & Dining.png', keywords: ['restaurant', 'cafe', 'bakery', 'kotte', 'food', 'eat', 'dining', 'breakfast', 'lunch', 'dinner'] },
  { name: 'Home Appliances & Services', icon: <Home size={16} />, image: '/icons/Home Appliances & Services.png', keywords: ['washing machine', 'fridge', 'ac', 'tv', 'repair', 'cleaning'] },
  { name: 'Office Equipment & Services', icon: <Briefcase size={16} />, image: '/icons/Office Equipment & Services.png', keywords: ['printer', 'ink', 'paper', 'furniture', 'consultant'] },
  { name: 'Weddings Services', icon: <Heart size={16} />, image: '/icons/Weddings Services.png', keywords: ['hall', 'photo', 'dress', 'cake', 'jewelry', 'flowers'] },
  { name: 'Professional Services', icon: <User size={16} />, image: '/icons/Professional Services.png', keywords: ['lawyer', 'accountant', 'architect', 'engineer', 'it'] },
  { name: 'Industry & Manufacturing', icon: <Factory size={16} />, image: '/icons/Industry & Manufacturing.png', keywords: ['factory', 'machine', 'plastic', 'rubber', 'export'] },
  { name: 'Repairing & Services', icon: <Wrench size={16} />, image: '/icons/Repairing & Services.png', keywords: ['computer repair', 'mobile repair', 'electronic repair', 'plumbing', 'electrician'] },
  { name: 'Arts, Entertainment & Leisure', icon: <Clapperboard size={16} />, image: '/icons/Arts, Entertainment & Leisure.png', keywords: ['movie', 'club', 'park', 'gym', 'music'] },
  { name: 'Travel & Tourism', icon: <Plane size={16} />, image: '/icons/Travel & Tourism.png', keywords: ['ticket', 'visa', 'guide', 'safari', 'tour'] },
  { name: 'Interior Design Services', icon: <Palette size={16} />, image: '/icons/Interior Design Services.png', keywords: ['curtain', 'paint', 'decor', 'floor', 'kitchen'] },
  { name: 'Health & Medical', icon: <Stethoscope size={16} />, image: '/icons/Health & Medical.png', keywords: ['doctor', 'clinic', 'hospital', 'pharmacy', 'lab'] },
  { name: 'Government & Services', icon: <Building size={16} />, image: '/icons/Government & Services.png', keywords: ['office', 'council', 'police', 'post'] },
  { name: 'Financial Services', icon: <Banknote size={16} />, image: '/icons/Financial Services.png', keywords: ['finance', 'loan', 'lease', 'pawn'] },
  { name: 'Travel & Transportation', icon: <Bus size={16} />, image: '/icons/Travel & Transportation.png', keywords: ['bus', 'van', 'taxi', 'delivery', 'courier'] },
  { name: 'Hardware Equipment', icon: <Hammer size={16} />, image: '/icons/Hardware Equipment.png', keywords: ['cement', 'paint', 'tools', 'pipe', 'roof'] },
  { name: 'Telecommunication Services', icon: <Phone size={16} />, image: '/icons/Telecommunication Services.png', keywords: ['dialog', 'mobitel', 'broadband', 'sim', 'reload'] },
  { name: 'Pet Care', icon: <Dog size={16} />, image: '/icons/Pet Care.png', keywords: ['vet', 'food', 'grooming', 'bird', 'fish'] },
  { name: 'Media & Advertising', icon: <Tv size={16} />, image: '/icons/Media & Advertising.png', keywords: ['news', 'radio', 'billboard', 'print', 'video'] },
  { name: 'Shopping & Retail', icon: <ShoppingCart size={16} />, image: '/icons/Shopping & Retail.png', keywords: ['supermarket', 'mall', 'clothing', 'shoes', 'gift'] },
  { name: 'Sports & Recreation', icon: <Dumbbell size={16} />, image: '/icons/Sports & Recreation.png', keywords: ['gym', 'cricket', 'football', 'swimming', 'yoga'] },
  { name: 'Media & Communications', icon: <Rss size={16} />, image: '/icons/Media & Communications.png', keywords: ['internet', 'fiber', 'tv', 'radio'] },
  { name: 'Agriculture Products', icon: <Tractor size={16} />, image: '/icons/Agriculture Products.png', keywords: ['seed', 'fertilizer', 'agri', 'farm'] },
  { name: 'Electronic Pheripherals', icon: <Laptop size={16} />, image: '/icons/Electronic Pheripherals.png', keywords: ['mouse', 'keyboard', 'monitor', 'ssd', 'ram'] },
  { name: 'Educational institutes & Services', icon: <School size={16} />, image: '/icons/Educational institutes & Services.png', keywords: ['school', 'class', 'tuition', 'degree', 'exam'] },
  { name: 'Baby Care', icon: <Baby size={16} />, image: '/icons/Baby Care.png', keywords: ['diaper', 'milk', 'toys', 'clothes'] },
  { name: 'Embassies & High commision', icon: <Building2 size={16} />, image: '/icons/Embassies & High commision.png', keywords: ['visa', 'embassy', 'passport'] },
  { name: 'Construction Services', icon: <HardHat size={16} />, image: '/icons/Construction Services.png', keywords: ['building', 'road', 'civil', 'contractor'] },
  { name: 'Banking & Finance', icon: <PiggyBank size={16} />, image: '/icons/Banking & Finance.png', keywords: ['bank', 'savings', 'credit card'] },
  { name: 'Religious Organization', icon: <Landmark size={16} />, image: '/icons/Religious Organization.png', keywords: ['temple', 'church', 'mosque', 'kovil'] },
  { name: 'Beauty & Health', icon: <HeartPulse size={16} />, image: '/icons/Beauty & Health.png', keywords: ['salon', 'makeup', 'spa', 'fitness'] },
  { name: 'Electrical Equipment and Services', icon: <Plug size={16} />, image: '/icons/Electrical Equipment and Services.png', keywords: ['wiring', 'fan', 'bulb', 'switch'] },
  { name: 'Emergency Services', icon: <Siren size={16} />, image: '/icons/Emergency Services.png', keywords: ['ambulance', 'fire', 'police'] },
  { name: 'Insurance Services', icon: <Shield size={16} />, image: '/icons/Insurance Services.png', keywords: ['life', 'medical', 'vehicle', 'policy'] },
];
