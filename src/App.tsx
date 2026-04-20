/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, Component, ReactNode } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toaster } from 'sonner';
import { Button } from './components/ui/Button';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AnimatePresence, motion } from 'motion/react';
import { handleFirestoreError } from './lib/utils';
import { OperationType } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import Profile from './pages/Profile';
import ChatPage from './pages/Chat';
import ChatDetail from './pages/ChatDetail';
import SupportPage from './pages/Support';
import AdminPage from './pages/Admin';
import FriendsPage from './pages/Friends';
import UserProfileView from './pages/UserProfileView';
import NotificationsPage from './pages/Notifications';
import NetworkStatus from './components/NetworkStatus';
import CoffeeButton from './components/CoffeeButton';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-pink-50 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-pink-600 mb-4" />
          <h1 className="text-2xl font-black text-pink-900 mb-2 uppercase">Something went wrong</h1>
          <p className="text-pink-600 mb-6 max-w-md">The application crashed. This could be due to a network error or a code issue.</p>
          <pre className="p-4 bg-white/50 rounded-xl text-left text-xs overflow-auto max-width-full mb-6 border border-pink-100 max-h-40">
            {error?.message}
          </pre>
          <Button onClick={() => window.location.reload()} className="bg-pink-600 hover:bg-pink-700">
            Restart App
          </Button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function AuthGuard({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-pink-50 gap-4">
      <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      <div className="text-pink-600 font-bold uppercase tracking-widest text-xs">
        Connecting...
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (requireProfile && !profile) return <Navigate to="/register" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const { user, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Temporarily disabled global settings sync for stability check
    /*
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.font) {
          const linkId = 'dynamic-font-link';
          let link = document.getElementById(linkId) as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          }
          link.href = `https://fonts.googleapis.com/css2?family=${data.font.replace(/ /g, '+')}:wght@400;500;700;900&display=swap`;
          document.body.style.fontFamily = `"${data.font}", sans-serif`;
        }
        if (data.appName) {
          document.title = data.appName;
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
    */
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (user && profile) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: document.visibilityState === 'visible',
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial update
    const initialUpdate = async () => {
      if (user && profile) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    };
    initialUpdate();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (user && profile) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    };
  }, [user?.uid, !!profile]);

  useEffect(() => {
    if (!user) return;

    // Friend Requests Toast
    const qRequests = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid), where('status', '==', 'pending'));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          toast.info('New friend request received!');
        }
      });
    });

    // Notifications Toast (News, Payments, etc)
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('toUid', 'in', ['all', user.uid])
    );
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only toast if it's recent (within last 10 seconds) to avoid toast storm on load
          const createdAt = data.createdAt?.toDate();
          if (createdAt && (new Date().getTime() - createdAt.getTime()) < 10000) {
            toast.info(`New Notification: ${data.title}`);
          }
        }
      });
    });

    return () => {
      unsubRequests();
      unsubNotifs();
    };
  }, [user]);

  return (
    <NetworkStatus>
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/login" element={<AnimatedRoute><Login /></AnimatedRoute>} />
          <Route path="/register" element={<AnimatedRoute><Register /></AnimatedRoute>} />
          <Route path="/" element={
            <AuthGuard>
              <AnimatedRoute><Dashboard /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/game/:gameId" element={
            <AuthGuard>
              <AnimatedRoute><Game /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/profile/:uid" element={
            <AuthGuard>
              <AnimatedRoute><UserProfileView /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard>
              <AnimatedRoute><Profile /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/chat" element={
            <AuthGuard>
              <AnimatedRoute><ChatPage /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/chat/:uid" element={
            <AuthGuard>
              <AnimatedRoute><ChatDetail /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/friends" element={
            <AuthGuard>
              <AnimatedRoute><FriendsPage /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/notifications" element={
            <AuthGuard>
              <AnimatedRoute><NotificationsPage /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/support" element={
            <AuthGuard>
              <AnimatedRoute><SupportPage /></AnimatedRoute>
            </AuthGuard>
          } />
          <Route path="/admin" element={
            <AuthGuard>
              <AnimatedRoute><AdminPage /></AnimatedRoute>
            </AuthGuard>
          } />
        </Routes>
      </AnimatePresence>
      {/* Temporarily hidden */}
      {/* <Toaster /> */}
      {/* <CoffeeButton /> */}
    </NetworkStatus>
  );
}
