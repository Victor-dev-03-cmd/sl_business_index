"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Star,
  Quote,
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
  Search,
  MessageSquare,
  Image as ImageIcon,
  User,
  ShieldCheck,
  Building2,
  Upload,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function TestimonialsManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"testimonials" | "reviews">("testimonials");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Real-time subscriptions
  React.useEffect(() => {
    const testimonialsChannel = supabase
      .channel("admin_testimonials_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonials" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
        }
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel("admin_reviews_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(testimonialsChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [queryClient]);

  // Queries
  const { data: testimonials = [], isLoading: loadingTestimonials } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "testimonials",
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses(name, logo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "reviews",
  });

  // Mutations
  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial deleted successfully");
    },
  });

  const upsertTestimonialMutation = useMutation({
    mutationFn: async (testimonial: any) => {
      const { error } = await supabase.from("testimonials").upsert(testimonial);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      setIsDialogOpen(false);
      setEditingTestimonial(null);
      toast.success("Testimonial saved successfully");
    },
  });

  const updateReviewStatusMutation = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review status updated");
    },
  });

  const filteredTestimonials = testimonials.filter((t: any) => 
    (t.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (t.quote || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredReviews = reviews.filter((r: any) => 
    (r.user_name || "").toLowerCase().includes(search.toLowerCase()) || 
    (r.comment || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.businesses?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTestimonial({
      type: "testimonial",
      name: "",
      role: "",
      image_url: "",
      quote: "",
      rating: 5,
      is_verified: true,
      display_order: testimonials.length,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `testimonial-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonials")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("testimonials")
        .getPublicUrl(filePath);

      setEditingTestimonial({ ...editingTestimonial, image_url: publicUrl });
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[100dvh] bg-gray-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews & Testimonials</h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform reviews and curated testimonials.</p>
        </div>
        
        {activeTab === "testimonials" && (
          <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-brand-blue transition-all font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Testimonial
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("testimonials")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === "testimonials" ? "text-brand-dark" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4" />
            Testimonials
          </div>
          {activeTab === "testimonials" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark" />}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === "reviews" ? "text-brand-dark" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            User Reviews
          </div>
          {activeTab === "reviews" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark" />}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, content, or business..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-dark outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {activeTab === "testimonials" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingTestimonials ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
          ) : filteredTestimonials.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <Quote className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400">No testimonials found.</p>
            </div>
          ) : (
            filteredTestimonials.map((t: any) => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg transition-all">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded",
                      t.type === 'testimonial' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {t.type}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-brand-dark transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm("Delete this testimonial?")) deleteTestimonialMutation.mutate(t.id);
                        }} 
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {t.type === 'testimonial' ? (
                    <>
                      <div className="flex items-center gap-1 text-brand-gold">
                        {Array(t.rating).fill(0).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                      </div>
                      <p className="text-gray-600 text-sm italic">"{t.quote}"</p>
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                          {t.image_url ? (
                            <Image src={t.image_url} alt={t.name} fill className="object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-300 absolute inset-0 m-auto" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            {t.name}
                            {t.is_verified && <CheckCircle className="w-3 h-3 text-brand-blue" />}
                          </h4>
                          <p className="text-[11px] text-gray-500 truncate">{t.role}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image src={t.image_url} alt="Success story image" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Review</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingReviews ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                  ))
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No reviews found.</td>
                  </tr>
                ) : (
                  filteredReviews.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden relative">
                            {r.businesses?.logo_url ? (
                              <Image src={r.businesses.logo_url} alt={r.businesses.name} fill className="object-cover" />
                            ) : (
                              <Building2 className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{r.businesses?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{r.user_name}</span>
                          <span className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 line-clamp-2 max-w-md">{r.comment}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-0.5 text-brand-gold">
                          {Array(r.rating).fill(0).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          r.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {r.is_approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateReviewStatusMutation.mutate({ id: r.id, is_approved: !r.is_approved })}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              r.is_approved ? "text-yellow-500 hover:bg-yellow-50" : "text-green-500 hover:bg-green-50"
                            )}
                            title={r.is_approved ? "Unapprove" : "Approve"}
                          >
                            {r.is_approved ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          </button>
                          <button 
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Feature as Testimonial"
                            onClick={() => {
                              setEditingTestimonial({
                                type: "testimonial",
                                name: r.user_name,
                                role: "Customer",
                                quote: r.comment,
                                rating: r.rating,
                                is_verified: true,
                                image_url: "", // Need to handle profile image if possible
                                display_order: testimonials.length,
                              });
                              setIsDialogOpen(true);
                              setActiveTab("testimonials");
                            }}
                          >
                            <Star className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingTestimonial?.id ? "Edit Testimonial" : "Add New Testimonial"}</DialogTitle>
            <DialogDescription>
              {editingTestimonial?.type === 'testimonial' 
                ? "Fill in the details for the curated testimonial."
                : "Upload an image for the success stories section."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setEditingTestimonial({ ...editingTestimonial, type: "testimonial" })}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                  editingTestimonial?.type === 'testimonial' ? "bg-white shadow-sm text-brand-dark" : "text-gray-400"
                )}
              >
                Testimonial
              </button>
              <button
                onClick={() => setEditingTestimonial({ ...editingTestimonial, type: "image" })}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                  editingTestimonial?.type === 'image' ? "bg-white shadow-sm text-brand-dark" : "text-gray-400"
                )}
              >
                Image Only
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image</label>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {editingTestimonial?.image_url ? (
                    <Image src={editingTestimonial.image_url} alt="Preview" fill className="object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-brand-dark" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={editingTestimonial?.image_url || ""}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, image_url: e.target.value })}
                      placeholder="URL or upload image..."
                    />
                    <label className="cursor-pointer px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center">
                      <Upload className="w-4 h-4 text-gray-600" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400">Recommended: Square for avatars, 16:9 for success stories.</p>
                </div>
              </div>
            </div>

            {editingTestimonial?.type === 'testimonial' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={editingTestimonial?.name || ""}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={editingTestimonial?.role || ""}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quote</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    value={editingTestimonial?.quote || ""}
                    onChange={(e) => setEditingTestimonial({ ...editingTestimonial, quote: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={editingTestimonial?.rating || 5}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num} Stars</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_verified"
                      className="w-4 h-4 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
                      checked={editingTestimonial?.is_verified || false}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, is_verified: e.target.checked })}
                    />
                    <label htmlFor="is_verified" className="text-sm text-gray-600">Verified User</label>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Order</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={editingTestimonial?.display_order ?? 0}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => upsertTestimonialMutation.mutate(editingTestimonial)}
              disabled={upsertTestimonialMutation.isPending}
              className="px-4 py-2 text-sm font-medium bg-brand-dark text-white rounded-lg hover:bg-brand-blue transition-all shadow-sm"
            >
              {upsertTestimonialMutation.isPending ? "Saving..." : "Save Testimonial"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
