import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Coffee, Smartphone, QrCode, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [20, 50, 100, 200];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;
const UPI_ID = 'aielot@airtel';

export default function SupportPage() {
  const [amount, setAmount] = useState<string>('50');
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  const handleAmountChange = (val: string) => {
    // Only allow numbers
    if (val !== '' && !/^\d+$/.test(val)) return;
    setAmount(val);
  };

  const currentAmount = parseInt(amount) || 0;
  const isValid = currentAmount >= MIN_AMOUNT && currentAmount <= MAX_AMOUNT;

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Wangkoii&am=${currentAmount}&cu=INR`;

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans">
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-32">
        <header className="flex items-center gap-4 mb-12">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.close()}
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
                  <p className="text-muted-foreground font-medium px-8 text-sm">Your support helps me maintain and add new features to Wangkoii!</p>
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

                  <Button
                    disabled={!isValid}
                    onClick={() => setShowPayment(true)}
                    className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg uppercase tracking-widest shadow-sm disabled:opacity-50"
                  >
                    Proceed to Pay ₹{currentAmount || 0}
                  </Button>
                </CardContent>
              </Card>
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
                <CardHeader className="pt-10 pb-6">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Scan to Pay</h3>
                  <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Amount: ₹{currentAmount}</p>
                </CardHeader>
                <CardContent className="px-8 pb-10 flex flex-col items-center gap-8">
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
                    <div className="flex items-center gap-4 text-left p-4 bg-muted/30 rounded-2xl border border-border">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-border">
                        <QrCode className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">UPI ID</p>
                        <p className="font-bold text-foreground text-sm">{UPI_ID}</p>
                      </div>
                    </div>

                    <a 
                      href={upiLink}
                      className="w-full h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-base flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95 uppercase tracking-widest"
                    >
                      <Smartphone className="w-5 h-5" />
                      Open UPI App
                    </a>

                    <Button
                      variant="ghost"
                      onClick={() => setShowPayment(false)}
                      className="w-full text-muted-foreground font-bold hover:text-foreground uppercase text-[10px] tracking-widest rounded-xl"
                    >
                      Change Amount
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-muted/30 border border-border p-4 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Secure UPI Payment via trusted apps</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
