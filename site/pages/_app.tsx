import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Modal from 'react-modal';
import { Inter } from 'next/font/google';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

Modal.setAppElement('#__next');

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    Modal.setAppElement('#__next');

    const startCronJob = async () => {
      try {
        await fetch('/api/start-cron-job');
      } catch (error) {
        console.error('Error starting cron job:', error);
      }
    };

    startCronJob();
  }, []);

  return (
    <div className={`${inter.variable} font-sans min-h-screen bg-surface text-fg antialiased`}>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
