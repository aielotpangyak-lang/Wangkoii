import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Message, UserProfile, OperationType } from '../types';
import { 
  getStoredKeyPair, 
  importPublicKey, 
  deriveSharedSecret, 
  encryptMessage, 
  decryptMessage 
} from '../lib/cryptoUtils';
import { Send, Lock, ShieldCheck, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface ChatProps {
  opponentUid: string;
  opponentName: string;
}

export default function Chat({ opponentUid, opponentName }: ChatProps) {
  const [messages, setMessages] = useState<(Message & { text?: string })[]>([]);
  const [inputText, setInputText] = useState('');
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = auth.currentUser?.uid;

  const chatId = userId && opponentUid 
    ? [userId, opponentUid].sort().join('_') 
    : null;

  useEffect(() => {
    if (!userId || !opponentUid || opponentUid === 'bot') {
      setLoading(false);
      return;
    }

    const setupEncryption = async () => {
      try {
        const myKeys = await getStoredKeyPair();
        if (!myKeys) {
          toast.error("E2EE keys not found. Please re-register or check settings.");
          return;
        }

        const opponentDoc = await getDoc(doc(db, 'users', opponentUid));
        const opponentData = opponentDoc.data() as UserProfile;
        
        if (!opponentData.publicKey) {
          toast.error("Opponent hasn't set up E2EE keys yet.");
          return;
        }

        const opponentPubKey = await importPublicKey(opponentData.publicKey);
        const derivedKey = await deriveSharedSecret(myKeys.privateKey, opponentPubKey);
        setSharedKey(derivedKey);
      } catch (err) {
        console.error("Encryption setup failed:", err);
        toast.error("Failed to setup secure chat.");
      } finally {
        setLoading(false);
      }
    };

    setupEncryption();
  }, [userId, opponentUid]);

  useEffect(() => {
    if (!chatId || !sharedKey) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const path = `chats/${chatId}/messages`;
    const unsub = onSnapshot(q, async (snapshot) => {
      const newMessages = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data() as Message;
        let decryptedText = "[Encrypted Message]";
        try {
          decryptedText = await decryptMessage(data.encryptedText, data.iv, sharedKey);
        } catch (err) {
          console.error("Decryption failed for message:", doc.id);
        }
        return { id: doc.id, ...data, text: decryptedText };
      }));
      setMessages(newMessages);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsub();
  }, [chatId, sharedKey]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sharedKey || !chatId || !userId || isSending) return;

    const text = inputText;
    setInputText('');
    setIsSending(true);

    try {
      const { encrypted, iv } = await encryptMessage(text, sharedKey);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderUid: userId,
        receiverUid: opponentUid,
        encryptedText: encrypted,
        iv: iv,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      toast.error("Failed to send encrypted message.");
      setInputText(text); // Restore text on failure
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing secure chat...</div>;

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
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Secure Chat</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
          <Lock className="w-3 h-3" />
          E2EE
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">No messages yet. Say hi securely!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.senderUid === userId ? "ml-auto items-end" : "mr-auto items-start"
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
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-4 border-t border-border bg-muted/10 flex gap-2">
        <Input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a secure message..."
          className="h-12 bg-white border-border rounded-xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 uppercase text-xs font-bold tracking-widest"
        />
        <Button type="submit" size="icon" disabled={isSending || !sharedKey} className="h-12 w-12 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm">
          {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
