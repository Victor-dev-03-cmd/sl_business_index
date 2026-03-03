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
        return <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-red-50 text-red-600   border border-red-100 ">Admin</span>;
      case 'vendor':
        return <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-600   border border-emerald-100 ">Vendor</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-blue-50 text-blue-600   border border-blue-100 ">Customer</span>;
    }
  };

  return (
    <div className="min-h-full bg-gray-50/50  transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 ">User Management</h1>
          <p className="text-sm text-gray-500  mt-1">Manage platform users, update roles and monitor account status.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search users by name or username..." 
              className="w-full pl-12 pr-4 py-3 bg-white  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white  rounded-[6px] border border-gray-300  shadow-sm overflow-hidden text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-[6px] h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-24">
              <User className="mx-auto text-gray-200  mb-4 h-12 w-12" strokeWidth={1} />
              <p className="text-gray-400  font-normal">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300  bg-gray-50/50 ">
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Joined</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 ">
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-gray-50/50  transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-[6px] bg-gray-100  flex items-center justify-center border border-gray-300 ">
                            <User size={18} className="text-gray-400 " />
                          </div>
                          <div className="min-w-0">
                            <p className="font-normal text-gray-900  truncate">{profile.full_name || 'Anonymous'}</p>
                            <p className="text-[11px] text-gray-400  truncate">@{profile.username || profile.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(profile.role)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 ">
                        <div className="flex items-center gap-1.5 text-xs font-normal">
                          <Calendar size={12} className="text-gray-300" />
                          {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-2 hover:bg-gray-100  rounded-[6px] transition-colors outline-none">
                            <MoreVertical size={16} className="text-gray-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white  border-gray-300  shadow-xl">
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'admin')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-red-50  focus:text-red-600 "
                            >
                              <Shield size={14} /> Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'vendor')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-emerald-50  focus:text-emerald-600 "
                            >
                              <ShieldCheck size={14} /> Make Vendor
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateRole(profile.id, 'customer')}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-blue-50  focus:text-blue-600 "
                            >
                              <UserCog size={14} /> Make Customer
                            </DropdownMenuItem>
                            <div className="h-px bg-gray-50  my-1" />
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal text-red-600 focus:bg-red-50  focus:text-red-600">
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
