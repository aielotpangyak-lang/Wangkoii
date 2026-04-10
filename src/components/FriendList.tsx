import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, OperationType } from '../types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare } from 'lucide-react';
import { handleFirestoreError, cn } from '../lib/utils';

export default function FriendList({ search }: { search: string }) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // This is a simplified approach, in a real app you might need a more complex query
    // or denormalized data to efficiently fetch friends.
    const friendshipsRef = collection(db, 'friendships');
    const q = query(friendshipsRef, where('uid1', '==', userId)); // Or uid2

    const unsub = onSnapshot(q, (snapshot) => {
      // Fetch user profiles for friends...
      // For now, just setting a dummy list to test
      setFriends([]);
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
                  <span className={cn("text-xs font-bold", friend.lastSeen && (Date.now() - friend.lastSeen.toMillis()) < 1000 * 60 * 60 ? "text-primary" : "text-foreground")}>{friend.name}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => navigate(`/chat/${friend.uid}`)}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
