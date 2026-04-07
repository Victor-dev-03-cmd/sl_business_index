"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, HelpCircle, MessageCircle, ShieldCheck, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How do I search for a specific business on SLBI?",
    answer: "You can use the search bar on the homepage. Simply type the business name, category, or service you are looking for. You can also filter by district or city for more localized results.",
    category: "search",
    icon: Search
  },
  {
    question: "How can I register my business on the platform?",
    answer: "Click on the 'Register Business' button in the navigation menu. Fill in your business details including name, category, contact information, and location. Once submitted, our team will review your application for approval.",
    category: "registration",
    icon: PlusCircle
  },
  {
    question: "What is the 'WhatsApp Enquiry' feature and how does it work?",
    answer: "The WhatsApp Enquiry feature allows customers to message business owners directly from their listing. Clicking the WhatsApp button will open a pre-filled message in WhatsApp, making communication fast and efficient.",
    category: "features",
    icon: MessageCircle
  },
  {
    question: "How does the business verification process work?",
    answer: "After registering your business, you can apply for a 'Verified' badge by uploading your Business Registration (BR) or relevant identification documents in the vendor settings. Our team verifies these to ensure authenticity.",
    category: "verification",
    icon: ShieldCheck
  },
  {
    question: "Is it free to list my business on SL Business Index?",
    answer: "Yes, we offer a free basic listing plan that allows you to showcase your business. We also have premium plans for enhanced visibility and advanced features.",
    category: "pricing",
    icon: HelpCircle
  },
  {
    question: "How can I update my business information?",
    answer: "Log in to your vendor dashboard, select 'My Businesses,' and click the edit button on the business you wish to update. Changes will be reflected once saved.",
    category: "management",
    icon: HelpCircle
  },
  {
    question: "What are the benefits of having a verified badge?",
    answer: "A verified badge builds trust with potential customers, improves your search ranking on our platform, and confirms that your business is legitimate and authentic.",
    category: "verification",
    icon: ShieldCheck
  },
  {
    question: "Can I add multiple businesses under one account?",
    answer: "Yes, you can manage multiple business listings from a single vendor account. Simply click 'Register Business' again to add another location or different business.",
    category: "management",
    icon: PlusCircle
  },
  {
    question: "What should I do if my business location is incorrect on the map?",
    answer: "You can adjust your location by editing your business listing. Use the map picker to pinpoint your exact coordinates or type your address for automatic geolocation.",
    category: "management",
    icon: HelpCircle
  },
  {
    question: "How do I contact SLBI support?",
    answer: "You can reach us through our contact page or by emailing support@slbusinessindex.com for any technical assistance or enquiries.",
    category: "support",
    icon: HelpCircle
  }
];

const FAQItem = ({ faq, isOpen, toggleOpen }: { faq: typeof faqs[0], isOpen: boolean, toggleOpen: () => void }) => {
  const Icon = faq.icon;
  return (
    <div className="border border-gray-300 rounded-[6px] bg-white overflow-hidden mb-3 transition-shadow hover:shadow-sm">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none group"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2 rounded-[6px] transition-colors",
            isOpen ? "bg-brand-blue/10 text-brand-blue" : "bg-gray-50 text-gray-400 group-hover:text-brand-blue"
          )}>
            <Icon size={20} />
          </div>
          <span className={cn(
            " text-gray-900 transition-colors",
            isOpen ? "text-brand-blue" : "group-hover:text-brand-blue"
          )}>
            {faq.question}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="text-gray-400"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-5 pb-6 pt-0 ml-14">
              <p className="text-gray-600 leading-relaxed text-[15px]">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(search.toLowerCase()) || 
      faq.answer.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Schema.org FAQPage JSON-LD
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50/50 py-20 px-4">
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl text-brand-dark mb-4"
          >
            How can we <span className="text-brand-gold">help you?</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg mb-8"
          >
            Find answers to common questions about SL Business Index.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group max-w-xl mx-auto"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-blue transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search for questions..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </motion.div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  layout
                >
                  <FAQItem
                    faq={faq}
                    isOpen={openIndex === index}
                    toggleOpen={() => setOpenIndex(openIndex === index ? null : index)}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="bg-white rounded border border-gray-200 p-8 shadow-sm">
                  <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">
                    We couldn't find any answers matching "{search}". Please try a different search term.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center bg-brand-dark rounded p-8 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-xl mb-2">Still have questions?</h2>
            <p className="text-blue-100 mb-6">Our team is here to help you get the most out of SLBI.</p>
            <a 
              href="/contact"
              className="inline-block px-8 py-3 bg-brand-gold text-white rounded hover:bg-brand-gold-light transition-all shadow-lg"
            >
              Contact Support
            </a>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-blue/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-gold/10 rounded-full blur-3xl" />
        </motion.div>
      </div>
    </div>
  );
}
