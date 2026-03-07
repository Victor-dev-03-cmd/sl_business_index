'use client';

import { useState } from 'react';
import { Star, MessageSquare, Search, Reply, MoreVertical, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data for Reviews
const MOCK_REVIEWS = [
  {
    id: 1,
    user: 'Sarah Johnson',
    rating: 5,
    date: '2 days ago',
    comment: 'Absolutely loved the service! The staff was friendly and the atmosphere was great. Will definitely be coming back.',
    business: 'Green Leaf Cafe',
    replied: false,
  },
  {
    id: 2,
    user: 'Michael Chen',
    rating: 4,
    date: '1 week ago',
    comment: 'Good food, but the wait time was a bit long. Otherwise, a solid experience.',
    business: 'Green Leaf Cafe',
    replied: true,
    replyText: 'Thanks for the feedback, Michael! We are working on improving our service speed.',
  },
  {
    id: 3,
    user: 'Emily Davis',
    rating: 2,
    date: '2 weeks ago',
    comment: 'Not what I expected. The coffee was cold and the tables were dirty.',
    business: 'Downtown Bakery',
    replied: false,
  },
  {
    id: 4,
    user: 'David Wilson',
    rating: 5,
    date: '3 weeks ago',
    comment: 'Best bakery in town! Their croissants are to die for.',
    business: 'Downtown Bakery',
    replied: true,
    replyText: 'Thank you so much, David! We are glad you enjoyed them.',
  }
];

export default function ReviewsPage() {
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReview, setExpandedReview] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Filter Logic
  const filteredReviews = MOCK_REVIEWS.filter(review => {
    const matchesRating = filterRating === 'all' || review.rating === filterRating;
    const matchesSearch = review.comment.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          review.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRating && matchesSearch;
  });

  const handleReplySubmit = (id: number) => {
    console.log(`Replying to review ${id}: ${replyText}`);
    setExpandedReview(null);
    setReplyText('');
    alert('Reply posted successfully!');
  };

  const toggleExpand = (id: number) => {
    if (expandedReview === id) {
      setExpandedReview(null);
    } else {
      setExpandedReview(id);
      setReplyText('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Reviews & Feedback</h1>
          <p className="text-gray-500 mt-1">Manage customer reviews and build trust.</p>
        </div>
        
        {/* Overall Stats */}
        <div className="flex items-center gap-6 bg-white px-6 py-3 rounded border border-gray-300 shadow-sm">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Avg Rating</p>
            <div className="flex items-center gap-1.5 text-brand-sand text-xl mt-0.5">
              4.2 <Star size={18} fill="currentColor" />
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Reviews</p>
            <p className="text-brand-dark text-xl mt-0.5">{MOCK_REVIEWS.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded border border-gray-300 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Search reviews..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-blue-500 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button 
            onClick={() => setFilterRating('all')}
            className={`px-4 py-2 rounded text-xs font-medium border transition-colors whitespace-nowrap ${filterRating === 'all' ? 'bg-blue-50 text-brand-dark border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button 
              key={star}
              onClick={() => setFilterRating(star)}
              className={`px-3 py-2 rounded text-xs font-medium border transition-colors flex items-center gap-1 whitespace-nowrap ${filterRating === star ? 'bg-gold-50 text-brand-sand border-gold-200' : 'bg-white text-brand-dark border-gray-300 hover:bg-gray-100'}`}
            >
              {star} <Star size={12} fill="currentColor" />
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-800 uppercase tracking-wider w-1/4">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-800 uppercase tracking-wider w-1/6">Rating</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-800 uppercase tracking-wider w-1/3">Comment Preview</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-800 uppercase tracking-wider w-1/6">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-800 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReviews.map((review) => (
                  <>
                    <tr 
                      key={review.id} 
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedReview === review.id ? 'bg-gray-50' : ''}`}
                      onClick={() => toggleExpand(review.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {review.user.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-brand-blue text-sm">{review.user}</p>
                            <p className="font-medium text-xs text-gray-500">{review.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={14} 
                              className={i < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">{review.comment}</p>
                      </td>
                      <td className="px-6 py-4">
                        {review.replied ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100">
                            <CheckCircle2 size={12} /> Replied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-100">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
                          {expandedReview === review.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedReview === review.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-6 py-6 border-t border-gray-100">
                          <div className="max-w-3xl mx-auto space-y-6">
                            {/* Full Comment */}
                            <div>
                              <h4 className="text-xs text-brand-dark uppercase tracking-wider mb-2">Full Review</h4>
                              <p className="text-gray-800 text-sm leading-relaxed bg-white p-4 rounded border border-gray-300">
                                "{review.comment}"
                              </p>
                            </div>

                            {/* Reply Section */}
                            <div>
                              <h4 className="text-xs text-brand-dark uppercase tracking-wider mb-2">
                                {review.replied ? 'Your Reply' : 'Post a Reply'}
                              </h4>
                              
                              {review.replied ? (
                                <div className="bg-emerald-50/50 p-4 rounded border border-blue-100">
                                  <p className="text-sm text-gray-700">{review.replyText}</p>
                                  <p className="text-xs text-brand-dark mt-2 font-medium">Replied on {review.date}</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <textarea 
                                    className="w-full p-3 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                                    rows={3}
                                    placeholder="Write your response to the customer..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-3">
                                    <button 
                                      onClick={() => setExpandedReview(null)}
                                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-300 rounded transition-colors border border-gray-300"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => handleReplySubmit(review.id)}
                                      className="px-4 py-2 text-sm bg-brand-dark text-white rounded  transition-colors flex items-center gap-2"
                                    >
                                      <Reply size={16} /> Post Reply
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
