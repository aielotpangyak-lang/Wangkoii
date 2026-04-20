/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toaster } from './components/ui/Sonner';
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
import { Loader2 } from 'lucide-react';

function AuthGuard({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <div className="text-primary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Loading...
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (requireProfile && !profile) return <Navigate to="/register" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
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
      <Toaster />
      <CoffeeButton />
    </NetworkStatus>
  );
}
