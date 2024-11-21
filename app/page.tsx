'use client'

import React from 'react'
import { useCallback, useEffect, useState, useRef, ChangeEvent } from 'react'
import { User, createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Json } from '@/types/supabase'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'

import usePeerJSConnection from './PeerSession'
import IncomingCall from './IncomingCall'

import { IoIosArrowBack } from 'react-icons/io'
import { FaUserAlt } from 'react-icons/fa'
import { TbMessageHeart } from 'react-icons/tb'
import { HiArrowNarrowRight } from 'react-icons/hi'
import { MdNotInterested } from 'react-icons/md'
import { MdCallEnd } from 'react-icons/md'
import Image from 'next/image'


export default function ConnectCreator({ user }: { user: User | null }) {

    const { peerRef, messages, setMessages, isConnected, incomingRef, connectionRef } = usePeerJSConnection({ user })
   
    const router = useRouter()
    const supabase = createClientComponentClient<Database>()

    const [creatorUsername, setCreatorUsername] = useState<string>()
    const [callerUsername, setCallerUsername] = useState<string>()
    const [status, setStatus] = useState<string | undefined>(undefined)
    const [rate, setRate] = useState<string | undefined>()

    const [roomMessage, setRoomMessage] = useState<string>()

    const microphoneStreamRef = useRef<MediaStream | null>(null)
    const [connectingPeer, setConnectingPeer] = useState(false)
    

    interface Message {
        text: string;
        type: 'incoming' | 'outgoing' | 'server';
        source: 'peerjs' | 'creator' | 'caller';
        autoReply?: Boolean;
        link?: string;
    }
      
    const Message: React.FC<Message> = ({ text, type, source, autoReply, link }) => {
        return (
          <div className={`flex flex-col ${type === 'incoming' ? 'justify-start' : ''} ${type === 'outgoing' ? 'justify-end items-end' : ''} ${type === 'server' ? 'justify-center text-center' : ''}`}>
            <div
              className={`
                ${source === 'peerjs' ? 'font-bold text-xs text-zinc-500' : ''} 
                ${source === 'creator' ? 'max-w-[75%] p-4 bg-haute-pink text-zinc-900 text-sm rounded-t-lg rounded-l-lg' : ''} 
                ${source === 'caller' ? 'max-w-[75%] p-4  bg-zinc-900 text-zinc-400 text-sm rounded-t-lg rounded-r-lg' : ''}`}
            >
              {link ? (
              <a href={link} target='_blank' className='text-haute-pink'>{text}</a>
              ) : (
              <span>{text}</span>
              )}
            </div>

            {autoReply && <div className='text-xxs pt-2 text-zinc-500 font-bold'>Your auto-reply</div>}
          </div>
        );
    }    
    
  //fetch profile from supabase
  const getProfile = useCallback(async () => {
    
    try {

      if (user) {

          // Fetch user profile
          const userProfile = await supabase
          .from('profile')
          .select(`username, status, rate, roomMessage`)
          .eq('user_id', user?.id)
          .single()

          // Check for errors in the profile result
          if (userProfile.error && userProfile.status !== 406) {
            throw userProfile.error
          }

          // If user data is available, set state variables
          if (userProfile.data) {
            setCreatorUsername(userProfile.data.username)
            setStatus(userProfile.data.status)
            setRate(userProfile.data.rate)

            setMessages((prev) => [
              ...prev,
              { text: 'Steamy mode', link: '/definition', type: 'server', source: 'peerjs' }
            ]);

            setMessages((prev) => [
              ...prev,
              { text: `This is your sex room`, type: 'server', source: 'peerjs' }
            ]);

            if (userProfile.data.roomMessage !== null) {

              setMessages((prev) => {  
                return [
                ...prev,
                { text: `${userProfile.data.roomMessage}`, type: 'outgoing', source: 'creator', autoReply: true }
                ];
              });
          
            } else {

              setMessages((prev) => {  
               
                return [
                ...prev,
                { text: `💡 We suggest you set an auto-reply for your room. It will show as a message that appears just like this one does.`, type: 'incoming', source: 'caller' }
                ];
              });
          
            }

          }

      }

    } catch (error: any) {
        toast.error(`Error: ${(error && error.message) || 'Unknown error'}`)
    } finally {}

  }, [supabase, user, setMessages])

// Get profile
  useEffect(() => {
    getProfile()
  }, [getProfile])


  useEffect(() => {
    const getMicrophoneAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream; // Store the microphone stream in the ref
        console.log('Microphone access granted');
       
        // You can further process the microphoneStream if needed
      } catch (error) {
        console.error('Microphone access denied or not supported:', error);
     
      }
    };

    getMicrophoneAccess();

    // Clean-up function (optional)
    return () => {
      // Perform any clean-up here if needed
    };
  }, []); // Empty dependency array means this effect runs once after the initial render


