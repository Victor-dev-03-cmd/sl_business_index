'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, ArrowLeft, Star, Navigation, Menu, X, ChevronDown, Search, Check, Clock, Zap, Tags } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, expandSearchQuery } from "@/lib/utils";
import { Business } from '@/lib/types';
import Fuse from 'fuse.js';
import { SL_TOWNS, Town } from '@/lib/towns';
import TownSelector from '@/components/TownSelector';
import VerifiedBadge from '@/app/components/VerifiedBadge';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { 
  ssr: false, 
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
});

const sriLankanDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  "Ampara": { lat: 7.2912, lng: 81.6724 },
  "Anuradhapura": { lat: 8.3122, lng: 80.4131 },
  "Badulla": { lat: 6.9899, lng: 81.0569 },
  "Batticaloa": { lat: 7.7102, lng: 81.6924 },
  "Colombo": { lat: 6.9271, lng: 79.8612 },
  "Galle": { lat: 6.0535, lng: 80.2210 },
  "Gampaha": { lat: 7.0873, lng: 79.9925 },
  "Hambantota": { lat: 6.1241, lng: 81.1225 },
  "Jaffna": { lat: 9.6615, lng: 80.0070 },
  "Kalutara": { lat: 6.5854, lng: 79.9607 },
  "Kandy": { lat: 7.2906, lng: 80.6337 },
  "Kegalle": { lat: 7.2513, lng: 80.3464 },
  "Kilinochchi": { lat: 9.3872, lng: 80.3948 },
  "Kurunegala": { lat: 7.4863, lng: 80.3647 },
  "Mannar": { lat: 8.9810, lng: 79.9044 },
  "Matale": { lat: 7.4675, lng: 80.6234 },
  "Matara": { lat: 5.9496, lng: 80.5469 },
  "Monaragala": { lat: 6.8718, lng: 81.3496 },
  "Mullaitivu": { lat: 9.2671, lng: 80.8144 },
  "Nuwara Eliya": { lat: 6.9697, lng: 80.7672 },
  "Polonnaruwa": { lat: 7.9403, lng: 81.0188 },
  "Puttalam": { lat: 8.0330, lng: 79.8259 },
  "Ratnapura": { lat: 6.6828, lng: 80.3992 },
  "Trincomalee": { lat: 8.5874, lng: 81.2152 },
  "Vavuniya": { lat: 8.7514, lng: 80.4971 }
};

