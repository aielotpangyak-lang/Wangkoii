import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, addDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { UserProfile, GameSession, MatchHistory, OperationType } from '../types';
import ChatComponent from '../components/Chat';
import VoiceChat from '../components/VoiceChat';
import { toast } from 'sonner';
import { ArrowLeft, RotateCcw, Trophy, History, MessageSquare, Send, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';

export default function Game() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameSession | null>(null);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Sound Effects
  const moveSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const winSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));
  const loseSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'));

  useEffect(() => {
    moveSound.current.volume = 0.3;
    winSound.current.volume = 0.4;
    loseSound.current.volume = 0.3;
  }, []);

  useEffect(() => {
    if (!gameId || !userId) return;

    const path = `games/${gameId}`;
    const unsub = onSnapshot(doc(db, 'games', gameId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameSession;
        setGame({ id: docSnap.id, ...data });
        
        // Play sounds based on state changes
        if (data.status === 'finished') {
          if (data.winner === userId) {
            winSound.current.play().catch(() => {});
          } else if (data.winner && data.winner !== 'draw') {
            loseSound.current.play().catch(() => {});
          }
          loadHistory(data.players);
        }
      } else {
        toast.error('Game not found');
        navigate('/');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsub();
  }, [gameId, userId]);

  useEffect(() => {
    if (game?.players) {
      loadHistory(game.players);
    }
  }, [game?.players]);

  const loadHistory = async (players: string[]) => {
    const matchesRef = collection(db, 'matches');
    // Firestore doesn't support array-contains with multiple values easily for "exactly these two"
    // So we'll fetch matches where current user is a player and filter in memory for the opponent
    const q = query(
      matchesRef, 
      where('players', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch more to filter
    );
    
    const snapshot = await getDocs(q);
    const opponentId = players.find(p => p !== userId);
    const filtered = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as MatchHistory))
      .filter(m => m.players.includes(opponentId!))
      .slice(0, 10); // Last 10 matches with THIS person

    setHistory(filtered);
  };

  useEffect(() => {
    if (!game || game.status !== 'active' || !game.timerSetting || game.timerSetting === 'unlimited' || !game.turnStartTime) {
      setTimeLeft(null);
      return;
    }

    const timerLimit = parseInt(game.timerSetting);
    
    const interval = setInterval(() => {
      const startTime = game.turnStartTime?.toDate?.()?.getTime() || Date.now();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timerLimit - elapsed);
      
      setTimeLeft(remaining);

      if (remaining === 0 && game.turn === userId) {
        // Auto-forfeit or skip turn? Let's skip turn for now to be less punishing, 
        // but usually it's a loss. Let's do auto-move (random) if time runs out.
        handleTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.turn, game?.turnStartTime, game?.status]);

  const handleTimeout = async () => {
    if (!game || game.status !== 'active' || game.turn !== userId) return;
    
    // Make a random move if time runs out
    const availableMoves = game.board?.map((cell, i) => cell === null ? i : null).filter(i => i !== null) as number[];
    if (availableMoves.length > 0) {
      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      handleMove(randomMove);
    }
  };
  const isMyTurn = game?.turn === userId;
  const isBotTurn = game?.turn === 'bot' && game?.status === 'active';
  const [quickChat, setQuickChat] = useState('');
  const [showBubble, setShowBubble] = useState<{ uid: string, text: string } | null>(null);

  useEffect(() => {
    if (!game?.lastMessage) return;
    
    // Show bubble
    setShowBubble({ uid: game.lastMessage.uid, text: game.lastMessage.text });
    
    const timer = setTimeout(() => {
      setShowBubble(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [game?.lastMessage?.timestamp]);

  // Bot Logic
  useEffect(() => {
    if (isBotTurn && game?.isBotGame) {
      const timer = setTimeout(() => {
        makeBotMove();
      }, 1000); // Delay for realism
      return () => clearTimeout(timer);
    }
  }, [isBotTurn]);

  if (!game || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-primary font-black uppercase tracking-widest text-xs animate-pulse">Loading Game Session...</p>
        </div>
      </div>
    );
  }

  const opponentId = game.players.find(p => p !== userId);
  const opponentUsername = game.playerUsernames[opponentId!] || 'Opponent';
  const myUsername = game.playerUsernames[userId!] || 'Me';

  const sendQuickChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickChat.trim() || !gameId || !userId) return;
    
    const text = quickChat;
    setQuickChat('');
    
    await updateDoc(doc(db, 'games', gameId), {
      lastMessage: {
        uid: userId,
        text: text,
        timestamp: serverTimestamp()
      }
    });
  };

  const makeBotMove = async () => {
    if (!game.board || game.status !== 'active') return;

    const availableMoves = game.board.map((cell, i) => cell === null ? i : null).filter(i => i !== null) as number[];
    if (availableMoves.length === 0) return;

    let moveIndex: number;

    if (game.difficulty === 'easy') {
      moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    } else if (game.difficulty === 'normal') {
      // 50% chance of best move, 50% random
      if (Math.random() > 0.5) {
        moveIndex = getBestMove(game.board, 'bot');
      } else {
        moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      }
    } else {
      // Hard: Always best move
      moveIndex = getBestMove(game.board, 'bot');
    }

    handleMove(moveIndex, true);
  };

  const getBestMove = (board: (string | null)[], botId: string): number => {
    const humanId = userId!;
    
    const minimax = (tempBoard: (string | null)[], depth: number, isMaximizing: boolean): number => {
      const result = calculateWinner(tempBoard);
      if (result === botId) return 10 - depth;
      if (result === humanId) return depth - 10;
      if (tempBoard.every(cell => cell !== null)) return 0;

      if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (tempBoard[i] === null) {
            tempBoard[i] = botId;
            const score = minimax(tempBoard, depth + 1, false);
            tempBoard[i] = null;
            bestScore = Math.max(score, bestScore);
          }
        }
        return bestScore;
      } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
          if (tempBoard[i] === null) {
            tempBoard[i] = humanId;
            const score = minimax(tempBoard, depth + 1, true);
            tempBoard[i] = null;
            bestScore = Math.min(score, bestScore);
          }
        }
        return bestScore;
      }
    };

    let bestScore = -Infinity;
    let move = -1;
    const tempBoard = [...board];

    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = botId;
        const score = minimax(tempBoard, 0, false);
        tempBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const handleMove = async (index: number, isBot: boolean = false) => {
    if (!game || !userId || game.status === 'finished' || game.board?.[index]) return;
    if (!isBot && game.turn !== userId) return;

    const newBoard = [...(game.board || [])];
    newBoard[index] = game.turn!;

    const winner = calculateWinner(newBoard);
    const isDraw = !winner && newBoard.every(cell => cell !== null);

    const update: any = {
      board: newBoard,
      updatedAt: serverTimestamp(),
      turnStartTime: serverTimestamp(),
    };

    if (winner || isDraw) {
      update.status = 'finished';
      update.winner = winner || 'draw';
      
      // Save to history
      await addDoc(collection(db, 'matches'), {
        players: game.players,
        winner: winner || 'draw',
        gameType: game.type,
        createdAt: serverTimestamp()
      });
    } else {
      update.turn = game.players.find(p => p !== game.turn);
    }

    await updateDoc(doc(db, 'games', game.id), update);
    moveSound.current.play().catch(() => {});
  };

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const resetGame = async () => {
    if (!game) return;
    await updateDoc(doc(db, 'games', game.id), {
      board: Array(9).fill(null),
      status: 'active',
      winner: null,
      turn: game.players[Math.floor(Math.random() * 2)], // Random start
      turnStartTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden font-sans">
      <header className="relative z-10 bg-white border-b border-border h-16 flex items-center px-4 sticky top-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setIsExitConfirmOpen(true)} 
            className="gap-2 text-muted-foreground hover:text-foreground rounded-xl font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </Button>
          <div className="text-center">
            <h1 className="font-black text-xl tracking-tighter uppercase text-foreground">WANGKOII</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">vs @{opponentUsername}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRulesOpen(true)}
              className="rounded-xl text-muted-foreground hover:text-primary"
            >
              <Info className="w-5 h-5" />
            </Button>
            <VoiceChat opponentUid={opponentId!} />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
        {/* Game Board */}
        <div className="lg:col-span-2 flex flex-col items-center space-y-6">
          {/* Turn Indicator & Timer */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex flex-col items-center gap-4"
          >
            <div className={cn(
              "px-6 py-2 border-2 font-black uppercase tracking-widest text-sm transition-all rounded-xl",
              game.status === 'active' 
                ? (isMyTurn ? "border-primary bg-primary text-white animate-pulse" : "border-muted bg-muted text-muted-foreground")
                : "border-border bg-white text-foreground"
            )}>
              {game.status === 'active' 
                ? (isMyTurn ? "YOUR TURN" : `${opponentUsername.toUpperCase()}'S TURN`)
                : "GAME OVER"}
            </div>

            {timeLeft !== null && game.status === 'active' && (
              <motion.div 
                key={timeLeft}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-4xl font-mono font-black tracking-tighter",
                  timeLeft <= 5 ? "text-destructive animate-bounce" : "text-foreground"
                )}
              >
                {timeLeft}s
              </motion.div>
            )}
          </motion.div>

          <div className="flex items-center justify-center gap-8 w-full max-w-md">
            <div className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 relative",
              isMyTurn && game.status === 'active' ? "border-primary bg-white scale-110 shadow-lg" : "border-transparent opacity-40"
            )}>
              <AnimatePresence>
                {showBubble?.uid === userId && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -40 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-10 bg-primary text-white px-3 py-1 rounded-full shadow-md z-20 whitespace-nowrap text-xs font-black uppercase tracking-widest"
                  >
                    {showBubble.text}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-mono font-black text-xl border border-border text-foreground">X</div>
              <p className="font-bold text-[10px] uppercase tracking-widest text-foreground">{myUsername}</p>
              {isMyTurn && game.status === 'active' && <div className="absolute -bottom-2 w-2 h-2 bg-primary rounded-full animate-pulse" />}
            </div>

            <div className="text-2xl font-black text-muted-foreground/30 italic tracking-tighter">VS</div>

            <div className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 relative",
              !isMyTurn && game.status === 'active' ? "border-primary bg-white scale-110 shadow-lg" : "border-transparent opacity-40"
            )}>
              <AnimatePresence>
                {showBubble?.uid === opponentId && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -40 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-10 bg-primary text-white px-3 py-1 rounded-full shadow-md z-20 whitespace-nowrap text-xs font-black uppercase tracking-widest"
                  >
                    {showBubble.text}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-mono font-black text-xl border border-border text-foreground">O</div>
              <p className="font-bold text-[10px] uppercase tracking-widest text-foreground">{opponentUsername}</p>
              {!isMyTurn && game.status === 'active' && <div className="absolute -bottom-2 w-2 h-2 bg-muted-foreground/30 rounded-full animate-pulse" />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-border shadow-sm w-full max-w-[400px] aspect-square">
            {game.board?.map((cell, i) => (
              <motion.button
                key={i}
                whileHover={!cell && isMyTurn ? { backgroundColor: 'var(--muted)', scale: 1.02 } : {}}
                whileTap={!cell && isMyTurn ? { scale: 0.95 } : {}}
                disabled={!!cell || !isMyTurn || game.status === 'finished'}
                onClick={() => handleMove(i)}
                className={cn(
                  "bg-muted/10 rounded-xl flex items-center justify-center text-6xl font-mono font-black transition-all border border-border",
                  !cell && isMyTurn && game.status === 'active' && "cursor-pointer hover:border-primary hover:bg-muted/20",
                  cell === userId ? "text-primary" : "text-foreground",
                  cell && "bg-white shadow-inner"
                )}
              >
                {cell ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {cell === userId ? 'X' : 'O'}
                  </motion.span>
                ) : ''}
              </motion.button>
            ))}
          </div>

          {game.status === 'finished' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-md"
            >
              <Card className="bg-white text-foreground border border-border shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="pt-8 text-center space-y-6">
                  <div className="mx-auto bg-muted p-4 rounded-xl w-fit">
                    <Trophy className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-foreground">
                      {game.winner === 'draw' ? "DRAW" : (game.winner === userId ? "VICTORY" : "DEFEAT")}
                    </h2>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-3">
                      {game.winner === 'draw' ? "Nobody wins" : (game.winner === userId ? "You won" : "You lost")}
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsResetConfirmOpen(true)} 
                    className="w-full h-12 gap-3 text-sm font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-xl shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rematch
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="w-full max-w-[400px] mt-4">
            <form onSubmit={sendQuickChat} className="flex gap-2">
              <Input 
                value={quickChat}
                onChange={(e) => setQuickChat(e.target.value)}
                placeholder="QUICK MESSAGE..."
                className="h-12 bg-white border-border rounded-xl focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 uppercase text-xs font-bold tracking-widest"
                disabled={game.isBotGame}
              />
              <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90" disabled={game.isBotGame}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar: Chat & History */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[600px] lg:h-[calc(100vh-12rem)]">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted border border-border p-1 rounded-xl">
              <TabsTrigger value="chat" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-xs tracking-widest">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-xs tracking-widest">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 mt-0">
              <div className="h-full rounded-2xl overflow-hidden border border-border bg-white shadow-sm">
                <ChatComponent opponentUid={opponentId!} opponentName={opponentUsername} />
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 mt-0">
              <Card className="bg-white border-border h-full flex flex-col rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-4 border-b border-border shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2 font-black uppercase tracking-widest text-foreground">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Match History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex-1 overflow-hidden">
                  <div className="space-y-2 h-full overflow-y-auto pr-2 custom-scrollbar">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
                        <History className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No history</p>
                      </div>
                    ) : (
                      history.map((match, i) => (
                        <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs hover:border-primary transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black text-foreground border border-border">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-widest text-foreground">{match.gameType}</p>
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                {match.createdAt?.toDate ? match.createdAt.toDate().toLocaleDateString() : 'Just now'}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                              match.winner === 'draw' ? 'bg-muted text-foreground' : (match.winner === userId ? 'bg-primary text-white' : 'bg-destructive text-white')
                            )}
                          >
                            {match.winner === 'draw' ? 'Draw' : (match.winner === userId ? 'Win' : 'Loss')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Rules Modal */}
      <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <DialogContent className="bg-white border-border rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Game Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Objective</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Be the first to get <span className="font-bold text-foreground">3 marks in a row</span> (horizontally, vertically, or diagonally).
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">How to Play</p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                <li>Players take turns placing their mark (X or O) in an empty square.</li>
                <li>X always goes first in the first round.</li>
                <li>If all 9 squares are filled and no one has 3 in a row, it's a <span className="font-bold text-foreground">Draw</span>.</li>
              </ul>
            </div>
          </div>
          <Button onClick={() => setIsRulesOpen(false)} className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-11">
            Got it
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="bg-white border-border rounded-2xl max-w-xs">
          <DialogHeader className="items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <RotateCcw className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-foreground">Reset Game?</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              This will clear the current board and start a new round.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center mt-4">
            <Button variant="ghost" onClick={() => setIsResetConfirmOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button onClick={() => { resetGame(); setIsResetConfirmOpen(false); }} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation */}
      <Dialog open={isExitConfirmOpen} onOpenChange={setIsExitConfirmOpen}>
        <DialogContent className="bg-white border-border rounded-2xl max-w-xs">
          <DialogHeader className="items-center text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-foreground">Exit Game?</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Are you sure you want to leave? The game session will remain active in your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center mt-4">
            <Button variant="ghost" onClick={() => setIsExitConfirmOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Stay
            </Button>
            <Button variant="destructive" onClick={() => navigate('/')} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
