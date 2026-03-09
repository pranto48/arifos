import { useState, useEffect, useCallback } from 'react';

interface OfflineAction {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const QUEUE_KEY = 'lifeos-offline-queue';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    updateQueueLength();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueLength > 0) {
      syncQueue();
    }
  }, [isOnline]);

  const updateQueueLength = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      setQueueLength(queue.length);
    } catch {
      setQueueLength(0);
    }
  };

  const addToQueue = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    try {
      const queue: OfflineAction[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      queue.push({
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      updateQueueLength();
    } catch (e) {
      console.error('Failed to queue offline action:', e);
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const queue: OfflineAction[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      const failed: OfflineAction[] = [];

      for (const action of queue) {
        try {
          if (action.type === 'insert') {
            const { error } = await (supabase.from(action.table as any) as any).insert(action.data);
            if (error) throw error;
          } else if (action.type === 'update') {
            const { id, ...rest } = action.data;
            const { error } = await (supabase.from(action.table as any) as any).update(rest).eq('id', id);
            if (error) throw error;
          } else if (action.type === 'delete') {
            const { error } = await (supabase.from(action.table as any) as any).delete().eq('id', action.data.id);
            if (error) throw error;
          }
        } catch {
          failed.push(action);
        }
      }

      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
      updateQueueLength();
      
      if (failed.length === 0 && queue.length > 0) {
        window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { synced: queue.length } }));
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  const clearQueue = useCallback(() => {
    localStorage.removeItem(QUEUE_KEY);
    updateQueueLength();
  }, []);

  return { isOnline, queueLength, isSyncing, addToQueue, syncQueue, clearQueue };
}
