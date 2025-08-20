import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Citation, SearchResult } from '@egregore/shared';
import { useStore } from '../store';

export default function SearchManuals() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const { piUrl } = useStore();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${piUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, k: 8 })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResult = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Manuals</h2>
        <p className="text-gray-600">Search the HVAC technical documentation database</p>
      </div>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter product name, model, protocol, or technical term..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hvac-blue"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-hvac-blue text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">{results.length} Results</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {results.map((result, idx) => (
              <div key={idx} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-lg">{result.title}</h4>
                  {result.score && (
                    <span className="text-sm text-gray-500">
                      {Math.round(result.score * 100)}% match
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-3">
                  {result.vendor && <span>Vendor: {result.vendor}</span>}
                  {result.family && <span>Family: {result.family}</span>}
                  {result.model && <span>Model: {result.model}</span>}
                  <span>Pages: {result.page_start}-{result.page_end}</span>
                </div>
                <p className="text-gray-700">{result.snippet}</p>
                <button className="mt-3 text-hvac-blue hover:underline text-sm">
                  View Document →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {results.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Enter a search query to find relevant manuals</p>
        </div>
      )}
    </div>
  );
}