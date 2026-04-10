export interface UserProfile {
  uid: string;
  username: string;
  name: string;
  isOnline?: boolean;
  lastSeen?: any;
  publicKey?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
}

export interface Challenge {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'declined';
  gameType: string;
  timerSetting?: '15' | '30' | '60' | 'unlimited';
  createdAt: any;
}

export interface GameSession {
  id: string;
  type: string;
  players: string[];
  playerUsernames: Record<string, string>;
  status: 'active' | 'finished';
  board?: (string | null)[];
  turn?: string;
  winner?: string | null;
  difficulty?: 'easy' | 'normal' | 'hard';
  timerSetting?: '15' | '30' | '60' | 'unlimited';
  turnStartTime?: any;
  isBotGame?: boolean;
  lastMessage?: {
    uid: string;
    text: string;
    timestamp: any;
  };
  createdAt: any;
  updatedAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export interface MatchHistory {
  id: string;
  players: string[];
  winner: string | null;
  gameType: string;
  createdAt: any;
}

export interface Message {
  id: string;
  senderUid: string;
  receiverUid: string;
  text: string;
  createdAt: any;
  isRead?: boolean;
}

export interface Notification {
  id: string;
  type: 'news' | 'payment' | 'system' | 'friend_request';
  title: string;
  message: string;
  toUid: string; // 'all' for broadcast or specific userId
  isRead: boolean;
  createdAt: any;
}
