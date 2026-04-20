import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Notification, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Bell, Send, Trash2, CheckCircle2, Info, CreditCard, Newspaper, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationsPage() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'news' | 'payment' | 'system'>('news');
  const [targetUid, setTargetUid] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUid', 'in', ['all', user.uid]),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        type,
        toUid: targetUid,
        isRead: false,
        createdAt: serverTimestamp()
      });
      toast.success('Notification sent successfully');
      setTitle('');
      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        isRead: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'news': return <Newspaper className="w-5 h-5 text-blue-500" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'friend_request': return <Bell className="w-5 h-5 text-pink-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Bell className="w-8 h-8 text-pink-500" />
          Notifications
        </h1>
      </div>

      {isAdmin && (
        <Card className="border-2 border-pink-100 bg-pink-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-pink-500" />
              Admin: Send Notification
            </CardTitle>
            <CardDescription>Broadcast news or send targeted updates to users.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex gap-2">
                    {(['news', 'payment', 'system'] as const).map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={type === t ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setType(t)}
                        className="capitalize flex-1"
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target User ID</Label>
                  <Input 
                    placeholder="'all' or specific UID" 
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  placeholder="Notification Title" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input 
                  placeholder="What's the update?" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600" disabled={sending}>
                {sending ? 'Sending...' : 'Send Notification'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-primary font-black uppercase tracking-widest text-[10px] animate-pulse">
                Loading Notifications...
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No notifications yet. Check back later!</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className={`relative overflow-hidden transition-all ${!notif.isRead ? 'border-pink-200 bg-pink-50/10' : ''}`}>
                  {!notif.isRead && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="mt-1">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold ${!notif.isRead ? 'text-pink-900' : 'text-foreground'}`}>
                            {notif.title}
                          </h3>
                          <span className="text-[10px] text-muted-foreground">
                            {notif.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {notif.message}
                        </p>
                        {!notif.isRead && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50 mt-2"
                            onClick={() => markAsRead(notif.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
