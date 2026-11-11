'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  Store, 
  QrCode, 
  Info, 
  ChevronRight, 
  CheckCircle2,
  Building2,
  Share2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Business } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendorQRCodePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [assignedQR, setAssignedQR] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingQR, setRequestingQR] = useState(false);
  const [checkingQR, setCheckingQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (!selectedBusiness?.id) { setAssignedQR(null); return; }
    let active = true;
    setAssignedQR(null);
    setCheckingQR(true);
    const loadQR = async () => {
      try {
        const { data, error } = await supabase.from('qr_inventory')
          .select('*').eq('business_id', selectedBusiness.id).maybeSingle();
        if (error) throw error;
        if (active) setAssignedQR(data);
      } catch {
        if (active) toast.error('Unable to load this business QR code.');
      } finally {
        if (active) setCheckingQR(false);
      }
    };
    void loadQR();
    return () => { active = false; };
  }, [selectedBusiness?.id]);

  const fetchBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
      if (data && data.length > 0) {
        setSelectedBusiness(data[0]);
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQR = async () => {
    if (!selectedBusiness) return;
    
    setRequestingQR(true);
    try {
      const response = await fetch('/api/qr/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: selectedBusiness?.id }),
      });

      const data = await response.json();
      if (data.success) {
        setAssignedQR(data.qr);
        toast.success('Professional QR Code generated successfully!');
      } else {
        toast.error(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      console.error('Error requesting QR:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setRequestingQR(false);
    }
  };

  const handleDownload = () => {
    if (!selectedBusiness) return;
    
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      toast.error('Could not find QR code to download');
      return;
    }

    try {
      // Create a temporary canvas to add some padding and branding
      const padding = 60;
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      finalCanvas.width = canvas.width + (padding * 2);
      finalCanvas.height = canvas.height + (padding * 2) + 100;

      // Background with subtle border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      
      // Top accent bar (brand-dark)
      ctx.fillStyle = '#053765';
      ctx.fillRect(0, 0, finalCanvas.width, 15);

      // Draw QR Code
      ctx.drawImage(canvas, padding, padding + 20);

      // Add Business Name
      ctx.fillStyle = '#053765';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      const displayName = (selectedBusiness?.name || '').length > 25 
        ? selectedBusiness?.name.substring(0, 22) + '...' 
        : selectedBusiness?.name;
      ctx.fillText(displayName, finalCanvas.width / 2, finalCanvas.height - 70);
      
      // Add Platform Name
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#dfb85d'; // brand-sand
      ctx.fillText('SRI LANKA BUSINESS INDEX', finalCanvas.width / 2, finalCanvas.height - 40);

      // Add Instructions
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Scan to view photos, reviews & details', finalCanvas.width / 2, finalCanvas.height - 20);

      const url = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR-${(selectedBusiness?.name || 'Business').replace(/[^a-z0-9]/gi, '-')}.png`;
      link.href = url;
      link.click();
      
      toast.success('Professional QR Code ready!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate download');
    }
  };

  const handlePrint = () => {
    if (!selectedBusiness) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1460px] space-y-5">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="vendor-premium-panel flex min-h-[60dvh] flex-col items-center justify-center border-dashed p-10 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Businesses Found</h2>
        <p className="text-gray-500 max-w-md mb-8">
          You need to register at least one business to generate a QR code.
        </p>
        <a 
          href="/register-business"
          className="vendor-primary-button"
        >
          Register Business
        </a>
      </div>
    );
  }

  const businessUrl = typeof window !== 'undefined' 
    ? assignedQR 
      ? `${window.location.origin}/q/${assignedQR.serial_id}`
      : `${window.location.origin}/business/${selectedBusiness?.slug || selectedBusiness?.id || ''}`
    : '';

  return (
    <div className="mx-auto max-w-[1460px] space-y-5 pb-5">
      <div className="vendor-premium-header flex flex-col gap-5 px-6 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#BBDDAD]">Digital storefront / QR studio</p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-.045em] text-white sm:text-[35px]">Turn every visit into a connection.</h1>
          <p className="mt-2 text-[12px] leading-6 text-[#D5E8D8]">A branded, scannable route to your directory profile. Select a business, generate a QR code, then print or share it.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-[#CFE8D1]">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Business-linked QR</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Print-ready</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Shareable link</span>
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          {assignedQR ? (
            <>
              <button 
                onClick={handlePrint}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-[12px] font-bold text-white transition hover:bg-white/20"
              >
                <Printer size={18} /> Print
              </button>
              <button 
                onClick={handleDownload}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-[#F1FAEF] px-4 text-[12px] font-bold text-[#225A3A] transition hover:bg-white"
              >
                <Download size={18} /> Download PNG
              </button>
            </>
          ) : (
            <button 
              onClick={handleRequestQR}
              disabled={requestingQR}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-[#F1FAEF] px-4 text-[12px] font-bold text-[#225A3A] transition hover:bg-white disabled:opacity-50"
            >
              {requestingQR ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
              Request Professional QR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left Column: Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="vendor-premium-panel overflow-hidden">
            <div className="border-b border-[#E6EEE5] bg-[#FAFCF9] p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Store size={16} className="text-brand-blue" />
                Select Business
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => setSelectedBusiness(biz)}
                  className={`w-full p-4 flex items-center gap-4 transition-all text-left hover:bg-gray-50 ${
                    selectedBusiness?.id === biz.id ? 'bg-blue-50/50 ring-1 ring-inset ring-brand-blue/20' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Building2 size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${selectedBusiness?.id === biz.id ? 'text-brand-blue' : 'text-gray-900'}`}>
                      {biz.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{biz.category}</p>
                  </div>
                  {selectedBusiness?.id === biz.id && (
                    <CheckCircle2 size={18} className="text-brand-blue" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="vendor-muted-callout">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0">
                <Info size={16} className="text-brand-blue" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-brand-blue">QR Code Tips</h3>
                <ul className="text-xs text-gray-600 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-brand-blue shrink-0" />
                    Place printed QR codes at eye level on your shop windows or checkout.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-brand-blue shrink-0" />
                    Include the QR code on your business cards and marketing flyers.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-brand-blue shrink-0" />
                    Customers can instantly view your reviews, photos, and contact info.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Preview */}
        <div className="lg:col-span-8">
          {checkingQR && <p role="status" className="mb-3 rounded-xl border border-[#DCE8D9] bg-white px-4 py-3 text-xs font-semibold text-[#4F785D]"><Loader2 size={14} className="mr-2 inline animate-spin"/>Checking QR assignment…</p>}
          <div className="vendor-premium-panel flex min-h-[600px] flex-col overflow-hidden">
            {assignedQR ? (
              <>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-[13px] font-extrabold text-[#2C4B36]">Print & share preview</h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Assigned QR
                  </div>
                </div>
                
                <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                  {/* This is the printable area */}
                  <div 
                    id="printable-qr"
                    ref={qrRef}
                    className="bg-white p-12 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center text-center max-w-sm w-full transition-transform hover:scale-[1.02] duration-500"
                  >
                    <div className="mb-8 w-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <QrCode className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1 px-4">{selectedBusiness?.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Official Directory Listing</p>
                    </div>

                    <div className="relative group p-4 bg-white rounded-2xl border-4 border-gray-50">
                      <QRCodeCanvas
                        value={businessUrl}
                        size={240}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/slbi-mark.svg",
                          x: undefined,
                          y: undefined,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                    </div>

                    <div className="mt-10 space-y-2">
                      <p className="text-sm font-bold text-brand-dark">Scan to Explore</p>
                      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 rounded-full border border-gray-100">
                        <span className="text-[10px] font-medium text-gray-400 font-mono tracking-tighter">
                          slbusinessindex.com/q/{assignedQR.serial_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col items-center text-center no-print">
                      <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">Serial ID</span>
                      <span className="text-2xl font-mono font-black text-brand-dark tracking-tighter">{assignedQR.serial_id}</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-12 flex flex-wrap justify-center gap-4 no-print">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(businessUrl);
                        toast.success('Link copied to clipboard');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold hover:border-brand-blue hover:text-brand-blue transition-all"
                    >
                      <Share2 size={14} /> Copy Link
                    </button>
                    <a 
                      href={businessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold hover:border-brand-blue hover:text-brand-blue transition-all"
                    >
                      <ExternalLink size={14} /> View Live
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-blue/10 rounded-full animate-pulse scale-150"></div>
                  <div className="relative w-24 h-24 bg-brand-blue/10 rounded-full flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-brand-blue" />
                  </div>
                </div>
                
                <div className="max-w-md space-y-4">
                  <h2 className="text-[23px] font-extrabold tracking-tight text-[#254832]">Your QR studio is ready</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Generate a serial-numbered QR code for this listing. You can print it for your counter, flyers or business cards. Scan counts are available only when tracking is configured.
                  </p>
                </div>

                <button 
                  onClick={handleRequestQR}
                  disabled={requestingQR}
                  className="flex items-center gap-3 px-8 py-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-blue transition-all shadow-xl shadow-brand-dark/10 disabled:opacity-50 group"
                >
                  {requestingQR ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} className="group-hover:rotate-12 transition-transform" />}
                  Generate Professional QR Code
                </button>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Benefit 1</p>
                    <p className="text-xs font-bold text-gray-700">Direct listing access</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Benefit 2</p>
                    <p className="text-xs font-bold text-gray-700">Download and print</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {label:'Public listing',text:'Check your public customer experience',href:selectedBusiness ? '/business/'+(selectedBusiness.slug||selectedBusiness.id) : '/vendor/my-businesses'},
          {label:'Growth insights',text:'Review recorded views and enquiries',href:'/vendor/insights'},
          {label:'Marketing studio',text:'Share the QR alongside a campaign',href:'/vendor/marketing'},
        ].map(item => <Link key={item.label} href={item.href} className="vendor-premium-card flex items-center justify-between gap-3 p-4 text-left hover:bg-[#F5FAF3]">
          <span><span className="block text-[12px] font-bold text-[#2B5138]">{item.label}</span><span className="mt-1 block text-[11px] text-[#839687]">{item.text}</span></span><ChevronRight size={17} className="shrink-0 text-[#659373]"/>
        </Link>)}
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr, #printable-qr * {
            visibility: visible;
          }
          #printable-qr {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.5);
            border: none !important;
            shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
