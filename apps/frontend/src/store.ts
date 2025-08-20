import { create } from 'zustand';
import type { Ticket } from '@egregore/shared';

interface Store {
  recentTickets: Ticket[];
  workerUrl: string;
  piUrl: string;
  addTicket: (ticket: Ticket) => void;
  getTicket: (id: string) => Ticket | undefined;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  setWorkerUrl: (url: string) => void;
  setPiUrl: (url: string) => void;
}

export const useStore = create<Store>((set, get) => ({
  recentTickets: [],
  workerUrl: import.meta.env.VITE_WORKER_URL || 'http://localhost:3001',
  piUrl: import.meta.env.VITE_PI_URL || 'http://localhost:8080',
  
  addTicket: (ticket) => {
    set((state) => ({
      recentTickets: [ticket, ...state.recentTickets].slice(0, 20) // Keep last 20
    }));
  },
  
  getTicket: (id) => {
    return get().recentTickets.find(t => t.id === id);
  },
  
  updateTicket: (id, updates) => {
    set((state) => ({
      recentTickets: state.recentTickets.map(t => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    }));
  },
  
  setWorkerUrl: (url) => {
    set({ workerUrl: url });
  },

  setPiUrl: (url) => {
    set({ piUrl: url });
  }
}));