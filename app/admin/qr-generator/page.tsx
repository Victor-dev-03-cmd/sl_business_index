"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Printer, Plus, Trash2, History, Database, ArrowRight, QrCode, Building2 } from "lucide-react";
import { toast } from "sonner";
import { QRInventory } from "@/lib/qr-types";

interface QRItem {
  id: string;
  serial_id: string;
  short_link: string;
  batch_name: string;
  status?: string;
}

export default function QRGeneratorPage() {
  const [count, setCount] = useState<number>(10);
  const [batchName, setBatchName] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQRs, setGeneratedQRs] = useState<QRItem[]>([]);
  const [inventory, setInventory] = useState<QRInventory[]>([]);
  const [lastSerialNum, setLastSerialNum] = useState<number>(1000);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchLastSerial = useCallback(async () => {
    const { data, error } = await supabase
      .from("qr_inventory")
      .select("serial_id")
      .order("serial_id", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last serial:", error);
      return;
    }

    if (data && data.length > 0) {
      const lastId = data[0].serial_id;
      const num = parseInt(lastId.replace("SLB-", ""));
      if (!isNaN(num)) {
        setLastSerialNum(num);
      }
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("qr_inventory")
      .select("*, businesses(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setInventory(data as unknown as QRInventory[]);
    }
    setIsLoadingHistory(false);
  }, []);

  useEffect(() => {
    fetchLastSerial();
    fetchInventory();
  }, [fetchLastSerial, fetchInventory]);

  const handleGenerate = async () => {
    if (!batchName) {
      toast.error("Please enter a batch name");
      return;
    }

    if (count <= 0 || count > 100) {
      toast.error("Please enter a count between 1 and 100");
      return;
    }

    setIsGenerating(true);
    const newQRs = [];

    for (let i = 1; i <= count; i++) {
      const nextNum = lastSerialNum + i;
      const serialId = `SLB-${nextNum}`;
      newQRs.push({
        serial_id: serialId,
        short_link: `/q/${serialId}`,
        batch_name: batchName,
        status: "unassigned" as const,
      });
    }

    const { data, error } = await supabase
      .from("qr_inventory")
      .insert(newQRs)
      .select();

    if (error) {
      toast.error("Failed to generate QRs: " + error.message);
      setIsGenerating(false);
      return;
    }

    const newGenerated = data as unknown as QRInventory[];
    setGeneratedQRs(newGenerated);
    setLastSerialNum(lastSerialNum + count);
    toast.success(`Successfully generated ${count} QR codes`);
    fetchInventory(); // Refresh the list
    setIsGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 bg-gray-50/30 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded border border-gray-300 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-dark/5 rounded-lg">
              <QrCode className="h-6 w-6 text-brand-dark" />
            </div>
            <h1 className="text-2xl tracking-tight text-brand-dark uppercase">QR Center</h1>
          </div>
          <p className="text-gray-500">Professional bulk generator for business posters.</p>
        </div>
        <div className="flex items-center gap-3">
          {generatedQRs.length > 0 && (
            <button 
              onClick={handlePrint} 
              className="flex items-center justify-center gap-3 bg-brand-dark text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-dark/90 transition-all shadow-xl shadow-brand-dark/20 active:scale-95 group"
            >
              <Printer className="h-5 w-5 group-hover:animate-bounce" />
              Print Batch ({generatedQRs.length})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Generator Form */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden sticky top-24">
            <div className="p-6 bg-brand-dark flex items-center justify-between">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">New Batch</h2>
              <Database className="h-5 w-5 text-brand-gold" />
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label htmlFor="batch-name" className="text-xs font-black text-gray-400 uppercase tracking-widest">Batch Identifier</label>
                <input
                  id="batch-name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-dark/5 focus:border-brand-dark transition-all font-medium"
                  placeholder="e.g. Colombo District V1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="count" className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity (Max 100)</label>
                <input
                  id="count"
                  type="number"
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-dark/5 focus:border-brand-dark transition-all font-medium"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-3 bg-brand-gold text-white px-4 py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-gold-light transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-brand-gold/20 mt-4"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Create Batch
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total QRs</p>
              <p className="text-2xl font-black text-brand-dark">{lastSerialNum}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latest ID</p>
              <p className="text-2xl font-black text-brand-gold">{`SLB-${lastSerialNum}`}</p>
            </div>
          </div>
        </div>

        {/* Inventory List / Preview */}
        <div className="lg:col-span-8 space-y-12">
          {generatedQRs.length > 0 ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 bg-brand-gold rounded-full"></div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase">Live Preview</h2>
                </div>
                <button 
                  onClick={() => setGeneratedQRs([])} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Discard
                </button>
              </div>
              
              <div 
                ref={printRef}
                className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:block print:p-0"
              >
                {generatedQRs.map((qr) => (
                  <div 
                    key={qr.id}
                    className="relative bg-white border border-gray-200 rounded-[40px] overflow-hidden flex flex-col items-center shadow-2xl print:shadow-none print:border-none print:w-[210mm] print:h-[297mm] print:m-0 print:page-break-after-always"
                  >
                    {/* Top Branding - Clean & Minimal */}
                    <div className="w-full pt-16 pb-8 flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-brand-dark rounded-[24px] flex items-center justify-center shadow-xl shadow-brand-dark/10">
                        <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain brightness-0 invert" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-brand-dark tracking-[0.1em] uppercase">Sri Lanka</h2>
                        <p className="text-brand-gold text-sm font-bold tracking-[0.3em] uppercase">Business Index</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center px-12 w-full space-y-12">
                      {/* Main Message */}
                      <div className="text-center space-y-2">
                        <h3 className="text-5xl font-black text-gray-900 tracking-tight leading-none print:text-7xl">DISCOVER MORE</h3>
                        <p className="text-lg text-gray-500 font-medium tracking-wide">View our verified profile & services</p>
                      </div>

                      {/* QR Frame - The centerpiece */}
                      <div className="relative group">
                        {/* Decorative Corners */}
                        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-brand-gold rounded-tl-2xl"></div>
                        <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-brand-gold rounded-tr-2xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-brand-gold rounded-bl-2xl"></div>
                        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-brand-gold rounded-br-2xl"></div>

                        <div className="p-10 bg-white rounded-[40px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center">
                          <QRCodeSVG 
                            value={`${window.location.origin}${qr.short_link}`}
                            size={320}
                            level="H"
                            imageSettings={{
                              src: "/logo.png",
                              x: undefined,
                              y: undefined,
                              height: 64,
                              width: 64,
                              excavate: true,
                            }}
                          />
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4 bg-gray-50 px-8 py-4 rounded-full border border-gray-100">
                          <QrCode className="h-5 w-5 text-brand-dark" />
                          <span className="text-sm font-bold text-gray-700 tracking-tight">Open camera to scan this code</span>
                        </div>
                        
                        <div className="flex gap-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-brand-gold/30"></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer - Professional ID Bar */}
                    <div className="w-full bg-brand-dark p-10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.2em] mb-1">Official Serial ID</span>
                        <span className="text-3xl font-mono font-bold text-white tracking-tighter">{qr.serial_id}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white/40 text-xs font-bold tracking-widest uppercase">Verified Listing</p>
                        <p className="text-white text-sm font-bold">slbusinessindex.com</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-brand-dark rounded-full"></div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Recent Inventory</h2>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Serial ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Link</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoadingHistory ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                          </tr>
                        ))
                      ) : inventory.length > 0 ? (
                        inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-mono font-bold text-brand-dark group-hover:text-brand-gold transition-colors">{item.serial_id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-600 truncate max-w-[150px] inline-block">{item.batch_name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.status === 'assigned' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {item.businesses ? (
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                                  <Building2 className="h-3 w-3 text-brand-blue" />
                                  <span className="truncate max-w-[120px]">{item.businesses.name}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 italic">Not Linked</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium text-gray-400">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <History className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No inventory records found.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing latest 20 items</p>
                  <button className="text-xs font-black text-brand-dark hover:text-brand-gold flex items-center gap-1 transition-all uppercase tracking-widest">
                    View Full Inventory
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .print\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
