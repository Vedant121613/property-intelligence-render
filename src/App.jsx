import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import CityPage from './pages/CityPage';
import LocalityPage from './pages/LocalityPage';
import ProjectPage from './pages/ProjectPage';
import ProfilePage from './pages/ProfilePage';
import PlansPage from './pages/PlansPage';
import AuthPage from './pages/AuthPage';
import MobileBottomNav from './components/MobileBottomNav';

function AppContent() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, handleAuthSuccess, openAuthModal } = useAuth();

  const [route, setRoute] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/login')) {
      return { page: 'signin', params: {} };
    } else if (path.startsWith('/plans')) {
      return { page: 'plans', params: {} };
    } else if (path.startsWith('/profile')) {
      return { page: 'profile', params: {} };
    } else if (path.startsWith('/details/')) {
      const parts = path.split('/').filter(Boolean);
      return {
        page: 'details',
        params: { transactionId: parts[1] || '11089052' }
      };
    } else if (path.startsWith('/transactions')) {
      return {
        page: 'transactions',
        params: { projectId: 'vj-indiworks-kharadi-central', cityId: 'pune' }
      };
    } else if (path.startsWith('/project/')) {
      const parts = path.split('/').filter(Boolean);
      return {
        page: 'project',
        params: {
          cityId: parts[1] || 'pune',
          localityId: parts[2] || 'kharadi',
          projectId: parts[3] || 'vj-indiworks-kharadi-central'
        }
      };
    } else if (path.startsWith('/location/')) {
      const parts = path.split('/').filter(Boolean);
      return {
        page: 'locality',
        params: {
          cityId: parts[1] || 'pune',
          localityId: parts[2] || 'kharadi'
        }
      };
    } else if (path.startsWith('/city/')) {
      const parts = path.split('/').filter(Boolean);
      return {
        page: 'city',
        params: { cityId: parts[1] || 'pune' }
      };
    }
    // Default to Home page
    return {
      page: 'home',
      params: {}
    };
  });

  const [currentCity, setCurrentCity] = useState(route.params?.cityId || 'pune');

  const navigateTo = (page, params = {}) => {
    setRoute({ page, params });
    if (params.cityId) {
      setCurrentCity(params.cityId);
    }

    let targetUrl = '/';
    if (page === 'home') {
      targetUrl = '/';
    } else if (page === 'signin' || page === 'signup') {
      targetUrl = '/signin';
    } else if (page === 'plans') {
      targetUrl = '/plans';
    } else if (page === 'profile') {
      targetUrl = '/profile';
    } else if (page === 'transactions') {
      targetUrl = `/transactions?project=${params.projectId || 'vj-indiworks-kharadi-central'}`;
    } else if (page === 'details') {
      targetUrl = `/details/${params.transactionId || 'kh-3861'}`;
    } else if (page === 'city') {
      targetUrl = `/city/${params.cityId || currentCity}`;
    } else if (page === 'locality') {
      targetUrl = `/location/${params.cityId || currentCity}/${params.localityId || 'kharadi'}`;
    } else if (page === 'project') {
      targetUrl = `/project/${params.cityId || currentCity}/${params.localityId || 'kharadi'}/${params.projectId || 'vj-indiworks-kharadi-central'}`;
    }

    try {
      window.history.pushState({ page, params }, '', targetUrl);
    } catch {
      // Fallback for sandboxed environments
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        setRoute(event.state);
        if (event.state.params?.cityId) {
          setCurrentCity(event.state.params.cityId);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="app-container">
      {/* Top Persistent Navbar (Hidden on dedicated Auth page) */}
      {route.page !== 'signin' && (
        <Navbar
          currentCity={currentCity}
          onSelectCity={(cityId) => {
            if (cityId === 'mumbai') return;
            setCurrentCity(cityId);
            if (route.page === 'city') {
              navigateTo('city', { cityId });
            }
          }}
          onNavigate={navigateTo}
        />
      )}

      {/* Main Page View */}
      <main className="main-content">
        {route.page === 'signin' && (
          <AuthPage onNavigate={navigateTo} />
        )}

        {route.page === 'plans' && (
          <PlansPage onNavigate={navigateTo} />
        )}

        {route.page === 'home' && (
          <HomePage
            currentCity={currentCity}
            onSelectCity={(cityId) => {
              if (cityId === 'mumbai') return;
              setCurrentCity(cityId);
            }}
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'profile' && (
          <ProfilePage
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'transactions' && (
          <TransactionsPage
            projectId={route.params.projectId || 'y-square'}
            cityId={route.params.cityId || currentCity}
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'details' && (
          <TransactionDetailPage
            transactionId={route.params.transactionId || '11089052'}
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'city' && (
          <CityPage
            cityId={route.params.cityId || currentCity}
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'locality' && (
          <LocalityPage
            cityId={route.params.cityId || currentCity}
            localityId={route.params.localityId || 'kharadi'}
            onNavigate={navigateTo}
          />
        )}

        {route.page === 'project' && (
          <ProjectPage
            cityId={route.params.cityId || currentCity}
            localityId={route.params.localityId || 'kharadi'}
            projectId={route.params.projectId || 'vj-indiworks-kharadi-central'}
            talukaId={route.params.talukaId || 'haveli'}
            villageName={route.params.villageName || 'Kharadi'}
            talukaName={route.params.talukaName || 'Haveli'}
            onNavigate={navigateTo}
          />
        )}
      </main>

      {/* Global Footer (Omitted on dedicated Auth page) */}
      {route.page !== 'signin' && <Footer onNavigate={navigateTo} />}

      {/* Floating Chat Assistant */}
      <ChatWidget />

      {/* Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <MobileBottomNav 
        currentRoute={route.page} 
        onNavigate={navigateTo} 
      />

      {/* Global Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
