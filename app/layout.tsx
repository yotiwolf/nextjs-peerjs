import type { Metadata } from 'next'
import './globals.css'
import React from 'react'
import { ToastContainer } from 'react-toastify'
import { Analytics } from "@vercel/analytics/react"


export const metadata: Metadata = {
  title: "Moshi Moshi - The phone sex app",
  description: "Dirty talk over a clean connection",
  openGraph: {
    title: "Moshi Moshi - The phone sex app",
    description: "Dirty talk over a clean connection",
    url: "https://moshimoshiapp.com", // Replace with your actual URL
    siteName: "Moshi Moshi",
    images: [
      {
        url: '/twitter_card.jpg', // Replace with your actual image URL
        width: 800,
        height: 600,
        alt: 'Moshi Moshi App Image',
      }
    ],
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image', // Use "summary" for a small card, or "summary_large_image" for a larger one
    site: '@MoshiMoshi_App', // Your app's Twitter username (optional)
    title: "Moshi Moshi",
    description: "Dirty talk over a clean connection",
    images: ['/twitter_card.jpg'], // Replace with your actual image URL
  },

}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en">
      <body>
        <Analytics/>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
       />

        
        <div className='flex h-dvh'>
        {children}
        </div>
        

      </body>
    </html>
  );
}
