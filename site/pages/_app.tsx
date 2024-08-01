import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Modal from 'react-modal';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';

// Ensure the environment variables are loaded
import '../utils/config';

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

  return <Component {...pageProps} />;
}

export default MyApp;
