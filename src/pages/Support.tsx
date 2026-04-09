import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/InputTemp';
import { ArrowLeft, Coffee, Smartphone, QrCode, CheckCircle2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const PRESET_AMOUNTS = [20, 50, 100, 200];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;
const UPI_ID = 'aielot@airtel';

export default function SupportPage() {
  const [amount, setAmount] = useState<string>('50');
  const [showPayment, setShowPayment] = useState(false);
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        }
      }
    };
    fetchUser();
  }, []);

  const handleAmountChange = (val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setAmount(val);
  };

  const currentAmount = parseInt(amount) || 0;
  const isValid = currentAmount >= MIN_AMOUNT && currentAmount <= MAX_AMOUNT;

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Wangkoii&am=${currentAmount}&cu=INR`;

  const submitUtr = async () => {
    if (!utr.trim() || utr.length < 6) {
      toast.error("Please enter a valid UTR/Reference number");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payments'), {
        uid: auth.currentUser?.uid || 'anonymous',
        name: userName || 'Anonymous',
        amount: currentAmount,
        utr: utr,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      toast.success("Payment details submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit payment details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans">
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-32">
        <header className="flex items-center gap-4 mb-12">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">SUPPORT ME</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Keep the games running</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!showPayment ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="bg-white border-border rounded-3xl shadow-lg overflow-hidden">
                <CardHeader className="text-center pt-10 pb-6">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                    <Coffee className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Buy me a chai</CardTitle>
                  <p className="text-muted-foreground font-medium px-8 text-sm">
                    {userName ? `Hey ${userName}, your support helps me maintain Wangkoii!` : "Your support helps me maintain Wangkoii!"}
                  </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_AMOUNTS.map((amt) => (
                      <Button
                        key={amt}
                        variant={currentAmount === amt ? 'default' : 'outline'}
                        onClick={() => setAmount(amt.toString())}
                        className={`h-12 rounded-xl font-black text-base transition-all ${
                          currentAmount === amt 
                            ? 'bg-primary text-white' 
                            : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        ₹{amt}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Custom Amount (₹{MIN_AMOUNT} - ₹50,000)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50 text-xl">₹</span>
                      <Input
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Enter amount"
                        className="h-14 pl-10 bg-muted/30 border-border rounded-xl text-xl font-black text-foreground focus:ring-primary/20"
                      />
                    </div>
                    {currentAmount > 0 && currentAmount < MIN_AMOUNT && (
                      <p className="text-destructive text-[10px] font-bold uppercase tracking-widest ml-1">Minimum amount is ₹{MIN_AMOUNT}</p>
                    )}
                    {currentAmount > MAX_AMOUNT && (
                      <p className="text-destructive text-[10px] font-bold uppercase tracking-widest ml-1">Maximum amount is ₹50,000</p>
                    )}
                  </div>

                  <div className="pt-4 grid grid-cols-1 gap-3">
                    <Button
                      disabled={!isValid}
                      onClick={() => setShowPayment(true)}
                      className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg uppercase tracking-widest shadow-sm disabled:opacity-50"
                    >
                      Go Pay ₹{currentAmount || 0}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-12"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground">We're checking it</h2>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                Thank you for trusting us, {userName}! Your payment reference is being verified. You will receive a notification once approved.
              </p>
              <Button 
                onClick={() => navigate('/')}
                className="mt-8 h-12 px-8 rounded-xl bg-primary text-white font-bold uppercase tracking-widest"
              >
                Back to Game
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="bg-white border-border rounded-3xl shadow-lg overflow-hidden text-center">
                <CardHeader className="pt-10 pb-6 bg-muted/10 border-b border-border">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Notice Board</h3>
                  <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Scan QR or Tap to Pay directly</p>
                </CardHeader>
                <CardContent className="px-8 py-8 flex flex-col items-center gap-8">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-border">
                    <QRCodeSVG 
                      value={upiLink} 
                      size={200}
                      fgColor="#000000"
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  <div className="w-full space-y-4">
                    <a 
                      href={upiLink}
                      className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-base flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95 uppercase tracking-widest"
                    >
                      <Smartphone className="w-5 h-5" />
                      Tap to Pay Directly
                    </a>

                    <div className="pt-6 border-t border-border space-y-4">
                      <div className="text-left space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Submit UTR / Reference Number</label>
                        <Input
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          placeholder="Enter 12-digit UTR number"
                          className="h-14 bg-muted/30 border-border rounded-xl text-sm font-bold text-foreground focus:ring-primary/20"
                        />
                      </div>
                      <Button
                        onClick={submitUtr}
                        disabled={isSubmitting || !utr.trim()}
                        className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black text-sm flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
                      >
                        {isSubmitting ? "Submitting..." : (
                          <>
                            Submit UTR <Send className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setShowPayment(false)}
                      className="w-full text-muted-foreground font-bold hover:text-foreground uppercase text-[10px] tracking-widest rounded-xl mt-4"
                    >
                      Change Amount
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
