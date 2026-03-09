import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Link, Unlink, Eye, EyeOff, Save, HelpCircle, X, ExternalLink, AlertTriangle, CheckCircle2, Copy, MonitorSmartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { isSelfHosted } from '@/lib/selfHostedConfig';

interface CalendarSyncConfig {
  id: string;
  provider: 'google' | 'microsoft';
  sync_enabled: boolean;
  last_sync_at: string | null;
  calendar_id: string | null;
}

export function CalendarIntegrationSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  // OAuth credentials state
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [microsoftClientId, setMicrosoftClientId] = useState('');
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState('');
  
  // Show/hide password state
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showMicrosoftSecret, setShowMicrosoftSecret] = useState(false);
  
  // Sync status state
  const [googleSync, setGoogleSync] = useState<CalendarSyncConfig | null>(null);
  const [microsoftSync, setMicrosoftSync] = useState<CalendarSyncConfig | null>(null);
  
  // Loading states
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingMicrosoft, setSavingMicrosoft] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncingMicrosoft, setSyncingMicrosoft] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingMicrosoft, setConnectingMicrosoft] = useState(false);
  
  // Help dialog state
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  const [showMicrosoftHelp, setShowMicrosoftHelp] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    if (user && !isSelfHosted()) {
      loadCalendarSyncStatus();
      loadStoredCredentials();
      
      // Handle OAuth callback - check for code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        if (state === 'microsoft_calendar') {
          handleMicrosoftOAuthCallback(code);
        } else if (state === 'google_calendar') {
          handleOAuthCallback(code, state);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      toast({
        title: language === 'bn' ? 'সংযোগ করা হচ্ছে...' : 'Connecting...',
        description: language === 'bn' ? 'Google Calendar সংযোগ করা হচ্ছে' : 'Connecting to Google Calendar'
      });

      // Use the same redirect URI format as get_auth_url
      const redirectUri = `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'exchange_code', 
          code, 
          redirectUri 
        }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংযুক্ত!' : 'Connected!',
        description: language === 'bn' ? 'Google Calendar সফলভাবে সংযুক্ত হয়েছে' : 'Google Calendar connected successfully'
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to connect Google Calendar',
        variant: 'destructive'
      });
    }
  };

  const handleMicrosoftOAuthCallback = async (code: string) => {
    try {
      toast({
        title: language === 'bn' ? 'সংযোগ করা হচ্ছে...' : 'Connecting...',
        description: language === 'bn' ? 'Outlook Calendar সংযোগ করা হচ্ছে' : 'Connecting to Outlook Calendar'
      });

      // Use the same redirect URI format as get_auth_url
      const redirectUri = `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-sync', {
        body: { 
          action: 'exchange_code', 
          code, 
          redirectUri 
        }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংযুক্ত!' : 'Connected!',
        description: language === 'bn' ? 'Outlook Calendar সফলভাবে সংযুক্ত হয়েছে' : 'Outlook Calendar connected successfully'
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      console.error('Microsoft OAuth callback error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to connect Outlook Calendar',
        variant: 'destructive'
      });
    }
  };

  const loadCalendarSyncStatus = async () => {
    const { data } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data && data.length > 0) {
      const googleConfig = data.find(d => !d.calendar_id?.startsWith('outlook_'));
      if (googleConfig) {
        setGoogleSync({
          id: googleConfig.id,
          provider: 'google',
          sync_enabled: googleConfig.sync_enabled,
          last_sync_at: googleConfig.last_sync_at,
          calendar_id: googleConfig.calendar_id
        });
      }
      
      const microsoftConfig = data.find(d => d.calendar_id?.startsWith('outlook_'));
      if (microsoftConfig) {
        setMicrosoftSync({
          id: microsoftConfig.id,
          provider: 'microsoft',
          sync_enabled: microsoftConfig.sync_enabled,
          last_sync_at: microsoftConfig.last_sync_at,
          calendar_id: microsoftConfig.calendar_id
        });
      }
    }
  };

  const loadStoredCredentials = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { action: 'get' }
      });
      
      if (error) throw error;
      
      if (data?.credentials) {
        const creds = data.credentials;
        setGoogleClientId(creds.GOOGLE_CLIENT_ID || '');
        setGoogleClientSecret(creds.GOOGLE_CLIENT_SECRET || '');
        setMicrosoftClientId(creds.MICROSOFT_CLIENT_ID || '');
        setMicrosoftClientSecret(creds.MICROSOFT_CLIENT_SECRET || '');
      }
    } catch (error) {
      console.log('Could not load stored credentials');
    }
  };

  const saveGoogleCredentials = async () => {
    if (!googleClientId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'Google Client ID প্রয়োজন' : 'Google Client ID is required',
        variant: 'destructive'
      });
      return;
    }

    setSavingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { 
          action: 'save',
          provider: 'google',
          clientId: googleClientId.trim(),
          clientSecret: googleClientSecret
        }
      });
      
      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Google credentials সংরক্ষিত হয়েছে' : 'Google credentials saved successfully'
      });
      
      loadStoredCredentials();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to save credentials',
        variant: 'destructive'
      });
    } finally {
      setSavingGoogle(false);
    }
  };

  const saveMicrosoftCredentials = async () => {
    if (!microsoftClientId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'Microsoft Client ID প্রয়োজন' : 'Microsoft Client ID is required',
        variant: 'destructive'
      });
      return;
    }

    setSavingMicrosoft(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { 
          action: 'save',
          provider: 'microsoft',
          clientId: microsoftClientId.trim(),
          clientSecret: microsoftClientSecret
        }
      });
      
      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Microsoft credentials সংরক্ষিত হয়েছে' : 'Microsoft credentials saved successfully'
      });
      
      loadStoredCredentials();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to save credentials',
        variant: 'destructive'
      });
    } finally {
      setSavingMicrosoft(false);
    }
  };

  const connectGoogleCalendar = async () => {
    setConnectingGoogle(true);
    try {
      // Use the custom domain that's configured in Google Cloud Console
      const redirectUri = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'get_auth_url', redirectUri }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth in same window for proper redirect handling
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const connectMicrosoftCalendar = async () => {
    setConnectingMicrosoft(true);
    try {
      // Use the custom domain that's configured in Azure Portal
      const redirectUri = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-sync', {
        body: { action: 'get_auth_url', redirectUri }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth in same window for proper redirect handling
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setConnectingMicrosoft(false);
    }
  };

  const syncGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সিঙ্ক সম্পন্ন' : 'Sync Complete',
        description: data?.message || (language === 'bn' ? 'Google Calendar সিঙ্ক হয়েছে' : 'Google Calendar synced successfully')
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const syncMicrosoftCalendar = async () => {
    setSyncingMicrosoft(true);
    try {
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সিঙ্ক সম্পন্ন' : 'Sync Complete',
        description: data?.message || (language === 'bn' ? 'Outlook Calendar সিঙ্ক হয়েছে' : 'Outlook Calendar synced successfully')
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingMicrosoft(false);
    }
  };

  const disconnectCalendar = async (provider: 'google' | 'microsoft') => {
    const syncConfig = provider === 'google' ? googleSync : microsoftSync;
    if (!syncConfig) return;

    try {
      await supabase
        .from('google_calendar_sync')
        .delete()
        .eq('id', syncConfig.id);

      if (provider === 'google') {
        setGoogleSync(null);
      } else {
        setMicrosoftSync(null);
      }

      toast({
        title: language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnected',
        description: language === 'bn' 
          ? `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar সংযোগ বিচ্ছিন্ন হয়েছে`
          : `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar disconnected`
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleSync = async (provider: 'google' | 'microsoft', enabled: boolean) => {
    const syncConfig = provider === 'google' ? googleSync : microsoftSync;
    if (!syncConfig) return;

    try {
      await supabase
        .from('google_calendar_sync')
        .update({ sync_enabled: enabled })
        .eq('id', syncConfig.id);

      if (provider === 'google') {
        setGoogleSync({ ...googleSync!, sync_enabled: enabled });
      } else {
        setMicrosoftSync({ ...microsoftSync!, sync_enabled: enabled });
      }

      toast({
        title: enabled 
          ? (language === 'bn' ? 'সিঙ্ক সক্রিয়' : 'Sync Enabled')
          : (language === 'bn' ? 'সিঙ্ক নিষ্ক্রিয়' : 'Sync Disabled'),
        description: language === 'bn'
          ? `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar সিঙ্ক ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} হয়েছে`
          : `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar sync ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/settings` : '';
  const selfHosted = isSelfHosted();

  if (selfHosted) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            {language === 'bn' ? 'ক্যালেন্ডার ইন্টিগ্রেশন' : 'Calendar Integration'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <MonitorSmartphone className="h-4 w-4" />
            <AlertDescription>
              {language === 'bn' 
                ? 'ক্যালেন্ডার সিঙ্ক স্থানীয়/ডকার মোডে উপলব্ধ নয়। এই বৈশিষ্ট্যটি ক্লাউড মোডে ব্যবহার করুন।'
                : 'Calendar sync is not available in local/Docker mode. This feature requires Cloud mode.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            {language === 'bn' ? 'ক্যালেন্ডার ইন্টিগ্রেশন' : 'Calendar Integration'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google Calendar</TabsTrigger>
              <TabsTrigger value="microsoft">Microsoft Outlook</TabsTrigger>
            </TabsList>
            
            {/* Google Calendar Tab */}
            <TabsContent value="google" className="space-y-4 mt-4">
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowGoogleHelp(true)}
                    className="gap-1 text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {language === 'bn' ? 'সেটআপ গাইড' : 'Setup Guide'}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="google-client-id">Client ID</Label>
                    <Input
                      id="google-client-id"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="Enter Google Client ID"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-client-secret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="google-client-secret"
                        type={showGoogleSecret ? 'text' : 'password'}
                        value={googleClientSecret}
                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                        placeholder="Enter Google Client Secret"
                        className="bg-background pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                      >
                        {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={saveGoogleCredentials} disabled={savingGoogle} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {savingGoogle ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Credentials')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm">
                  {language === 'bn' ? 'সংযোগ স্ট্যাটাস' : 'Connection Status'}
                </h4>
                
                {googleSync ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm">{language === 'bn' ? 'সংযুক্ত' : 'Connected'}</span>
                      </div>
                      <Switch
                        checked={googleSync.sync_enabled}
                        onCheckedChange={(checked) => toggleSync('google', checked)}
                      />
                    </div>
                    
                    {googleSync.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last sync:'} {format(new Date(googleSync.last_sync_at), 'PPp')}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={syncGoogleCalendar}
                        disabled={syncingGoogle || !googleSync.sync_enabled}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingGoogle ? 'animate-spin' : ''}`} />
                        {syncingGoogle ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Now')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => disconnectCalendar('google')}
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        {language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {language === 'bn' 
                        ? 'Google Calendar এখনো সংযুক্ত নয়। উপরে credentials সংরক্ষণ করে সংযোগ করুন।'
                        : 'Google Calendar is not connected yet. Save your credentials above and connect.'}
                    </p>
                    <Button
                      onClick={connectGoogleCalendar}
                      disabled={connectingGoogle || !googleClientId}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      {connectingGoogle 
                        ? (language === 'bn' ? 'সংযোগ হচ্ছে...' : 'Connecting...')
                        : (language === 'bn' ? 'Google Calendar সংযুক্ত করুন' : 'Connect Google Calendar')}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Microsoft Outlook Tab */}
            <TabsContent value="microsoft" className="space-y-4 mt-4">
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowMicrosoftHelp(true)}
                    className="gap-1 text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {language === 'bn' ? 'সেটআপ গাইড' : 'Setup Guide'}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="microsoft-client-id">Application (Client) ID</Label>
                    <Input
                      id="microsoft-client-id"
                      value={microsoftClientId}
                      onChange={(e) => setMicrosoftClientId(e.target.value)}
                      placeholder="Enter Microsoft Client ID"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="microsoft-client-secret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="microsoft-client-secret"
                        type={showMicrosoftSecret ? 'text' : 'password'}
                        value={microsoftClientSecret}
                        onChange={(e) => setMicrosoftClientSecret(e.target.value)}
                        placeholder="Enter Microsoft Client Secret"
                        className="bg-background pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowMicrosoftSecret(!showMicrosoftSecret)}
                      >
                        {showMicrosoftSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={saveMicrosoftCredentials} disabled={savingMicrosoft} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {savingMicrosoft ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Credentials')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm">
                  {language === 'bn' ? 'সংযোগ স্ট্যাটাস' : 'Connection Status'}
                </h4>
                
                {microsoftSync ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm">{language === 'bn' ? 'সংযুক্ত' : 'Connected'}</span>
                      </div>
                      <Switch
                        checked={microsoftSync.sync_enabled}
                        onCheckedChange={(checked) => toggleSync('microsoft', checked)}
                      />
                    </div>
                    
                    {microsoftSync.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last sync:'} {format(new Date(microsoftSync.last_sync_at), 'PPp')}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={syncMicrosoftCalendar}
                        disabled={syncingMicrosoft || !microsoftSync.sync_enabled}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingMicrosoft ? 'animate-spin' : ''}`} />
                        {syncingMicrosoft ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Now')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => disconnectCalendar('microsoft')}
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        {language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {language === 'bn' 
                        ? 'Microsoft Outlook এখনো সংযুক্ত নয়। উপরে credentials সংরক্ষণ করে সংযোগ করুন।'
                        : 'Microsoft Outlook is not connected yet. Save your credentials above and connect.'}
                    </p>
                    <Button
                      onClick={connectMicrosoftCalendar}
                      disabled={connectingMicrosoft || !microsoftClientId}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      {connectingMicrosoft 
                        ? (language === 'bn' ? 'সংযোগ হচ্ছে...' : 'Connecting...')
                        : (language === 'bn' ? 'Outlook Calendar সংযুক্ত করুন' : 'Connect Outlook Calendar')}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Troubleshooting Button */}
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => setShowTroubleshooting(true)}
              className="w-full gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {language === 'bn' ? 'সমস্যা সমাধান গাইড' : 'Troubleshooting Guide'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Setup Guide Dialog */}
      <Dialog open={showGoogleHelp} onOpenChange={setShowGoogleHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Google Calendar OAuth Setup Guide
            </DialogTitle>
            <DialogDescription>
              Follow these steps to create OAuth credentials for Google Calendar integration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Go to Google Cloud Console
                </h3>
                <p className="text-muted-foreground pl-8">
                  Open <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a> and sign in with your Google account.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Create a New Project
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Click on the project dropdown at the top</li>
                  <li>Click "New Project"</li>
                  <li>Enter a project name (e.g., "LifeOS Calendar")</li>
                  <li>Click "Create"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Enable Google Calendar API
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "Library"</li>
                  <li>Search for "Google Calendar API"</li>
                  <li>Click on it and press "Enable"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                  Configure OAuth Consent Screen
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "OAuth consent screen"</li>
                  <li>Select "External" user type and click "Create"</li>
                  <li>Fill in App name, User support email, and Developer email</li>
                  <li>Click "Save and Continue" through the remaining steps</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">5</span>
                  Create OAuth Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "Credentials"</li>
                  <li>Click "Create Credentials" → "OAuth client ID"</li>
                  <li>Select "Web application" as application type</li>
                  <li>Add a name for your OAuth client</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">6</span>
                  Add Authorized Redirect URI
                </h3>
                <div className="pl-8 space-y-2">
                  <p className="text-muted-foreground">Under "Authorized redirect URIs", add this <strong>exact</strong> URL:</p>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs break-all flex items-center justify-between gap-2">
                    <span>{redirectUri}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(redirectUri);
                        toast({ title: 'Copied!', description: 'Redirect URI copied to clipboard' });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This URL must match <strong>exactly</strong> including the /settings path. Do not add trailing slashes.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">7</span>
                  Copy Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Click "Create" to generate your credentials</li>
                  <li>Copy the "Client ID" and "Client Secret"</li>
                  <li>Paste them in the fields above and save</li>
                </ul>
              </div>

              {/* Critical: Add Test Users Section */}
              <div className="space-y-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs">8</span>
                  Add Test Users (Required for Testing Mode)
                </h3>
                <p className="text-sm text-muted-foreground">
                  While your app is in "Testing" status (not yet published), you <strong>must</strong> add users who can access the app:
                </p>
                <ul className="text-muted-foreground pl-4 space-y-1 list-disc list-inside text-sm">
                  <li>Go to "APIs & Services" → "OAuth consent screen"</li>
                  <li>Scroll down to "Test users" section</li>
                  <li>Click "+ ADD USERS"</li>
                  <li>Enter the Gmail addresses of users who need access (including your own)</li>
                  <li>Click "Save"</li>
                </ul>
                <div className="bg-orange-500/20 rounded p-2 mt-2">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    <strong>⚠️ Without adding test users, you'll get a "403: access_denied" error</strong> saying the app hasn't completed the Google verification process.
                  </p>
                </div>
              </div>

              {/* Publishing Option */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">9</span>
                  Optional: Publish Your App
                </h3>
                <p className="text-muted-foreground pl-8 text-sm">
                  To allow any Google user to connect (without adding them as test users):
                </p>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside text-sm">
                  <li>Go to "OAuth consent screen"</li>
                  <li>Click "PUBLISH APP" button</li>
                  <li>Confirm the publishing action</li>
                  <li>For apps accessing sensitive scopes, Google may require verification</li>
                </ul>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                <p className="text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <strong>Quick Fix:</strong> If you see "Access blocked" error, add your email as a test user in step 8.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Microsoft Setup Guide Dialog */}
      <Dialog open={showMicrosoftHelp} onOpenChange={setShowMicrosoftHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Microsoft Outlook OAuth Setup Guide
            </DialogTitle>
            <DialogDescription>
              Follow these steps to create OAuth credentials for Microsoft Outlook integration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Go to Azure Portal
                </h3>
                <p className="text-muted-foreground pl-8">
                  Open <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Azure Portal <ExternalLink className="h-3 w-3" />
                  </a> and sign in with your Microsoft account.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Register a New Application
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "Microsoft Entra ID" (formerly Azure AD)</li>
                  <li>Click "App registrations" → "New registration"</li>
                  <li>Enter a name (e.g., "LifeOS Calendar")</li>
                  <li>Select "Accounts in any organizational directory and personal Microsoft accounts"</li>
                </ul>
              </div>

              {/* Critical: Redirect URI Configuration */}
              <div className="space-y-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs">3</span>
                  Add Redirect URI (Critical Step!)
                </h3>
                <p className="text-sm text-muted-foreground">
                  This is the most common source of errors. The redirect URI must match <strong>exactly</strong>:
                </p>
                <div className="space-y-3 pl-4">
                  <div>
                    <p className="text-xs font-medium mb-1">Platform: Select "Web"</p>
                    <p className="text-xs font-medium mb-1">Redirect URI (copy exactly):</p>
                    <div className="bg-muted p-3 rounded-md font-mono text-xs break-all flex items-center justify-between gap-2">
                      <span>{redirectUri}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(redirectUri);
                          toast({ title: 'Copied!', description: 'Redirect URI copied to clipboard' });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-orange-500/20 rounded p-2">
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      <strong>⚠️ Common mistakes:</strong>
                      <br />• Do NOT use trailing slashes (wrong: .../settings/)
                      <br />• Do NOT use http:// (must be https://)
                      <br />• Include the full path with /settings
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                  Copy Application (Client) ID
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>After registration, go to the app's "Overview"</li>
                  <li>Copy the "Application (client) ID"</li>
                </ul>
              </div>

              {/* Critical: Client Secret Warning */}
              <div className="space-y-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs">5</span>
                  Create Client Secret (Most Common Error!)
                </h3>
                <ul className="text-muted-foreground pl-4 space-y-1 list-disc list-inside text-sm">
                  <li>Go to "Certificates & secrets"</li>
                  <li>Click "New client secret"</li>
                  <li>Add a description and select expiration</li>
                  <li>Click "Add"</li>
                </ul>
                <div className="bg-red-500/20 rounded p-3 mt-2">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    ⚠️ CRITICAL: Copy the "Value" column, NOT the "Secret ID"!
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    After you click "Add", you'll see a table with "Secret ID" and "Value" columns. 
                    You MUST copy the <strong>Value</strong> (the long string that starts with random characters). 
                    The "Secret ID" (GUID format) will NOT work and causes "AADSTS7000215: Invalid client secret" error.
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    💡 The Value is only shown once! If you didn't copy it, delete the secret and create a new one.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">6</span>
                  Add API Permissions
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "API permissions"</li>
                  <li>Click "Add a permission" → "Microsoft Graph"</li>
                  <li>Select "Delegated permissions"</li>
                  <li>Add: Calendars.ReadWrite, User.Read, offline_access</li>
                  <li>Click "Grant admin consent" if available</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">7</span>
                  Save Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Paste your Application ID and Client Secret in the fields above</li>
                  <li>Click "Save Credentials"</li>
                  <li>Then click "Connect Outlook Calendar"</li>
                </ul>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                <p className="text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <strong>Quick Fix:</strong> If you see "AADSTS50011" error, verify the redirect URI matches exactly.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-2">
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  <strong>Tip:</strong> For personal Microsoft accounts, make sure you selected "Personal Microsoft accounts" during app registration.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Troubleshooting Dialog */}
      <Dialog open={showTroubleshooting} onOpenChange={setShowTroubleshooting}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {language === 'bn' ? 'সমস্যা সমাধান গাইড' : 'Troubleshooting Guide'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn' 
                ? 'সাধারণ OAuth ত্রুটি এবং তাদের সমাধান' 
                : 'Common OAuth errors and how to fix them'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              {/* Google Errors Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base text-foreground border-b pb-2">
                  Google Calendar Errors
                </h3>

                {/* 403 Access Denied */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Error 403: access_denied
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "Access blocked: [app] has not completed the Google verification process"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>Add yourself as a test user:</strong> Go to Google Cloud Console → APIs & Services → OAuth consent screen → Test users → Add Users</li>
                      <li><strong>Publish your app:</strong> If you want anyone to use it, click "PUBLISH APP" on the OAuth consent screen</li>
                      <li><strong>Check app status:</strong> Ensure your app isn't in "Needs verification" status</li>
                    </ul>
                  </div>
                </div>

                {/* Redirect URI Mismatch */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    redirect_uri_mismatch
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "The redirect URI in the request does not match the ones authorized"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Go to Google Cloud Console → Credentials → Your OAuth client</li>
                      <li>Add this exact URI to "Authorized redirect URIs":</li>
                    </ul>
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all flex items-center justify-between gap-2 mt-1">
                      <span>{redirectUri}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(redirectUri);
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Invalid Client */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    invalid_client
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "The OAuth client was not found"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Verify your Client ID is correct (no extra spaces)</li>
                      <li>Check that the Client Secret hasn't expired or been deleted</li>
                      <li>Ensure you're using the correct Google Cloud project</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Microsoft Errors Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base text-foreground border-b pb-2">
                  Microsoft Outlook Errors
                </h3>

                {/* AADSTS50011 */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    AADSTS50011: Redirect URI mismatch
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "The redirect URI specified in the request does not match"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Go to Azure Portal → Microsoft Entra ID → App registrations → Your app</li>
                      <li>Click "Authentication" in the left menu</li>
                      <li>Under "Platform configurations", add or update the redirect URI:</li>
                    </ul>
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all flex items-center justify-between gap-2 mt-1">
                      <span>{redirectUri}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(redirectUri);
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      ⚠️ Make sure to select "Web" as the platform type, not "SPA" or "Mobile"
                    </p>
                  </div>
                </div>

                {/* AADSTS7000215 - Invalid Client Secret */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    AADSTS7000215: Invalid client secret
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "Invalid client secret provided. Ensure the secret being sent is the client secret value, not the client secret ID"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">This is the most common error!</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>You copied the Secret ID instead of the Secret Value!</strong></li>
                      <li>Go to Azure Portal → Your app → Certificates & secrets</li>
                      <li>Look at the table - there are two columns: "Secret ID" and "Value"</li>
                      <li>The Secret ID looks like: <code className="bg-muted px-1 rounded">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code></li>
                      <li>The Value looks like: <code className="bg-muted px-1 rounded">abc123~xyz789...</code></li>
                      <li><strong>Use the VALUE, not the ID!</strong></li>
                      <li>If you can't see the Value, create a NEW secret (values are only shown once)</li>
                    </ul>
                  </div>
                </div>

                {/* AADSTS700016 */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    AADSTS700016: Application not found
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "Application with identifier was not found in the directory"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Verify the Application (Client) ID is correct</li>
                      <li>Check you're using the ID from the correct Azure tenant</li>
                      <li>Ensure the app registration hasn't been deleted</li>
                    </ul>
                  </div>
                </div>

                {/* Consent Required */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    AADSTS65001: Consent required
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    "The user or administrator has not consented to use the application"
                  </p>
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-sm font-medium">Solutions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Go to Azure Portal → Your app → API permissions</li>
                      <li>Click "Grant admin consent" if you're an admin</li>
                      <li>Or remove and re-add the permissions</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* General Tips */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-blue-600 dark:text-blue-400">General Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Always use HTTPS for redirect URIs in production</li>
                  <li>Clear browser cookies if you're stuck in an error loop</li>
                  <li>Try using an incognito/private window for testing</li>
                  <li>Check that your domain matches exactly (including www or subdomain)</li>
                  <li>Credential changes may take a few minutes to propagate</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