const CATEGORY_SUBGROUPS: Record<string, { group: string; items: string[] }[]> = {
  'Health & Medical': [
    {
      group: 'Medical Specialties & Subspecialties',
      items: ['Anesthesiology', 'Adult Cardiac Anesthesiology', 'Critical Care Medicine', 'Obstetric Anesthesiology', 'Pain Medicine', 'Pediatric Anesthesiology']
    },
    {
      group: 'Dermatology',
      items: ['Dermatopathology', 'Micrographic Dermatologic Surgery', 'Pediatric Dermatology']
    },
    {
      group: 'Emergency Medicine',
      items: ['Emergency Medical Services', 'Medical Toxicology', 'Pediatric Emergency Medicine', 'Sports Medicine', 'Undersea and Hyperbaric Medicine']
    },
    {
      group: 'Family Medicine',
      items: ['Adolescent Medicine', 'Geriatric Medicine', 'Hospice and Palliative Medicine']
    },
    {
      group: 'Internal Medicine',
      items: ['Cardiovascular Disease', 'Endocrinology, Diabetes, and Metabolism', 'Gastroenterology', 'Hematology and Oncology', 'Infectious Disease', 'Nephrology', 'Pulmonary Disease', 'Rheumatology']
    },
    {
      group: 'Neurology',
      items: ['Brain Injury Medicine', 'Child Neurology', 'Epilepsy', 'Vascular Neurology']
    },
    {
      group: 'Obstetrics and Gynecology (OB/GYN)',
      items: ['Gynecologic Oncology', 'Maternal-Fetal Medicine', 'Reproductive Endocrinology and Infertility']
    },
    {
      group: 'Ophthalmology',
      items: ['Neuro-Ophthalmology', 'Ocular Oncology']
    },
    {
      group: 'Orthopaedic Surgery',
      items: ['Adult Reconstructive Orthopaedic Surgery', 'Hand Surgery', 'Orthopaedic Sports Medicine']
    },
    {
      group: 'Pathology',
      items: ['Blood Banking-Transfusion Medicine', 'Forensic Pathology', 'Neuropathology']
    },
    {
      group: 'Pediatrics',
      items: ['Neonatal-Perinatal Medicine', 'Pediatric Cardiology', 'Pediatric Nephrology']
    },
    {
      group: 'Psychiatry',
      items: ['Addiction Psychiatry', 'Child and Adolescent Psychiatry', 'Forensic Psychiatry', 'Geriatric Psychiatry']
    },
    {
      group: 'Radiology',
      items: ['Diagnostic Radiology', 'Interventional Radiology', 'Neuroradiology', 'Nuclear Medicine']
    },
    {
      group: 'Surgery',
      items: ['Colon and Rectal Surgery', 'Neurological Surgery', 'Plastic Surgery', 'Thoracic Surgery', 'Vascular Surgery']
    }
  ],
  'Food & Dining': [
    {
      group: 'Cuisines',
      items: ['Sri Lankan', 'Chinese', 'Indian', 'Italian', 'Western', 'Japanese', 'Thai', 'Arabic']
    },
    {
      group: 'Establishment Type',
      items: ['Fine Dining', 'Casual Dining', 'Cafes & Coffee Shops', 'Bakeries', 'Fast Food', 'Pubs & Bars', 'Juice Bars', 'Pastry Shops']
    }
  ],
  'Hotels & Accommodation': [
    {
      group: 'Accommodation Type',
      items: ['Luxury Hotels', 'Boutique Hotels', 'Resorts', 'Guest Houses', 'Homestays', 'Villas', 'Budget Hotels', 'Eco Lodges']
    },
    {
      group: 'Facilities',
      items: ['Swimming Pool', 'Spa & Wellness', 'Beachfront', 'Conference Halls', 'Wedding Venues']
    }
  ],
  'Transportation & Logistics': [
    {
      group: 'Transportation Services',
      items: ['Airlines', 'Trains', 'Buses', 'Cars', 'Taxis', 'Ferries', 'Subways', 'Bikes', 'Scooters', 'Freight', 'Logistics', 'Limousines', 'Charters']
    },
    {
      group: 'Infrastructure',
      items: ['Airports', 'Stations', 'Harbors', 'Tolls', 'Parking', 'Highways']
    }
  ],
  'Education': [
    {
      group: 'Institutions',
      items: ['Primary Schools', 'Secondary Schools', 'International Schools', 'Universities', 'Vocational Training', 'Technical Colleges']
    },
    {
      group: 'Tuition & Courses',
      items: ['Maths Tuition', 'Science Tuition', 'English Language', 'IT & Coding', 'Music & Arts', 'Driving Schools']
    }
  ],
  'Finance & Legal': [
    {
      group: 'Banking & Finance',
      items: ['Banks', 'ATM Locations', 'Finance Companies', 'Insurance Agents', 'Microfinance', 'Leasing Services']
    },
    {
      group: 'Legal Services',
      items: ['Lawyers', 'Notary Public', 'Legal Consultants', 'Corporate Law', 'Divorce Lawyers']
    }
  ],
  'Agriculture, Forestry & Aquaculture': [
    {
      group: 'Cereals & Grains',
      items: ['Wheat', 'Rice', 'Corn (Maize)', 'Barley', 'Oats', 'Sorghum']
    },
    {
      group: 'Legumes & Pulses',
      items: ['Beans', 'Peas', 'Lentils', 'Chickpeas']
    },
    {
      group: 'Oilseeds & Oil-Bearing Crops',
      items: ['Soybeans', 'Canola', 'Sunflower seeds', 'Peanuts', 'Oil palm']
    },
    {
      group: 'Fruits (Temperate)',
      items: ['Apples', 'Pears', 'Grapes', 'Berries']
    },
    {
      group: 'Fruits (Tropical/Subtropical)',
      items: ['Bananas', 'Mangoes', 'Citrus', 'Pineapple']
    },
    {
      group: 'Vegetables (Leafy/Stem)',
      items: ['Lettuce', 'Spinach', 'Cabbage']
    },
    {
      group: 'Vegetables (Root, Bulb & Tuber)',
      items: ['Potatoes', 'Carrots', 'Onions', 'Cassava']
    },
    {
      group: 'Vegetables (Fruit-bearing)',
      items: ['Tomatoes', 'Peppers', 'Cucumbers']
    },
    {
      group: 'Sugar & Fiber Crops',
      items: ['Sugarcane', 'Sugar beet', 'Cotton', 'Jute', 'Flax', 'Hemp']
    },
    {
      group: 'Beverage & Stimulant Crops',
      items: ['Coffee', 'Tea', 'Cocoa', 'Tobacco']
    },
    {
      group: 'Spices & Aromatic Herbs',
      items: ['Black pepper', 'Vanilla', 'Cinnamon', 'Ginger', 'Cardamom']
    },
    {
      group: 'Forage & Ornamental Crops',
      items: ['Alfalfa', 'Clover', 'Grasses', 'Flowers', 'Nursery plants', 'Foliage']
    },
    {
      group: 'Meat & Poultry',
      items: ['Beef', 'Pork', 'Lamb', 'Chicken', 'Turkey', 'Goat']
    },
    {
      group: 'Dairy & Eggs',
      items: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs']
    },
    {
      group: 'Animal Fibers & By-products',
      items: ['Wool', 'Mohair', 'Silk', 'Hides', 'Leather', 'Tallow', 'Manure']
    },
    {
      group: 'Forestry',
      items: ['Timber', 'Rubber', 'Resin', 'Firewood', 'Charcoal']
    },
    {
      group: 'Aquaculture',
      items: ['Fish (Tilapia, Catfish)', 'Shellfish (Shrimp, Oysters)']
    }
  ],
  'Agriculture Products': [], // This will be handled as an alias in logic
  'Beauty & Health': [
    {
      group: 'Beauty & Personal Care',
      items: ['Skin', 'Hair', 'Makeup', 'Fragrance', 'Grooming', 'Bath', 'Tools', 'Oral']
    },
    {
      group: 'Health & Wellness',
      items: ['Vitamins', 'Medical', 'Sports', 'Sexual', 'Hygiene', 'Vision', 'Aromatherapy']
    }
  ],
  'Electronic Peripherals': [
    {
      group: 'Input',
      items: ['Keyboards', 'Mice', 'Scanners', 'Microphones', 'Webcams', 'Controllers', 'Tablets', 'Readers']
    },
    {
      group: 'Output',
      items: ['Monitors', 'Printers', 'Speakers', 'Headphones', 'Projectors', 'Plotters']
    },
    {
      group: 'Storage',
      items: ['Drives', 'Flash', 'Cards', 'Optical']
    },
    {
      group: 'Communication & Networking',
      items: ['Modems', 'Routers', 'Adapters', 'Hubs']
    }
  ],
  'Home Appliances & Services': [
    {
      group: 'Home Services',
      items: ['Cleaning', 'Plumbing', 'Electrical', 'Installation', 'Repair', 'Maintenance', 'Gardening', 'Pest', 'Security', 'Moving', 'Painting', 'Renovation', 'Interior', 'Laundry', 'HVAC']
    }
  ],
  'Interior Design Services': [
    {
      group: 'Interior Design Styles',
      items: ['Modern', 'Contemporary', 'Minimalist', 'Industrial', 'Mid-Century Modern', 'Traditional', 'Transitional', 'Bohemian', 'Scandinavian', 'Rustic', 'Coastal', 'Art Deco', 'French Country', 'Japandi']
    }
  ],
  'Pet Care': [
    {
      group: 'Pet Products',
      items: ['Food', 'Treats', 'Toys', 'Beds', 'Collars', 'Leashes', 'Grooming', 'Cages', 'Aquariums', 'Litter', 'Health', 'Apparel', 'Bowls', 'Carriers']
    },
    {
      group: 'Pet Services',
      items: ['Veterinary', 'Grooming', 'Boarding', 'Sitting', 'Walking', 'Training', 'Daycare', 'Therapy', 'Insurance', 'Photography', 'Waste (Removal)', 'Transport']
    }
  ],
  'Shopping & Retail': [
    {
      group: 'Categories',
      items: ['Apparel', 'Electronics', 'Grocery', 'Home', 'Beauty', 'Health', 'Hardware', 'Toys', 'Automotive', 'Pet', 'Media', 'Sports']
    },
    {
      group: 'Store Types',
      items: ['Department', 'Specialty', 'Supermarket', 'Convenience', 'Discount', 'eCommerce', 'Warehouse']
    }
  ],
  'Travel & Transportation': [
    {
      group: 'Travel',
      items: ['Flights', 'Hotels', 'Cruises', 'Resorts', 'Vacations', 'Rentals', 'Tours', 'Insurance', 'Adventure', 'Business', 'Camping', 'Hostels', 'Safaris']
    },
    {
      group: 'Transportation',
      items: ['Airlines', 'Trains', 'Buses', 'Cars', 'Taxis', 'Ferries', 'Subways', 'Bikes', 'Scooters', 'Freight', 'Logistics', 'Limousines', 'Charters']
    },
    {
      group: 'Infrastructure',
      items: ['Airports', 'Stations', 'Harbors', 'Tolls', 'Parking', 'Highways']
    }
  ],
  'Arts, Entertainment & Leisure': [
    {
      group: 'Arts',
      items: ['Visual', 'Performing', 'Fine', 'Digital', 'Photography', 'Sculpture', 'Literature', 'Crafts', 'Galleries', 'Museums']
    },
    {
      group: 'Entertainment',
      items: ['Movies', 'Music', 'Theater', 'Gaming', 'Concerts', 'Festivals', 'Broadcasting', 'Streaming', 'Events', 'Nightlife']
    },
    {
      group: 'Leisure',
      items: ['Hobbies', 'Sports', 'Parks', 'Fitness', 'Reading', 'Gardening', 'Crafting', 'Clubs', 'Tourism']
    }
  ],
  'Construction Services': [
    {
      group: 'Planning & Consulting',
      items: ['Planning', 'Architecture', 'Engineering', 'Surveying', 'Drafting', 'Consulting']
    },
    {
      group: 'Site Preparation',
      items: ['Demolition', 'Excavation', 'Grading', 'Foundation', 'Dredging']
    },
    {
      group: 'Structural & Exterior',
      items: ['Structural', 'Framing', 'Masonry', 'Concrete', 'Roofing', 'Siding', 'Welding']
    },
    {
      group: 'Systems & Finishing',
      items: ['Electrical', 'Plumbing', 'HVAC', 'Mechanical', 'Solar', 'Security', 'Drywall', 'Painting', 'Flooring', 'Carpentry', 'Tiling', 'Glazing']
    },
    {
      group: 'Exterior & Landscaping',
      items: ['Paving', 'Landscaping', 'Fencing', 'Pool', 'Decking']
    }
  ],
  'Embassies & High commission': [
    {
      group: 'Diplomatic Missions',
      items: ['Embassies', 'High Commissions', 'Consulates', 'Missions', 'Delegations', 'Chanceries', 'Residences']
    },
    {
      group: 'Departments',
      items: ['Consular', 'Political', 'Economic', 'Commercial', 'Cultural', 'Defense', 'Press', 'Legal', 'Administration', 'Immigration', 'Security']
    },
    {
      group: 'Services',
      items: ['Visas', 'Passports', 'Notarization', 'Authentication', 'Registration', 'Evacuation']
    }
  ],
  'Government & Services': [
    {
      group: 'Government Services',
      items: ['Agriculture', 'Banking', 'Registration', 'Communication', 'Education', 'Employment', 'Environment', 'Health', 'Housing', 'Justice', 'Trade', 'Travel']
    },
    {
      group: 'Public Service Groups',
      items: ['Administrative', 'Police', 'Customs', 'Medical', 'Engineering', 'Planning', 'Scientific', 'Architectural', 'Teaching', 'Legal', 'Surveyors', 'Accountants']
    },
    {
      group: 'Local Authority Services',
      items: ['Sanitation', 'Thoroughfares', 'Parks', 'Waste', 'Markets', 'Utility', 'Fire']
    }
  ],
  'Hotels & Restaurants': [
    {
      group: 'Hotels',
      items: ['Luxury', 'Boutique', 'Resorts', 'Business', 'Budget', 'Motels', 'Hostels', 'Suites', 'Villas', 'Lodges', 'Apartments', 'Transit']
    },
    {
      group: 'Restaurants',
      items: ['Fine (Dining)', 'Casual', 'Fast (Food)', 'Cafes', 'Bistros', 'Buffets', 'Bakeries', 'Pubs', 'Bars', 'Pizzerias', 'Steakhouses', 'Grills', 'Diners', 'Delis']
    },
    {
      group: 'Services',
      items: ['Catering', 'Delivery', 'Takeout', 'Reservations', 'Concierge', 'Housekeeping', 'Banquet', 'Valet']
    }
  ],
  'Media & Advertising': [
    {
      group: 'Media',
      items: ['Broadcasting', 'Television', 'Radio', 'Print', 'Digital', 'Social', 'Streaming', 'News', 'Publishing', 'Podcasting', 'Websites']
    },
    {
      group: 'Advertising',
      items: ['Creative', 'Branding', 'Design', 'SEO', 'SEM', 'PPC', 'Display', 'Billboards', 'Signage', 'Email', 'Programmatic', 'Experiential']
    },
    {
      group: 'Services',
      items: ['Planning', 'Buying', 'Production', 'Research', 'Analytics', 'Relations', 'Consulting', 'Copywriting']
    }
  ],
  'Professional Services': [
    {
      group: 'Consulting',
      items: ['Management', 'Strategy', 'Operations', 'Financial', 'Human (Resources)', 'Information (Technology)', 'Sustainability']
    },
    {
      group: 'Legal',
      items: ['Corporate', 'Litigation', 'Intellectual (Property)', 'Employment', 'Environmental', 'Notary', 'Paralegal']
    },
    {
      group: 'Finance & Accounting',
      items: ['Auditing', 'Taxation', 'Bookkeeping', 'Payroll', 'Actuarial', 'Investment (Advisory)']
    },
    {
      group: 'Technical & Design',
      items: ['Architecture', 'Engineering', 'Drafting', 'Graphic (Design)', 'Interior (Design)', 'Surveying']
    },
    {
      group: 'Marketing & Communications',
      items: ['Advertising', 'Public (Relations)', 'Translation', 'Copywriting', 'Research (Market)']
    },
    {
      group: 'Scientific',
      items: ['Research', 'Testing', 'Laboratory', 'Veterinary']
    }
  ],
  'Sports & Recreation': [
    {
      group: 'Sports',
      items: ['Athletics', 'Gymnastics', 'Swimming', 'Combat', 'Racquet', 'Team', 'Motorsports', 'Equestrian', 'Cycling', 'Golf']
    },
    {
      group: 'Recreation',
      items: ['Fitness', 'Outdoor', 'Water', 'Winter', 'Gaming', 'Adventure']
    },
    {
      group: 'Infrastructure & Gear',
      items: ['Stadiums', 'Arenas', 'Courts', 'Apparel', 'Equipment', 'Footwear']
    },
    {
      group: 'Services',
      items: ['Coaching', 'Training', 'Officiating', 'Physiotherapy', 'Management', 'Broadcasting']
    }
  ],
  'Vehicles & Automotive': [
    {
      group: 'Vehicles',
      items: ['Cars', 'Trucks', 'Vans', 'Motorcycles', 'Buses', 'Electric', 'Luxury', 'Commercial', 'Industrial', 'Specialty']
    },
    {
      group: 'Automotive Parts',
      items: ['Engines', 'Tires', 'Wheels', 'Brakes', 'Suspension', 'Lighting', 'Interior', 'Body', 'Batteries', 'Electronics']
    },
    {
      group: 'Services',
      items: ['Repair', 'Maintenance', 'Bodywork', 'Detailing', 'Inspection', 'Rental', 'Financing', 'Roadside']
    },
    {
      group: 'Fuel & Charging',
      items: ['Gasoline', 'Diesel', 'Electric', 'Hydrogen', 'Lubricants']
    }
  ],
  'Baby Care': [
    {
      group: 'Feeding',
      items: ['Nursing', 'Bottles', 'Formula', 'Solid', 'Utensils']
    },
    {
      group: 'Diapering',
      items: ['Diapers', 'Wipes', 'Creams', 'Bags', 'Disposal']
    },
    {
      group: 'Bath & Body',
      items: ['Cleansers', 'Moisturizers', 'Bathing', 'Grooming', 'Laundry']
    },
    {
      group: 'Nursery & Sleep',
      items: ['Furniture', 'Bedding', 'Monitoring', 'Soothing']
    },
    {
      group: 'Travel & Gear',
      items: ['Strollers', 'Car Seats', 'Carriers', 'Playpens']
    },
    {
      group: 'Health & Safety',
      items: ['Medical', 'Safety', 'Teething', 'Sun']
    },
    {
      group: 'Play & Learning',
      items: ['Toys', 'Walkers', 'Books']
    }
  ],
  'Educational institutes & Services': [
    {
      group: 'Institutions',
      items: ['Preschools', 'Schools', 'Colleges', 'Universities', 'Vocational', 'Polytechnics', 'Academies', 'Conservatories', 'Seminaries']
    },
    {
      group: 'Specialized Learning',
      items: ['Language', 'Technical', 'Medical', 'Legal', 'Business', 'Art', 'Music', 'Flight', 'Special']
    },
    {
      group: 'Educational Services',
      items: ['Tutoring', 'Coaching', 'Consultancy', 'Counseling', 'Testing', 'Placement', 'Training', 'E-learning']
    },
    {
      group: 'Supplies & Support',
      items: ['Textbooks', 'Stationery', 'Uniforms', 'Library', 'Research', 'Scholarships']
    }
  ],
  'Emergency Services': [
    {
      group: 'Core Agencies',
      items: ['Police', 'Fire', 'Ambulance', 'Dispatch']
    },
    {
      group: 'Specialized Rescue',
      items: ['Search', 'Coast', 'Mountain', 'Lifeguard', 'Hazmat']
    },
    {
      group: 'Disaster & Management',
      items: ['Management', 'Military', 'Meteorology', 'Cyber']
    },
    {
      group: 'Community & Welfare',
      items: ['Child', 'Women', 'Mental', 'Poison', 'Animal']
    },
    {
      group: 'Utilities (Emergency Response)',
      items: ['Electricity', 'Water', 'Road']
    }
  ],
  'Hardware Equipment': [
    {
      group: 'Tools',
      items: ['Hand', 'Power', 'Pneumatic', 'Measuring', 'Cutting']
    },
    {
      group: 'Fasteners & Fixings',
      items: ['Screws', 'Nails', 'Bolts', 'Anchors', 'Rivets', 'Adhesives']
    },
    {
      group: 'Building Materials',
      items: ['Lumber', 'Cement', 'Drywall', 'Insulation', 'Roofing', 'Brick']
    },
    {
      group: 'Plumbing & Electrical',
      items: ['Pipes', 'Fittings', 'Wiring', 'Switches', 'Breakers', 'Conduit']
    },
    {
      group: 'Fixtures & Finishings',
      items: ['Knobs', 'Hinges', 'Handles', 'Locks', 'Latches', 'Brackets']
    },
    {
      group: 'Safety & Storage',
      items: ['Personal', 'Toolboxes', 'Shelving', 'Ladders', 'Workbenches']
    }
  ]
};

