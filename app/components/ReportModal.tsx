"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, ShieldAlert, Flag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/app/components/SessionContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'news' | 'business';
  targetName?: string;
}

const REPORT_REASONS = [
  "Inappropriate Content",
  "Spam or Misleading",
  "Illegal Activities",
  "Harassment",
  "Incorrect Information",
  "Other"
];

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetName }: ReportModalProps) {
  const { user } = useSession();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Please login to submit a report");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("reports")
        .insert([
          {
            reporter_id: user?.id,
            target_id: targetId,
            target_type: targetType,
            target_name: targetName,
            reason,
            description,
          }
        ]);

      if (error) throw error;

      toast.success("Report submitted successfully. Our team will review it.");
      onClose();
      setDescription("");
      setReason(REPORT_REASONS[0]);
    } catch (err: any) {
      console.error("Error submitting report:", err);
      toast.error(err.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Report {targetType === 'business' ? 'Business' : 'Post'}</h2>
                  <p className="text-xs text-gray-500 font-medium">Help us keep the platform safe</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {targetName && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target</p>
                  <p className="text-sm font-bold text-gray-900">{targetName}</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Report</label>
                <div className="grid grid-cols-1 gap-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        "text-left px-4 py-3 rounded-xl text-sm font-bold border transition-all",
                        reason === r 
                          ? "bg-red-50 border-red-200 text-red-600 shadow-sm" 
                          : "bg-white border-gray-100 text-gray-600 hover:border-gray-200"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Details (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us more about the issue..."
                  className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Flag size={18} /> Submit Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 text-gray-400 hover:text-gray-600 font-bold text-[12px] uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
