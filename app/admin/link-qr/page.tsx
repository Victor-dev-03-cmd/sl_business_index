"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Link as LinkIcon, Search, Building2, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Business } from "@/lib/types";
import { QRInventory } from "@/lib/qr-types";

export default function LinkQRPage() {
  const [serialId, setSerialId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrInfo, setQrInfo] = useState<{ status: string; business_name?: string } | null>(null);

  const searchBusinesses = useCallback(async () => {
    setIsSearching(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, category, address")
      .ilike("name", `%${searchTerm}%`)
      .limit(5);

    if (!error && data) {
      setBusinesses(data as Business[]);
    }
    setIsSearching(false);
  }, [searchTerm]);

  const checkQrStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("qr_inventory")
      .select("status, businesses(name)")
      .eq("serial_id", serialId)
      .single();

    if (!error && data) {
      const qrData = data as unknown as QRInventory;
      setQrInfo({
        status: qrData.status,
        business_name: qrData.businesses.name
      });
    } else {
      setQrInfo(null);
    }
  }, [serialId]);

  const generateNewQr = async () => {
    setIsGenerating(true);
    
    // 1. Fetch last serial ID
    const { data: lastData } = await supabase
      .from("qr_inventory")
      .select("serial_id")
      .order("serial_id", { ascending: false })
      .limit(1);

    let nextNum = 1001;
    if (lastData && lastData.length > 0) {
      const lastId = lastData[0].serial_id;
      const num = parseInt(lastId.replace("SLB-", ""));
      if (!isNaN(num)) nextNum = num + 1;
    }

    const nextSerialId = `SLB-${nextNum}`;

    // 2. Insert into qr_inventory
    const { error: insertError } = await supabase
      .from("qr_inventory")
      .insert({
        serial_id: nextSerialId,
        short_link: `/q/${nextSerialId}`,
        batch_name: "Instant Link",
        status: "unassigned"
      });

    if (insertError) {
      toast.error("Failed to generate: " + insertError.message);
    } else {
      setSerialId(nextSerialId);
      toast.success(`Generated new ID: ${nextSerialId}`);
    }
    
    setIsGenerating(false);
  };

  // Search businesses as user types
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchBusinesses();
      } else {
        setBusinesses([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchBusinesses]);

  // Check QR status when serial ID changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (serialId.startsWith("SLB-")) {
        checkQrStatus();
      } else {
        setQrInfo(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [serialId, checkQrStatus]);

  const handleLink = async () => {
    if (!selectedBusiness) {
      toast.error("Please select a business");
      return;
    }
    if (!serialId) {
      toast.error("Please enter a Serial ID");
      return;
    }

    setIsLinking(true);

    // 1. Verify QR exists
    const { data: qr, error: qrError } = await supabase
      .from("qr_inventory")
      .select("id, status")
      .eq("serial_id", serialId)
      .single();

    if (qrError || !qr) {
      toast.error("Invalid Serial ID. Please check the printed poster.");
      setIsLinking(false);
      return;
    }

    // 2. Update QR record
    const { error: updateError } = await supabase
      .from("qr_inventory")
      .update({
        business_id: selectedBusiness.id,
        status: "assigned",
        updated_at: new Date().toISOString()
      })
      .eq("serial_id", serialId);

    if (updateError) {
      toast.error("Failed to link QR: " + updateError.message);
    } else {
      toast.success(`Successfully linked ${serialId} to ${selectedBusiness.name}`);
      setSerialId("");
      setSearchTerm("");
      setSelectedBusiness(null);
      setQrInfo(null);
    }
    setIsLinking(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl tracking-tight text-brand-dark">Link QR Poster</h1>
        <p className="text-gray-500 mt-1">Connect a printed QR poster to a registered business.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white border border-gray-300 rounded-[6px] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl text-gray-800">Step 1: Enter Serial ID</h2>
                <p className="text-sm text-gray-500">Enter or generate a new poster ID.</p>
              </div>
              <button
                onClick={generateNewQr}
                disabled={isGenerating}
                className="text-xs font-medium text-brand-dark bg-brand-dark/5 px-3 py-1.5 rounded-[6px] hover:bg-brand-dark/10 transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <QrCode className="h-3 w-3" />
                )}
                Generate New
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="serial-id" className="text-sm font-medium text-brand-blue">Serial ID</label>
                <div className="relative">
                  <input
                    id="serial-id"
                    placeholder="e.g. SLB-1001"
                    className="w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-dark transition-all"
                    value={serialId}
                    onChange={(e) => setSerialId(e.target.value.toUpperCase())}
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {qrInfo && (
                <div className={`p-4 rounded-[6px] flex items-start space-x-3 ${
                  qrInfo.status === 'unassigned' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {qrInfo.status === 'unassigned' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Available</p>
                        <p className="text-sm">This QR is currently unassigned and ready to be linked.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Already Assigned</p>
                        <p className="text-sm text-amber-600">Currently linked to: <strong>{qrInfo.business_name}</strong>. Linking will re-assign it.</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-[6px] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl text-gray-900">Step 2: Select Business</h2>
              <p className="text-sm text-gray-500">Search for the business you want to link.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="search-business" className="text-sm font-medium text-brand-blue">Search Business</label>
                <div className="relative">
                  <input
                    id="search-business"
                    placeholder="Type business name..."
                    className="w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-dark transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                </div>
              </div>

              {businesses.length > 0 && !selectedBusiness && (
                <div className="border border-gray-100 rounded-[6px] overflow-hidden shadow-sm divide-y divide-gray-50 bg-white">
                  {businesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBusiness(b);
                        setSearchTerm(b.name);
                        setBusinesses([]);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-[6px] bg-brand-dark/5 flex items-center justify-center text-brand-dark shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 truncate">{b.name}</p>
                        <p className="text-xs text-gray-500 truncate">{b.category} • {b.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedBusiness && (
                <div className="p-4 bg-brand-dark/5 rounded-[6px] border border-brand-dark/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-[6px] bg-brand-dark flex items-center justify-center text-white shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedBusiness.name}</p>
                      <p className="text-xs text-gray-500">{selectedBusiness.category}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedBusiness(null)}
                    className="text-xs font-bold text-gray-400 hover:text-red-500 transition-all uppercase tracking-wider"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleLink}
            disabled={isLinking || !selectedBusiness || !serialId}
            className="w-full flex items-center justify-center gap-2 bg-brand-dark text-white px-4 py-3 rounded-[6px] text-base font-bold hover:bg-brand-dark/90 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isLinking ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="h-5 w-5" />
                Link QR to Business
              </>
            )}
          </button>
        </div>

        <div className="hidden lg:block">
          <div className="bg-gray-50/50 border border-gray-300 rounded-[6px] shadow-sm h-full overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl text-gray-900">Instructions</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-gray-600 text-sm">Take a printed QR poster and look for the <strong>Serial ID</strong> at the bottom (e.g., SLB-1001).</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                  <p className="text-gray-600 text-sm">Type the Serial ID in the input field. The system will verify if it exists and show its current status.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                  <p className="text-gray-600 text-sm">Search for the business you want to assign this poster to and select it from the results.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</div>
                  <p className="text-gray-600 text-sm">Click <strong>Link QR to Business</strong>. The poster is now ready to be given to the business owner!</p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white rounded-[6px] border border-gray-200 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Linked Preview</p>
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-[6px] bg-gray-100 flex items-center justify-center border border-gray-200">
                    <QrCode className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-gray-100 rounded-full mb-2"></div>
                    <div className="h-2 w-16 bg-gray-50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
