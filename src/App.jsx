import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useFinancialData } from './hooks/useFinancialData';
import Dashboard from './components/Dashboard';
import ConceptExplorer from './components/ConceptExplorer';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { LayoutDashboard, Search, Loader2, Menu } from 'lucide-react';

// Private Route Component
const PrivateRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Main Dashboard Layout Component
function DashboardLayout() {
  const { data, loading, error } = useFinancialData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Filters State
  const [filters, setFilters] = useState({
    categories: new Set(),
    types: new Set(),
    years: new Set()
  });

  // Clear invalid categories when Type filter changes
  useEffect(() => {
    if (filters.types.size === 0) return;

    const validCategories = new Set();
    data.forEach(d => {
      if (filters.types.has(d['Tipo de movimiento'])) {
        validCategories.add(d['Categoría']);
      }
    });

    setFilters(prev => {
      const newCategories = new Set();
      let changed = false;
      prev.categories.forEach(cat => {
        if (validCategories.has(cat)) {
          newCategories.add(cat);
        } else {
          changed = true;
        }
      });

      if (changed) {
        return { ...prev, categories: newCategories };
      }
      return prev;
    });
  }, [filters.types, data]);

  // Filter Data Logic
  const filteredData = useMemo(() => {
    return data.filter(d => {
      // In Explorer mode, ignore Category and Type filters
      if (activeTab === 'explorer') {
        return filters.years.size === 0 || filters.years.has(d.year);
      }

      const catMatch = filters.categories.size === 0 || filters.categories.has(d['Categoría']);
      const typeMatch = filters.types.size === 0 || filters.types.has(d['Tipo de movimiento']);
      const yearMatch = filters.years.size === 0 || filters.years.has(d.year);
      return catMatch && typeMatch && yearMatch;
    });
  }, [data, filters, activeTab]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-500">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md border border-red-100">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error Cargando Datos</h2>
          <p className="text-slate-600">{error.message || error.toString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:block h-full shadow-lg z-10">
        <Sidebar data={data} filters={filters} setFilters={setFilters} activeTab={activeTab} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <LayoutDashboard size={20} />
              </div>
              <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                FinDashboard
              </span>
            </h1>
          </div>

          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'explorer'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Search size={18} />
              <span>Explorador</span>
            </button>
          </nav>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' ? (
              <Dashboard data={filteredData} />
            ) : (
              <ConceptExplorer data={filteredData} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <Sidebar data={data} filters={filters} setFilters={setFilters} activeTab={activeTab} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
