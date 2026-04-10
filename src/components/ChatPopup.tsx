import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import ChatComponent from './Chat';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError, cn } from '../lib/utils';
import { User, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';

export default function ChatPopup({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId || !isOpen) return;

    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('uid1', '==', userId));

    const unsub = onSnapshot(q, async (snapshot) => {
      const friendUids = snapshot.docs.map(doc => doc.data().uid2);
      if (friendUids.length === 0) {
        setFriends([]);
        return;
      }

      const friendsData: UserProfile[] = [];
      for (const uid of friendUids) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          friendsData.push(userDoc.data() as UserProfile);
        }
      }
      setFriends(friendsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'friendships');
    });

    return () => unsub();
  }, [userId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-border rounded-3xl p-0 overflow-hidden max-w-md h-[80vh] flex flex-col">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center gap-2">
          {selectedFriend && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFriend(null)} className="h-8 w-8 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-foreground">
            {selectedFriend ? selectedFriend.name : 'Chat'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {selectedFriend ? (
            <ChatComponent opponentUid={selectedFriend.uid} opponentName={selectedFriend.name} />
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No friends to chat with</p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <button
                      key={friend.uid}
                      onClick={() => setSelectedFriend(friend)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-all text-left group"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {friend.photoURL ? (
                            <img src={friend.photoURL} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
                          ) : <User className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        {friend.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-black text-sm text-foreground truncate">{friend.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">@{friend.username}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
