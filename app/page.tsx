import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import ViewSession from '@/app/components/ViewSession'
import BrowseCardC from './components/BrowseCardC'
import ViewSessionNav from '@/app/components/ViewSessionNav'
import Link from 'next/link'
import { AgeGateServer } from '@/app/components/AgeGateServer'


export default async function Home() {

    // Server Action
    async function fetchSessionAndUser() {
      
      'use server'
      const cookieStore = cookies()
      const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      // ...
      return { session, user }
    }

    const { session, user } = await fetchSessionAndUser()


  return (
  <>
    <AgeGateServer />
    <div className='flex flex-col h-full w-full'>

    <section className='h-full overflow-y-auto'>
      
    <div className='container mx-auto h-full'>
      <div className='flex flex-row w-full h-full justify-center'>

      <div className='xxs:w-0 lg:w-120 xxs:invisible xs:invisible sm:invisible md:visible lg:visible md:pt-4 md:pr-4 flex justify-end border-zinc-900 border-r-2 md:p-4'>
        <ViewSession session={session} user={user}/>
      </div>

      <div className='lg:w-2/5 min-w-fit justify-center'>
        <BrowseCardC user={user}  />
      </div>

      <div className='xxs:w-0 lg:w-2/5 xxs:invisible xs:invisible sm:invisible md:visible lg:visible border-zinc-900 border-l-2'>
      <div className='flex w-full h-full items-end place-content-end md:p-4'>

      <div className='flex gap-x-2 overflow-hidden text-nowrap'>

        <Link href='/2257-compliance' target='_blank' className='flex w-fit'>
          <div className='text-zinc-500 hover:text-zinc-400 text-xs xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>2257</div>
        </Link>

        <div className='text-zinc-500 text-xs text-nowrap xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>•</div>
        
        <Link href='/terms' target='_blank' className='flex w-fit'>
          <div className='text-zinc-500 hover:text-zinc-400 text-xs xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>Terms</div>
        </Link>

        <div className='text-zinc-500 text-xs text-nowrap xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>•</div>

        <Link href='/privacy-policy' target='_blank' className='flex w-fit'>
          <div className='text-zinc-500 hover:text-zinc-400 whitespace-nowrap text-xs xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>Privacy Policy</div>
        </Link>

        <div className='text-zinc-500 text-xs text-nowrap xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>•</div>
        
        <Link href='/contact' target='_blank' className='flex w-fit'>
          <div className='text-zinc-500 hover:text-zinc-400 text-xs xxs:invisible sm:invisible md:invisible lg:visible xxs:w-0 lg:w-full font-bold'>Contact</div>
        </Link>

      </div>
      
      </div>
      </div>
      
      </div>
      </div>
    
    </section>
  
    <ViewSessionNav session={session} user={user} />
    </div>
    </>
  )
}


