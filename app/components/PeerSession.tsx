'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { User, createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { toast } from 'react-toastify'
import Peer, { DataConnection, MediaConnection } from 'peerjs';

declare global {
  interface Window {
    peer: Peer | null;
    conn: DataConnection | null;
    incoming: MediaConnection | null;
  }
}

function usePeerJSConnection({ user }: { user: User | null}) {

    const supabase = createClientComponentClient<Database>()

    const peerRef = useRef<Peer | null>(null)  
    const incomingRef = useRef<MediaConnection | null>(null)
    const connectionRef = useRef<DataConnection | null>(null)

    const [incomingCall, setIncomingCall] = useState(false)

    const [creatorUsername, setCreatorUsername] = useState<string>('')
    const [callerUsername, setCallerUsername] = useState<string>('')

    const [messages, setMessages] = useState<Message[]>([])
    
    const [isConnected, setIsConnected] = useState(false)


     // Create a ref to store the Audio object
    const ringToneRef = useRef<HTMLAudioElement | null>(null)
    const [ringTone, setRingTone] = useState<HTMLAudioElement | null>(null)
    
    interface Message {
      text: string;
      type: 'incoming' | 'outgoing' | 'server';
      source: 'peerjs' | 'creator' | 'caller';
      autoReply?: Boolean;
      link?: string;
    }

    useEffect(() => {
      // Ensure we’re in the browser
      

        ringToneRef.current = new Audio('/inTone.mp3');

        ringToneRef.current.preload = 'auto';
        ringToneRef.current.load(); // Start loading the audio file
        
        // Set to state for future use
        setRingTone(ringToneRef.current);

      

    }, []);
  
    
    

//fetch profile from supabase
  const startPeerSession = useCallback(async () => {


    try {
    
    if (user) {

      // Fetch user profile
      const roleResult = await supabase
      .from('sidebar')
      .select(`role`)
      .eq('user_id', user.id)
      .single()

      if (roleResult.data) {

        if (roleResult.data.role === 'Creator') {

          // Fetch user profile
          const userResult = await supabase
          .from('profile')
          .select(`username, roomMessage, status`)
          .eq('user_id', user.id)
          .single()
      
          // If profile data is available, set state variables
          if (userResult.data) {

            setCallerUsername(userResult.data.username)
      
            // Ensure the code only runs on the client side
            if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {

              // Initialize a PeerJS connection with your own user ID
             const callerid = userResult.data.username; // Replace with actual callerUsername

              const peer = new Peer(callerid, { 
                host: 'miamiientertainmentllc.com',
                path: '/peerjs',
                secure: true,
                debug: 3
              });
          
              // Store the peer instance in the ref
              peerRef.current = peer
  
              //opens connection with peerjs
              peerRef.current?.on('open', () => {
          
              if (peerRef.current && peerRef.current.open) {

                peerRef.current.on('connection', (conn) => {

                connectionRef.current = conn;

                conn.on('open', () => { })
    
                conn.on('close', () => {

                  if (ringToneRef.current) {
                    ringToneRef.current.load()
                  }

                  incomingRef.current = null
                  connectionRef.current = null
                  setIsConnected(false)

                  setMessages((prev) => [
                    ...prev,
                    { text: 'Connection closed', type: 'server', source: 'peerjs' }
                  ])

                })
            
                })

            
                peerRef.current.on('call', (call: MediaConnection) => { 

                setMessages((prev) => [
                  ...prev,
                  { text: 'Call coming in', type: 'server', source: 'peerjs' }
                ])

                incomingRef.current = call;
                
                // Check if ring is defined and play it
                if (ringToneRef.current) {
                  
                  ringToneRef.current.volume = 0.7
                  ringToneRef.current.loop = true

                  ringToneRef.current.play().catch(error => {
                    console.error("Error playing ring tone:", error);
                  });
                  
                }

                call.on('stream', () => {
                
                  setIsConnected(true)
                  if (ringToneRef.current) {
                    ringToneRef.current.load()
                  }
             
                });


                call.on('close', () => {
                
                  incomingRef.current = null
                  connectionRef.current = null
                  setIsConnected(false)
                  if (ringToneRef.current) {
                    ringToneRef.current.load()
                  }
               
                });

              
                call.on('error', () => {

                  incomingRef.current = null
                  connectionRef.current = null
                  setIsConnected(false)
                   if (ringToneRef.current) {
                    ringToneRef.current.load()
                  }
               
                })

                })
          
              }


              peerRef.current?.on('disconnected', () => {
                
                peerRef.current = null // Clear the ref
                incomingRef.current = null
                setIsConnected(false)

              });
  

              peerRef.current?.on('error', (err) => {

                if (peerRef.current) {
                  peerRef.current.destroy();
                  peerRef.current = null;
                }

                incomingRef.current = null;
                connectionRef.current = null;

                setIsConnected(false)
                setMessages((prev) => [
                  ...prev,
                  { text: `${err}`, type: 'server', source: 'peerjs' }
                ]);

              });

              });

              // Clean up the peer connection when the component unmounts
              return () => {

                // Cleanup logic to unmount the component
                if (peerRef.current) {
                  peerRef.current.destroy();
                  peerRef.current = null;
                }

                incomingRef.current = null;
                connectionRef.current = null;

              };


             } else {

                setMessages((prev) => [
                  ...prev,
                  { text: `Browser is imcapatible, try Chrome or Safari.`, type: 'server', source: 'peerjs' }
                ]);

            }


        
          }


        }

      } else {}

    } 
  
    } catch (error: any) {

        // Ensure cleanup on error
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }

        incomingRef.current = null;
        connectionRef.current = null;
        setIsConnected(false);

  } finally { 
  }

  }, [supabase, user])


  useEffect(() => {

    startPeerSession();


    // Cleanup function to destroy the peer instance when the component unmounts
    return () => {
  
      if (peerRef.current) {
        console.log('runing cleaning unmount')
        incomingRef.current = null;
        connectionRef.current = null;
        peerRef.current.destroy();
        peerRef.current = null; // Clear the ref
      }

    };

  }, [startPeerSession]);
  
 
  return { peerRef, isConnected, messages, incomingCall, setIncomingCall, setMessages, setIsConnected, ringTone, incomingRef, connectionRef }

}

export default usePeerJSConnection;
