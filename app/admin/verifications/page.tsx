"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle,
  XCircle,
  Search,
  Mail,
  User,
  ShieldCheck,
  Loader2,
  Eye,
  Building2,
  History,
  Clock,
  ExternalLink,
  Fingerprint,
  FileText,
  Maximize2,
  X,
  Copy,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { VerificationWithBusiness } from "@/lib/admin-types";
import { toast } from "sonner";
import { approveVerificationAction, rejectVerificationAction } from "@/app/actions/verifications";

// Extend the type to include owner_id which we need for profile updates
interface ExtendedVerification extends VerificationWithBusiness {
  businesses: {
    name: string;
    logo_url?: string;
    owner_name: string;
    email: string;
    phone: string;
    owner_id: string;
  };
}

export default function VerificationsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [verifications, setVerifications] = useState<ExtendedVerification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [moderationStatuses, setModerationStatuses] = useState<Record<string, string>>({});

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("BR Number copied to clipboard!");
  };

  useEffect(() => {
    fetchVerifications();
  }, [activeTab]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("verifications")
        .select(
          "*, businesses(name, logo_url, owner_name, email, phone, owner_id)",
        )
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else {
        query = query.neq("status", "pending");
      }

      const { data, error } = await query;

      if (error) throw error;
      setVerifications((data as unknown as ExtendedVerification[]) || []);
    } catch (error) {
      console.error("Error fetching verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    id: string,
    business_id: string,
    owner_id: string,
    status: "approved" | "rejected",
    businessName: string,
    moderationStatus: string = "active"
  ) => {
    setSubmitting(id);
    try {
      if (status === "approved") {
        const result = await approveVerificationAction(
          id,
          business_id,
          owner_id,
          businessName,
          moderationStatus
        );
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await rejectVerificationAction(id, owner_id);
        if (!result.success) throw new Error(result.error);
      }

      toast.success(`Verification ${status} successfully!`);
      fetchVerifications();
    } catch (error: any) {
      console.error("Error updating verification:", error);
      toast.error(error.message || "Failed to update verification status");
    } finally {
      setSubmitting(null);
    }
  };

  const filteredVerifications = verifications.filter(
    (v) =>
      v.businesses.name.toLowerCase().includes(search.toLowerCase()) ||
      v.businesses.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl text-brand-dark flex items-center gap-2">
          <ShieldCheck className="text-brand-blue shrink-0" />
          Verification Requests
        </h1>
        <p className="text-gray-500 mt-1">
          Review and manage vendor identity verification requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-4 text-sm transition-all relative flex items-center gap-2 whitespace-nowrap shrink-0 px-1 ${
            activeTab === "pending"
              ? "text-brand-blue"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock size={16} />
          Pending Requests
          {activeTab === "pending" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-blue animate-in fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-4 text-sm transition-all relative flex items-center gap-2 whitespace-nowrap shrink-0 px-1 ${
            activeTab === "history"
              ? "text-brand-blue"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <History size={16} />
          History
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-blue animate-in fade-in" />
          )}
        </button>
      </div>

      {/* Stats & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
          <input
            type="text"
            placeholder="Search by business name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 uppercase tracking-wider shrink-0">
          {verifications.length} {activeTab === "pending" ? "Pending" : "Total"}{" "}
          Requests
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">Loading verification requests...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="p-8 w-full text-center text-gray-400">
            <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
            <p>No {activeTab} verification requests found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Business Info
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Verification Details
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {activeTab === "pending"
                        ? "Requested Date"
                        : "Status & Date"}
                    </th>
                    {activeTab === "pending" && (
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVerifications.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                            {v.businesses.logo_url ? (
                              <img
                                src={v.businesses.logo_url}
                                alt={v.businesses.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building2 size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {v.businesses.name || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">
                                {v.businesses.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-3">
                          {/* BR Number & Lookup */}
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-12">BR No:</span>
                              <span className="text-sm font-mono font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[140px]">
                                {v?.br_number || "N/A"}
                              </span>
                              {v?.br_number && (
                                <button
                                  onClick={() => copyToClipboard(v.br_number!)}
                                  className="p-1 text-gray-400 hover:text-brand-blue transition-colors rounded hover:bg-gray-100"
                                  title="Copy BR Number"
                                >
                                  <Copy size={12} />
                                </button>
                              )}
                            </div>
                            
                            {v?.br_number && (
                              <div className="flex gap-1.5 ml-14">
                                {v.br_number.startsWith('PV') && (
                                  <button
                                    onClick={() => window.open(`https://eroc.drc.gov.lk/search/company?registration_no=${v.br_number}`, "_blank")}
                                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-all shadow-sm"
                                  >
                                    <Search size={10} />
                                    Search eROC
                                  </button>
                                )}
                                <button
                                  onClick={() => window.open(`https://www.ird.gov.lk/en/eServices/sitepages/Taxpayer%20Registration%20Search.aspx?menuid=1801`, "_blank")}
                                  className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-all shadow-sm"
                                >
                                  <Fingerprint size={10} />
                                  Check IRD
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Business Type */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-12">Type:</span>
                            <span className="text-xs font-medium text-gray-600">
                              {v.business_type === 'pvt_ltd' ? 'Private Limited' : 'Local Business'}
                            </span>
                          </div>

                          {/* Moderation Status Dropdown (only for pending) */}
                          {activeTab === 'pending' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-12">Status:</span>
                              <select
                                value={moderationStatuses[v.id] || "active"}
                                onChange={(e) => setModerationStatuses({ ...moderationStatuses, [v.id]: e.target.value })}
                                className="text-[10px] font-bold px-2 py-1 border border-gray-200 rounded bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-brand-blue/20"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="under_investigation">Under Investigation</option>
                              </select>
                            </div>
                          )}

                          {/* TIN / SVAT */}
                          {(v.tin_number || v.svat_number) && (
                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-100">
                              {v.tin_number && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-12">TIN:</span>
                                  <span className="text-xs font-medium text-gray-700">{v.tin_number}</span>
                                </div>
                              )}
                              {v.svat_number && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-12">SVAT:</span>
                                  <span className="text-xs font-medium text-gray-700">{v.svat_number}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {v.br_document_url ? (
                          <div className="relative group h-16 w-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center shadow-sm">
                            <img
                              src={v.br_document_url}
                              alt="Verification Document"
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform cursor-pointer"
                              onClick={() => setSelectedImage(v.br_document_url || null)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                              <Maximize2 className="text-white" size={16} />
                            </div>
                            <div className="absolute bottom-1 right-1 bg-white/90 p-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <FileText size={10} className="text-brand-blue" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No document
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {activeTab === "history" ? (
                          <div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                v.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {v.status}
                            </span>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(v.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          new Date(v.created_at).toLocaleDateString()
                        )}
                      </td>
                      {activeTab === "pending" && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                handleAction(
                                  v.id,
                                  v.business_id,
                                  v.businesses.owner_id,
                                  "approved",
                                  v.businesses.name,
                                  moderationStatuses[v.id] || "active"
                                )
                              }
                              disabled={submitting === v.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded text-xs font-bold hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleAction(
                                  v.id,
                                  v.business_id,
                                  v.businesses.owner_id,
                                  "rejected",
                                  v.businesses.name
                                )
                              }
                              disabled={submitting === v.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs font-bold hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Proof Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-brand-blue rounded-lg">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-none">Document Proof Viewer</h3>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Verification Evidence</p>
              </div>
            </div>
            <div className="aspect-[16/10] relative bg-gray-900 flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="BR Document Full View" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <p className="text-xs text-gray-400 italic">Click outside or press (X) to close</p>
              <button 
                onClick={() => window.open(selectedImage, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors"
              >
                <ExternalLink size={14} />
                Open Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
