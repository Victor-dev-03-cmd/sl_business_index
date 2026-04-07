'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, 
  Phone, 
  Mail, 
  MessageCircle, 
  User, 
  MapPin, 
  Clock, 
  XCircle, 
  ArrowRight,
  FileText,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface LeadNote {
  id: string;
  note: string;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  source: string;
  created_at: string;
  lead_notes: LeadNote[];
}

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);
      
      if (businessData && businessData.length > 0) {
        const businessIds = businessData.map(b => b.id);
        
        const { data: leadsData, error } = await supabase
          .from('leads')
          .select('*, lead_notes(*)')
          .in('business_id', businessIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLeads(leadsData || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = (lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone?.includes(searchQuery)) ?? false;
    return matchesStatus && matchesSearch;
  });

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedLead) return;
    
    try {
      const { data: newNote, error } = await supabase
        .from('lead_notes')
        .insert({ lead_id: selectedLead.id, note: noteText })
        .select()
        .single();

      if (error) throw error;

      const updatedLeads = leads.map(l => 
        l.id === selectedLead.id ? { ...l, lead_notes: [...(l.lead_notes || []), newNote] } : l
      );
      setLeads(updatedLeads);
      setSelectedLead({ ...selectedLead, lead_notes: [...(selectedLead.lead_notes || []), newNote] });
      setNoteText('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'contacted': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'converted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'lost': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return 'Just now';
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100dvh-120px)] gap-6">
      
      {/* Left: Leads List */}
      <div className={`flex-1 flex flex-col bg-white rounded border border-gray-300 overflow-hidden ${selectedLead ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-300 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'new', 'contacted', 'converted', 'lost'].map((status) => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded text-xs font-medium border capitalize transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <User className="h-12 w-12 mb-3 text-gray-300" />
              <p>No leads found</p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div 
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${selectedLead?.id === lead.id ? 'bg-blue-50/30 border-blue-500' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className=" text-brand-blue">{lead.name}</h3>
                  <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 truncate mb-2">{lead.message}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {lead.source}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Lead Details (Drawer style) */}
      {selectedLead ? (
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-white rounded border border-gray-300 shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-300 bg-gray-50/30 flex justify-between items-start">
            <div>
              <h2 className="text-xl text-brand-dark">{selectedLead.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border uppercase tracking-wide ${getStatusColor(selectedLead.status)}`}>
                  {selectedLead.status}
                </span>
                <span className="font-medium text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {formatDate(selectedLead.created_at)}
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full">
              <XCircle size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <a href={`tel:${selectedLead.phone}`} className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                <Phone size={20} className="mb-1" />
                <span className="text-xs font-medium">Call</span>
              </a>
              <a href={`mailto:${selectedLead.email}`} className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-500 rounded hover:bg-blue-100 transition-colors">
                <Mail size={20} className="mb-1" />
                <span className="text-xs font-medium">Email</span>
              </a>
              <a href={`https://wa.me/${selectedLead.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                <MessageCircle size={20} className="mb-1" />
                <span className="text-xs font-medium">WhatsApp</span>
              </a>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm text-brand-dark uppercase tracking-wider border-b pb-2">Contact Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={16} className="text-brand-blue" /> {selectedLead.email}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone size={16} className="text-brand-blue" /> {selectedLead.phone}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={16} className="text-brand-blue" /> {selectedLead.source}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h3 className="text-sm text-brand-dark uppercase tracking-wider border-b pb-2">Enquiry Message</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded border border-gray-200">
                &quot;{selectedLead.message}&quot;
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm text-brand-dark uppercase tracking-wider border-b pb-2">Internal Notes</h3>
              <div className="space-y-3">
                {(!selectedLead.lead_notes || selectedLead.lead_notes.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">No notes added yet.</p>
                ) : (
                  selectedLead.lead_notes.map((note) => (
                    <div key={note.id} className="text-xs text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-100 flex gap-2">
                      <FileText size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                      {note.note}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add a note..." 
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button 
                  onClick={addNote}
                  className="p-2 bg-brand-blue text-white rounded hover:bg-blue-600q transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Status Actions */}
            <div className="pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full py-2.5 border border-gray-300 rounded text-sm text-gray-100 bg-brand-dark transition-colors flex items-center justify-center gap-2">
                  Change Status <ArrowRight size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white rounded border border-gray-300 shadow-lg">
                  <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateStatus(selectedLead.id, 'new')}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> New
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(selectedLead.id, 'contacted')}>
                    <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div> Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(selectedLead.id, 'converted')}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Converted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(selectedLead.id, 'lost')}>
                    <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div> Lost
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>
        </div>
      ) : (
        // Empty State for Right Panel (Desktop)
        <div className="hidden lg:flex flex-1 bg-gray-50 rounded border border-gray-300 border-dashed items-center justify-center text-gray-400 flex-col">
          <User size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a lead to view details</p>
        </div>
      )}
    </div>
  );
}
