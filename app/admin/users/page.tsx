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
  Ban
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setProfiles(data);
    }
    setLoading(false);
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

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.username?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'ceo':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/50">Admin</span>;
      case 'vendor':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">Vendor</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">Customer</span>;
    }
  };

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage platform users, update roles and monitor account status.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search users by name or username..." 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm dark:text-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-24">
              <User className="mx-auto text-gray-200 dark:text-gray-800 mb-4 h-12 w-12" strokeWidth={1} />
              <p className="text-gray-400 dark:text-gray-500 font-normal">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Joined</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            <User size={18} className="text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-normal text-gray-900 dark:text-white truncate">{profile.full_name || 'Anonymous'}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">@{profile.username || profile.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(profile.role)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5 text-xs font-normal">
                          <Calendar size={12} className="text-gray-300" />
                          {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors outline-none">
                            <MoreVertical size={16} className="text-gray-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-xl">
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'admin')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Shield size={14} /> Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'vendor')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-600 dark:focus:text-emerald-400"
                            >
                              <ShieldCheck size={14} /> Make Vendor
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'customer')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-blue-50 dark:focus:bg-blue-950/30 focus:text-blue-600 dark:focus:text-blue-400"
                            >
                              <UserCog size={14} /> Make Customer
                            </DropdownMenuItem>
                            <div className="h-px bg-gray-50 dark:bg-gray-800 my-1" />
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-600">
                              <Ban size={14} /> Suspend User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
