import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Settings, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
  'Poppins', 'Oswald', 'Raleway', 'Nunito', 'Ubuntu',
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif',
  'Space Grotesk', 'JetBrains Mono', 'Fira Code', 'Inconsolata',
  'Quicksand', 'Titillium Web', 'Josefin Sans', 'Dosis',
  'Cabin', 'Anton', 'Dancing Script'
];

export default function AdminPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [appName, setAppName] = useState('WANGKOII');
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.currentUser?.email !== 'aielotpangyak@gmail.com') {
      navigate('/');
      return;
    }

    // Fetch Settings
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.appName) setAppName(data.appName);
        if (data.font) setSelectedFont(data.font);
      }
    };
    fetchSettings();

    // Listen to Payments
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(data);
    });

    return () => unsub();
  }, [navigate]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        appName,
        font: selectedFont,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const approvePayment = async (paymentId: string, uid: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // Send Notification to user
      if (uid && uid !== 'anonymous') {
        await addDoc(collection(db, 'notifications'), {
          toUid: uid,
          fromName: 'Admin',
          type: 'system',
          message: `Thank you for trusting ${appName}! Your payment of ₹${amount} has been approved.`,
          createdAt: serverTimestamp()
        });
      }

      toast.success("Payment approved");
    } catch (error) {
      toast.error("Failed to approve payment");
    }
  };

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans pb-12">
      <header className="bg-white border-b border-border h-16 flex items-center px-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground rounded-xl font-bold">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="font-black text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4" /> Admin Panel
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <Card className="border-border bg-white rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-lg font-black tracking-tight text-foreground uppercase">Global Settings</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">App Name</label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="h-12 bg-muted/30 border-border rounded-xl font-bold text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">App Font</label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="w-full h-12 px-3 bg-muted/30 border border-border rounded-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {FONTS.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
              </select>
            </div>
            <Button onClick={saveSettings} disabled={isSaving} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase tracking-widest">
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-white rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight text-foreground uppercase flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground font-bold text-xs uppercase tracking-widest py-8">No payments found</p>
              ) : (
                payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                    <div>
                      <p className="font-bold text-foreground text-sm">{payment.name} <span className="text-muted-foreground font-normal">paid</span> ₹{payment.amount}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">UTR: {payment.utr}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleString() : ''}
                      </p>
                    </div>
                    <div>
                      {payment.status === 'approved' ? (
                        <div className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-4 h-4" /> Approved
                        </div>
                      ) : (
                        <Button 
                          onClick={() => approvePayment(payment.id, payment.uid, payment.amount)}
                          className="h-9 px-4 bg-primary text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary/90"
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
