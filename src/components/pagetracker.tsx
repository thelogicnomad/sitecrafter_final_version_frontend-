import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (command: string, action: string, params: any) => void;
  }
}

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPage = () => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: location.pathname,
          page_location: window.location.href,
          page_title: document.title,
          send_to: process.env.REACT_APP_GA_TRACKING_ID
        });
      }
    };

    trackPage();
  }, [location]);

  return null;
};

export default PageTracker;