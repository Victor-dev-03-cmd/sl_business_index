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
} from "lucide-react";
import { VerificationWithBusiness } from "@/lib/admin-types";
import { toast } from "sonner";

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
  ) => {
    setSubmitting(id);
    try {
      // 1. Update Verification Status
      const { error: verificationError } = await supabase
        .from("verifications")
        .update({ status })
        .eq("id", id);

      if (verificationError) throw verificationError;

      // 2. Update Business Verified Status (if approved)
      if (status === "approved" && business_id) {
        const { error: businessError } = await supabase
          .from("businesses")
          .update({ is_verified: true })
          .eq("id", business_id);

        if (businessError) throw businessError;
      }

      // 3. Update Profile Verification Status (for the badge)
      if (owner_id) {
        const profileStatus = status === "approved" ? "verified" : "unverified";
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ verification_status: profileStatus })
          .eq("id", owner_id);

        if (profileError)
          console.error("Error updating profile status:", profileError);
      }

      toast.success(`Verification ${status} successfully!`);
      fetchVerifications();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast.error("Failed to update verification status");
    } finally {
      setSubmitting(null);
    }
  };

  const filteredVerifications = verifications.filter(
    (v) =>
      v.businesses.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.businesses.email?.toLowerCase().includes(search.toLowerCase()),
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
                        {v.br_document_url ? (
                          <div className="relative group h-16 w-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <img
                              src={v.br_document_url}
                              alt="Verification Document"
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform cursor-pointer"
                              onClick={() =>
                                window.open(v.br_document_url, "_blank")
                              }
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                              <Eye className="text-white" size={16} />
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
    </div>
  );
}
