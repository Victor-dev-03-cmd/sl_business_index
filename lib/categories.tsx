import { Hotel, Car, Utensils, Home, Briefcase, Heart, User, Factory, Wrench, Clapperboard, Plane, Palette, Stethoscope, Building, Landmark, Banknote, Bus, Hammer, Phone, Dog, Tv, ShoppingCart, Dumbbell, Rss, Tractor, Laptop, School, Baby, Building2, HeartPulse, Plug, Siren, Shield, HardHat, PiggyBank } from 'lucide-react';
import React from 'react';

export interface Category {
  name: string;
  icon: React.ReactNode;
}

export const categories: Category[] = [
  { name: 'Hotels & Restaurants', icon: <Hotel size={16} /> },
  { name: 'Vehicles & Automative', icon: <Car size={16} /> },
  { name: 'Food & Dinning', icon: <Utensils size={16} /> },
  { name: 'Home Appliances & Services', icon: <Home size={16} /> },
  { name: 'Office Equipment & Services', icon: <Briefcase size={16} /> },
  { name: 'Weddings Services', icon: <Heart size={16} /> },
  { name: 'Professional Services', icon: <User size={16} /> },
  { name: 'Industry & Manufacturing', icon: <Factory size={16} /> },
  { name: 'Repairing & Services', icon: <Wrench size={16} /> },
  { name: 'Arts, Entertainment & Leisure', icon: <Clapperboard size={16} /> },
  { name: 'Travel & Tourism', icon: <Plane size={16} /> },
  { name: 'Interior Design Services', icon: <Palette size={16} /> },
  { name: 'Health & Medical', icon: <Stethoscope size={16} /> },
  { name: 'Government & Services', icon: <Building size={16} /> },
  { name: 'Financial Services', icon: <Banknote size={16} /> },
  { name: 'Travel & Transportation', icon: <Bus size={16} /> },
  { name: 'Hardware Equipment', icon: <Hammer size={16} /> },
  { name: 'Telecommunication Services', icon: <Phone size={16} /> },
  { name: 'Pet Care', icon: <Dog size={16} /> },
  { name: 'Media & Advertising', icon: <Tv size={16} /> },
  { name: 'Shopping & Retail', icon: <ShoppingCart size={16} /> },
  { name: 'Sports & Recreation', icon: <Dumbbell size={16} /> },
  { name: 'Media & Communications', icon: <Rss size={16} /> },
  { name: 'Agriculture Products', icon: <Tractor size={16} /> },
  { name: 'Electronic Pheripherals', icon: <Laptop size={16} /> },
  { name: 'Educational institutes & Services', icon: <School size={16} /> },
  { name: 'Baby Care', icon: <Baby size={16} /> },
  { name: 'Embassies & High commision', icon: <Building2 size={16} /> },
  { name: 'Construction Services', icon: <HardHat size={16} /> },
  { name: 'Banking & Finance', icon: <PiggyBank size={16} /> },
  { name: 'Religious Organization', icon: <Landmark size={16} /> },
  { name: 'Beauty & Health', icon: <HeartPulse size={16} /> },
  { name: 'Electrical Equipment and Services', icon: <Plug size={16} /> },
  { name: 'Emergency Services', icon: <Siren size={16} /> },
  { name: 'Insurance Services', icon: <Shield size={16} /> },
];
