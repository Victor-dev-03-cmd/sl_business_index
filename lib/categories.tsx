import { Hotel, Car, Utensils, Home, Briefcase, Heart, User, Factory, Wrench, Clapperboard, Plane, Palette, Stethoscope, Building, Landmark, Banknote, Bus, Hammer, Phone, Dog, Tv, ShoppingCart, Dumbbell, Rss, Tractor, Laptop, School, Baby, Building2, HeartPulse, Plug, Siren, Shield, HardHat, PiggyBank } from 'lucide-react';
import React from 'react';

export interface Category {
  name: string;
  icon: React.ReactNode;
  keywords?: string[];
}

export const categories: Category[] = [
  { name: 'Hotels & Restaurants', icon: <Hotel size={16} />, keywords: ['hotel', 'stay', 'room', 'resort', 'resthouse'] },
  { name: 'Vehicles & Automative', icon: <Car size={16} />, keywords: ['car', 'bike', 'garage', 'repair', 'spare parts', 'tyre', 'wash'] },
  { name: 'Food & Dinning', icon: <Utensils size={16} />, keywords: ['restaurant', 'cafe', 'bakery', 'kotte', 'food', 'eat'] },
  { name: 'Home Appliances & Services', icon: <Home size={16} />, keywords: ['washing machine', 'fridge', 'ac', 'tv', 'repair', 'cleaning'] },
  { name: 'Office Equipment & Services', icon: <Briefcase size={16} />, keywords: ['printer', 'ink', 'paper', 'furniture', 'consultant'] },
  { name: 'Weddings Services', icon: <Heart size={16} />, keywords: ['hall', 'photo', 'dress', 'cake', 'jewelry', 'flowers'] },
  { name: 'Professional Services', icon: <User size={16} />, keywords: ['lawyer', 'accountant', 'architect', 'engineer', 'it'] },
  { name: 'Industry & Manufacturing', icon: <Factory size={16} />, keywords: ['factory', 'machine', 'plastic', 'rubber', 'export'] },
  { name: 'Repairing & Services', icon: <Wrench size={16} />, keywords: ['computer repair', 'mobile repair', 'electronic repair', 'plumbing', 'electrician'] },
  { name: 'Arts, Entertainment & Leisure', icon: <Clapperboard size={16} />, keywords: ['movie', 'club', 'park', 'gym', 'music'] },
  { name: 'Travel & Tourism', icon: <Plane size={16} />, keywords: ['ticket', 'visa', 'guide', 'safari', 'tour'] },
  { name: 'Interior Design Services', icon: <Palette size={16} />, keywords: ['curtain', 'paint', 'decor', 'floor', 'kitchen'] },
  { name: 'Health & Medical', icon: <Stethoscope size={16} />, keywords: ['doctor', 'clinic', 'hospital', 'pharmacy', 'lab'] },
  { name: 'Government & Services', icon: <Building size={16} />, keywords: ['office', 'council', 'police', 'post'] },
  { name: 'Financial Services', icon: <Banknote size={16} />, keywords: ['finance', 'loan', 'lease', 'pawn'] },
  { name: 'Travel & Transportation', icon: <Bus size={16} />, keywords: ['bus', 'van', 'taxi', 'delivery', 'courier'] },
  { name: 'Hardware Equipment', icon: <Hammer size={16} />, keywords: ['cement', 'paint', 'tools', 'pipe', 'roof'] },
  { name: 'Telecommunication Services', icon: <Phone size={16} />, keywords: ['dialog', 'mobitel', 'broadband', 'sim', 'reload'] },
  { name: 'Pet Care', icon: <Dog size={16} />, keywords: ['vet', 'food', 'grooming', 'bird', 'fish'] },
  { name: 'Media & Advertising', icon: <Tv size={16} />, keywords: ['news', 'radio', 'billboard', 'print', 'video'] },
  { name: 'Shopping & Retail', icon: <ShoppingCart size={16} />, keywords: ['supermarket', 'mall', 'clothing', 'shoes', 'gift'] },
  { name: 'Sports & Recreation', icon: <Dumbbell size={16} />, keywords: ['gym', 'cricket', 'football', 'swimming', 'yoga'] },
  { name: 'Media & Communications', icon: <Rss size={16} />, keywords: ['internet', 'fiber', 'tv', 'radio'] },
  { name: 'Agriculture Products', icon: <Tractor size={16} />, keywords: ['seed', 'fertilizer', 'agri', 'farm'] },
  { name: 'Electronic Pheripherals', icon: <Laptop size={16} />, keywords: ['mouse', 'keyboard', 'monitor', 'ssd', 'ram'] },
  { name: 'Educational institutes & Services', icon: <School size={16} />, keywords: ['school', 'class', 'tuition', 'degree', 'exam'] },
  { name: 'Baby Care', icon: <Baby size={16} />, keywords: ['diaper', 'milk', 'toys', 'clothes'] },
  { name: 'Embassies & High commision', icon: <Building2 size={16} />, keywords: ['visa', 'embassy', 'passport'] },
  { name: 'Construction Services', icon: <HardHat size={16} />, keywords: ['building', 'road', 'civil', 'contractor'] },
  { name: 'Banking & Finance', icon: <PiggyBank size={16} />, keywords: ['bank', 'savings', 'credit card'] },
  { name: 'Religious Organization', icon: <Landmark size={16} />, keywords: ['temple', 'church', 'mosque', 'kovil'] },
  { name: 'Beauty & Health', icon: <HeartPulse size={16} />, keywords: ['salon', 'makeup', 'spa', 'fitness'] },
  { name: 'Electrical Equipment and Services', icon: <Plug size={16} />, keywords: ['wiring', 'fan', 'bulb', 'switch'] },
  { name: 'Emergency Services', icon: <Siren size={16} />, keywords: ['ambulance', 'fire', 'police'] },
  { name: 'Insurance Services', icon: <Shield size={16} />, keywords: ['life', 'medical', 'vehicle', 'policy'] },
];
