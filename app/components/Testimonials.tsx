"use client";

import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Star, CheckCircle, Quote } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

interface TestimonialItem {
  id: number | string;
  type: "testimonial" | "image";
  name?: string;
  role?: string;
  image_url: string;
  quote?: string;
  rating?: number;
  is_verified?: boolean;
}

const bentoClasses = [
  "md:col-span-2 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("display_order", { ascending: true });
    
    if (error) {
      console.error("Error fetching testimonials:", error);
    } else if (data && data.length > 0) {
      setTestimonials(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTestimonials();

    // Set up real-time subscription
    const channel = supabase
      .channel("testimonials_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonials" },
        () => {
          fetchTestimonials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
      </div>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-transparent relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl opacity-40 animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block p-3 rounded bg-brand-blue/5 mb-6"
          >
            <Quote className="w-8 h-8 text-brand-blue" />
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-4xl text-brand-dark mb-6 tracking-tight"
          >
            Voices of <span className="text-brand-gold">Success</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed"
          >
            Discover how local businesses are growing and thriving with SL Business Index.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[240px] grid-flow-dense relative z-10"
        >
          {testimonials.map((item, idx) => (
            <motion.div
              key={item.id}
              variants={cardVariants}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className={cn(
                "relative rounded overflow-hidden group transition-all duration-300 h-full",
                bentoClasses[idx] || "md:col-span-1 md:row-span-1",
                item.type === 'testimonial' ? "p-6 md:p-8 border border-gray-300 bg-white/70 backdrop-blur-xl shadow-sm flex flex-col" : ""
              )}
            >
              {item.type === 'testimonial' ? (
                <>
                  <div className="flex gap-1 mb-4">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />
                    ))}
                  </div>

                  <blockquote className={cn(
                    "text-brand-dark leading-relaxed mb-6 flex-grow",
                    idx === 0 ? "text-2xl" : "text-lg"
                  )}>
                    "{item.quote}"
                  </blockquote>

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100 mt-auto">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                      <Image
                        src={item.image_url}
                        alt={item.name || ""}
                        fill
                        className="object-cover"
                        unoptimized={item.image_url.includes('dicebear')}
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-brand-dark text-sm">{item.name}</span>
                        {item.is_verified && (
                          <CheckCircle className="w-3 h-3 text-brand-blue" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{item.role}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={item.image_url}
                    alt="Success Story"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-20 flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 duration-500"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl text-brand-dark">5000+</span>
            <span className="text-xs text-brand-gold uppercase tracking-[0.2em] font-semibold">Businesses</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl text-brand-dark">25+</span>
            <span className="text-xs text-brand-gold uppercase tracking-[0.2em] font-semibold">Districts</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl text-brand-dark">100%</span>
            <span className="text-xs text-brand-gold uppercase tracking-[0.2em] font-semibold">Authentic</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
