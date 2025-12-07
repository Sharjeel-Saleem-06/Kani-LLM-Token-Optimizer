import React, { createContext, useState, useEffect } from 'react';
import { AppProps } from 'next/app';
import '../styles/globals.css';
import KaniService from '../services/KaniService';

// Create a context for the KaniService
export const KaniContext = createContext<{
  kaniService: KaniService | null;
  setKaniService: (service: KaniService | null) => void;
}>({
  kaniService: null,
  setKaniService: () => {}
});

// Add a check to make TypeScript happy with our window augmentation
declare global {
  interface Window {
    kaniService?: KaniService;
    kaniMemory?: any;
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  const [kaniService, setKaniService] = useState<KaniService | null>(null);
  
  // Use effect to expose the KaniService to the window for easier debugging
  // and to make it accessible to other components
  useEffect(() => {
    if (typeof window !== 'undefined' && kaniService) {
      console.log("Exposing KaniService to window.kaniService");
      window.kaniService = kaniService;
      
      // Also expose the memory object directly for easier access
      // @ts-ignore - we know memory exists on the service
      if (kaniService.memory) {
        // @ts-ignore
        window.kaniMemory = kaniService.memory;
        console.log("Exposing KaniService memory to window.kaniMemory");
      }
    }
    
    // Clean up function
    return () => {
      if (typeof window !== 'undefined') {
        delete window.kaniService;
        delete window.kaniMemory;
      }
    };
  }, [kaniService]);
  
  return (
    <KaniContext.Provider value={{ kaniService, setKaniService }}>
      <Component {...pageProps} />
    </KaniContext.Provider>
  );
}

export default MyApp; 