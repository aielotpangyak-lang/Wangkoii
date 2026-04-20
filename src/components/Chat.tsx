import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Message, OperationType } from '../types';
import { Send, Lock, ShieldCheck, Bot, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  opponentUid: string;
  opponentName: string;
}

export default function Chat({ opponentUid, opponentName }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/135/135-preview.mp3'));
  const lastMessageIdRef = useRef<string | null>(null);
  const userId = auth.currentUser?.uid;

  const chatId = userId && opponentUid 
    ? [userId, opponentUid].sort().join('_') 
    : null;

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const path = `chats/${chatId}/messages`;
    const unsub = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      
      // Play sound and show notification for new messages from opponent
      if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMessageIdRef.current && lastMsg.id !== lastMessageIdRef.current && lastMsg.senderUid === opponentUid) {
          ringtoneRef.current.play().catch(() => {});
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`New message from ${opponentName}`, {
              body: lastMsg.text,
              icon: '/favicon.ico'
            });
          }
        }
        lastMessageIdRef.current = lastMsg.id;
      }

      setMessages(newMessages);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsub();
  }, [chatId, opponentUid, opponentName]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatId || !userId || isSending) return;

    const text = inputText;
    setInputText('');
    setIsSending(true);

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderUid: userId,
        receiverUid: opponentUid,
        text: text,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (err) {
      toast.error("Failed to send message.");
      setInputText(text); // Restore text on failure
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
      <div className="text-primary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Loading messages...
      </div>
    </div>
  );

  if (opponentUid === 'bot') {
    return (
      <div className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6 border border-border">
          <Bot className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="text-xl font-black tracking-tight text-foreground uppercase">Chat Unavailable</h3>
        <p className="text-xs text-muted-foreground font-medium mt-2">The computer bot doesn't support chatting. Focus on the game!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Private Chat</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
          <Lock className="w-3 h-3" />
          Secure
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">No messages yet. Say hi!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.senderUid === userId ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm relative group transition-all",
                    msg.senderUid === userId 
                      ? "bg-primary text-white rounded-tr-none hover:bg-primary/90" 
                      : "bg-white text-foreground border border-border rounded-tl-none hover:bg-muted/50"
                  )}>
                    {msg.text}
                    <div className={cn(
                      "absolute -bottom-5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-muted-foreground",
                      msg.senderUid === userId ? "right-0" : "left-0"
                    )}>
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Sending...'}
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1.5 px-1">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-4 border-t border-border bg-muted/10 flex gap-2">
        <Input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="h-12 bg-white border-border rounded-xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 uppercase text-xs font-bold tracking-widest"
        />
        <Button type="submit" size="icon" disabled={isSending} className="h-12 w-12 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm">
          {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
