import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, MonitorSmartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSelfHosted } from '@/lib/selfHostedConfig';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    checkSupport();
  }, [user]);

  const checkSupport = async () => {
    setIsLoading(true);
    
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    
    setIsSupported(supported);

    if (!supported || !user) {
      setIsLoading(false);
      return;
    }

    // Check if user has an existing subscription
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setIsSubscribed(data && data.length > 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    setIsLoading(false);
  };

  const subscribeToPush = async () => {
    if (!user) return false;

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }

      // Fetch VAPID public key from edge function
      let vapidKey = '';
      try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: { action: 'get-vapid-key' },
        });
        if (!error && data?.vapid_public_key) {
          vapidKey = data.vapid_public_key;
        }
      } catch (e) {
        console.error('Failed to fetch VAPID key:', e);
      }

      if (!vapidKey) {
        toast({
          title: 'Configuration error',
          description: 'Push notification keys are not configured on the server.',
          variant: 'destructive',
        });
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await (registration as any).pushManager.getSubscription();
      
      if (!subscription) {
        try {
          subscription = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });
        } catch (e: any) {
          console.log('Push subscription with VAPID failed:', e.message);
          const pseudoSubscription = {
            endpoint: `polling-${user.id}-${Date.now()}`,
            p256dh: 'polling',
            auth: 'polling',
          };

          const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              endpoint: pseudoSubscription.endpoint,
              p256dh: pseudoSubscription.p256dh,
              auth: pseudoSubscription.auth,
              device_info: navigator.userAgent,
            }, {
              onConflict: 'user_id,endpoint'
            });

          if (error) throw error;
          
          toast({
            title: 'Notifications enabled (limited)',
            description: 'Browser notifications enabled. Full push notifications may not be available on this browser.',
          });
          return true;
        }
      }

      if (subscription) {
        const subscriptionJson = subscription.toJSON();

        // Save subscription to database
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: subscriptionJson.endpoint!,
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
            device_info: navigator.userAgent,
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (error) throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription failed',
        description: error.message || 'Could not enable push notifications.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    if (!user) return false;

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not disable push notifications.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);

    let success = false;
    if (enabled) {
      success = await subscribeToPush();
    } else {
      success = await unsubscribeFromPush();
    }

    if (success) {
      setIsSubscribed(enabled);
      toast({
        title: enabled ? 'Notifications enabled' : 'Notifications disabled',
        description: enabled 
          ? 'You will receive push notifications for tasks and habits.'
          : 'Push notifications have been turned off.',
      });
    }

    setIsToggling(false);
  };

  const sendTestNotification = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: '🔔 Test Notification',
          body: 'Push notifications are working! You will receive reminders for tasks and habits.',
          url: '/settings',
        },
      });

      if (error) throw error;

      toast({
        title: 'Test sent',
        description: 'Check your notifications!',
      });
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast({
        title: 'Error',
        description: 'Could not send test notification.',
        variant: 'destructive',
      });
    }
  };

  if (isSelfHosted()) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" /> Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <MonitorSmartphone className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not available in local/Docker mode. This feature requires Cloud mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Bell className="h-5 w-5" /> Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Push notifications are not supported on this browser. Try using Chrome, Firefox, or Edge on desktop, or install the app on Android.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive reminders for tasks and habits even when the app is closed.
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            </div>

            {isSubscribed && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={sendTestNotification}
                className="w-full"
              >
                Send Test Notification
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              💡 Push notifications work best when the app is installed as a PWA. On iPhone, notifications are limited to Safari on iOS 16.4+.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
