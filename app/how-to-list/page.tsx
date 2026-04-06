'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { CheckCircle2, Map, Search, Sliders, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const steps = [
  {
    id: '01',
    title: 'Get Started',
    text: "Start by clicking the 'Sign In' button on the top right of the navigation bar.",
    image: '/list/nav.png',
    priority: true
  },
  {
    id: '02',
    title: 'Create Your Account',
    text: 'If you are new, fill in your Username, Email, and Password to create a secure account.',
    image: '/list/register.png',
    priority: true
  },
  {
    id: '03',
    title: 'Check Your Email',
    text: 'We will send an 8-digit OTP to your inbox. Copy the code exactly as shown.',
    image: '/list/email-otp.png'
  },
  {
    id: '04',
    title: 'Verify Identity',
    text: 'Paste the 8-digit code into the verification box to activate your account.',
    image: '/list/paste-otp.png'
  },
  {
    id: '05',
    title: 'Access the Platform',
    text: 'Once verified, you will be redirected to the Home Page.',
    image: '/list/home.png'
  },
  {
    id: '06',
    title: 'Register Your Business (Part 1)',
    text: 'Enter your Business Name, Category, Logo, and a short Description.',
    image: '/list/register-business.png'
  },
  {
    id: '07',
    title: 'Location & Legal (Part 2)',
    text: 'Provide your contact details, pin your location on the map, and enter your BR (Business Registration) number.',
    image: '/list/register-2.png'
  },
  {
    id: '08',
    title: 'Open Vendor Portal',
    text: "After admin approve to Click on your profile icon and select 'Vendor Dashboard' to manage your listings.",
    image: '/list/profile.png'
  },
  {
    id: '09',
    title: 'Monitor Performance',
    text: 'Use your Dashboard to track profile views, calls, and leads in real-time.',
    image: '/list/dashboard.png'
  }
]

export default function HowToListPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl text-brand-dark sm:text-5xl">
            How to List Your Business
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Follow this simple guide to get your business on SL Business Index.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line for the timeline */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 hidden md:block" />

          <div className="space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`relative flex flex-col md:flex-row items-center gap-8 ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Step Marker */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white z-10 shadow-lg border-4 border-white hidden md:flex">
                  <CheckCircle2 size={20} />
                </div>

                {/* Content Container */}
                <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 mb-4">
                    Step {step.id}
                  </span>
                  <h2 className="text-2xl text-slate-900 mb-4">{step.title}</h2>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    {step.text}
                  </p>
                </div>

                {/* Image Container */}
                <div className="w-full md:w-1/2">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-2 border border-slate-200">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={800}
                      height={500}
                      className="rounded-xl w-full h-auto object-cover"
                      priority={step.priority}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  )
}
