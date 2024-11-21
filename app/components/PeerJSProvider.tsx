import React, { createContext, useContext, ReactNode } from 'react';
import usePeerJSConnection from './PeerSession';
import { User } from '@supabase/auth-helpers-nextjs';
import Peer, { DataConnection, MediaConnection } from 'peerjs';

// Define the shape of your context value
interface PeerJSContextType {
  peerRef: React.MutableRefObject<Peer | null>;
  isConnected: boolean;
  messages: { text: string; type: string; source: string }[]; // Update based on your message type
  incomingRef: React.MutableRefObject<MediaConnection | null>;
  connectionRef: React.MutableRefObject<DataConnection | null>;
}

// Create the context with a default value of `null` as undefined or null can be used as an initial state
const PeerJSContext = createContext<PeerJSContextType | null>(null);

// Provide the context to the app
export function PeerJSProvider({ user, children }: { user: User | null; children: ReactNode }) {
  const peerJS = usePeerJSConnection({ user });

  // Ensure that the context is never null by enforcing it as required for children
  return <PeerJSContext.Provider value={peerJS}>{children}</PeerJSContext.Provider>;
}

// Custom hook to use the PeerJS context
export function usePeerJS() {
  const context = useContext(PeerJSContext);

  if (context === null) {
    throw new Error('usePeerJS must be used within a PeerJSProvider');
  }

  return context;
}
