import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import type { Ticket } from '@egregore/shared';
import { useStore } from '../store';
import clsx from 'clsx';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicket, workerUrl } = useStore();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    // Try to get from store first
    const storedTicket = getTicket(id);
    if (storedTicket) {
      setTicket(storedTicket);
      setLoading(false);
    } else {
      // Fetch from API
      fetchTicket();
    }
  }, [id]);
  
  const fetchTicket = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`${workerUrl}/tickets/${id}`);
      if (!response.ok) {
        throw new Error('Ticket not found');
      }
      const data = await response.json();
      setTicket(data);
    } catch (error) {
      toast.error('Failed to load ticket');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!ticket) return;
    
    setSending(true);
    const toastId = toast.loading('Sending email...');
    
    try {
      const response = await fetch(`${workerUrl}/tickets/${ticket.id}/send`, {
        method: 'POST'
      });
      
      if (response.status === 501) {
        toast.error('Email sending not yet implemented', { id: toastId });
      } else if (!response.ok) {
        throw new Error('Failed to send email');
      } else {
        toast.success('Email sent successfully!', { id: toastId });
        setTicket({ ...ticket, status: 'sent' });
      }
    } catch (error) {
      toast.error('Failed to send email', { id: toastId });
    } finally {
      setSending(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hvac-blue"></div>
      </div>
    );
  }
  
  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {ticket.subject || 'Support Ticket'}
          </h2>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'px-3 py-1 text-sm font-medium rounded-full',
              ticket.status === 'ready' ? 'bg-green-100 text-green-800' :
              ticket.status === 'escalated' ? 'bg-red-100 text-red-800' :
              ticket.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            )}>
              {ticket.status}
            </span>
            {ticket.parse?.priority && (
              <span className={clsx(
                'px-3 py-1 text-sm font-medium rounded-full',
                ticket.parse.priority === 'urgent' ? 'bg-red-500 text-white' :
                ticket.parse.priority === 'high' ? 'bg-orange-500 text-white' :
                ticket.parse.priority === 'medium' ? 'bg-yellow-500 text-white' :
                'bg-gray-400 text-white'
              )}>
                {ticket.parse.priority}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600">
          ID: {ticket.id} • Source: {ticket.source} • Created: {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Request */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Original Request</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.text}</p>
          </div>
          
          {/* Draft Email */}
          {ticket.draft && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Draft Response</h3>
                {ticket.validation && (
                  <span className={clsx(
                    'text-sm px-2 py-1 rounded',
                    ticket.validation.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {ticket.validation.ok ? '✓ Validated' : `⚠ ${ticket.validation.issues.length} Issues`}
                  </span>
                )}
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Subject:</p>
                <p className="font-medium">{ticket.draft.subject}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Body:</p>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{ticket.draft.body}</ReactMarkdown>
                </div>
              </div>
              
              {/* Citations */}
              {ticket.draft.citations.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">References:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {ticket.draft.citations.map((citation, idx) => (
                      <li key={idx}>• {citation}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Validation Issues */}
              {ticket.validation && !ticket.validation.ok && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                  <p className="text-sm font-medium text-red-800 mb-2">Validation Issues:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {ticket.validation.issues.map((issue, idx) => (
                      <li key={idx}>
                        • <strong>{issue.claim}:</strong> {issue.reason}
                        {issue.suggestion && <span className="block ml-3 text-red-600">→ {issue.suggestion}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {ticket.status === 'ready' && (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-hvac-green text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {sending ? 'Sending...' : '📧 Send Email'}
                  </button>
                )}
                {ticket.status === 'escalated' && (
                  <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                    🚨 Escalate to Human
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Parse Results */}
          {ticket.parse && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-3">Analysis</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Category:</dt>
                  <dd className="font-medium capitalize">{ticket.parse.category}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Products:</dt>
                  <dd>{ticket.parse.product.map(p => `${p.name} ${p.model || ''}`).join(', ') || 'None'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Quantity:</dt>
                  <dd>{ticket.parse.quantity || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Protocols:</dt>
                  <dd>{ticket.parse.protocols.join(', ') || 'None'}</dd>
                </div>
                {ticket.parse.missing.length > 0 && (
                  <div>
                    <dt className="text-gray-500">Missing Info:</dt>
                    <dd>
                      <ul className="mt-1 space-y-1">
                        {ticket.parse.missing.map((m, idx) => (
                          <li key={idx}>• {m}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          
          {/* Manual Citations */}
          {ticket.citations && ticket.citations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-3">Manual References</h3>
              <div className="space-y-3">
                {ticket.citations.slice(0, 5).map((citation, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium">{citation.title}</p>
                    <p className="text-gray-500 text-xs">
                      Pages {citation.page_start}-{citation.page_end}
                    </p>
                    <p className="text-gray-600 mt-1 text-xs line-clamp-2">
                      {citation.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}