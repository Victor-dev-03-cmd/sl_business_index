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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-dark/5 rounded-lg">
              <QrCode className="h-6 w-6 text-brand-dark" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">QR Center</h1>
          </div>
          <p className="text-gray-500 font-medium">Professional bulk generator for business posters.</p>
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
                    className="relative bg-white border border-gray-100 rounded-3xl overflow-hidden flex flex-col items-center shadow-2xl print:shadow-none print:border-none print:w-[210mm] print:h-[297mm] print:m-0 print:page-break-after-always"
                  >
                    {/* Catalog Style Design */}
                    <div className="w-full h-24 bg-brand-dark flex items-center px-12 relative overflow-hidden print:h-32">
                      <div className="absolute top-0 right-0 w-64 h-full bg-brand-gold/10 transform skew-x-[-35deg] translate-x-12"></div>
                      <div className="absolute top-0 right-16 w-32 h-full bg-brand-gold/20 transform skew-x-[-35deg] translate-x-12"></div>
                      <div className="relative flex items-center gap-6">
                        <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain brightness-0 invert" />
                        <div className="flex flex-col">
                          <span className="text-white font-black text-xl tracking-[0.2em] uppercase print:text-3xl">SL Business</span>
                          <span className="text-brand-gold text-[10px] font-bold tracking-[0.4em] uppercase">Verified Index</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-16 print:p-24 print:space-y-24">
                      {/* Decorative Pattern Background (Visual only, simple dots) */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#053765 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                      <div className="text-center space-y-6 relative">
                        <h3 className="text-4xl font-black text-brand-dark tracking-tighter print:text-7xl">CONNECT WITH US</h3>
                        <div className="flex items-center justify-center gap-4">
                          <div className="h-1 w-12 bg-brand-gold rounded-full"></div>
                          <div className="h-2 w-2 bg-brand-gold rounded-full"></div>
                          <div className="h-1 w-12 bg-brand-gold rounded-full"></div>
                        </div>
                      </div>

                      <div className="relative p-10 bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(5,55,101,0.2)] border-2 border-brand-gold/10 flex items-center justify-center print:p-16 print:rounded-[60px]">
                        <div className="absolute -inset-4 border border-brand-gold/5 rounded-[50px] -z-10 animate-pulse"></div>
                        <QRCodeSVG 
                          value={`${window.location.origin}${qr.short_link}`}
                          size={280}
                          level="H"
                          imageSettings={{
                            src: "/logo.png",
                            x: undefined,
                            y: undefined,
                            height: 56,
                            width: 56,
                            excavate: true,
                          }}
                        />
                      </div>

                      <div className="text-center space-y-6 max-w-sm relative">
                        <p className="text-2xl font-bold text-brand-dark print:text-4xl italic px-4">Scan for business details, location & offers</p>
                        <div className="flex justify-center gap-2">
                          <span className="h-1.5 w-1.5 bg-brand-gold rounded-full"></span>
                          <span className="h-1.5 w-1.5 bg-brand-gold rounded-full opacity-50"></span>
                          <span className="h-1.5 w-1.5 bg-brand-gold rounded-full opacity-20"></span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 p-8 flex items-center justify-between print:p-12 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1 print:text-xs">Serial ID</span>
                        <span className="text-2xl font-mono font-black text-brand-dark tracking-tighter print:text-4xl">{qr.serial_id}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain mb-2 opacity-20 grayscale" />
                        <p className="text-[10px] text-gray-400 font-bold print:text-xs tracking-tight uppercase">slbusinessindex.com</p>
                      </div>
                    </div>

                    {/* Accent Borders */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-brand-gold"></div>
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
