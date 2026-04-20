import React, { useState, useEffect, useRef } from 'react';
import { 
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, onSnapshot, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { handleFirestoreError, cn } from '../lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { UserProfile, OperationType } from '../types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, LogOut, ShieldCheck, Trash2, AlertTriangle, Pencil, Loader2 } from 'lucide-react';
import { isProfane } from '../lib/profanity';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import BottomNav from '../components/BottomNav';
import ChatPopup from '../components/ChatPopup';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const navigate = useNavigate();

  const avatars = [
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Bandit',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Cali',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Dusty'
  ];

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = `users/${auth.currentUser.uid}`;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setName(data.name);
        setSelectedAvatar(data.photoURL || avatars[0]);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsub();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;

    if (isProfane(name)) {
      toast.error('Display name contains inappropriate language.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: name,
        photoURL: selectedAvatar
      });
      toast.success('Profile updated!');
      setIsEditingName(false);
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !profile) return;
    if (!deletePassword) {
      toast.error('Please enter your password to confirm deletion.');
      return;
    }

    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      const uid = user.uid;
      const username = profile.username;

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // 1. Delete Firestore data first
      await deleteDoc(doc(db, 'users', uid));
      await deleteDoc(doc(db, 'usernames', username));

      // 2. Delete Auth User
      await user.delete();

      toast.success('Account deleted successfully.');
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Session expired. Please sign out and sign in again before deleting.');
      } else {
        toast.error('Failed to delete account: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans pb-12">
      <header className="bg-white border-b border-border h-16 flex items-center px-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground rounded-xl font-bold">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="font-black text-sm text-foreground uppercase tracking-widest">My Profile</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 pb-24">
        <Card className="border-border bg-white rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="text-center pb-8 border-b border-border bg-gradient-to-b from-primary/5 to-white relative">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="w-full h-full rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-primary/20 overflow-hidden border-4 border-white">
                <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              {avatars.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={cn(
                    "w-12 h-12 rounded-xl border-2 overflow-hidden aspect-square",
                    selectedAvatar === avatar ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground uppercase mt-6">{profile.name}</CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-widest text-muted-foreground mt-1">
              @{profile.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-bold text-xs uppercase tracking-wider ml-1">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={profile.username}
                    readOnly
                    className="bg-muted border-border text-muted-foreground cursor-not-allowed pr-10 rounded-xl h-12 font-medium"
                  />
                  <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name" className="text-foreground font-bold text-xs uppercase tracking-wider ml-1">Display Name</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                    onClick={() => setIsEditingName(!isEditingName)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your Name"
                  disabled={!isEditingName}
                  className={cn(
                    "bg-white border-border rounded-xl h-12 focus:ring-primary/20 text-foreground",
                    !isEditingName && "bg-muted cursor-not-allowed"
                  )}
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20" 
                  disabled={loading || (name === profile.name && selectedAvatar === (profile.photoURL || avatars[0]))}
                >
                  {loading ? 'Saving...' : 'Update Profile'}
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 rounded-xl border-border text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider"
                    onClick={() => auth.signOut()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 font-bold text-xs uppercase tracking-wider"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white rounded-3xl border-border">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive font-black uppercase tracking-widest text-lg">
                          <AlertTriangle className="w-5 h-5" />
                          Delete Account
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium text-sm">
                          This action is permanent. Your profile, username, and game history will be deleted.
                          <div className="mt-4 space-y-2">
                            <Label htmlFor="delete-password" title="Confirm Password" />
                            <Input
                              id="delete-password"
                              type="password"
                              placeholder="Enter your password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              className="rounded-xl border-destructive/20 focus:ring-destructive/20"
                            />
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-4 gap-2">
                        <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground text-xs uppercase">Cancel</Button>
                        <Button 
                          variant="destructive" 
                          className="rounded-xl font-bold text-xs uppercase"
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em] font-black">
            Wangkoii v1.0
          </p>
        </div>
      </main>
      <BottomNav setIsChatOpen={setIsChatOpen} />
      <ChatPopup isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