// Handle back
  const handleBack = () => {
    router.back()
  }

  const autoReplyRef = useRef<HTMLDivElement | null>(null)
  const roomTextRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  
  const [writeReply, setWriteReply] = useState(false)

// Room text area
  useEffect(() => {

    const textArea = roomTextRef.current;
    if (textArea) {

      roomTextRef.current.style.height = 'auto'

      textArea.style.height = '24px'; // Set the initial height to 24px

      // Allow the height to grow with content
      if (textArea.scrollHeight > 24) {
        textArea.style.height = textArea.scrollHeight + 'px';
      }

    }  

  }, [roomMessage])

// Message smooth
  useEffect(() => {
    // Scroll to the last message when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

// Toggle auto reply
  const handleToggleReply = () => {
    
    setWriteReply(true);

  }

// Write room message
  const handleRoomMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
    
    let newRoomMessage = e.target.value
    setRoomMessage(newRoomMessage)
   
  }

// Exit room message edit
  const handleClickOutside = (event: MouseEvent) => {
    if (autoReplyRef.current && !autoReplyRef.current.contains(event.target as Node)) {
      setWriteReply(false)
      setRoomMessage(roomMessage)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  })

// Insert room message
  async function insertRoomMessage(){  

    if (user) {

      try {
  
        const notificationSound = new Audio('/notification.mp3')

        const insertRoomMessage = await supabase
        .from('profile')
        .update({
          roomMessage: roomMessage
        })
        .eq('user_id', user?.id)
        .select()

        if (insertRoomMessage.data) {
          setWriteReply(false)

          setMessages((prev) => [
            ...prev,
            { text: `Saved auto-reply`, type: 'server', source: 'peerjs' }
          ]);

          setMessages((prev) => {  
            notificationSound.play();
            return [
            ...prev,
            { text: `${roomMessage}`, type: 'outgoing', source: 'creator'}
            ];
          });
          
        }
      
        } finally {
          
        }
      
    } 
  }

// Handle go online
  async function handleGoOnline(){ 

    setConnectingPeer(true)

    if (user) {

      const statusOnline = await supabase
      .from('profile')
      .update({
        status: 'Online'
      })
      .eq('user_id', user?.id)
      .select()

      if (statusOnline.error) {

        setMessages((prev) => [
          ...prev,
          { text: `Error occured, refresh the page and try again`, type: 'server', source: 'peerjs' }
        ]);

        setConnectingPeer(false)

        return
      }

      if (statusOnline.data) {
        setStatus('Online')
      }

    }

    setConnectingPeer(false)

  };

// Handle go offline
  async function handleGoOffline(){ 

    setConnectingPeer(true)

    if (user) {

      const statusOnline = await supabase
      .from('profile')
      .update({
        status: 'Offline'
      })
      .eq('user_id', user?.id)
      .select()

      if (statusOnline.error) {

        setMessages((prev) => [
          ...prev,
          { text: `Error occured, refresh the page and try again`, type: 'server', source: 'peerjs' }
        ]);

        setConnectingPeer(false)

        return
      }

      if (statusOnline.data) {
        
        setStatus('Offline')

        if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getTracks().forEach(track => {track.stop()})
          microphoneStreamRef.current = null
        }

      }

    }

    setConnectingPeer(false)

  };



