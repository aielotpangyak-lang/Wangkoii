import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Bot, MessageSquare, Users, Home, Search, UserCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { cn } from '@/lib/utils';

export default function BottomNav({ setIsBotModalOpen, setIsSearchOpen, setIsChatOpen, activePath }: { 
  setIsBotModalOpen?: (open: boolean) => void,
  setIsSearchOpen?: (open: boolean) => void,
  setIsChatOpen?: (open: boolean) => void,
  activePath?: string
}) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-border p-1.5 flex items-center justify-between shadow-2xl rounded-2xl">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted", activePath === '/bot' && "text-primary bg-muted")}
            onClick={() => setIsBotModalOpen?.(true)}
          >
            <Bot className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted", activePath === '/chat' && "text-primary bg-muted")}
            onClick={() => setIsChatOpen?.(true)}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted", activePath === '/friends' && "text-primary bg-muted")}
            onClick={() => navigate('/friends')}
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>

        <Button 
          variant="outline"
          className={cn("w-12 h-12 rounded-xl border-border text-foreground hover:bg-muted shadow-sm", activePath === '/' && "bg-muted")}
          onClick={() => navigate('/')}
        >
          <Home className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted", activePath === '/search' && "text-primary bg-muted")}
            onClick={() => setIsSearchOpen?.(true)}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted overflow-hidden", activePath === '/profile' && "text-primary bg-muted")}
            onClick={() => navigate('/profile')}
          >
            <UserCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