// Update alias mapping
const CATEGORY_ALIASES: Record<string, string> = {
  'Agriculture Products': 'Agriculture, Forestry & Aquaculture',
  'Farming': 'Agriculture, Forestry & Aquaculture',
  'Beauty': 'Beauty & Health',
  'Health': 'Beauty & Health',
  'Personal Care': 'Beauty & Health',
  'Wellness': 'Beauty & Health',
  'Electronics': 'Electronic Peripherals',
  'Computers': 'Electronic Peripherals',
  'Peripherals': 'Electronic Peripherals',
  'Electronic Pheripherals': 'Electronic Peripherals',
  'Home Services': 'Home Appliances & Services',
  'Maintenance': 'Home Appliances & Services',
  'Appliances': 'Home Appliances & Services',
  'Interior Design': 'Interior Design Services',
  'Interior Decor': 'Interior Design Services',
  'Pets': 'Pet Care',
  'Veterinary': 'Pet Care',
  'Pet Shop': 'Pet Care',
  'Shopping': 'Shopping & Retail',
  'Retail': 'Shopping & Retail',
  'Supermarket': 'Shopping & Retail',
  'Travel': 'Travel & Transportation',
  'Transportation': 'Travel & Transportation',
  'Transport': 'Travel & Transportation',
  'Taxi': 'Travel & Transportation',
  'Sports': 'Sports & Recreation',
  'Fitness': 'Sports & Recreation',
  'Vehicles': 'Vehicles & Automotive',
  'Cars': 'Vehicles & Automotive',
  'Automotive': 'Vehicles & Automotive',
  'Automative': 'Vehicles & Automotive',
  'Arts': 'Arts, Entertainment & Leisure',
  'Entertainment': 'Arts, Entertainment & Leisure',
  'Leisure': 'Arts, Entertainment & Leisure',
  'Music': 'Arts, Entertainment & Leisure',
  'Movies': 'Arts, Entertainment & Leisure',
  'Construction': 'Construction Services',
  'Architecture': 'Construction Services',
  'Embassy': 'Embassies & High commission',
  'Consulate': 'Embassies & High commission',
  'Diplomatic': 'Embassies & High commission',
  'Government': 'Government & Services',
  'Public Service': 'Government & Services',
  'Hotels': 'Hotels & Restaurants',
  'Restaurants': 'Hotels & Restaurants',
  'Food & Dining': 'Hotels & Restaurants',
  'Media': 'Media & Advertising',
  'Advertising': 'Media & Advertising',
  'Marketing': 'Media & Advertising',
  'Professional': 'Professional Services',
  'Consulting': 'Professional Services',
  'Legal': 'Professional Services',
  'Accounting': 'Professional Services',
  'Baby': 'Baby Care',
  'Kids': 'Baby Care',
  'Education': 'Educational institutes & Services',
  'School': 'Educational institutes & Services',
  'University': 'Educational institutes & Services',
  'Tuition': 'Educational institutes & Services',
  'Emergency': 'Emergency Services',
  'Rescue': 'Emergency Services',
  'Police': 'Emergency Services',
  'Fire': 'Emergency Services',
  'Ambulance': 'Emergency Services',
  'Hardware': 'Hardware Equipment',
  'Tools': 'Hardware Equipment',
  'Building Materials': 'Hardware Equipment'
};

function SplitScreenResultsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const district = searchParams.get('district');
  const initialQuery = searchParams.get('q') || '';
  const initialRadius = searchParams.get('radius');
  const radius = useMemo(() => {
    if (!initialRadius) return 5000;
    const r = parseInt(initialRadius);
    if (isNaN(r)) return 5000;
    // If someone put KM (e.g. 5) instead of meters (e.g. 5000)
    return r < 100 ? r * 1000 : r;
  }, [initialRadius]);

  const [selectedRadius, setSelectedRadius] = useState(radius);
  const [visualRadius, setVisualRadius] = useState(radius);
  const memoizedVisualRadius = useMemo(() => [visualRadius], [visualRadius]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchType, setSearchType] = useState<'location' | 'district'>(district ? 'district' : 'location');
  const [currentLat, setCurrentLat] = useState<string | null>(lat);
  const [currentLng, setCurrentLng] = useState<string | null>(lng);
  const [mapCenter, setMapCenter] = useState({ 
    lat: lat ? parseFloat(lat) : (district && districtCoordinates[district] ? districtCoordinates[district].lat : 7.8731), 
    lng: lng ? parseFloat(lng) : (district && districtCoordinates[district] ? districtCoordinates[district].lng : 80.7718) 
  });
  const [mapZoom, setMapZoom] = useState(lat || district ? 14 : 8);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(district);
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [isMapManual, setIsMapManual] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = React.useCallback(() => {
    setDebouncedSearchQuery(searchQuery);
  }, [searchQuery]);

  const findMyLocation = React.useCallback(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setIsMapManual(false);
          setMapCenter({ lat: latitude, lng: longitude });
          setMapZoom(15);
          setCurrentLat(latitude.toString());
          setCurrentLng(longitude.toString());
          setSearchType('location');
          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    if (!lat && !lng && !district) {
      findMyLocation();
    }
  }, [lat, lng, district, findMyLocation]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    const km = meters / 1000;
    // Show .5 if it's not a whole number (e.g., 1.5 km)
    return km % 1 === 0 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
  };
  
  const activeSubgroups = React.useMemo(() => {
    // 1. Check selected category (including aliases)
    if (selectedCategory) {
      if (CATEGORY_SUBGROUPS[selectedCategory]) {
        return CATEGORY_SUBGROUPS[selectedCategory];
      }
      const alias = CATEGORY_ALIASES[selectedCategory];
      if (alias && CATEGORY_SUBGROUPS[alias]) {
        return CATEGORY_SUBGROUPS[alias];
      }
    }
    
    // 2. Try to match searchQuery with main categories that have subgroups
    const lowerQuery = searchQuery.toLowerCase();
    for (const catName in CATEGORY_SUBGROUPS) {
      if (lowerQuery.includes(catName.toLowerCase())) {
        if (CATEGORY_SUBGROUPS[catName].length > 0) {
          return CATEGORY_SUBGROUPS[catName];
        }
        const alias = CATEGORY_ALIASES[catName];
        if (alias && CATEGORY_SUBGROUPS[alias]) {
          return CATEGORY_SUBGROUPS[alias];
        }
      }
    }

    // 3. Special case for common terms
    if (lowerQuery.includes('health') || lowerQuery.includes('medical') || lowerQuery.includes('doctor') || lowerQuery.includes('clinic')) {
       return CATEGORY_SUBGROUPS['Health & Medical'];
    }
    if (lowerQuery.includes('food') || lowerQuery.includes('restaurant') || lowerQuery.includes('eat') || lowerQuery.includes('cafe') || lowerQuery.includes('dining')) {
       return CATEGORY_SUBGROUPS['Hotels & Restaurants'];
    }
    if (lowerQuery.includes('hotel') || lowerQuery.includes('resort') || lowerQuery.includes('stay') || lowerQuery.includes('accommodation')) {
       return CATEGORY_SUBGROUPS['Hotels & Restaurants'];
    }
    if (lowerQuery.includes('car') || lowerQuery.includes('auto') || lowerQuery.includes('vehicle') || lowerQuery.includes('repair') || lowerQuery.includes('motorcycle') || lowerQuery.includes('bike')) {
       return CATEGORY_SUBGROUPS['Vehicles & Automotive'];
    }
    if (lowerQuery.includes('school') || lowerQuery.includes('learn') || lowerQuery.includes('education') || lowerQuery.includes('class') || lowerQuery.includes('university') || lowerQuery.includes('college')) {
       return CATEGORY_SUBGROUPS['Educational institutes & Services'];
    }
    if (lowerQuery.includes('bank') || lowerQuery.includes('finance') || lowerQuery.includes('legal') || lowerQuery.includes('lawyer') || lowerQuery.includes('accountant')) {
       return CATEGORY_SUBGROUPS['Professional Services'];
    }
    if (lowerQuery.includes('shop') || lowerQuery.includes('retail') || lowerQuery.includes('store') || lowerQuery.includes('supermarket') || lowerQuery.includes('market')) {
       return CATEGORY_SUBGROUPS['Shopping & Retail'];
    }
    if (lowerQuery.includes('travel') || lowerQuery.includes('transport') || lowerQuery.includes('tour') || lowerQuery.includes('flight') || lowerQuery.includes('taxi') || lowerQuery.includes('bus') || lowerQuery.includes('train')) {
       return CATEGORY_SUBGROUPS['Transportation & Logistics'];
    }
    if (lowerQuery.includes('electron') || lowerQuery.includes('computer') || lowerQuery.includes('peripheral') || lowerQuery.includes('pheripheral') || lowerQuery.includes('keyboard') || lowerQuery.includes('monitor')) {
       return CATEGORY_SUBGROUPS['Electronic Peripherals'];
    }
    if (lowerQuery.includes('home service') || lowerQuery.includes('cleaning') || lowerQuery.includes('plumbing') || lowerQuery.includes('repair') || lowerQuery.includes('appliance')) {
       return CATEGORY_SUBGROUPS['Home Appliances & Services'];
    }
    if (lowerQuery.includes('interior') || lowerQuery.includes('decor') || lowerQuery.includes('design')) {
       return CATEGORY_SUBGROUPS['Interior Design Services'];
    }
    if (lowerQuery.includes('pet') || lowerQuery.includes('vet') || lowerQuery.includes('animal care') || lowerQuery.includes('dog') || lowerQuery.includes('cat')) {
       return CATEGORY_SUBGROUPS['Pet Care'];
    }
    if (lowerQuery.includes('beauty') || lowerQuery.includes('cosmetic') || lowerQuery.includes('makeup') || lowerQuery.includes('salon') || lowerQuery.includes('wellness') || lowerQuery.includes('grooming')) {
       return CATEGORY_SUBGROUPS['Beauty & Health'];
    }
    if (lowerQuery.includes('agri') || lowerQuery.includes('farm') || lowerQuery.includes('crop') || lowerQuery.includes('animal') || lowerQuery.includes('fish') || lowerQuery.includes('forest') || lowerQuery.includes('agriculture products')) {
       return CATEGORY_SUBGROUPS['Agriculture, Forestry & Aquaculture'];
    }
    if (lowerQuery.includes('art') || lowerQuery.includes('entertain') || lowerQuery.includes('leisure') || lowerQuery.includes('music') || lowerQuery.includes('movie') || lowerQuery.includes('game') || lowerQuery.includes('hobby')) {
       return CATEGORY_SUBGROUPS['Arts, Entertainment & Leisure'];
    }
    if (lowerQuery.includes('sport') || lowerQuery.includes('recreation') || lowerQuery.includes('gym') || lowerQuery.includes('fitness') || lowerQuery.includes('outdoor') || lowerQuery.includes('adventure')) {
       return CATEGORY_SUBGROUPS['Sports & Recreation'];
    }
    if (lowerQuery.includes('construct') || lowerQuery.includes('build') || lowerQuery.includes('architect') || lowerQuery.includes('engineer') || lowerQuery.includes('plumb') || lowerQuery.includes('electr')) {
       return CATEGORY_SUBGROUPS['Construction Services'];
    }
    if (lowerQuery.includes('embassy') || lowerQuery.includes('consulate') || lowerQuery.includes('diplomat') || lowerQuery.includes('visa') || lowerQuery.includes('passport')) {
       return CATEGORY_SUBGROUPS['Embassies & High commission'];
    }
    if (lowerQuery.includes('gov') || lowerQuery.includes('police') || lowerQuery.includes('public service') || lowerQuery.includes('sanitation')) {
       return CATEGORY_SUBGROUPS['Government & Services'];
    }
    if (lowerQuery.includes('media') || lowerQuery.includes('advertis') || lowerQuery.includes('market') || lowerQuery.includes('brand') || lowerQuery.includes('broadcas')) {
       return CATEGORY_SUBGROUPS['Media & Advertising'];
    }
    if (lowerQuery.includes('professional') || lowerQuery.includes('consult') || lowerQuery.includes('legal') || lowerQuery.includes('account') || lowerQuery.includes('audit')) {
       return CATEGORY_SUBGROUPS['Professional Services'];
    }
    if (lowerQuery.includes('baby') || lowerQuery.includes('kid') || lowerQuery.includes('infant') || lowerQuery.includes('nursery') || lowerQuery.includes('toy')) {
       return CATEGORY_SUBGROUPS['Baby Care'];
    }

    return [];
  }, [selectedCategory, searchQuery]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-nearby'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const IconComponent = ({ name, className }: { name: string | null, className?: string }) => {
    if (!name) return <Tags className={className} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : <Tags className={className} />;
  };

  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!isNaN(radius)) {
      setVisualRadius(radius);
      setSelectedRadius(radius);
    }
  }, [radius]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: businessesData = [], isLoading: loadingBusinesses, error } = useQuery({
    queryKey: ['nearby-businesses', currentLat, currentLng, selectedRadius, debouncedSearchQuery],
    queryFn: async () => {
      // If we don't have location and it's not a district search, we use Sri Lanka center as default for the RPC
      const lat = currentLat ? parseFloat(currentLat) : 7.8731;
      const lng = currentLng ? parseFloat(currentLng) : 80.7718;
      
      const { data, error } = await supabase.rpc('get_nearby_businesses', {
        user_lat: lat,
        user_lng: lng,
        search_query: debouncedSearchQuery || '',
        dist_limit: selectedRadius
      });

      if (error) throw error;

      // Convert to Feature format for compatibility with existing LeafletMap/clustering logic
      return data.map((b: any) => ({
        type: 'Feature',
        id: b.id,
        properties: { 
          ...b,
          distance: b.distance_meters 
        },
        geometry: {
          type: 'Point',
          coordinates: [b.longitude, b.latitude]
        }
      }));
    },
    enabled: true, // Always fetch something
    staleTime: 60 * 1000, // 1 minute
  });

  const businesses = React.useMemo(() => {
    if (loadingBusinesses) return [];
    
    let filtered = [...businessesData];

    // Filter by Category (since RPC doesn't currently filter by category)
    if (selectedCategory) {
      filtered = filtered.filter(f => f.properties.category === selectedCategory);
    }

    // Filter by District if searchType is district
    if (searchType === 'district' && (selectedDistrict || district)) {
       const dist = (selectedDistrict || district).toLowerCase();
       filtered = filtered.filter(f => 
         f.properties.location?.toLowerCase().includes(dist) ||
         f.properties.city?.toLowerCase().includes(dist) ||
         f.properties.address?.toLowerCase().includes(dist)
       );
    }

    return filtered.map(f => ({
      ...f.properties,
      id: f.id || f.properties.id || Math.random().toString(),
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      distanceText: (typeof f.properties.distance === 'number') 
        ? (f.properties.distance < 10 ? 'At location' : (f.properties.distance < 1000 ? `${Math.round(f.properties.distance)} m` : `${(f.properties.distance / 1000).toFixed(1)} km`)) 
        : 'Calculating...'
    }));
  }, [businessesData, loadingBusinesses, selectedCategory, searchType, selectedDistrict, district]);

  const loading = loadingBusinesses || locationLoading;
  const fuse = React.useMemo(() => new Fuse(businessesData, {
    keys: ['properties.name', 'properties.category', 'properties.location', 'properties.address'],
    threshold: 0.3,
  }), [businessesData]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const results = fuse.search(searchQuery).slice(0, 6);
      setSuggestions(results.map(r => r.item));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, fuse]);

  const results = businesses || [];

  if (!currentLat && !currentLng && !district && error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <Link href="/" className="text-brand-dark hover:text-brand-blue font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLat && !currentLng && !district && loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 border-3 border-brand-dark border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
        {/* Top Filter Bar */}
        <div className="h-16 border-b border-gray-300 flex items-center justify-between px-4 md:px-6 bg-white z-10 gap-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link href="/" className="text-brand-dark hover:text-brand-blue transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
            <div className="hidden md:flex items-center text-sm text-gray-600 font-normal">
              <MapPin size={16} strokeWidth={1.5} className="mr-1.5 text-brand-dark" />
              <span>Nearby</span>
            </div>
          </div>

          {/* Center Section: Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block relative">
            <div className="flex items-center w-full px-3 bg-gray-50 rounded-[6px] border border-gray-300 focus-within:bg-white focus-within:border-brand-dark h-10 transition-all shadow-sm">
              <Search size={16} strokeWidth={1.5} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search businesses or areas..."
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 font-normal"
              />
            </div>

            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[6px] shadow-2xl z-50 overflow-hidden">
                {suggestions.map((feature, idx) => (
                  <button
                    key={feature.id || idx}
                    onClick={() => {
                      const { name } = feature.properties;
                      const [lng, lat] = feature.geometry.coordinates;
                      setSearchQuery(name);
                      setSuggestions([]);
                      setIsMapManual(false);
                      setMapCenter({ lat, lng });
                      setMapZoom(16);
                      setCurrentLat(lat.toString());
                      setCurrentLng(lng.toString());
                      setSearchType('location');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <MapPin size={14} className="text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-700 font-medium">{feature.properties.name}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">
                        {feature.properties.category} • {feature.properties.location || feature.properties.city || 'Sri Lanka'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Section: Filters */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={findMyLocation}
              className="flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 outline-none focus:ring-1 focus:ring-brand-dark transition-all shadow-sm group font-normal"
              title="Find my current location"
            >
              <Navigation size={14} strokeWidth={1.5} className="text-brand-dark group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline whitespace-nowrap text-gray-600">Find Me</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 outline-none focus:ring-1 focus:ring-brand-dark transition-all shadow-sm font-normal">
                  <span className="whitespace-nowrap text-gray-600">Radius: <span className="text-brand-dark font-normal">{formatDistance(visualRadius)}</span></span>
                  <ChevronDown size={14} strokeWidth={1.5} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-4 w-64 bg-white shadow-xl border border-gray-300 rounded-[6px]">
                <div className="mb-4 flex justify-between font-normal">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Search Radius</span>
                  <span className="text-xs text-brand-dark bg-blue-50 px-2 py-0.5 rounded">{formatDistance(visualRadius)}</span>
                </div>
                <Slider
                  value={memoizedVisualRadius}
                  max={50000}
                  min={500}
                  step={500}
                  onValueChange={(value) => setVisualRadius(value[0])}
                  onValueCommit={(value) => setSelectedRadius(value[0])}
                  className="py-4"
                />
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative">
              <DropdownMenu open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="hidden md:flex items-center gap-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded-[6px] px-3 h-10 outline-none focus:ring-1 focus:ring-brand-dark transition-all shadow-sm font-normal"
                  >
                    <span className="whitespace-nowrap text-gray-600">
                      {selectedCategory ? (
                        <div className="flex items-center">
                          <span className="text-brand-dark mr-2">{categories.find(c => c.name === selectedCategory)?.icon}</span>
                          {selectedCategory}
                        </div>
                      ) : 'Category'}
                    </span>
                    <ChevronDown size={14} strokeWidth={1.5} className={cn("text-gray-400 transition-transform duration-200", isCategoryOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-0 bg-white rounded-[6px] shadow-2xl border border-gray-300 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Search categories..." className="h-10 border-none ring-0 focus:ring-0" />
                    <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <CommandEmpty className="py-4 text-center text-gray-400 text-sm">No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-categories"
                          onSelect={() => {
                            setSelectedCategory(null);
                            setIsCategoryOpen(false);
                          }}
                          className="flex items-center px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <span className="text-gray-500 mr-3 opacity-50"><X size={14} /></span>
                          <span className="text-sm font-medium text-gray-700">All Categories</span>
                          {selectedCategory === null && <Check className="ml-auto h-4 w-4 text-brand-dark" />}
                        </CommandItem>
                        {categories.map((cat: any) => (
                          <CommandItem
                            key={cat.name}
                            value={`${cat.name} ${cat.keywords?.join(' ')}`}
                            onSelect={() => {
                              setSelectedCategory(cat.name === selectedCategory ? null : cat.name);
                              setIsCategoryOpen(false);
                            }}
                            className="flex items-center px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center flex-1">
                              <span className="text-brand-dark mr-3">
                                <IconComponent name={cat.icon} />
                              </span>
                              <span className="text-sm font-normal text-gray-700">{cat.name}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedCategory === cat.name ? "opacity-100 text-brand-dark" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden md:block w-56">
              <TownSelector 
                onSelect={(town) => {
                  setSelectedTown(town);
                  setSelectedDistrict(town.district);
                  setSearchType('location');
                  setCurrentLat(town.lat.toString());
                  setCurrentLng(town.lon.toString());
                  setMapCenter({ lat: town.lat, lng: town.lon });
                  setMapZoom(14);
                  setIsMapManual(false);
                }} 
                selectedTownName={selectedTown?.name || selectedDistrict || undefined}
                placeholder="Select Town or District"
                className="h-10 border-gray-300 text-gray-600 rounded-[6px] shadow-sm"
                iconClassName="text-brand-dark"
              />
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-[6px] transition-colors h-10 w-10 flex items-center justify-center border border-gray-300"
            >
              {mobileMenuOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Quick Actions Sidebar (Hover to Open) */}
          <div className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 group">
            {/* Narrow Bar (Always Visible) */}
            <div className="w-12 bg-white border-r border-gray-300 flex flex-col items-center py-4 gap-6 h-full shadow-sm">
              <div className="p-2 rounded-[6px] bg-blue-50 text-brand-dark">
                <Menu size={20} />
              </div>
              <div className="flex flex-col gap-6 mt-4">
                <div className="p-2 text-gray-400 group-hover:text-brand-blue transition-colors">
                  <Clock size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-brand-blue transition-colors">
                  <Navigation size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-brand-blue transition-colors">
                  <Star size={20} />
                </div>
                <div className="p-2 text-gray-400 group-hover:text-brand-blue transition-colors">
                  <Zap size={20} />
                </div>
              </div>
            </div>

            {/* Expanded Sidebar content on hover */}
            <div className="w-0 group-hover:w-64 overflow-hidden transition-all duration-300 bg-white border-r border-gray-300 shadow-xl flex flex-col h-full">
              <div className="p-6 w-64">
                <h2 className="text-lg font-normal text-gray-900 mb-6">Quick Actions</h2>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setSearchQuery("Open Now");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-blue-50 text-gray-700 hover:text-brand-dark transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-[6px] bg-gray-100 group-hover/item:bg-blue-100 transition-colors">
                      <Clock size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Open Now</p>
                      <p className="text-xs text-gray-500 font-normal">Businesses open right now</p>
                    </div>
                  </button>

                  <button 
                    onClick={findMyLocation}
                    className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-blue-50 text-gray-700 hover:text-brand-dark transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-[6px] bg-gray-100 group-hover/item:bg-blue-100 transition-colors">
                      <Navigation size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Nearby Me</p>
                      <p className="text-xs text-gray-500 font-normal">Closest verified businesses</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setSearchQuery("Top Rated");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-blue-50 text-gray-700 hover:text-brand-dark transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-[6px] bg-gray-100 group-hover/item:bg-blue-100 transition-colors">
                      <Star size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Top Rated</p>
                      <p className="text-xs text-gray-500 font-normal">Highly reviewed locations</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setSearchQuery("Verified");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-[6px] hover:bg-blue-50 text-gray-700 hover:text-brand-dark transition-all text-left group/item font-normal"
                  >
                    <div className="p-2 rounded-[6px] bg-gray-100 group-hover/item:bg-blue-100 transition-colors">
                      <Zap size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-normal">Verified Only</p>
                      <p className="text-xs text-gray-500 font-normal">Verified by our team</p>
                    </div>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-300 font-normal">
                  <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-4 px-3 font-normal">Recent Searches</h3>
                  <div className="space-y-1">
                    {['Hotels', 'Clinics', 'Restaurants'].map(item => (
                      <button 
                        key={item}
                        onClick={() => {
                          setSearchQuery(item);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-brand-dark hover:bg-blue-50 rounded-[6px] transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Left Side: Business List */}
          <div
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } md:block w-full md:w-96 lg:w-[450px] overflow-y-auto bg-gray-50 border-r border-gray-300 ml-0 md:ml-12 transition-all font-normal h-full`}
          >
            <div className="p-4 sticky top-0 bg-gray-50 border-b border-gray-300 z-10">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-normal">
                {results.length} Registered Business{results.length !== 1 ? 'es' : ''}
              </p>
            </div>

            {loading ? (
              <div className="space-y-4 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 border border-gray-200 rounded-[6px]">
                    <Skeleton className="w-20 h-20 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 font-normal">
                <div className="bg-red-50 border border-red-200 rounded-[6px] p-4">
                  <p className="text-red-800 text-sm">{error instanceof Error ? error.message : String(error)}</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 font-normal">
                <div className="bg-blue-50 border border-gray-300 rounded-[6px] p-4 text-center">
                  <p className="text-blue-900 text-sm font-normal">No businesses found</p>
                  <p className="text-blue-700 text-xs mt-1 font-normal">Try expanding the search radius</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4 font-normal">
                {results.map((business: Business) => (
                  <div
                    key={business.id}
                    onClick={() => {
                      setSelectedBusiness(business);
                      setMobileMenuOpen(false);
                      setIsMapManual(false);
                      setMapCenter({ lat: business.latitude, lng: business.longitude });
                      setMapZoom(16);
                    }}
                    className={`p-4 rounded-[6px] border transition-all cursor-pointer ${
                      selectedBusiness?.id === business.id
                        ? 'bg-blue-50 border-brand-blue shadow-md'
                        : 'bg-white border-gray-300 hover:border-brand-blue'
                    }`}
                  >
                    <div className="flex gap-3">
                      {(business.logo_url || business.image_url) && (
                        <div className="w-20 h-20 rounded-[6px] bg-gray-200 flex-shrink-0 overflow-hidden">
                          <img
                            src={business.logo_url || business.image_url}
                            alt={business.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-normal text-gray-900 truncate flex items-center gap-1 group-hover:text-brand-blue transition-colors">
                            {business.name}
                            {(business.is_verified || business.verification_status === 'verified') && business.can_show_badge && <VerifiedBadge size={10} />}
                          </h3>
                          {(business.rating || 0) > 0 && (
                            <div className="flex items-center gap-1 bg-brand-sand/20 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                              <Star size={12} strokeWidth={1.5} className="text-brand-gold fill-brand-gold" />
                              <span className="font-normal text-brand-text">{business.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-brand-blue font-normal uppercase tracking-wide mt-1">
                          {business.category}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center font-normal">
                          <MapPin size={12} strokeWidth={1.5} className="mr-1 flex-shrink-0 text-brand-gold" />
                          {business.address}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-[10px] font-normal">
                            <Navigation size={10} strokeWidth={1.5} className="text-brand-dark" />
                            <span className="text-gray-700">
                              {business.distanceText || 'Calculating...'}
                            </span>
                          </div>
                          <Link 
                            href={`/business/${business.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold text-brand-dark hover:text-brand-blue flex items-center gap-1 border-b border-brand-dark/20 pb-0.5"
                          >
                            View Profile <LucideIcons.ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Map */}
          <div className="hidden md:flex flex-1 relative bg-gray-100 font-normal">
              <LeafletMap 
                centerLat={mapCenter.lat}
                centerLng={mapCenter.lng}
                userLat={currentLat ? parseFloat(currentLat) : undefined}
                userLng={currentLng ? parseFloat(currentLng) : undefined}
                businesses={results}
                zoom={mapZoom}
                height="100%"
                radius={selectedRadius}
                enableClustering={results.length > 20}
                onMarkerClick={(business) => {
                  setSelectedBusiness(business);
                }}
                onMapMove={() => {
                  setIsMapManual(true);
                }}
              />

              {/* Search this area button (only shows when map is clicked/moved manually) */}
              {isMapManual && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
                  <button 
                    onClick={() => {
                      // Logic handled by useMemo
                      setIsMapManual(false);
                    }}
                    className="bg-brand-dark text-white px-6 py-2.5 rounded-full shadow-2xl hover:bg-brand-blue transition-all font-normal flex items-center gap-2 border-2 border-white animate-in zoom-in-95"
                  >
                    <Search size={18} strokeWidth={1.5} />
                    Search this area
                  </button>
                </div>
              )}

              {/* Map Status Indicator */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-300 flex items-center gap-2 text-xs text-gray-700 z-[1000] font-normal">
                <div className="w-2 h-2 bg-brand-dark rounded-full animate-pulse"></div>
                Showing {results.length} business{results.length !== 1 ? 'es' : ''} {searchType === 'location' ? `within ${(selectedRadius / 1000).toFixed(0)}km` : `in ${selectedDistrict || district}`}
              </div>
          </div>

          {/* Right Side Bar: Category Chips (Hover to Open) */}
          <div className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 flex-row-reverse group">
             {/* Narrow Bar (Always Visible) */}
             <div className="w-12 bg-white border-l border-gray-300 flex flex-col items-center py-4 gap-6 h-full shadow-sm">
                <div className="p-2 rounded-[6px] bg-blue-50 text-brand-dark">
                  <Tags size={20} />
                </div>
                <div className="flex flex-col gap-6 mt-4">
                  {activeSubgroups.slice(0, 4).map((_, i) => (
                    <div key={i} className="p-2 text-gray-400 group-hover:text-brand-blue transition-colors">
                      <Zap size={20} />
                    </div>
                  ))}
                </div>
             </div>

             {/* Expanded Sidebar content on hover */}
             <div className="w-0 group-hover:w-80 overflow-hidden transition-all duration-300 bg-white border-l border-gray-300 shadow-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="p-6 w-80">
                   <h2 className="text-lg font-normal text-gray-900 mb-6 flex items-center gap-2">
                     <Tags size={20} className="text-brand-dark" />
                     Quick Filters
                   </h2>
                   {activeSubgroups.length > 0 ? (
                      <div className="space-y-6">
                        {(searchQuery.toLowerCase().includes('agri') || (selectedCategory && (selectedCategory.includes('Agri') || selectedCategory.includes('Agriculture Products')))) && (
                          <div className="mb-4">
                             <Link 
                               href="/agriculture" 
                               className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-medium hover:bg-brand-blue transition-all shadow-sm"
                             >
                               <Tags size={16} />
                               View All Agriculture Products
                             </Link>
                          </div>
                        )}
                        {activeSubgroups.map((group, idx) => (
                          <div key={idx} className="animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                            <h3 className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-3 font-medium">{group.group}</h3>
                            <div className="flex flex-wrap gap-2">
                              {group.items.map(item => (
                                <button
                                  key={item}
                                  onClick={() => {
                                    setSearchQuery(item);
                                    handleSearch();
                                  }}
                                  className="px-3 py-1.5 bg-gray-50 hover:bg-brand-blue/10 text-gray-600 hover:text-brand-dark rounded-full text-xs transition-all border border-gray-200 hover:border-brand-blue/30 text-left font-normal"
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                   ) : (
                      <div className="text-center py-10 opacity-60">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-300">
                          <Search size={24} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-normal">Search for a category like <br/> <span className="text-brand-dark font-medium cursor-pointer hover:underline" onClick={() => setSearchQuery('Health')}>"Health"</span> to see filters</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
    </div>
  );
}

export default function NearbyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <SplitScreenResultsContent />
    </Suspense>
  );
}
