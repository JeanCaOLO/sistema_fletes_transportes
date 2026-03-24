import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import TravelTicketsBoard from './components/TravelTicketsBoard';
import WarehouseTicketsBoard from './components/WarehouseTicketsBoard';
import ReportsModule from './components/ReportsModule';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'travel' | 'warehouse' | 'reports'>('travel');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION as the very first event,
    // with the session restored from localStorage — this is the safe way to
    // check auth on page refresh without race conditions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // This is the definitive answer: is the user logged in or not?
        if (session) {
          setUser(session.user);
          setAuthLoading(false);
        } else {
          navigate('/');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        navigate('/');
      }
      // Ignore other events (PASSWORD_RECOVERY, etc.) to avoid false redirects
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Verificando sesión...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                <i className="ri-truck-line text-lg sm:text-xl text-white"></i>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900">Sistema Fletes OLO</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <i className="ri-user-line"></i>
                <span>{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-logout-box-line text-lg sm:text-base"></i>
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('travel')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'travel'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="ri-car-line mr-1 sm:mr-2"></i>
            Viajes Normales
          </button>
          <button
            onClick={() => setActiveTab('warehouse')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'warehouse'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="ri-building-2-line mr-1 sm:mr-2"></i>
            Viajes de Almacén
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="ri-bar-chart-box-line mr-1 sm:mr-2"></i>
            Reportes
          </button>
        </div>

        {/* Content */}
        {activeTab === 'travel' && <TravelTicketsBoard />}
        {activeTab === 'warehouse' && <WarehouseTicketsBoard />}
        {activeTab === 'reports' && <ReportsModule />}
      </main>
    </div>
  );
}
