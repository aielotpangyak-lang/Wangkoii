import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, User, Phone, Video, MoreVertical } from 'lucide-react';
import ChatComponent from '../components/Chat';
import { motion } from 'motion/react';

export default function ChatDetail() {
  const { uid } = useParams<{ uid: string }>();
  const [opponent, setOpponent] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !userId) return;

    const path = `users/${uid}`;
    const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        setOpponent({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // Check friendship
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('uid1', '==', userId), where('uid2', '==', uid));
    const unsubFriendship = onSnapshot(q, (snapshot) => {
      setIsFriend(!snapshot.empty);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'friendships');
    });

    // Mark messages as read
    const chatId = [userId, uid].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const qUnread = query(messagesRef, where('receiverUid', '==', userId), where('isRead', '==', false));
    getDocs(qUnread).then((snapshot) => {
      snapshot.forEach((docSnap) => {
        updateDoc(docSnap.ref, { isRead: true });
      });
    });

    return () => {
      unsub();
      unsubFriendship();
    };
  }, [uid, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!opponent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-foreground uppercase mb-4">User Not Found</h2>
        <Button onClick={() => navigate('/chat')} className="rounded-xl font-bold uppercase tracking-widest">
          Back to Messages
        </Button>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-foreground uppercase mb-4">Not Friends</h2>
        <p className="text-muted-foreground mb-6">You need to be friends to message each other.</p>
        <Button onClick={() => navigate('/chat')} className="rounded-xl font-bold uppercase tracking-widest">
          Back to Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-20 shrink-0">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/chat')}
              className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                  {opponent.photoURL ? (
                    <img src={opponent.photoURL} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
                  ) : <User className="w-5 h-5 text-muted-foreground" />}
                </div>
                {opponent.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <p className="font-black text-sm text-foreground leading-none mb-0.5">{opponent.name}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${opponent.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {opponent.isOnline ? 'Online Now' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          <ChatComponent 
            opponentUid={opponent.uid} 
            opponentName={opponent.name} 
          />
        </div>
      </main>
    </div>
  );
}
