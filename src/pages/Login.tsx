import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Gamepad2, Gamepad } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password.');
      } else {
        toast.error('Login failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-sans bg-background">
      <Card className="w-full max-w-md border-border bg-white rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="text-center space-y-4 pt-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto bg-primary text-white p-4 rounded-2xl w-fit shadow-sm"
          >
            <Gamepad2 className="w-10 h-10" />
          </motion.div>
          <div className="space-y-1">
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground uppercase">WANGKOII</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
              Minimal gaming for serious players
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-12 px-8">
          <form onSubmit={handleLogin} className="space-y-4">
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
            <Button 
              type="submit" 
              className="w-full h-14 text-sm font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-2xl shadow-sm transition-all mt-4"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="flex flex-col items-center gap-4 pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-black uppercase tracking-wider hover:underline">
                Register
              </Link>
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-0.5 bg-border" />
              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                60 FPS PERFORMANCE
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
