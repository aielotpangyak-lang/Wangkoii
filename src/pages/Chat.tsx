import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Input } from '../components/ui/input';
import { Search, User, MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatComponent from '../components/Chat';
import { motion, AnimatePresence } from 'motion/react';

export default function ChatPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
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
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans">
      <div className="relative z-10 max-w-6xl mx-auto h-screen flex flex-col p-4 md:p-6">
        <header className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.close()}
              className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">MESSAGES</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Minimal Communication</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* User List Sidebar */}
          <Card className="w-full md:w-80 bg-white border-border flex flex-col overflow-hidden rounded-2xl shadow-sm">
            <CardHeader className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input 
                  placeholder="Search friends..." 
                  className="pl-11 bg-muted/50 border-border h-11 rounded-xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {filteredUsers.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedUser?.uid === user.uid 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${
                          selectedUser?.uid === user.uid ? 'bg-white/20' : 'bg-muted'
                        }`}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : <User className={`w-5 h-5 ${selectedUser?.uid === user.uid ? 'text-white' : 'text-muted-foreground'}`} />}
                        </div>
                        {user.isOnline && (
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 rounded-full ${
                            selectedUser?.uid === user.uid ? 'bg-green-400 border-primary' : 'bg-green-500 border-white'
                          }`} />
                        )}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="font-bold text-sm truncate">{user.name}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${selectedUser?.uid === user.uid ? 'text-white/70' : 'text-muted-foreground/70'}`}>
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 bg-white border-border flex flex-col overflow-hidden rounded-2xl shadow-sm">
            {selectedUser ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : <User className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{selectedUser.name}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedUser.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {selectedUser.isOnline ? 'Online Now' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatComponent 
                    opponentUid={selectedUser.uid} 
                    opponentName={selectedUser.name} 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-foreground uppercase mb-2">Conversations</h3>
                <p className="text-muted-foreground font-medium text-sm max-w-xs">Select a friend from the sidebar to start a secure chat.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
