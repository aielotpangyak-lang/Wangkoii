import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import BackButton from '../components/BackButton';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import FriendList from '../components/FriendList';
import FriendRequest from '../components/FriendRequest';
import BottomNav from '../components/BottomNav';
import ChatPopup from '../components/ChatPopup';

export default function FriendsPage() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [debouncedFriendSearch, setDebouncedFriendSearch] = useState('');
  const [debouncedRequestSearch, setDebouncedRequestSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFriendSearch(friendSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [friendSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRequestSearch(requestSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [requestSearch]);

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans bg-muted/10 pb-24">
      <div className="relative z-10 max-w-2xl mx-auto min-h-screen flex flex-col p-4 md:p-8">
        <header className="flex items-center gap-4 mb-8 shrink-0">
          <BackButton />
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Friends</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Manage your connections</p>
          </div>
        </header>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white rounded-2xl p-1 shadow-sm border border-border">
            <TabsTrigger value="friends" className="rounded-xl font-black uppercase tracking-widest text-xs">Friends</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl font-black uppercase tracking-widest text-xs">Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
              <Input 
                placeholder="Search friends..." 
                className="pl-12 bg-white border-border h-12 rounded-2xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 shadow-sm"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                autoFocus
              />
            </div>
            <FriendList search={debouncedFriendSearch} />
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
              <Input 
                placeholder="Search requests..." 
                className="pl-12 bg-white border-border h-12 rounded-2xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 shadow-sm"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                autoFocus
              />
            </div>
            <FriendRequest search={debouncedRequestSearch} />
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav activePath="/friends" setIsChatOpen={setIsChatOpen} />
      <ChatPopup isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
