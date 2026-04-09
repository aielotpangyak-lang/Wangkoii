/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import Profile from './pages/Profile';
import ChatPage from './pages/Chat';
import SupportPage from './pages/Support';
import { UserProfile } from './types';
import NetworkStatus from './components/NetworkStatus';
import CoffeeButton from './components/CoffeeButton';

function AuthGuard({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
          // Update online status
          await updateDoc(docRef, {
            isOnline: true,
            lastSeen: serverTimestamp()
          });
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (requireProfile && !profile) return <Navigate to="/register" />;

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          isOnline: document.visibilityState === 'visible',
          lastSeen: serverTimestamp()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial update
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline: true,
        lastSeen: serverTimestamp()
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      }
    };
  }, [auth.currentUser]);

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
