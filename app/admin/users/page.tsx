'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, 
  User, 
  Shield, 
  Mail, 
  Calendar,
  MoreVertical,
  ShieldCheck,
  UserCog,
  Ban,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  email?: string;
  created_at: string;
  status?: 'active' | 'suspended';
  last_sign_in?: string;
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        // Mocking some data that might not be in the profile table yet
        const enrichedData = data.map(p => ({
          ...p,
          status: p.status || 'active',
          // email would typically come from auth.users, but we'll use a placeholder or join if available
        }));
        setProfiles(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert('Error updating role');
    } else {
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
    }
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    // In a real app, you'd update this in the DB
    setProfiles(profiles.map(p => p.id === userId ? { ...p, status: newStatus } : p));
  };

  // Filtering Logic
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'ceo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <Shield size={10} /> Admin
          </span>
        );
      case 'vendor':
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
    return status === 'active' ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Suspended
      </span>
    );
  };

  // Stats Calculation
  const stats = [
    { label: 'Total Users', value: profiles.length, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vendors', value: profiles.filter(p => p.role === 'vendor').length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Admins', value: profiles.filter(p => ['admin', 'ceo'].includes(p.role)).length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Suspended', value: profiles.filter(p => p.status === 'suspended').length, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor and manage user accounts, roles, and permissions.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-[6px] text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Download size={16} /> Export CSV
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-[6px] text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">
              <User size={16} /> Add User
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-[8px] border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by name, email or username..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Filter size={16} /> 
                Role: <span className="text-gray-900">{roleFilter === 'all' ? 'All Roles' : roleFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-300 shadow-lg rounded-lg">
                <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem onClick={() => setRoleFilter('all')} className="cursor-pointer hover:bg-gray-50">All Roles</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('admin')} className="cursor-pointer hover:bg-gray-50">Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('vendor')} className="cursor-pointer hover:bg-gray-50">Vendor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('customer')} className="cursor-pointer hover:bg-gray-50">Customer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
                <AlertCircle size={16} /> 
                Status: <span className="text-gray-900">{statusFilter === 'all' ? 'All Status' : statusFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-300 shadow-lg rounded-lg">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className="cursor-pointer hover:bg-gray-50">All Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')} className="cursor-pointer hover:bg-gray-50">Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('suspended')} className="cursor-pointer hover:bg-gray-50">Suspended</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-500 text-sm">Loading users...</p>
            </div>
          ) : paginatedProfiles.length === 0 ? (
            <div className="text-center py-24">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-gray-400 h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No users found</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                We couldn't find any users matching your search criteria. Try adjusting your filters.
              </p>
              <button 
                onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
                className="mt-6 text-emerald-600 font-medium hover:text-emerald-700 text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border-gray-300">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-60/50">
                      <th className="px-6 py-4 text-xs text-gray-950 uppercase tracking-wider">User Details</th>
                      <th className="px-6 py-4 text-xs text-gray-950 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs text-gray-950 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs text-gray-950 uppercase tracking-wider">Joined Date</th>
                      <th className="px-6 py-4 text-xs text-gray-950 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {paginatedProfiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200 text-gray-500 font-medium text-sm">
                              {profile.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{profile.full_name || 'Anonymous User'}</p>
                              <p className="text-xs text-gray-500 truncate">@{profile.username || 'unknown'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(profile.role)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(profile.status || 'active')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 hover:bg-gray-100 rounded-lg transition-colors outline-none text-gray-400 hover:text-gray-600">
                              <MoreVertical size={18} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-1 bg-white border border-gray-300 shadow-lg rounded-lg">
                              <DropdownMenuLabel className="text-xs font-normal text-gray-500 px-2 py-1.5">Manage Role</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateRole(profile.id, 'admin')} className="gap-2 text-xs cursor-pointer hover:bg-gray-50">
                                <Shield size={14} className="text-purple-500" /> Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRole(profile.id, 'vendor')} className="gap-2 text-xs cursor-pointer hover:bg-gray-50">
                                <ShieldCheck size={14} className="text-blue-500" /> Make Vendor
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRole(profile.id, 'customer')} className="gap-2 text-xs cursor-pointer hover:bg-gray-50">
                                <User size={14} className="text-gray-500" /> Make Customer
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator className="bg-gray-200" />
                              
                              <DropdownMenuItem 
                                onClick={() => toggleStatus(profile.id, profile.status || 'active')}
                                className={`gap-2 text-xs cursor-pointer hover:bg-gray-50 ${profile.status === 'suspended' ? 'text-green-600 focus:text-green-700 focus:bg-green-50' : 'text-red-600 focus:text-red-700 focus:bg-red-50'}`}
                              >
                                {profile.status === 'suspended' ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                                {profile.status === 'suspended' ? 'Activate User' : 'Suspend User'}
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
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/30">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredProfiles.length)}</span> of <span className="font-medium text-gray-900">{filteredProfiles.length}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
      </div>
    </div>
  );
}
