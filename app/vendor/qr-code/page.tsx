'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      checkAssignedQR(selectedBusiness.id);
    }
  }, [selectedBusiness]);

  const checkAssignedQR = async (businessId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('qr_inventory')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (!error) {
        setAssignedQR(data);
      }
    } catch (err) {
      console.error('Error checking assigned QR:', err);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
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
        body: JSON.stringify({ business_id: selectedBusiness.id }),
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
      const displayName = selectedBusiness.name.length > 25 
        ? selectedBusiness.name.substring(0, 22) + '...' 
        : selectedBusiness.name;
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
      link.download = `QR-${selectedBusiness.name.replace(/[^a-z0-9]/gi, '-')}.png`;
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
      <div className="space-y-8 animate-in fade-in duration-500">
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Businesses Found</h2>
        <p className="text-gray-500 max-w-md mb-8">
          You need to register at least one business to generate a QR code.
        </p>
        <a 
          href="/register-business"
          className="px-8 py-3 bg-brand-dark text-white rounded-lg font-bold hover:bg-brand-blue transition-all"
        >
          Register Business
        </a>
      </div>
    );
  }

  const businessUrl = typeof window !== 'undefined' 
    ? assignedQR 
      ? `${window.location.origin}/q/${assignedQR.serial_id}`
      : `${window.location.origin}/business/${selectedBusiness?.slug || selectedBusiness?.id}`
    : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 tracking-tight">Business QR Code</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            Generate and download professional QR codes for your storefront.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {assignedQR ? (
            <>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-[6px] text-sm font-bold hover:bg-gray-50 transition-all"
              >
                <Printer size={18} /> Print
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-[6px] text-sm font-bold hover:bg-brand-blue transition-all shadow-lg shadow-brand-dark/10"
              >
                <Download size={18} /> Download PNG
              </button>
            </>
          ) : (
            <button 
              onClick={handleRequestQR}
              disabled={requestingQR}
              className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-[6px] text-sm font-bold hover:bg-brand-blue transition-all shadow-lg shadow-brand-dark/10 disabled:opacity-50"
            >
              {requestingQR ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
              Request Professional QR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
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

          <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full overflow-hidden flex flex-col min-h-[600px]">
            {assignedQR ? (
              <>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Professional Preview</h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Professional Index
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
                          src: "/logo.png",
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
                  <h2 className="text-2xl font-normal text-gray-900 tracking-tight">No Professional QR Assigned</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Link your business to our professional indexing system to generate a serial-numbered QR code. This allows for better tracking and a more professional storefront presence.
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
                    <p className="text-xs font-bold text-gray-700">Trackable Scans</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Benefit 2</p>
                    <p className="text-xs font-bold text-gray-700">Serial Indexing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
