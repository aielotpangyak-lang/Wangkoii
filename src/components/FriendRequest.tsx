import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';

export default function FriendRequest({ search }: { search: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const requestsRef = collection(db, 'friendRequests');
    const q = query(requestsRef, where('toUid', '==', userId), where('status', '==', 'pending'));

    const unsub = onSnapshot(q, (snapshot) => {
      const newRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(newRequests);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'friendRequests');
    });

    return () => unsub();
  }, [userId]);

  const filteredRequests = requests.filter(r => 
    r.fromUid.toLowerCase().includes(search.toLowerCase())
  );

  const acceptRequest = async (request: any) => {
    if (!userId) return;

    try {
      // 1. Update request status
      await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' });

      // 2. Create friendship
      await addDoc(collection(db, 'friendships'), {
        uid1: userId,
        uid2: request.fromUid,
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'friendships'), {
        uid1: request.fromUid,
        uid2: userId,
        createdAt: serverTimestamp()
      });

      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept friend request.');
    }
  };

  return (
    <Card className="border-border bg-white rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest">Friend Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pending requests found.</p>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/50">
                <span className="text-xs font-bold truncate max-w-[150px]">{req.fromUid}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => acceptRequest(req)}>
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <X className="w-4 h-4 text-red-500" />
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
