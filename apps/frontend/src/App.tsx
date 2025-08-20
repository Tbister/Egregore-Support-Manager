import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';
import SearchManuals from './pages/SearchManuals';

function App() {
  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-ticket" element={<NewTicket />} />
            <Route path="/ticket/:id" element={<TicketDetail />} />
            <Route path="/search" element={<SearchManuals />} />
          </Routes>
        </Layout>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#dc2626',
            },
          },
        }}
      />
    </>
  );
}

export default App;