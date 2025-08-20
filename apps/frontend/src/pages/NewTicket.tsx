import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { CreateTicketRequest, CreateTicketResponse, TicketSource } from '@egregore/shared';
import { useStore } from '../store';

export default function NewTicket() {
  const navigate = useNavigate();
  const { addTicket, workerUrl } = useStore();
  
  const [source, setSource] = useState<TicketSource>('manual');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter ticket text');
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Processing ticket...');
    
    try {
      const request: CreateTicketRequest = {
        source,
        subject: subject.trim() || undefined,
        text: text.trim()
      };
      
      const response = await fetch(`${workerUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.statusText}`);
      }
      
      const data: CreateTicketResponse = await response.json();
      
      // Add to store
      addTicket({
        id: data.ticketId,
        source,
        subject: subject || data.draft.subject,
        text,
        parse: data.parse,
        citations: data.citations,
        draft: data.draft,
        validation: data.validation,
        status: data.validation.ok ? 'ready' : 'escalated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Ticket created successfully!', { id: toastId });
      navigate(`/ticket/${data.ticketId}`);
      
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket', { id: toastId });
    } finally {
      setLoading(false);
    }
  };
  
  const sampleTickets = [
    {
      subject: 'Douglas Lighting Controller Retro Kit',
      text: 'Looking for pricing on Blue Ridge Douglas Lighting Controller Retro Kit (36 panels, BACnet MS/TP).'
    },
    {
      subject: 'Spyder Controller Configuration',
      text: 'Need help configuring Honeywell Spyder controller for BACnet IP. Getting communication errors on network address 10. Running firmware version 3.2.'
    },
    {
      subject: 'VAV Box Actuator Issue',
      text: 'Johnson Controls VAV box actuator not responding. Model NAE5510, shows offline in Metasys. Need troubleshooting steps and possible replacement part numbers.'
    }
  ];
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Ticket</h2>
        <p className="text-gray-600">Enter customer inquiry for AI-powered support response</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Source Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Source
              </label>
              <div className="flex gap-4">
                {(['manual', 'gmail', 'hubspot'] as TicketSource[]).map((s) => (
                  <label key={s} className="flex items-center">
                    <input
                      type="radio"
                      value={s}
                      checked={source === s}
                      onChange={(e) => setSource(e.target.value as TicketSource)}
                      className="mr-2"
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Subject */}
            <div className="mb-6">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject (Optional)
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hvac-blue"
                placeholder="e.g., VAV Box Troubleshooting"
              />
            </div>
            
            {/* Text */}
            <div className="mb-6">
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Text *
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hvac-blue"
                placeholder="Paste or type the customer inquiry here..."
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Include product names, model numbers, and specific issues
              </p>
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-hvac-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Create Ticket'}
            </button>
          </form>
        </div>
        
        {/* Sample Tickets */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Sample Tickets</h3>
            <div className="space-y-3">
              {sampleTickets.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSubject(sample.subject);
                    setText(sample.text);
                    toast.success('Sample loaded');
                  }}
                  className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <p className="font-medium text-sm mb-1">{sample.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{sample.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}