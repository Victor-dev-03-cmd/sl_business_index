"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  User,
  Ban,
  CheckCircle,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  ShieldCheck,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  email?: string;
  created_at: string;
  status?: "active" | "suspended";
  last_sign_in?: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 10;

  const { data: profiles = [], isLoading: loading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((p) => ({
        ...p,
        status: p.status || "active",
      })) as Profile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User role updated successfully");
    },
    onError: () => {
      toast.error("Error updating role");
    },
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedProfiles.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkStatusChange = async (newStatus: "active" | "suspended") => {
    if (
      !confirm(
        `Are you sure you want to ${newStatus} ${selectedIds.length} users?`,
      )
    )
      return;

    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .in("id", selectedIds);

    if (error) {
      toast.error(`Error updating users status to ${newStatus}`);
    } else {
      setSelectedIds([]);
      toast.success(
        `Successfully updated ${selectedIds.length} users to ${newStatus}`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
  };

  const updateRole = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    // This is a local toggle in the current UI, but we could also make it a mutation
    // For now keeping it consistent with the previous local update but using queryClient to update cache
    queryClient.setQueryData(["admin-profiles"], (old: Profile[] | undefined) =>
      old ? old.map((p) => (p.id === userId ? { ...p, status: newStatus } : p)) : [],
    );
  };

  // Filtering Logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.username.toLowerCase().includes(search.toLowerCase()) ||
        (p.email ? p.email.toLowerCase().includes(search.toLowerCase()) : false);

      const matchesRole = roleFilter === "all" || p.role === roleFilter;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
      case "ceo":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <Shield size={10} /> Admin
          </span>
        );
      case "vendor":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <ShieldCheck size={10} /> Vendor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <User size={10} /> Customer
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-sand/20 text-brand-gold border border-brand-sand/30">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold"></span> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Suspended
      </span>
    );
  };

  // Stats Calculation
  const stats = [
    {
      label: "Total Users",
      value: profiles.length,
      icon: User,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Vendors",
      value: profiles.filter((p) => p.role === "vendor").length,
      icon: ShieldCheck,
      color: "text-brand-dark",
      bg: "bg-brand-sand/20",
    },
    {
      label: "Admins",
      value: profiles.filter((p) => ["admin", "ceo"].includes(p.role)).length,
      icon: Shield,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Suspended",
      value: profiles.filter((p) => p.status === "suspended").length,
      icon: Ban,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors">
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10 space-y-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="text-base text-gray-500 mt-2">
              Monitor and manage user accounts, roles, and permissions.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-[8px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Professional Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[6px] shadow-sm border border-gray-100 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors" />
              <input
                type="text"
                placeholder="Search by name, email or username..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-1 focus:border-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-auto">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-[6px] pl-10 pr-10 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-blue/5 focus:border-brand-blue appearance-none cursor-pointer hover:border-gray-300 transition-all min-w-[160px] shadow-sm w-full md:w-auto"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="vendor">Vendor</option>
                  <option value="customer">Customer</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative group w-full md:w-auto">
                <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-[6px] pl-10 pr-10 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-blue/5 focus:border-brand-blue appearance-none cursor-pointer hover:border-gray-300 transition-all min-w-[160px] shadow-sm w-full md:w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-[6px] text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Download size={16} /> Export CSV
            </button>
            <div className="h-8 w-px bg-gray-200 hidden md:block" />
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-dark text-white rounded-[6px] text-sm font-medium hover:bg-brand-dark/90 transition-all shadow-lg">
              <User size={16} /> Add User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden relative">
          {selectedIds.length > 0 && (
            <div className="bg-brand-dark/5 border-b border-gray-200 px-8 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-brand-dark">
                {selectedIds.length} users selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleBulkStatusChange("active")}
                  className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-[6px] text-xs font-bold hover:bg-green-600 hover:text-white transition-all border border-green-100 shadow-sm"
                >
                  <CheckCircle size={14} /> Activate Selected
                </button>
                <button
                  onClick={() => handleBulkStatusChange("suspended")}
                  className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-[6px] text-xs font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                >
                  <Ban size={14} /> Suspend Selected
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-2"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="p-0">
              <div className="border-b border-gray-300 bg-gray-50/50 p-4 grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 grid grid-cols-5 gap-4 border-b border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-grow">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 my-auto rounded-full" />
                  <Skeleton className="h-6 w-24 my-auto rounded-full" />
                  <div className="flex items-center gap-2 my-auto">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-end my-auto">
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedProfiles.length === 0 ? (
            <div className="text-center py-24">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400 h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No users found
              </h3>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                We couldn&apos;t find any users matching your search criteria.
                Try adjusting your filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-6 text-brand-dark font-medium hover:text-brand-blue text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border-gray-300">
                <table className="w-full min-w-[750px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-200 border-b border-gray-300">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                          onChange={handleSelectAll}
                          checked={
                            selectedIds.length === paginatedProfiles.length &&
                            paginatedProfiles.length > 0
                          }
                        />
                      </th>
                      <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">
                        User Details
                      </th>
                      <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {paginatedProfiles.map((profile) => (
                      <tr
                        key={profile.id}
                        className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.includes(profile.id) ? "bg-brand-blue/5" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                            checked={selectedIds.includes(profile.id)}
                            onChange={() => handleSelectOne(profile.id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200 text-gray-500 font-medium text-sm">
                              {profile.full_name.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-brand-blue truncate">
                                {profile.full_name || "Anonymous User"}
                              </p>
                              <p className="font-medium text-xs text-gray-500 truncate">
                                @{profile.username || "unknown"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(profile.role)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(profile.status || "active")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(profile.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 hover:bg-gray-100 rounded-lg transition-colors outline-none text-gray-400 hover:text-gray-600">
                              <MoreVertical size={18} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 p-1 bg-white border border-gray-300 shadow-lg rounded-lg"
                            >
                              <DropdownMenuLabel className="text-xs font-normal text-gray-500 px-2 py-1.5">
                                Manage Role
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => updateRole(profile.id, "admin")}
                                className="gap-2 text-xs cursor-pointer hover:bg-gray-50"
                              >
                                <Shield size={14} className="text-purple-500" />{" "}
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateRole(profile.id, "vendor")}
                                className="gap-2 text-xs cursor-pointer hover:bg-gray-50"
                              >
                                <ShieldCheck
                                  size={14}
                                  className="text-blue-500"
                                />{" "}
                                Make Vendor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateRole(profile.id, "customer")
                                }
                                className="gap-2 text-xs cursor-pointer hover:bg-gray-50"
                              >
                                <User size={14} className="text-gray-500" />{" "}
                                Make Customer
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-gray-200" />

                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatus(
                                    profile.id,
                                    profile.status || "active",
                                  )
                                }
                                className={`gap-2 text-xs cursor-pointer hover:bg-gray-50 ${profile.status === "suspended" ? "text-green-600 focus:text-green-700 focus:bg-green-50" : "text-red-600 focus:text-red-700 focus:bg-red-50"}`}
                              >
                                {profile.status === "suspended" ? (
                                  <CheckCircle size={14} />
                                ) : (
                                  <Ban size={14} />
                                )}
                                {profile.status === "suspended"
                                  ? "Activate User"
                                  : "Suspend User"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2 items-center justify-between bg-gray-50/30">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredProfiles.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {filteredProfiles.length}
                  </span>{" "}
                  results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
