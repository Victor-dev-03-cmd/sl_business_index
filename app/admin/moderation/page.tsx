"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  ShieldAlert, 
  Flag, 
  CheckCircle2, 
  Trash2, 
  Ban, 
  ExternalLink, 
  Clock, 
  Filter,
  AlertTriangle,
  Loader2,
  MoreVertical,
  User,
  Building2,
  Megaphone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: 'news' | 'business';
  target_name: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("reports")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (filter === 'pending') {
        query = query.eq("status", "pending");
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (report: Report, action: 'dismiss' | 'delete' | 'ban') => {
    try {
      setActioningId(report.id);
      
      if (action === 'dismiss') {
        const { error } = await supabase
          .from("reports")
          .update({ status: 'dismissed' })
          .eq("id", report.id);
        if (error) throw error;
        toast.success("Report dismissed");
      } 
      else if (action === 'delete') {
        // Delete the target content
        const table = report.target_type === 'news' ? 'business_news' : 'businesses';
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("id", report.target_id);
        
        if (deleteError) throw deleteError;

        // Mark report as resolved
        await supabase
          .from("reports")
          .update({ status: 'resolved' })
          .eq("id", report.id);
          
        toast.success(`${report.target_type === 'news' ? 'Post' : 'Business'} deleted successfully`);
      }
      else if (action === 'ban') {
        if (report.target_type === 'business') {
          // Suspend the business
          const { error: suspendError } = await supabase
            .from("businesses")
            .update({ status: 'suspended', is_verified: false })
            .eq("id", report.target_id);
          
          if (suspendError) throw suspendError;

          await supabase
            .from("reports")
            .update({ status: 'resolved' })
            .eq("id", report.id);
            
          toast.success("Business suspended and unverified");
        } else {
          // If it's a news post, we might want to suspend the owning business
          const { data: post } = await supabase
            .from("business_news")
            .select("business_id")
            .eq("id", report.target_id)
            .single();

          if (post?.business_id) {
            await supabase
              .from("businesses")
              .update({ status: 'suspended', is_verified: false })
              .eq("id", post.business_id);
          }

          await supabase
            .from("business_news")
            .delete()
            .eq("id", report.target_id);

          await supabase
            .from("reports")
            .update({ status: 'resolved' })
            .eq("id", report.id);

          toast.success("Post deleted and business suspended");
        }
      }

      fetchReports();
    } catch (err: any) {
      console.error(`Error during ${action}:`, err);
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 tracking-tight">User Safety & Moderation</h1>
          <p className="text-gray-500 mt-2">Manage reports, handle violations, and protect platform integrity.</p>
        </div>
        <div className="flex bg-white border border-gray-300 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setFilter('pending')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              filter === 'pending' ? "bg-brand-dark text-white shadow-md" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              filter === 'all' ? "bg-brand-dark text-white shadow-md" : "text-gray-500 hover:text-gray-900"
            )}
          >
            All Reports
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-bold text-sm uppercase tracking-widest">Loading Reports...</p>
          </div>
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type / Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          report.target_type === 'news' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {report.target_type === 'news' ? <Megaphone size={18} /> : <Building2 size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 capitalize">{report.target_type}</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-1">{report.target_name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{report.target_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-xs font-bold text-red-600">{report.reason}</p>
                        {report.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{report.description}"</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <User size={12} className="text-gray-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900">{report.profiles?.full_name || 'Unknown'}</span>
                          <span className="text-[10px] text-gray-400">{report.profiles?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock size={12} />
                        <span className="text-xs font-bold">
                          {new Date(report.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}, {new Date(report.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        report.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        report.status === 'resolved' ? "bg-green-50 text-green-600 border-green-100" :
                        "bg-gray-50 text-gray-500 border-gray-100"
                      )}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(report, 'dismiss')}
                              disabled={!!actioningId}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Dismiss Report"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => handleAction(report, 'delete')}
                              disabled={!!actioningId}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Content"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => handleAction(report, 'ban')}
                              disabled={!!actioningId}
                              className="p-2 text-gray-400 hover:text-red-900 hover:bg-red-100 rounded-lg transition-all"
                              title="Ban/Suspend Entity"
                            >
                              <Ban size={18} />
                            </button>
                          </>
                        )}
                        <a
                          href={report.target_type === 'news' ? `/business-news?post_id=${report.target_id}` : `/business/${report.target_id}`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-all"
                          title="View Target"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Platform is Safe</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">No pending reports found. All community violations have been addressed.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-[12px] border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold text-gray-900">Auto-Moderation</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Businesses with more than <span className="font-bold text-amber-600">5 pending reports</span> are automatically unverified and flagged for manual review.
          </p>
        </div>
        
        <div className="p-6 bg-white rounded-[12px] border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <h3 className="font-bold text-gray-900">Priority Tickets</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Reports tagged as <span className="font-bold text-red-600">Illegal Activities</span> or <span className="font-bold text-red-600">Harassment</span> should be prioritized immediately.
          </p>
        </div>

        <div className="p-6 bg-white rounded-[12px] border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Filter size={20} />
            </div>
            <h3 className="font-bold text-gray-900">Shadow Ban Logic</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Suspended businesses are hidden from search results but remain in the database for legal and audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
