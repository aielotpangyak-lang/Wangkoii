import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Swords } from 'lucide-react';
import { handleFirestoreError, cn } from '../lib/utils';

export default function FriendList({ search, onChallenge }: { search: string, onChallenge?: (user: UserProfile) => void }) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // This is a simplified approach, in a real app you might need a more complex query
    // or denormalized data to efficiently fetch friends.
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('uid1', '==', userId)); // Or uid2

    const unsub = onSnapshot(q, async (snapshot) => {
      const friendUids = snapshot.docs.map(doc => doc.data().uid2);
      
      if (friendUids.length === 0) {
        setFriends([]);
        return;
      }

      // Fetch user profiles for all friends
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
  }, [userId]);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border bg-white rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest">Friends</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredFriends.length === 0 ? (
          <p className="text-xs text-muted-foreground">No friends found.</p>
        ) : (
          <div className="space-y-2">
            {filteredFriends.map(friend => (
              <div key={friend.uid} className="flex items-center justify-between p-2 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User className={cn("w-6 h-6", friend.isOnline ? "text-primary" : "text-muted-foreground")} />
                    {friend.isOnline && <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-xs font-bold", friend.lastSeen && (Date.now() - friend.lastSeen.toMillis()) < 1000 * 60 * 60 ? "text-primary" : "text-foreground")}>{friend.name}</span>
                    <span className="text-[10px] text-muted-foreground">@{friend.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 gap-1.5 rounded-xl text-primary hover:text-primary hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest"
                    onClick={() => onChallenge?.(friend)}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Challenge
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary" onClick={() => navigate(`/chat/${friend.uid}`)}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
