import { useState, useEffect } from 'react';
import { Send, Key, Save, Loader2, Eye, EyeOff, CheckCircle, XCircle, TestTube, ExternalLink, MonitorSmartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { isSelfHosted } from '@/lib/selfHostedConfig';

export function ResendSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');

  useEffect(() => {
    if (!isSelfHosted()) {
      loadApiKey();
    } else {
      setLoading(false);
    }
  }, []);

  const loadApiKey = async () => {
    try {
      const response = await supabase.functions.invoke('manage-resend-key', {
        body: { action: 'get' }
      });

      if (response.data?.hasKey) {
        setHasExistingKey(true);
        setMaskedKey(response.data.maskedKey || '••••••••');
      }
    } catch (error) {
      console.error('Failed to load Resend API key status:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!user) return;

    if (!apiKey.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'API কী প্রয়োজন।' 
          : 'API key is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate Resend API key format (starts with re_)
    if (!apiKey.startsWith('re_')) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'অবৈধ Resend API কী ফরম্যাট। কী "re_" দিয়ে শুরু হওয়া উচিত।' 
          : 'Invalid Resend API key format. Key should start with "re_".',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await supabase.functions.invoke('manage-resend-key', {
        body: { 
          action: 'save',
          apiKey: apiKey.trim()
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save API key');
      }

      if (response.data?.success) {
        toast({
          title: language === 'bn' ? 'সফল' : 'Success',
          description: language === 'bn' 
            ? 'Resend API কী সংরক্ষিত হয়েছে।' 
            : 'Resend API key saved successfully.',
        });
        setApiKey('');
        setHasExistingKey(true);
        await loadApiKey();
      } else {
        throw new Error(response.data?.error || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Failed to save Resend API key:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' 
          ? 'API কী সংরক্ষণ ব্যর্থ।' 
          : 'Failed to save API key.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async () => {
    if (!user) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await supabase.functions.invoke('manage-resend-key', {
        body: { 
          action: 'test',
          testEmail: user.email
        }
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
      console.error('Resend test failed:', error);
      setTestResult({
        success: false,
        message: error.message || (language === 'bn' 
          ? 'Resend API পরীক্ষা ব্যর্থ।' 
          : 'Resend API test failed.'),
      });
    } finally {
      setTesting(false);
    }
  };

  const deleteApiKey = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await supabase.functions.invoke('manage-resend-key', {
        body: { action: 'delete' }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete API key');
      }

      if (response.data?.success) {
        toast({
          title: language === 'bn' ? 'সফল' : 'Success',
          description: language === 'bn' 
            ? 'Resend API কী মুছে ফেলা হয়েছে।' 
            : 'Resend API key deleted successfully.',
        });
        setHasExistingKey(false);
        setMaskedKey('');
        setApiKey('');
      }
    } catch (error: any) {
      console.error('Failed to delete Resend API key:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' 
          ? 'API কী মুছতে ব্যর্থ।' 
          : 'Failed to delete API key.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSelfHosted()) {
    return (
      <div className="space-y-4">
        <Alert>
          <MonitorSmartphone className="h-4 w-4" />
          <AlertDescription>
            {language === 'bn' 
              ? 'Resend API স্থানীয়/ডকার মোডে উপলব্ধ নয়। এই বৈশিষ্ট্যটি ক্লাউড মোডে ব্যবহার করুন।'
              : 'Resend API is not available in local/Docker mode. This feature requires Cloud mode.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Send className="h-4 w-4" />
        <AlertDescription>
          {language === 'bn' 
            ? 'Resend API ব্যবহার করে ইমেইল নোটিফিকেশন পাঠানো হয় (টাস্ক রিমাইন্ডার, লোন পেমেন্ট এলার্ট, টাস্ক অ্যাসাইনমেন্ট ইত্যাদি)।'
            : 'Resend API is used to send email notifications (task reminders, loan payment alerts, task assignments, etc.).'
          }
        </AlertDescription>
      </Alert>

      {/* Resend API Key Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            {language === 'bn' ? 'Resend API কী' : 'Resend API Key'}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            {language === 'bn' 
              ? 'আপনার Resend অ্যাকাউন্ট থেকে API কী দিন।'
              : 'Enter your API key from Resend.'
            }
            <a 
              href="https://resend.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {language === 'bn' ? 'API কী পান' : 'Get API Key'}
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasExistingKey ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'API কী কনফিগার করা হয়েছে' : 'API Key Configured'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {maskedKey}
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                  {language === 'bn' ? 'সক্রিয়' : 'Active'}
                </Badge>
              </div>

              {/* Update API Key */}
              <div className="space-y-2">
                <Label htmlFor="new_api_key">
                  {language === 'bn' ? 'নতুন API কী (আপডেট করতে)' : 'New API Key (to update)'}
                </Label>
                <div className="relative">
                  <Input
                    id="new_api_key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Key className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {language === 'bn' ? 'কোনো API কী কনফিগার করা হয়নি' : 'No API Key Configured'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' 
                        ? 'ইমেইল নোটিফিকেশন পাঠাতে API কী যোগ করুন।'
                        : 'Add an API key to enable email notifications.'
                      }
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {language === 'bn' ? 'সেটআপ প্রয়োজন' : 'Setup Required'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">
                  {language === 'bn' ? 'API কী' : 'API Key'} *
                </Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'API কী "re_" দিয়ে শুরু হওয়া উচিত।'
                    : 'API key should start with "re_".'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Important Note */}
          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <AlertDescription className="text-sm">
              {language === 'bn' 
                ? '⚠️ Resend ব্যবহার করতে আপনার ডোমেইন ভেরিফাই করতে হবে। '
                : '⚠️ You must verify your domain in Resend to send emails. '
              }
              <a 
                href="https://resend.com/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {language === 'bn' ? 'ডোমেইন ভেরিফাই করুন' : 'Verify Domain'}
                <ExternalLink className="h-3 w-3 inline ml-1" />
              </a>
            </AlertDescription>
          </Alert>
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
        {hasExistingKey && (
          <Button
            variant="outline"
            onClick={testApiKey}
            disabled={testing}
            className="flex-1 sm:flex-none"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            {language === 'bn' ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
          </Button>
        )}
        <Button
          onClick={saveApiKey}
          disabled={saving || !apiKey.trim()}
          className="flex-1 sm:flex-none"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {hasExistingKey 
            ? (language === 'bn' ? 'আপডেট করুন' : 'Update Key')
            : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Key')
          }
        </Button>
        {hasExistingKey && (
          <Button
            variant="destructive"
            onClick={deleteApiKey}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            {language === 'bn' ? 'মুছুন' : 'Delete Key'}
          </Button>
        )}
      </div>
    </div>
  );
}
