import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { UserProfile, OperationType } from '../types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, LogOut, ShieldCheck, Trash2, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import { isProfane } from '../lib/profanity';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = `users/${auth.currentUser.uid}`;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setName(data.name);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsub();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Validate file type and size (e.g., max 2MB)
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: downloadURL
      });
      
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

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
        name: name
      });
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !profile) return;

    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      const uid = user.uid;
      const username = profile.username;

      // 1. Delete Firestore data first
      // We do this individually to avoid transaction issues if one fails
      await deleteDoc(doc(db, 'users', uid));
      await deleteDoc(doc(db, 'usernames', username));

      // 2. Delete Auth User
      await user.delete();

      toast.success('Account deleted successfully.');
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again to delete your account for security reasons.');
      } else {
        toast.error('Failed to delete account: ' + error.message);
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
          <Button variant="ghost" onClick={() => window.close()} className="gap-2 text-muted-foreground hover:text-foreground rounded-xl font-bold">
            <ArrowLeft className="w-4 h-4" />
            Close
          </Button>
          <h1 className="font-black text-sm text-foreground uppercase tracking-widest">My Profile</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8">
        <Card className="border-border bg-white rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="text-center pb-8 border-b border-border bg-muted/30 relative">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="w-full h-full rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-black shadow-sm overflow-hidden border-4 border-white">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile.name[0].toUpperCase()
                )}
              </div>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white text-primary border border-border shadow-md hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <CardTitle className="text-xl font-black tracking-tight text-foreground uppercase">{profile.name}</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
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
                <Label htmlFor="name" className="text-foreground font-bold text-xs uppercase tracking-wider ml-1">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your Name"
                  className="bg-white border-border rounded-xl h-12 focus:ring-primary/20 text-foreground"
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button type="submit" className="w-full h-12 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest text-sm shadow-sm" disabled={loading}>
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
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-4 gap-2">
                        <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground text-xs uppercase" onClick={() => {}}>Cancel</Button>
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
    </div>
  );
}
