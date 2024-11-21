import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import Peer, { DataConnection, MediaConnection } from 'peerjs'
import { User, createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { FaUserAlt } from 'react-icons/fa'
import { MdCallEnd } from 'react-icons/md'
import { IoCall } from 'react-icons/io5'
import { IoIosArrowBack } from 'react-icons/io'


interface IncomingCallProps {
  peerRef: React.MutableRefObject<Peer | null>;
  incomingRef: React.MutableRefObject<MediaConnection | null>;
  connectionRef: React.MutableRefObject<DataConnection | null>;
  messages: Message[]; // Assuming messages is an array
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

interface Message {
  text: string;
  type: 'incoming' | 'outgoing' | 'server';
  source: 'peerjs' | 'creator' | 'caller';
}

const Message: React.FC<Message> = ({ text, type, source }) => {
  return (
    <div className={`flex ${type === 'incoming' ? 'justify-start' : ''} ${type === 'outgoing' ? 'justify-end' : ''} ${type === 'server' ? 'justify-center text-center' : ''}`}>
      <div
        className={`
          ${source === 'peerjs' ? 'font-bold text-xs text-zinc-500' : ''} 
          ${source === 'creator' ? 'max-w-[75%] p-4 bg-haute-pink text-zinc-900 text-sm rounded-t-lg rounded-l-lg' : ''} 
          ${source === 'caller' ? 'max-w-[75%] p-4  bg-zinc-900 text-zinc-400 text-sm rounded-t-lg rounded-r-lg' : ''}`}
      >
        {text}
      </div>
    </div>
  );
}  


// Function to format milliseconds into HH:MM:SS format
const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const IncomingCall: React.FC<IncomingCallProps> = ({ peerRef, incomingRef, connectionRef, messages, setMessages }) => {


  const [hasAccepted, setHasAccepted] = useState(false)
  const [remoteAudio, setRemoteAudio] = useState<HTMLAudioElement | null>(null)
  const supabase = createClientComponentClient<Database>()


  const waitForCanvasAndInitialize = (remoteStream: MediaStream): void => {
    const checkCanvas = () => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  
      if (canvas) {
        initializeAudioAnalyzer(remoteStream); // Call the original function
      } else {
        console.log('Canvas not ready, retrying...');
        setTimeout(checkCanvas, 100); // Retry after 100ms
      }
    };
  
    checkCanvas();
  }

  async function StatusOnACall() {

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {

      try {

      const statusOnline = await supabase
      .from('profile')
      .update({
        status: 'On a call'
      })
      .eq('user_id', user?.id)
      .select()
      console.log("Status updated:", statusOnline);

      }  catch (error) {
        console.error("Error updating status:", error);
      }

    } else {
      console.log('No user')
    }

  }

  async function StatusOnline() {

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {

      const statusOnline = await supabase
      .from('profile')
      .update({
        status: 'Online'
      })
      .eq('user_id', user?.id)
      .select()

    }

  }
  
  const acceptCall = () => {

    if (incomingRef) {

      StatusOnACall()

      // Accept the incoming call
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        
        incomingRef.current?.answer(stream); // Answer the call with the user's media stream
        startCallTimer()
        setHasAccepted(true)

        // Do additional logic if needed
        incomingRef.current?.on("stream", (remoteStream) => {
          if (remoteStream.getAudioTracks().length > 0) {

            console.log("Received remote audio stream:", remoteStream);
      
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            setRemoteAudio(audio); // Manage the audio element in React state
            waitForCanvasAndInitialize(remoteStream);
         
          } else {
            console.warn("No audio tracks in the remote stream");
          }
        });
      

      }).catch((error) => {
    
        console.error('Error accessing media devices.', error);
    
      });

      if (connectionRef.current) { 

        connectionRef.current.on('data', (data) => {

          setMessages((prev) => [
            ...prev,
            { text: `${data}`, type: 'incoming', source: 'caller' }
          ])

        })
      }

    }
     
    
  }

  const declineCall = () => {

    if (peerRef.current && peerRef.current.open) {

      if (connectionRef.current) {

        connectionRef.current.send('Cannot come to the phone right now 😔')
        connectionRef.current.close()

      } else {
        console.log('No connection ref')
      }

    }

  }

  const endCall = () => {

    if (incomingRef.current) {

      incomingRef.current.close()
      resetCallTimer()
      StatusOnline()

      if (remoteAudio) {
        remoteAudio.pause();
        remoteAudio.srcObject = null; // Clean up the audio element when component unmounts
        setRemoteAudio(null); // Reset the state
      }

    } else {
      console.error('No incoming call to decline.');
    }
    
    

  }

  const handleEnd = () => {
    if (incomingRef.current) {
      // Call has been received and is active
      // Assuming you have a way to determine if the call has been answered
      if (incomingRef.current.open) {
        // Call is already answered, end it
        endCall();
      } else {
        // Call has not been answered, decline it
        declineCall();
      }
    } else {
      console.error('No incoming call reference.');
    }
  }

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCallTimer = useCallback(() => {
    setStartTime(Date.now()); // Set the start time to the current time
  }, []);

  const resetCallTimer = useCallback(() => {
    setStartTime(null); // Reset the start time
    setElapsedTime(0); // Reset the elapsed time
    if (intervalRef.current) {
      clearInterval(intervalRef.current); // Clear existing interval
    }
  }, []);

  useEffect(() => {
    if (startTime !== null) {
      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        setElapsedTime(currentTime - startTime);
      }, 1000);

      // Cleanup interval on component unmount or when startTime changes
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [startTime]);

  
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [message, setMessage] = useState<string>('')


  // Message smooth
  useEffect(() => {
    // Scroll to the last message when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Room text area
  useEffect(() => {

    const textArea = textAreaRef.current;
    if (textArea) {
  
      textAreaRef.current.style.height = 'auto'
  
      textArea.style.height = '24px'; // Set the initial height to 24px
  
      // Allow the height to grow with content
      if (textArea.scrollHeight > 24) {
        textArea.style.height = textArea.scrollHeight + 'px';
      }
  
    }  
  
  }, [message])

  const handleMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
    
    let newMessage = e.target.value
    setMessage(newMessage)
   
  }

  // Send message
  const handleSendMessage  = () => {   

    if (!message) {

      setErrorMessage('No message to send')
      setTimeout(() => {
        setErrorMessage('');
      }, 3000)

      return; // Early return if selectedItem is falsy
    }
      
    const notificationSound = new Audio('/notification.mp3');
        
    setMessages((prev) => {  
      notificationSound.play();
      return [
        ...prev,
        { text: `${message}`, type: 'outgoing', source: 'creator' }
      ];
    });

    if (peerRef.current && peerRef.current.open) {

      if (connectionRef.current) {

        connectionRef.current.send(`${message}`)

      } else {
        console.log('No connection ref')
      }

    }

    setMessage('')
    
  }

  const canvasRef = useRef<CanvasRenderingContext2D | null>(null)

  const initializeAudioAnalyzer = (remoteStream: MediaStream): void => {

    const audioContext = new (window.AudioContext || window.AudioContext)();
    const source = audioContext.createMediaStreamSource(remoteStream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 256;
  
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  
    if (!canvas) {
      console.error('Canvas element not found or not a canvas');
      return;
    }

    const canvasCtx = canvas.getContext('2d');
    canvasRef.current = canvasCtx
    if (!canvasCtx) {
      console.error('2D context not supported or canvas already initialized');
      return;
    }

    canvas.width = 800; // Set desired width
    canvas.height = 800; // Set desired height
  
    const stars = Array(100).fill(null).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: '0.25px',
      baseSize: Math.random(),
    }));

    const draw = (): void => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star, index) => {
          const frequencyValue = dataArray[index % bufferLength];
          const brightness = frequencyValue / 255;

          // Flicker the stars based on frequency data
          const flickerSize = star.baseSize + brightness * 2;
          const flickerAlpha = 0.5 + brightness * 0.5;

          canvasCtx.beginPath();
          canvasCtx.arc(star.x, star.y, flickerSize, 0, Math.PI * 2);
          canvasCtx.fillStyle = `rgba(255, 255, 255, ${flickerAlpha})`;
          canvasCtx.fill();
      });
    };

    draw();

  }


  return (

    <div className={`fixed inset-0 flex items-center justify-center z-30`}>
      <div className={`fixed inset-0 bg-black z-50 ${hasAccepted ? 'opacity-100' : 'opacity-75'}`} />

      {hasAccepted ? (
      <div className='absolute top-0 w-full h-[75vh] z-50'>

        <div className='flex w-full h-full bg-black items-center'>

          <div className='flex flex-col w-full h-full items-center'>

          <div className='flex xxs:w-[99vw] bg-zinc-900 border-b-2 border-t-2 border-black py-2 justify-between items-center pr-2'>

            <div className='flex justify-center items-center'>
              <IoIosArrowBack className='size-6 cursor-pointer' />
              <div className='flex xxs:w-10 h-14 bg-zinc-800 rounded-lg items-center justify-center overflow-hidden'>
                <FaUserAlt className='fill-zinc-700'/> 
              </div>

              <div className='flex flex-col pl-1 gap-y-1'>

                <div className='text-zinc-500 text-xs leading-none'>
                  @{incomingRef.current?.peer}
                </div>
                <div className='text-zinc-500 text-xs leading-none'>{formatTime(elapsedTime)}</div>

              </div>
        
            </div>

            <button onClick={endCall} className={`relative flex justify-center items-center text-xs text-white rounded-3xl h-10 z-10 w-32`}>
    
              <div className={`absolute flex gap-x-1 items-center justify-center inset-0 z-20 rounded-3xl h-10 border-nope border-2 w-32` }>
    
                <MdCallEnd className='size-6'/>  
                <span>$1.11/min</span>

              </div>
              <div className={`flex items-center justify-center z-0 rounded-3xl blur-sm h-10 bg-nope w-32`}/>
  
            </button>

          </div>

          <div className='flex relative min-h-0 h-full xxs:w-[99vw] px-4 items-end'>
            <div className='flex flex-col gap-y-4 w-full h-full overflow-auto z-20'>
              <div className='flex-grow' />
                {messages.map((message, index) => (
                  <Message 
                  key={index} 
                  text={message.text} 
                  type={message.type} 
                  source={message.source} 
                  />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className='absolute w-full h-full inset-0 z-10'>
              <canvas id='canvas' className='absolute w-full h-full' />
            </div>
          </div>

          <div className='flex flex-col xxs:w-[99vw] md:w-144 items-center p-2 z-20'>
    
            <div
            ref={tipRef} 
            className='flex flex-col w-full justify-between px-2 text-sm border-2 border-zinc-500 rounded-3xl items-center'>

              <div className={`flex w-full items-center py-2`}>
        
              <div className='flex w-full px-2'>
                <textarea
                ref={textAreaRef}
                value={message}
                onChange={handleMessage}
                className='block w-full h-6 outline-none bg-transparent resize-none overflow-hidden text-base items-center align-center text-zinc-300 placeholder:text-zinc-500 caret-haute-pink'
                placeholder='Respond?'
                />
              </div>

              <button
              onClick={handleSendMessage} 
              className={`flex self-end justify-center items-center h-fit text-xs font-bold py-2 px-4 rounded-2xl ${message ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-zinc-500 cursor-default'}`}>
              Send
              </button>
      
            </div>

          </div>

            {errorMessage && <p className='flex w-full justify-center text-xs font-bold text-red-500 py-2'>{errorMessage}</p>}
          </div>

          </div>

        </div>

      </div>  
      
      ) : (

        <div className='absolute xxs:bottom-24 z-50'>
        <div className='flex w-84 max-h-fit bg-zinc-900 rounded-full justify-between items-center py-2 px-4'>

          <div className='flex items-center pl-2'>
            <div className='flex xxs:w-10 h-14 bg-zinc-800 rounded-lg items-center justify-center'>
              <FaUserAlt className='fill-zinc-700'/>
            </div>
            <div className='flex flex-col pl-2 gap-y-1'>
              <div className='text-zinc-500 text-sm leading-none'>@{incomingRef.current?.peer}</div>
              <div className='text-zinc-500 text-xs leading-none'>Incoming call</div>
              
            </div>
          </div>
          <div className='flex gap-x-4 items-center'>

            <button 
              className='relative h-12 w-12 z-10' 
              onClick={handleEnd}>
              <div className='absolute flex items-center justify-center inset-0 z-20 rounded-full border-nope border-2 h-12 w-12'>
                <MdCallEnd className='size-6'/>
              </div>
              <div className='flex items-center justify-center z-0 rounded-full size-12 bg-nope blur-sm'/>
            </button>

            <button 
              className='relative h-12 w-12 z-10' 
              onClick={acceptCall}>
              <div className='absolute flex items-center justify-center inset-0 z-20 rounded-full border-call-me border-2 h-12 w-12'>
                <IoCall className='size-6'/>
              </div>
              <div className='flex items-center justify-center z-0 rounded-full size-12 bg-call-me blur-sm'/>
            </button>

          </div>
        </div>
        </div>

      )}

    </div>
  );
};

export default IncomingCall;
