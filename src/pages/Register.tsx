import React, { useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { generateKeyPair, exportPublicKey, saveKeyPair } from '../lib/cryptoUtils';
import { filterUsername, isProfane } from '../lib/profanity';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { motion } from 'motion/react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only alphabet, remove anything else
    const value = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
    setUsername(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filterUsername(username)) {
      toast.error('Username must be 6-20 characters (letters only).');
      return;
    }

    if (isProfane(name)) {
      toast.error('Display name contains inappropriate language.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Generate E2EE Keys
      const keys = await generateKeyPair();
      const pubKeyBase64 = await exportPublicKey(keys.publicKey);
      await saveKeyPair(keys);

      // 3. Set Profile and Username Tracker
      const userRef = doc(db, 'users', user.uid);
      const usernameRef = doc(db, 'usernames', username);
      
      await runTransaction(db, async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists()) {
          throw new Error('Username is already taken.');
        }

        transaction.set(userRef, {
          uid: user.uid,
          username,
          name,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          publicKey: pubKeyBase64
        });

        transaction.set(usernameRef, {
          uid: user.uid
        });
      });

      toast.success('Account created successfully!');
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already in use.');
      } else if (error.message === 'Username is already taken.') {
        toast.error(error.message);
      } else {
        toast.error('Registration failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-sans">
      <Card className="w-full max-w-md border border-border bg-white rounded-3xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto bg-primary text-white p-4 rounded-2xl w-fit shadow-sm"
          >
            <Gamepad2 className="w-10 h-10" />
          </motion.div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight uppercase">Join Wangkoii</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Create your unique identity
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider ml-1">Username</Label>
              <Input
                id="username"
                placeholder="letters only (6-20 chars)"
                value={username}
                onChange={handleUsernameChange}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pl-1">
                Alphabet only. Minimum 6 letters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider ml-1">Display Name</Label>
              <Input
                id="name"
                placeholder="How you appear to others"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider ml-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider ml-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl h-12 border-border focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className="w-full h-14 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/10 mt-2" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-4 pt-6">
            <p className="text-xs text-muted-foreground font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-black uppercase tracking-wider hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
