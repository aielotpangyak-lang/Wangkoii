import React, { useState } from 'react';
import { doc, setDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { generateKeyPair, exportPublicKey, saveKeyPair } from '../lib/cryptoUtils';
import { filterUsername, isProfane } from '../lib/profanity';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';

export default function Register() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    auth.signOut();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Validation (6-20 chars, lowercase alphanumeric)
    if (!filterUsername(username)) {
      toast.error('Username must be 6-20 characters (lowercase letters/numbers only).');
      return;
    }

    if (isProfane(name)) {
      toast.error('Display name contains inappropriate language.');
      return;
    }

    setLoading(true);
    try {
      // Generate E2EE Keys
      const keys = await generateKeyPair();
      const pubKeyBase64 = await exportPublicKey(keys.publicKey);
      await saveKeyPair(keys);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const usernameRef = doc(db, 'usernames', username);
      
      // Use a transaction to ensure username uniqueness
      await runTransaction(db, async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists() && usernameDoc.data()?.uid !== auth.currentUser!.uid) {
          throw new Error('Username is already taken.');
        }

        transaction.set(userRef, {
          uid: auth.currentUser!.uid,
          username,
          name,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          publicKey: pubKeyBase64
        });

        transaction.set(usernameRef, {
          uid: auth.currentUser!.uid
        });
      });

      toast.success('Profile created with E2EE!');
      navigate('/');
    } catch (error: any) {
      if (error.message === 'Username is already taken.') {
        toast.error(error.message);
      } else {
        handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-sans">
      <div className="w-full max-w-md mb-4">
        <Button variant="ghost" onClick={handleBack} className="gap-2 rounded-xl text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>
      </div>
      <Card className="w-full max-w-md border border-border rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Complete Profile</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Set your unique identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider">Username</Label>
              <Input
                id="username"
                placeholder="e.g. player123"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                6-20 chars, lowercase + numbers only.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">Display Name</Label>
              <Input
                id="name"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/10" disabled={loading}>
              {loading ? 'Saving...' : 'Start Playing'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
