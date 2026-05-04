import { useState, useEffect } from 'react';
import { LiveMap } from './components/LiveMap';
import { MyPosts } from './components/MyPosts';
import { MessagesPage } from './components/MessagesPage';
import { ProfilePage } from './components/ProfilePage';
import { BottomNav } from './components/BottomNav';
import type { TabId } from './components/BottomNav';
import { QuickPostModal } from './components/QuickPostModal';
import { AuthModal } from './components/AuthModal';
import { useAppSelector, useAppDispatch } from './store/store';
import { setAuth, fetchUserProfile } from './store/authSlice';
import { communityApi, STRAPI_BASE_URL } from './store/communityApi';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  // Handle OAuth callback (Strapi redirects to ?access_token=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('token') || urlParams.get('access_token');
    
    if (accessToken) {
      // Fetch the real user profile using the token
      dispatch(fetchUserProfile(accessToken)).unwrap().then((userData) => {
        dispatch(setAuth({ jwt: accessToken, user: userData }));
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/');
        setActiveTab('profile');
      }).catch(err => {
        console.error("Failed to fetch user profile", err);
      });
    }
  }, [dispatch]);

  // Socket.IO Setup
  useEffect(() => {
    let socket: Socket;
    if (isAuthenticated && user && localStorage.getItem('jwt')) {
      const token = localStorage.getItem('jwt');
      socket = io(STRAPI_BASE_URL, {
        query: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Socket connected');
      });

      socket.on('messages.create', () => {
        // Invalidate Messages query so RTK Query refetches the latest chat/list
        dispatch(communityApi.util.invalidateTags(['Messages']));
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user, dispatch]);

  const handleSignIn = () => {
    setIsAuthModalOpen(true);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'map':
        return <LiveMap onSignIn={handleSignIn} onNavigateToMessages={() => setActiveTab('messages')} />;
      case 'posts':
        return <MyPosts />;
      case 'messages':
        return <MessagesPage />;
      case 'profile':
        return <ProfilePage isAuthenticated={isAuthenticated} user={user} onSignIn={handleSignIn} />;
      default:
        return <LiveMap onSignIn={handleSignIn} />;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {renderActiveTab()}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPostClick={() => setIsPostModalOpen(true)}
      />

      {isPostModalOpen && (
        <QuickPostModal onClose={() => setIsPostModalOpen(false)} />
      )}

      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}

      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '24px',
            background: '#333',
            color: '#fff',
            fontSize: '15px',
            padding: '12px 24px',
          },
          success: {
            iconTheme: {
              primary: '#0d9488',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
