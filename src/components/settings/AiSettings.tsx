import { useState, useEffect } from 'react';
import { Sparkles, Zap, Key, Eye, EyeOff, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiIndicator } from '@/components/shared/AiIndicator';

const PROVIDERS = [
  { id: 'free', name: 'Free (Built-in)', description: '10 AI calls/day using built-in models', icon: Sparkles },
  { id: 'openai', name: 'OpenAI', description: 'Use your own OpenAI API key for unlimited access', icon: Zap },
  { id: 'custom', name: 'Custom API', description: 'Any OpenAI-compatible API endpoint', icon: Key },
];

const MODELS = {
  free: [{ id: 'auto', name: 'Auto (Gemini Flash Lite)' }],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Affordable)' },
    { id: 'gpt-4o', name: 'GPT-4o (Best Quality)' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Budget)' },
  ],
  custom: [{ id: 'auto', name: 'Default Model' }],
};

export function AiSettings() {
  const { config, saveConfig, getRemainingCalls, loading } = useAiAssist();
  const { language } = useLanguage();
  const [provider, setProvider] = useState<'free' | 'openai' | 'custom'>(config?.provider as any || 'free');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(config?.model_preference || 'auto');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider || 'free');
      setModel(config.model_preference || 'auto');
      if (config.api_key_encrypted) setApiKey('••••••••••••••••');
    }
  }, [config]);

  const remaining = getRemainingCalls();

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      provider,
      model_preference: model,
    };
    if (apiKey && !apiKey.startsWith('••')) {
      updates.api_key_encrypted = apiKey;
    }
    await saveConfig(updates);
    setSaving(false);
  };

  const models = MODELS[provider as keyof typeof MODELS] || MODELS.free;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'AI কনফিগারেশন' : 'AI Configuration'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'bn' ? 'রিপোর্ট সামারি, স্মার্ট অ্যালার্ট এবং নোটিফিকেশন ডাইজেস্ট কনফিগার করুন' : 'Configure AI-powered report summaries, smart alerts, and notification digests'}
          </p>
        </div>
        <AiIndicator provider={provider} remaining={remaining} />
      </div>

      {/* Provider Selection */}
      <div className="grid gap-3">
        {PROVIDERS.map(p => {
          const Icon = p.icon;
          const isActive = provider === p.id;
          return (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => {
                setProvider(p.id as 'free' | 'openai' | 'custom');
                setModel(MODELS[p.id as keyof typeof MODELS]?.[0]?.id || 'auto');
              }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.id === 'free' && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${isActive ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                  {isActive && <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Free tier info */}
      {provider === 'free' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {language === 'bn'
              ? `আপনার আজকের বাকি AI কল: ${remaining ?? 10}/10। আনলিমিটেড ব্যবহারের জন্য নিজের API কী যোগ করুন।`
              : `You have ${remaining ?? 10}/10 free AI calls remaining today. Add your own API key for unlimited usage.`}
          </AlertDescription>
        </Alert>
      )}

      {/* API Key field for paid providers */}
      {provider !== 'free' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{provider === 'openai' ? 'OpenAI API Key' : 'API Key'}</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={provider === 'openai' ? 'sk-...' : 'Enter your API key'}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {provider === 'openai'
                ? 'Get your key from platform.openai.com/api-keys'
                : 'Enter your API key for the custom endpoint'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{language === 'bn' ? 'মডেল' : 'Model'}</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : language === 'bn' ? 'সংরক্ষণ করুন' : 'Save AI Settings'}
      </Button>
    </div>
  );
}
