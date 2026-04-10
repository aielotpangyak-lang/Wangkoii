import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [requestCount, setRequestCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    // Count pending friend requests
    const requestsRef = collection(db, 'friendRequests');
    const qRequests = query(requestsRef, where('toUid', '==', userId), where('status', '==', 'pending'));

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setRequestCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'friendRequests');
    });

    // Count unread notifications (broadcast or targeted)
    const notifsRef = collection(db, 'notifications');
    const qNotifs = query(
      notifsRef, 
      where('toUid', 'in', ['all', userId]),
      where('isRead', '==', false)
    );

    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setNotifCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => {
      unsubRequests();
      unsubNotifs();
    };
  }, [userId]);

  const totalUnread = requestCount + notifCount;

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted relative" 
        onClick={() => navigate('/notifications')}
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-pulse">
            {totalUnread}
          </span>
        )}
      </Button>
    </div>
  );
}
