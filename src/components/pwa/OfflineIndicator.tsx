import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudUpload, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const { isOnline, queueLength, isSyncing, syncQueue } = useOfflineSync();
  const [showBanner, setShowBanner] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setJustReconnected(false);
    } else if (showBanner) {
      // Show reconnected briefly
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setJustReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Listen for sync complete
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      toast({
        title: 'Synced!',
        description: `${e.detail.synced} offline changes synced successfully.`,
      });
    };
    window.addEventListener('offline-sync-complete', handler as EventListener);
    return () => window.removeEventListener('offline-sync-complete', handler as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 ${
            justReconnected 
              ? 'bg-green-600 text-white' 
              : 'bg-orange-600 text-white'
          }`}
        >
          {justReconnected ? (
            <>
              <Wifi className="h-3.5 w-3.5" />
              Back online!
              {queueLength > 0 && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-6 px-2 text-xs ml-2"
                  onClick={() => syncQueue()}
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3 mr-1" />}
                  Sync {queueLength} changes
                </Button>
              )}
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              You're offline — changes will sync when reconnected
              {queueLength > 0 && (
                <span className="ml-1 bg-white/20 rounded px-1.5 py-0.5">{queueLength} queued</span>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