return ( 

<div className='flex flex-col w-full h-full items-center'>

  {status === 'Online' ? ( 

    <></>

  ) : (

    <div className='flex xxs:w-[99vw] md:w-144 go-live border-b-2 border-t-2 border-black  text-sm text-black font-bold justify-center items-center'> 

      {connectingPeer ? (
        <div className='w-full flex items-center justify-center py-2'>Connecting...</div>
      ) : (
        <button onClick={handleGoOnline} className='w-full flex items-center justify-center py-2'>Go online <HiArrowNarrowRight /></button>
      )}
      
    </div>
  
  )}

  <div className='flex xxs:w-[99vw] md:w-144 bg-zinc-900 border-b-2 border-t-2 border-black py-2 justify-between items-center pr-2'>

    <div className='flex justify-center items-center'>
      <IoIosArrowBack onClick={handleBack} className='size-6 cursor-pointer' />
      <div className='flex xxs:w-10 h-14 bg-zinc-800 rounded-lg items-center justify-center overflow-hidden'>
      
        {status === 'Online' ? (

        <div className='spinner_icon'/>

        ) : (

        <FaUserAlt className='fill-zinc-700'/> 

        )}
        
      </div>

    
        {status === 'Online' ? (

          <div className='flex flex-col pl-1 gap-y-1'>

            <div className='text-zinc-500 text-xs leading-none'>

              {isConnected ? (
                <p>@{incomingRef.current?.peer}</p>
              ) : (
                <p>Waiting for a call</p>
              )}
              
            </div>
              
            <button onClick={handleGoOffline} className='flex w-fit rounded-3xl px-2 text-nope bg-zinc-800 text-xs font-bold items-center gap-x-1'>
              Close room
            </button>

          </div>
            
          ) : (

          <div className='flex flex-col pl-1 gap-y-1 cursor-default'>

            <div className='text-zinc-500 text-xs leading-none'>Calls paused</div>  
            
            <div className='flex w-fit rounded-3xl px-1 bg-zinc-800 text-zinc-500 text-xxs font-bold items-center gap-x-1'>
              <MdNotInterested className='size-3'/>  
              {status}
            </div>
            
          </div>

        )}

       

    </div>

    {status === 'Online' ? (

      <div className={`relative flex justify-center items-center text-xs text-white rounded-3xl h-10 z-10 ${isConnected ? 'w-32' : 'w-24'}`}>
        
        <div className={`absolute flex gap-x-1 items-center justify-center inset-0 z-20 rounded-3xl h-10 ${isConnected ? 'border-nope border-2 w-32' : ' text-zinc-400 bg-zinc-800'}` }>
        
          {isConnected ? (<MdCallEnd className='size-6'/>) : (null)}  
          <span>${rate}/min</span>

        </div>
        <div className={`flex items-center justify-center z-0 rounded-3xl blur-sm  h-10 ${isConnected ? ' bg-nope w-32' : ''}`}></div>
      
      </div>

    ) : (

        <div className='flex justify-center items-center h-fit text-xs text-zinc-400 bg-zinc-800 py-2 px-4 rounded-3xl'>
            <span>${rate}/min</span>
        </div>

    )}

  </div>

  <div className='flex relative min-h-0 h-full xxs:w-[99vw] md:w-144 px-4 items-end'>

    {status === 'Online' &&  
    <div className='absolute w-full h-full inset-x-0 p-2'>
      <div className='flex flex-row items-center justify-center bg-zinc-900 rounded-2xl xxs:px-4 md:px-6 py-2'>
        <Image
        src="/love.gif" // replace with your GIF path
        alt="Love gif"
        width={75}
        height={75}
        unoptimized
        placeholder="blur"
        blurDataURL="/love.jpg"  // Optional, provide a small static image as a placeholder	
        />
        <div className='w-full flex text-zinc-300 xxs:text-sm md:text-base justify-center font-bold xxs:pl-4 md:pl-0'>Use earbuds or headphones for enhanced pleasure.</div>
      </div>
    </div>
    }

    <div className='flex flex-col gap-y-4 w-full h-full overflow-auto'>
    <div className='flex-grow' />
    {messages.map((message, index) => (
      <Message 
        key={index} 
        text={message.text} 
        type={message.type} 
        source={message.source}
        autoReply={message.autoReply}
        link={message.link} 
      />
    ))}
    <div ref={messagesEndRef} />
    </div>
  </div>

  <div className='xxs:w-[99vw] md:w-144 items-center p-2'>
    
    {writeReply ? (

      <div 
      ref={autoReplyRef}
      className='flex w-full h-full px-2 py-2 text-sm border-2 border-zinc-800 rounded-3xl items-center'>
          
        <div className='flex w-full px-2'>
          <textarea
          ref={roomTextRef}
          value={roomMessage}
          onChange={handleRoomMessage}
          className='block w-full h-6 outline-none bg-transparent resize-none overflow-hidden text-base items-center align-center text-zinc-300 placeholder:text-zinc-500 caret-haute-pink'
          placeholder='Write your auto-reply'
          />
        </div>

        <button onClick={insertRoomMessage} className='flex self-end justify-center items-center h-fit text-xs font-bold bg-zinc-300 text-zinc-950 py-2 px-4 rounded-2xl'>Save</button>
      </div>

    ) : (
    
      <div className='flex w-full gap-x-2 items-center'>
        <div onClick={handleToggleReply} className='w-fit flex flex-col gap-y-1 items-center text-zinc-500'>
          <TbMessageHeart className='size-6'/>
          <div className='text-xxs leading-none text-nowrap whitespace-nowrap'>Auto-reply</div>
        </div>

        <div className='flex w-full justify-between px-2 py-2 text-sm border-2 border-zinc-800 rounded-3xl items-center'>
          <span className='text-zinc-500 pl-2'></span>
          <div className='flex justify-center items-center h-fit text-xs font-bold bg-zinc-900 text-zinc-700 py-2 px-4 rounded-2xl'>Send</div>
        </div>
      </div>

    )}

  </div>

  {incomingRef.current && <IncomingCall peerRef={peerRef} incomingRef={incomingRef} connectionRef={connectionRef} messages={messages} setMessages={setMessages} />}
    
</div>


)}
