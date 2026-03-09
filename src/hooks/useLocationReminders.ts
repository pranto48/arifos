import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface GeofenceReminder {
  id: string;
  title: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  triggered: boolean;
}

const STORAGE_KEY = 'lifeos-location-reminders';

export function useLocationReminders() {
  const [isSupported] = useState(() => 'geolocation' in navigator);
  const [isWatching, setIsWatching] = useState(false);
  const [reminders, setReminders] = useState<GeofenceReminder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Persist reminders
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkReminders = useCallback((lat: number, lng: number) => {
    setReminders(prev => {
      let changed = false;
      const updated = prev.map(r => {
        if (r.triggered) return r;
        const dist = getDistance(lat, lng, r.lat, r.lng);
        if (dist <= r.radiusMeters) {
          changed = true;
          toast({
            title: '📍 Location Reminder',
            description: r.title,
          });
          // Try browser notification too
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📍 Location Reminder', { body: r.title, icon: '/icon-192.png' });
          }
          return { ...r, triggered: true };
        }
        return r;
      });
      return changed ? updated : prev;
    });
  }, []);

  const startWatching = useCallback(() => {
    if (!isSupported || isWatching) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        checkReminders(latitude, longitude);
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    setWatchId(id);
    setIsWatching(true);
  }, [isSupported, isWatching, checkReminders]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  }, [watchId]);

  const addReminder = useCallback((title: string, lat: number, lng: number, radiusMeters = 200) => {
    const reminder: GeofenceReminder = {
      id: crypto.randomUUID(),
      title,
      lat,
      lng,
      radiusMeters,
      triggered: false,
    };
    setReminders(prev => [...prev, reminder]);
    return reminder;
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearTriggered = useCallback(() => {
    setReminders(prev => prev.map(r => ({ ...r, triggered: false })));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  return {
    isSupported,
    isWatching,
    currentPosition,
    reminders,
    startWatching,
    stopWatching,
    addReminder,
    removeReminder,
    clearTriggered,
  };
}
