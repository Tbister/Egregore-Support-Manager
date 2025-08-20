import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Ticket } from '@egregore/shared';
import { useStore } from '../store';
import clsx from 'clsx';

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { recentTickets } = useStore();
  
  useEffect(() => {
    // In a real app, fetch from API
    // For now, use store's recent tickets
    setTickets(recentTickets);
    setLoading(false);
  }, [recentTickets]);
  
  const getStatusBadge = (status: Ticket['status']) => {
    const colors = {
      processing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      escalated: 'bg-red-100 text-red-800',
      sent: 'bg-blue-100 text-blue-800'
    };
    
    return colors[status];
  };
  
  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-gray-400 text-white'
    };
    
    return colors[priority as keyof typeof colors];
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hvac-blue"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Support Dashboard</h2>
        <p className="text-gray-600">Manage HVAC support tickets with AI-powered assistance</p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link 
          to="/new-ticket"
          className="bg-hvac-blue text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <h3 className="font-semibold text-lg mb-2">📝 New Ticket</h3>
          <p className="text-blue-100">Create a support ticket from email or manual input</p>
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-lg mb-2">📊 Stats</h3>
          <div className="space-y-1 text-sm">
            <p>Ready to Send: <span className="font-bold text-green-600">
              {tickets.filter(t => t.status === 'ready').length}
            </span></p>
            <p>Escalated: <span className="font-bold text-red-600">
              {tickets.filter(t => t.status === 'escalated').length}
            </span></p>
          </div>
        </div>
        
        <Link 
          to="/search"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-hvac-blue transition-colors"
        >
          <h3 className="font-semibold text-lg mb-2">🔍 Search Manuals</h3>
          <p className="text-gray-600">Search the HVAC manuals database</p>
        </Link>
      </div>
      
      {/* Recent Tickets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Tickets</h3>
        </div>
        
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tickets yet. Create your first ticket to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/ticket/${ticket.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {ticket.subject || 'No subject'}
                      </h4>
                      {ticket.parse?.priority && (
                        <span className={clsx(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          getPriorityBadge(ticket.parse.priority)
                        )}>
                          {ticket.parse.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {ticket.text}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                      <span>•</span>
                      <span className="capitalize">{ticket.source}</span>
                      {ticket.parse?.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{ticket.parse.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={clsx(
                    'ml-4 px-3 py-1 text-xs font-medium rounded-full',
                    getStatusBadge(ticket.status)
                  )}>
                    {ticket.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}