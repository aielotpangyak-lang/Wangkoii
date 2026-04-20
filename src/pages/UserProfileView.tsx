import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, addDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, User, MessageSquare, Swords, UserPlus, UserMinus, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UserProfileView() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      }
    };
    fetchProfile();

    if (!userId) return;

    // Check friendship status
    const checkStatus = async () => {
      const friendshipsRef = collection(db, 'friendships');
      const qFriend = query(friendshipsRef, where('uid1', '==', userId), where('uid2', '==', uid));
      const friendSnap = await getDocs(qFriend);
      if (!friendSnap.empty) {
        setFriendStatus('friends');
        return;
      }

      const requestsRef = collection(db, 'friendRequests');
      const qReq = query(requestsRef, where('fromUid', '==', userId), where('toUid', '==', uid), where('status', '==', 'pending'));
      const reqSnap = await getDocs(qReq);
      if (!reqSnap.empty) {
        setFriendStatus('pending');
        setRequestId(reqSnap.docs[0].id);
      }
    };
    checkStatus();
  }, [uid, userId]);

  const sendFriendRequest = async () => {
    if (!userId || !uid) return;
    try {
      const docRef = await addDoc(collection(db, 'friendRequests'), {
        fromUid: userId,
        toUid: uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setFriendStatus('pending');
      setRequestId(docRef.id);
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error('Failed to send friend request.');
    }
  };

  const cancelFriendRequest = async () => {
    if (!requestId) return;
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      setFriendStatus('none');
      setRequestId(null);
      toast.success('Friend request cancelled.');
    } catch (error) {
      toast.error('Failed to cancel friend request.');
    }
  };

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <div className="text-primary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Loading Profile...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
        <h1 className="text-xl font-black uppercase">Profile</h1>
      </header>
      <Card className="w-full max-w-md rounded-3xl p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center overflow-hidden">
          {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover aspect-square" /> : <User className="w-12 h-12 text-muted-foreground" />}
        </div>
        <h2 className="text-2xl font-black">{profile.name}</h2>
        <p className="text-muted-foreground mb-6">@{profile.username}</p>
        
        {friendStatus === 'none' && (
          <Button onClick={sendFriendRequest} className="w-full rounded-xl gap-2">
            <UserPlus className="w-4 h-4" /> Add Friend
          </Button>
        )}
        {friendStatus === 'pending' && (
          <Button onClick={cancelFriendRequest} variant="outline" className="w-full rounded-xl gap-2">
            <UserMinus className="w-4 h-4" /> Cancel Request
          </Button>
        )}
        {friendStatus === 'friends' && (
          <Button onClick={() => navigate(`/chat/${uid}`)} className="w-full rounded-xl gap-2">
            <MessageSquare className="w-4 h-4" /> Message
          </Button>
        )}
      </Card>
    </div>
  );
}
