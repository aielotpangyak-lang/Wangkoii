import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Bot, MessageSquare, Users, Home, Search, UserCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function BottomNav({ setIsBotModalOpen, setIsSearchOpen }: { 
  setIsBotModalOpen?: (open: boolean) => void,
  setIsSearchOpen?: (open: boolean) => void 
}) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-border p-1.5 flex items-center justify-between shadow-2xl rounded-2xl">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
            onClick={() => setIsBotModalOpen?.(true)}
          >
            <Bot className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
            onClick={() => navigate('/chat')}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
            onClick={() => navigate('/friends')}
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>

        <Button 
          variant="outline"
          className="w-12 h-12 rounded-xl border-border text-foreground hover:bg-muted shadow-sm"
          onClick={() => navigate('/')}
        >
          <Home className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
            onClick={() => setIsSearchOpen?.(true)}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted overflow-hidden"
            onClick={() => navigate('/profile')}
          >
            <UserCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
