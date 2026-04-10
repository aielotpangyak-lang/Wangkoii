import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { Search, User, MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatComponent from '../components/Chat';
import { motion, AnimatePresence } from 'motion/react';
import FriendRequest from '../components/FriendRequest';
import BottomNav from '../components/BottomNav';

export default function ChatPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const path = 'users';
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.uid !== userId);
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));

    return () => unsub();
  }, [userId]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans bg-muted/10">
      <div className="relative z-10 max-w-2xl mx-auto min-h-screen flex flex-col p-4 md:p-8">
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">MESSAGES</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Minimal Communication</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <FriendRequest search="" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <Input 
              placeholder="Search players..." 
              className="pl-12 bg-white border-border h-14 rounded-2xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 shadow-sm text-lg font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2 mb-4">Recent Conversations</p>
            
            {filteredUsers.length > 0 ? (
              <div className="grid gap-2">
                {filteredUsers.map(user => (
                  <motion.button
                    key={user.uid}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate(`/chat/${user.uid}`)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-border hover:border-primary/30 transition-all shadow-sm group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/20 transition-colors">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
                        ) : <User className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      {user.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="text-left flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-black text-lg text-foreground truncate">{user.name}</p>
                        {user.isOnline && (
                          <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">No conversations found</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
