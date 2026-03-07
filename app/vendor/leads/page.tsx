'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
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

// Mock Data for Leads
const MOCK_LEADS = [
  {
    id: 1,
    name: 'John Anderson',
    email: 'john.anderson@example.com',
    phone: '+94 77 123 4567',
    status: 'new',
    source: 'Website Enquiry',
    date: '2 hours ago',
    message: 'Hi, I am interested in your catering services for a wedding next month. Can you send me a quote?',
    notes: []
  },
  {
    id: 2,
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    phone: '+94 71 987 6543',
    status: 'contacted',
    source: 'Phone Call',
    date: '1 day ago',
    message: 'Looking for a bulk order of cupcakes for a corporate event.',
    notes: ['Called on Monday, she is busy. Call back on Wednesday.']
  },
  {
    id: 3,
    name: 'David Miller',
    email: 'david.m@example.com',
    phone: '+94 76 555 1234',
    status: 'converted',
    source: 'Walk-in',
    date: '3 days ago',
    message: 'Visited the store and asked about custom cake designs.',
    notes: ['Order placed for $50.']
  },
  {
    id: 4,
    name: 'Emma Brown',
    email: 'emma.b@example.com',
    phone: '+94 70 111 2222',
    status: 'lost',
    source: 'Website Enquiry',
    date: '1 week ago',
    message: 'Do you deliver to Kandy?',
    notes: ['We do not deliver to Kandy yet.']
  }
];

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [noteText, setNoteText] = useState('');

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const updateStatus = (id: number, newStatus: string) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    if (selectedLead && selectedLead.id === id) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const addNote = () => {
    if (!noteText.trim() || !selectedLead) return;
    const updatedLeads = leads.map(l => 
      l.id === selectedLead.id ? { ...l, notes: [...l.notes, noteText] } : l
    );
    setLeads(updatedLeads);
    setSelectedLead({ ...selectedLead, notes: [...selectedLead.notes, noteText] });
    setNoteText('');
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

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      
      {/* Left: Leads List */}
      <div className={`flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${selectedLead ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'new', 'contacted', 'converted', 'lost'].map((status) => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <User className="h-12 w-12 mb-3 text-gray-300" />
              <p>No leads found</p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div 
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${selectedLead?.id === lead.id ? 'bg-emerald-50/30 border-emerald-500' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                  <span className="text-xs text-gray-400">{lead.date}</span>
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
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50/30 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedLead.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border uppercase tracking-wide ${getStatusColor(selectedLead.status)}`}>
                  {selectedLead.status}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {selectedLead.date}
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
              <a href={`tel:${selectedLead.phone}`} className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors">
                <Phone size={20} className="mb-1" />
                <span className="text-xs font-medium">Call</span>
              </a>
              <a href={`mailto:${selectedLead.email}`} className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                <Mail size={20} className="mb-1" />
                <span className="text-xs font-medium">Email</span>
              </a>
              <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors">
                <MessageCircle size={20} className="mb-1" />
                <span className="text-xs font-medium">WhatsApp</span>
              </a>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Contact Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={16} className="text-gray-400" /> {selectedLead.email}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone size={16} className="text-gray-400" /> {selectedLead.phone}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={16} className="text-gray-400" /> {selectedLead.source}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Enquiry Message</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg italic border border-gray-100">
                "{selectedLead.message}"
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Internal Notes</h3>
              <div className="space-y-3">
                {selectedLead.notes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No notes added yet.</p>
                ) : (
                  selectedLead.notes.map((note: string, i: number) => (
                    <div key={i} className="text-xs text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex gap-2">
                      <FileText size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                      {note}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add a note..." 
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button 
                  onClick={addNote}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Status Actions */}
            <div className="pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  Change Status <ArrowRight size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
        <div className="hidden lg:flex flex-1 bg-gray-50 rounded-xl border border-gray-200 border-dashed items-center justify-center text-gray-400 flex-col">
          <User size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Select a lead to view details</p>
        </div>
      )}
    </div>
  );
}
