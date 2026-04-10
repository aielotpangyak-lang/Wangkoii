import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/Dialog";
import { UserProfile, Challenge, GameSession, OperationType } from '../types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, User, Swords, Play, LogOut, UserCircle, Bot, ChevronDown, Gamepad2, Home, MessageSquare, X, Trophy, Trash2, MoreVertical, Eye, UserPlus } from 'lucide-react';
import { cn, handleFirestoreError } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeGames, setActiveGames] = useState<GameSession[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [timerSetting, setTimerSetting] = useState<'15' | '30' | '60' | 'unlimited'>('unlimited');
  const navigate = useNavigate();

  const randomOnlinePlayers = useMemo(() => {
    return users
      .filter(u => u.isOnline)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
  }, [users, isSearchOpen]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Current user profile
    const userPath = `users/${auth.currentUser.uid}`;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) setCurrentUserProfile(doc.data() as UserProfile);
    }, (error) => handleFirestoreError(error, OperationType.GET, userPath));

    // All users (for searching)
    const usersPath = 'users';
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const uList = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid);
      setUsers(uList);
    }, (error) => handleFirestoreError(error, OperationType.GET, usersPath));

    // Incoming challenges
    const challengesPath = 'challenges';
    const challengesRef = collection(db, 'challenges');
    const qChallenges = query(challengesRef, where('toUid', '==', auth.currentUser.uid), where('status', '==', 'pending'));
    const unsubChallenges = onSnapshot(qChallenges, (snapshot) => {
      setChallenges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge)));
    }, (error) => handleFirestoreError(error, OperationType.GET, challengesPath));

    // Active games
    const gamesPath = 'games';
    const gamesRef = collection(db, 'games');
    const qGames = query(gamesRef, where('players', 'array-contains', auth.currentUser.uid), where('status', '==', 'active'));
    const unsubGames = onSnapshot(qGames, (snapshot) => {
      setActiveGames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession)));
    }, (error) => handleFirestoreError(error, OperationType.GET, gamesPath));

    // Notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const notificationsPath = 'notifications';
    const notificationsRef = collection(db, 'notifications');
    const qNotifications = query(notificationsRef, where('toUid', '==', auth.currentUser.uid));
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (Notification.permission === "granted") {
            const message = data.type === 'challenge' 
              ? `${data.fromName} challenged you to a game!` 
              : `${data.fromName} invited you to play!`;
            new Notification("Wangkoii", {
              body: message,
              icon: "/favicon.ico"
            });
          }
          const toastMessage = data.type === 'challenge' 
            ? `${data.fromName} challenged you!` 
            : `${data.fromName} invited you to play!`;
          toast.info(toastMessage);
          // Optionally delete the notification document after showing
          deleteDoc(doc(db, 'notifications', change.doc.id)).catch(err => 
            handleFirestoreError(err, OperationType.DELETE, `notifications/${change.doc.id}`)
          );
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, notificationsPath));

    return () => {
      unsubUser();
      unsubUsers();
      unsubChallenges();
      unsubGames();
      unsubNotifications();
    };
  }, []);

  const sendInvite = async (toUser: UserProfile) => {
    if (!auth.currentUser || !currentUserProfile) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        toUid: toUser.uid,
        fromName: currentUserProfile.name,
        type: 'invite',
        createdAt: serverTimestamp()
      });
      toast.success(`Invite sent to ${toUser.name}`);
    } catch (error) {
      toast.error('Failed to send invite');
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, 'games', gameId));
      // No toast for cleaner UI
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Fallback if permission denied or other error
      toast.error('Could not delete session. It might already be gone.');
    }
  };

  const cleanupActiveGames = async () => {
    if (activeGames.length > 0) {
      const deletePromises = activeGames.map(game => deleteDoc(doc(db, 'games', game.id)));
      await Promise.all(deletePromises);
    }
  };

  const startBotGame = async (difficulty: 'easy' | 'normal' | 'hard') => {
    if (!auth.currentUser || !currentUserProfile) return;
    try {
      await cleanupActiveGames();
      const gameRef = await addDoc(collection(db, 'games'), {
        type: 'Tic Tac Toe',
        players: [auth.currentUser.uid, 'bot'],
        playerUsernames: {
          [auth.currentUser.uid]: currentUserProfile.username,
          'bot': `Computer (${difficulty})`
        },
        status: 'active',
        board: Array(9).fill(null),
        turn: auth.currentUser.uid,
        difficulty,
        isBotGame: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/game/${gameRef.id}`);
      setIsBotModalOpen(false);
    } catch (error: any) {
      toast.error('Failed to start bot game');
    }
  };

  const sendChallenge = async () => {
    if (!auth.currentUser || !currentUserProfile || !selectedUser) return;
    try {
      // 1. Create Challenge
      await addDoc(collection(db, 'challenges'), {
        fromUid: auth.currentUser.uid,
        fromUsername: currentUserProfile.username,
        toUid: selectedUser.uid,
        status: 'pending',
        gameType: 'Tic Tac Toe',
        timerSetting: timerSetting,
        createdAt: serverTimestamp()
      });

      // 2. Send Notification for immediate feedback
      await addDoc(collection(db, 'notifications'), {
        toUid: selectedUser.uid,
        fromName: currentUserProfile.name,
        type: 'challenge',
        createdAt: serverTimestamp()
      });

      toast.success(`Challenge sent to ${selectedUser.name}`);
      setIsChallengeModalOpen(false);
      setIsSearchOpen(false);
    } catch (error: any) {
      toast.error('Failed to send challenge');
    }
  };

  const openChallengeModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsChallengeModalOpen(true);
  };

  const openProfileModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const acceptChallenge = async (challenge: Challenge) => {
    try {
      await cleanupActiveGames();
      // 1. Create Game
      const gameRef = await addDoc(collection(db, 'games'), {
        type: challenge.gameType,
        players: [challenge.fromUid, challenge.toUid],
        playerUsernames: {
          [challenge.fromUid]: challenge.fromUsername,
          [challenge.toUid]: currentUserProfile?.username || 'Opponent'
        },
        status: 'active',
        board: Array(9).fill(null),
        turn: challenge.fromUid, // Challenger starts
        timerSetting: challenge.timerSetting || 'unlimited',
        turnStartTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Update Challenge
      await updateDoc(doc(db, 'challenges', challenge.id), {
        status: 'accepted'
      });

      navigate(`/game/${gameRef.id}`);
    } catch (error: any) {
      toast.error('Failed to accept challenge');
    }
  };

  const declineChallenge = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'declined'
      });
    } catch (error: any) {
      toast.error('Failed to decline challenge');
    }
  };

  useEffect(() => {
    if (search) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [search]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans">
      {/* Main Content - Centered */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-32">
        <div className="flex flex-col items-center mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white p-4 mb-4 border border-border shadow-sm rounded-2xl"
          >
            <Gamepad2 className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter mb-1 text-foreground">
            WANGKOII
          </h1>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase">Minimal Gaming Portal</p>
        </div>
        <div className="space-y-6">
          {/* Active Games Section */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-widest">
                <Play className="w-3 h-3 text-primary" />
                Active Sessions
              </h2>
              <Badge variant="outline" className="bg-white border-border text-foreground rounded-full px-3">
                {activeGames.length}
              </Badge>
            </div>
            
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {activeGames.length > 0 ? (
                  activeGames.map((game) => (
                    <motion.div
                      key={game.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="bg-white border-border hover:border-primary transition-all cursor-pointer group overflow-hidden rounded-2xl shadow-sm" onClick={() => navigate(`/game/${game.id}`)}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-muted flex items-center justify-center border border-border rounded-xl group-hover:bg-primary/10 transition-colors">
                              <Trophy className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{game.type}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                vs {Object.values(game.playerUsernames).find(u => u !== currentUserProfile?.username)}
                              </p>
                            </div>
                          </div>
                            <div className="flex items-center gap-2">
                              {game.turn === auth.currentUser?.uid && (
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                              )}
              <Button 
                size="sm" 
                variant="outline"
                className="rounded-xl border-border hover:border-primary font-bold text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/game/${game.id}`);
                }}
              >
                PLAY
              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGame(game.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white/40 rounded-3xl border-2 border-dashed border-pink-200"
                  >
                    <p className="text-pink-400 text-sm font-medium">No active games. Start one below!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Challenges Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold flex items-center gap-2 text-pink-700">
                <Swords className="w-4 h-4 text-pink-500" />
                Pending Challenges
              </h2>
              {challenges.length > 0 && (
                <Badge className="bg-pink-600 text-white border-none font-bold">
                  {challenges.length} NEW
                </Badge>
              )}
            </div>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {challenges.map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className="bg-white/70 border-white backdrop-blur-md rounded-3xl soft-shadow">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-pink-600" />
                          </div>
                          <div>
                            <p className="font-bold text-pink-900">{challenge.fromUsername}</p>
                            <p className="text-xs text-pink-500 font-medium">wants to play {challenge.gameType}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl font-bold"
                            onClick={() => declineChallenge(challenge.id)}
                          >
                            Decline
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-pink-600 text-white hover:bg-pink-700 rounded-xl font-bold"
                            onClick={() => acceptChallenge(challenge)}
                          >
                            Accept
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {challenges.length === 0 && (
                <div className="text-center py-8 text-pink-300 text-sm font-medium italic">
                  No pending challenges
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-border p-1.5 flex items-center justify-between shadow-2xl rounded-2xl">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={() => setIsBotModalOpen(true)}
            >
              <Bot className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={() => navigate('/chat')}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>

          <Button 
            variant="outline"
            className="w-12 h-12 rounded-xl border-border text-foreground hover:bg-muted shadow-sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Home className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted overflow-hidden"
              onClick={() => navigate('/profile')}
            >
              {currentUserProfile?.photoURL ? (
                <img src={currentUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Search & Online Players Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border-pink-100 text-pink-950 sm:max-w-md rounded-3xl p-0 overflow-hidden soft-shadow">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-pink-600">Find Players</DialogTitle>
            </DialogHeader>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
              <Input 
                placeholder="Search by username..." 
                className="pl-11 pr-11 bg-pink-50/50 border-pink-100 h-12 rounded-2xl focus:ring-pink-200 text-pink-900 placeholder:text-pink-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                </div>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {search ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-pink-400 px-1">Search Results</p>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/30 border border-pink-100 hover:bg-pink-50 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : <User className="w-5 h-5 text-pink-400" />}
                              </div>
                              {user.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-pink-900">{user.name}</p>
                              <p className="text-xs text-pink-400 font-medium">@{user.username}</p>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-100">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-pink-100 rounded-xl shadow-xl">
                              <DropdownMenuItem onClick={() => openChallengeModal(user)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                <Swords className="w-4 h-4" />
                                Invite to Play
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/chat/${user.uid}`)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                <MessageSquare className="w-4 h-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProfileModal(user)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                <Eye className="w-4 h-4" />
                                View Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-pink-300 text-sm font-medium">No players found</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-pink-400 px-1">Online Now</p>
                      <div className="grid gap-3">
                        {randomOnlinePlayers.map(user => (
                          <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/30 border border-pink-100 group">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                                  {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : <User className="w-5 h-5 text-pink-400" />}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-pink-900">{user.name}</p>
                                <p className="text-xs text-green-500 font-bold uppercase tracking-widest text-[8px]">Online</p>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-pink-400 hover:text-pink-600 hover:bg-pink-100">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-pink-100 rounded-xl shadow-xl">
                                <DropdownMenuItem onClick={() => openChallengeModal(user)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                  <Swords className="w-4 h-4" />
                                  Invite to Play
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/chat/${user.uid}`)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                  <MessageSquare className="w-4 h-4" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openProfileModal(user)} className="gap-2 font-bold text-pink-700 focus:bg-pink-50 focus:text-pink-900 cursor-pointer">
                                  <Eye className="w-4 h-4" />
                                  View Profile
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Settings Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border-pink-100 text-pink-950 sm:max-w-md rounded-3xl p-6 soft-shadow">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight mb-4 text-pink-600">Challenge Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-pink-400 px-1">Select Turn Timer</p>
              <div className="grid grid-cols-2 gap-2">
                {(['15', '30', '60', 'unlimited'] as const).map((t) => (
                  <Button
                    key={t}
                    variant={timerSetting === t ? 'default' : 'outline'}
                    className={cn(
                      "rounded-xl font-bold uppercase text-xs tracking-widest h-12",
                      timerSetting === t ? "bg-pink-600 text-white" : "border-pink-100 text-pink-600 hover:bg-pink-50"
                    )}
                    onClick={() => setTimerSetting(t)}
                  >
                    {t === 'unlimited' ? 'No Limit' : `${t}s`}
                  </Button>
                ))}
              </div>
            </div>
            <Button 
              className="w-full h-14 bg-pink-600 text-white hover:bg-pink-700 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-pink-100"
              onClick={sendChallenge}
            >
              Send Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bot Game Selection Modal */}
      <Dialog open={isBotModalOpen} onOpenChange={setIsBotModalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border-pink-100 text-pink-950 sm:max-w-md rounded-3xl p-6 soft-shadow">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight mb-4 text-pink-600">Play with Bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-pink-400 font-medium mb-6">Select your challenge level. The bot will adapt to your skill.</p>
            <div className="grid gap-3">
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl border-pink-100 bg-pink-50/30 hover:bg-pink-50 hover:border-pink-200 justify-between px-6 group"
                onClick={() => startBotGame('easy')}
              >
                <div className="text-left">
                  <p className="font-bold text-pink-900">Easy Mode</p>
                  <p className="text-xs text-pink-400 font-medium">Perfect for practice</p>
                </div>
                <Badge className="bg-pink-100 text-pink-600 border-none font-bold">LVL 1</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl border-pink-100 bg-pink-50/30 hover:bg-pink-50 hover:border-pink-200 justify-between px-6 group"
                onClick={() => startBotGame('normal')}
              >
                <div className="text-left">
                  <p className="font-bold text-pink-900">Normal Mode</p>
                  <p className="text-xs text-pink-400 font-medium">A fair challenge</p>
                </div>
                <Badge className="bg-pink-200 text-pink-700 border-none font-bold">LVL 2</Badge>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl border-pink-100 bg-pink-50/30 hover:bg-pink-50 hover:border-pink-200 justify-between px-6 group"
                onClick={() => startBotGame('hard')}
              >
                <div className="text-left">
                  <p className="font-bold text-pink-900">Hard Mode</p>
                  <p className="text-xs text-pink-400 font-medium">Master level AI</p>
                </div>
                <Badge className="bg-pink-600 text-white border-none font-bold">LVL 3</Badge>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Info Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="bg-white border-pink-100 text-pink-950 sm:max-w-sm rounded-3xl p-0 overflow-hidden soft-shadow">
          {selectedUser && (
            <div className="flex flex-col">
              <div className="h-32 bg-pink-600 relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg">
                    <div className="w-full h-full rounded-2xl bg-pink-100 flex items-center justify-center overflow-hidden">
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : <User className="w-10 h-10 text-pink-400" />}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-16 pb-8 px-8 text-center space-y-4">
                <div>
                  <h3 className="text-2xl font-black text-pink-900 uppercase tracking-tight">{selectedUser.name}</h3>
                  <p className="text-sm text-pink-400 font-bold uppercase tracking-widest">@{selectedUser.username}</p>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Badge className={cn(
                    "rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-widest border-none",
                    selectedUser.isOnline ? "bg-green-100 text-green-600" : "bg-pink-50 text-pink-300"
                  )}>
                    {selectedUser.isOnline ? "Online Now" : "Offline"}
                  </Badge>
                </div>

                <div className="pt-4 grid grid-cols-1 gap-2">
                  <Button 
                    className="w-full h-12 bg-pink-600 text-white hover:bg-pink-700 rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      openChallengeModal(selectedUser);
                    }}
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Challenge Player
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-12 border-pink-100 text-pink-600 hover:bg-pink-50 rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      navigate(`/chat/${selectedUser.uid}`);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-12 border-pink-100 text-pink-600 hover:bg-pink-50 rounded-2xl font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsProfileModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
