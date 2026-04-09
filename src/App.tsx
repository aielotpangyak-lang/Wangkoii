/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import Profile from './pages/Profile';
import ChatPage from './pages/Chat';
import SupportPage from './pages/Support';
import NetworkStatus from './components/NetworkStatus';
import CoffeeButton from './components/CoffeeButton';

function AuthGuard({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-background text-primary font-black uppercase tracking-widest text-xs animate-pulse">Authenticating...</div>;

  if (!user) return <Navigate to="/login" />;

  if (requireProfile && !profile) return <Navigate to="/register" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile } = useAuth();

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

  return (
    <Router>
      <NetworkStatus>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={
            <AuthGuard requireProfile={false}>
              <Register />
            </AuthGuard>
          } />
          <Route path="/" element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } />
          <Route path="/game/:gameId" element={
            <AuthGuard>
              <Game />
            </AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          } />
          <Route path="/chat" element={
            <AuthGuard>
              <ChatPage />
            </AuthGuard>
          } />
          <Route path="/support" element={
            <AuthGuard>
              <SupportPage />
            </AuthGuard>
          } />
        </Routes>
        <Toaster />
        <CoffeeButton />
      </NetworkStatus>
    </Router>
  );
}
