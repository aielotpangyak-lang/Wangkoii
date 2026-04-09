import { signInWithPopup, OAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Gamepad2, Apple } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed') {
        toast.error('Login failed. If you are in a preview, try opening the app in a new tab.');
      } else {
        toast.error('Google login failed: ' + error.message);
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      const appleProvider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, appleProvider);
      navigate('/');
    } catch (error: any) {
      toast.error('Apple login failed: ' + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-sans">
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
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleGoogleLogin} 
              className="w-full h-14 text-sm font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-2xl shadow-sm transition-all"
            >
              Sign in with Google
            </Button>
            
            <Button 
              onClick={handleAppleLogin} 
              variant="outline"
              className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl border-border text-foreground hover:bg-muted transition-all"
            >
              <Apple className="w-5 h-5 mr-2" />
              Sign in with Apple
            </Button>
          </div>
          
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="w-12 h-0.5 bg-border" />
            <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
              60 FPS PERFORMANCE
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
