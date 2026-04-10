import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceChatProps {
  opponentUid: string;
}

export default function VoiceChat({ opponentUid }: VoiceChatProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const userId = auth.currentUser?.uid;

  const callId = userId && opponentUid 
    ? [userId, opponentUid].sort().join('_') 
    : null;

  const servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
  };

  const cleanup = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (callId) {
      try {
        await deleteDoc(doc(db, 'calls', callId));
      } catch (e) {}
    }
    setIsCalling(false);
    setIsConnected(false);
  };

  const startCall = async () => {
    if (!callId || !userId) return;
    setIsCalling(true);

    try {
      pc.current = new RTCPeerConnection(servers);
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      localStream.current.getTracks().forEach(track => {
        pc.current?.addTrack(track, localStream.current!);
      });

      pc.current.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          updateDoc(doc(db, 'calls', callId), {
            candidates: arrayUnion(JSON.stringify(event.candidate.toJSON()))
          });
        }
      };

      const offerDescription = await pc.current.createOffer();
      await pc.current.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await setDoc(doc(db, 'calls', callId), { offer, candidates: [] });

      onSnapshot(doc(db, 'calls', callId), (snapshot) => {
        const data = snapshot.data();
        if (!pc.current?.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.current?.setRemoteDescription(answerDescription);
        }
      });

      onSnapshot(doc(db, 'calls', callId), (snapshot) => {
        const data = snapshot.data();
        if (data?.candidates) {
          data.candidates.forEach((candidateStr: string) => {
            const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
            pc.current?.addIceCandidate(candidate);
          });
        }
      });

    } catch (err) {
      console.error(err);
      toast.error("Could not start voice chat. Check microphone permissions.");
      cleanup();
    }
  };

  const joinCall = async () => {
    if (!callId || !userId) return;
    setIsCalling(true);

    try {
      pc.current = new RTCPeerConnection(servers);
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      localStream.current.getTracks().forEach(track => {
        pc.current?.addTrack(track, localStream.current!);
      });

      pc.current.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          updateDoc(doc(db, 'calls', callId), {
            candidates: arrayUnion(JSON.stringify(event.candidate.toJSON()))
          });
        }
      };

      const callDoc = await getDoc(doc(db, 'calls', callId));
      const callData = callDoc.data();

      if (!callData?.offer) return;

      const offerDescription = new RTCSessionDescription(callData.offer);
      await pc.current.setRemoteDescription(offerDescription);

      const answerDescription = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answerDescription);

      const answer = {
        sdp: answerDescription.sdp,
        type: answerDescription.type,
      };

      await updateDoc(doc(db, 'calls', callId), { answer });

      onSnapshot(doc(db, 'calls', callId), (snapshot) => {
        const data = snapshot.data();
        if (data?.candidates) {
          data.candidates.forEach((candidateStr: string) => {
            const candidate = new RTCIceCandidate(JSON.parse(candidateStr));
            pc.current?.addIceCandidate(candidate);
          });
        }
      });

    } catch (err) {
      console.error(err);
      toast.error("Could not join voice chat.");
      cleanup();
    }
  };

  useEffect(() => {
    if (!callId) return;

    const path = `calls/${callId}`;
    const unsub = onSnapshot(doc(db, 'calls', callId), (snapshot) => {
      if (!snapshot.exists() && isCalling) {
        cleanup();
      } else if (snapshot.exists() && !isCalling && snapshot.data()?.offer && !snapshot.data()?.answer) {
        // Incoming call detected
        toast.info("Incoming voice chat...", {
          action: {
            label: "Join",
            onClick: () => joinCall()
          }
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => {
      unsub();
      cleanup();
    };
  }, [callId, isCalling]);

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  if (opponentUid === 'bot') return null;

  return (
    <div className="flex items-center gap-2">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {isCalling ? (
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-1.5 shadow-sm animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 mr-2">
            <div className={isConnected ? "w-2 h-2 bg-green-500 rounded-full animate-pulse" : "w-2 h-2 bg-muted-foreground/30 rounded-full"} />
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground">
              {isConnected ? "Live" : "Calling"}
            </span>
          </div>
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-lg hover:bg-muted" 
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
          </Button>
          
          <Button 
            size="icon" 
            className="h-8 w-8 rounded-lg bg-destructive text-white hover:bg-destructive/90 shadow-sm" 
            onClick={cleanup}
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button 
          size="icon" 
          variant="outline" 
          className="h-10 w-10 rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm" 
          onClick={startCall}
        >
          <Phone className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
