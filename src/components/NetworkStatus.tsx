import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

export default function NetworkStatus({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Slow connection check (e.g., if app takes too long to load or connection type is slow)
    const conn = (navigator as any).connection;
    if (conn) {
      const updateConnectionStatus = () => {
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      };
      conn.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <WifiOff className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900 mb-2">No Internet Connection</h2>
        <p className="text-neutral-500 max-w-xs mb-8">
          Please turn on the internet and try again.
        </p>
        <Button onClick={() => window.location.reload()} className="gap-2 h-12 px-8 rounded-xl">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {isSlow && (
        <div className="fixed top-0 left-0 right-0 z-[90] bg-yellow-50 border-b border-yellow-200 p-3 flex items-center justify-center gap-3 animate-in slide-in-from-top duration-500">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <p className="text-xs font-medium text-yellow-800">
            Slow connection detected. If everything is taking too long to load, please retry using a good internet connection.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsSlow(false)} className="h-7 text-yellow-800 hover:bg-yellow-100">
            Dismiss
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
