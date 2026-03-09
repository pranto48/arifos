import { useState, useEffect } from 'react';
import { Mail, Server, Lock, Save, Loader2, TestTube, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, MonitorSmartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { isSelfHosted } from '@/lib/selfHostedConfig';

interface SmtpSettingsData {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
}

const defaultSettings: SmtpSettingsData = {
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  from_email: '',
  from_name: 'LifeOS',
  use_tls: true,
  is_active: true,
};

export function SmtpSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [settings, setSettings] = useState<SmtpSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings({
          id: data.id,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_username: data.smtp_username,
          smtp_password: data.smtp_password,
          from_email: data.from_email,
          from_name: data.from_name,
          use_tls: data.use_tls,
          is_active: data.is_active,
        });
        setHasExistingSettings(true);
      }
    } catch (error) {
      console.error('Failed to load SMTP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    // Validate required fields
    if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password || !settings.from_email) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'সমস্ত প্রয়োজনীয় ফিল্ড পূরণ করুন।' 
          : 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.from_email)) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'সঠিক ইমেইল ঠিকানা দিন।' 
          : 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (hasExistingSettings && settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('smtp_settings')
          .update({
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_username: settings.smtp_username,
            smtp_password: settings.smtp_password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            use_tls: settings.use_tls,
            is_active: settings.is_active,
            updated_by: user.id,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('smtp_settings')
          .insert({
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_username: settings.smtp_username,
            smtp_password: settings.smtp_password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            use_tls: settings.use_tls,
            is_active: settings.is_active,
            updated_by: user.id,
          });

        if (error) throw error;
        setHasExistingSettings(true);
      }

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' 
          ? 'SMTP সেটিংস সংরক্ষিত হয়েছে।' 
          : 'SMTP settings saved successfully.',
      });

      // Reload to get the new ID if inserted
      await loadSettings();
    } catch (error: any) {
      console.error('Failed to save SMTP settings:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' 
          ? 'SMTP সেটিংস সংরক্ষণ ব্যর্থ।' 
          : 'Failed to save SMTP settings.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) return;

    // Validate required fields first
    if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password || !settings.from_email) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'সমস্ত প্রয়োজনীয় ফিল্ড পূরণ করুন।' 
          : 'Please fill in all required fields before testing.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    if (isSelfHosted()) {
      setTestResult({
        success: false,
        message: language === 'bn' 
          ? 'SMTP টেস্ট স্থানীয়/ডকার মোডে উপলব্ধ নয়।' 
          : 'SMTP test email is not available in local/Docker mode.',
      });
      setTesting(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke('send-smtp-email', {
        body: {
          action: 'test',
          smtp_settings: {
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_username: settings.smtp_username,
            smtp_password: settings.smtp_password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            use_tls: settings.use_tls,
          },
          test_email: user.email,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Test failed');
      }

      if (response.data?.success) {
        setTestResult({
          success: true,
          message: language === 'bn' 
            ? `টেস্ট ইমেইল ${user.email} এ পাঠানো হয়েছে।` 
            : `Test email sent to ${user.email}.`,
        });
      } else {
        throw new Error(response.data?.error || 'Test failed');
      }
    } catch (error: any) {
      console.error('SMTP test failed:', error);
      setTestResult({
        success: false,
        message: error.message || (language === 'bn' 
          ? 'SMTP সংযোগ পরীক্ষা ব্যর্থ।' 
          : 'SMTP connection test failed.'),
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          {language === 'bn' 
            ? 'এই SMTP সেটিংস ব্যবহার করে সিস্টেম ইমেইল পাঠানো হবে (রেজিস্ট্রেশন, পাসওয়ার্ড রিসেট, নোটিফিকেশন ইত্যাদি)।'
            : 'These SMTP settings will be used to send system emails (registration, password reset, notifications, etc.).'
          }
        </AlertDescription>
      </Alert>

      {/* SMTP Server Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5" />
            {language === 'bn' ? 'SMTP সার্ভার' : 'SMTP Server'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'আপনার ইমেইল সার্ভারের সংযোগ সেটিংস।'
              : 'Connection settings for your email server.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">
                {language === 'bn' ? 'SMTP হোস্ট' : 'SMTP Host'} *
              </Label>
              <Input
                id="smtp_host"
                placeholder="smtp.example.com"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">
                {language === 'bn' ? 'SMTP পোর্ট' : 'SMTP Port'} *
              </Label>
              <Input
                id="smtp_port"
                type="number"
                placeholder="587"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_username">
                {language === 'bn' ? 'ইউজারনেম' : 'Username'} *
              </Label>
              <Input
                id="smtp_username"
                placeholder="your@email.com"
                value={settings.smtp_username}
                onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">
                {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'} *
              </Label>
              <div className="relative">
                <Input
                  id="smtp_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={settings.smtp_password}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {language === 'bn' ? 'TLS/SSL ব্যবহার করুন' : 'Use TLS/SSL'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'নিরাপদ সংযোগের জন্য TLS এনক্রিপশন সক্রিয় করুন।'
                    : 'Enable TLS encryption for secure connection.'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={settings.use_tls}
              onCheckedChange={(checked) => setSettings({ ...settings, use_tls: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            {language === 'bn' ? 'প্রেরক তথ্য' : 'Sender Information'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'ইমেইলে কোন নাম ও ঠিকানা দেখাবে সেই তথ্য।'
              : 'Name and address that will appear in sent emails.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_email">
                {language === 'bn' ? 'প্রেরক ইমেইল' : 'From Email'} *
              </Label>
              <Input
                id="from_email"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_name">
                {language === 'bn' ? 'প্রেরক নাম' : 'From Name'}
              </Label>
              <Input
                id="from_name"
                placeholder="LifeOS"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <div>
                <p className="text-sm font-medium">
                  {language === 'bn' ? 'SMTP সক্রিয়' : 'SMTP Active'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'এই SMTP সেটিংস ব্যবহার করে ইমেইল পাঠান।'
                    : 'Use these SMTP settings to send emails.'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Result */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={testConnection}
          disabled={testing || !settings.smtp_host}
          className="flex-1 sm:flex-none"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <TestTube className="h-4 w-4 mr-2" />
          )}
          {language === 'bn' ? 'সংযোগ পরীক্ষা' : 'Test Connection'}
        </Button>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="flex-1 sm:flex-none"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Settings'}
        </Button>
      </div>

      {/* Status */}
      {hasExistingSettings && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={settings.is_active ? 'default' : 'secondary'}>
            {settings.is_active 
              ? (language === 'bn' ? 'সক্রিয়' : 'Active') 
              : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')
            }
          </Badge>
          <span>
            {language === 'bn' 
              ? 'SMTP কনফিগার করা হয়েছে'
              : 'SMTP is configured'
            }
          </span>
        </div>
      )}

      {/* Common SMTP Providers Help */}
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {language === 'bn' ? 'সাধারণ SMTP প্রোভাইডার' : 'Common SMTP Providers'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded bg-background">
              <p className="font-medium">Gmail</p>
              <p className="text-muted-foreground">smtp.gmail.com : 587</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="font-medium">Outlook/Microsoft</p>
              <p className="text-muted-foreground">smtp.office365.com : 587</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="font-medium">SendGrid</p>
              <p className="text-muted-foreground">smtp.sendgrid.net : 587</p>
            </div>
            <div className="p-2 rounded bg-background">
              <p className="font-medium">Mailgun</p>
              <p className="text-muted-foreground">smtp.mailgun.org : 587</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
