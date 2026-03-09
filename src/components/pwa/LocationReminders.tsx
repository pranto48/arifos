import { useState } from 'react';
import { MapPin, Plus, Trash2, Navigation, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useLocationReminders } from '@/hooks/useLocationReminders';
import { useLanguage } from '@/contexts/LanguageContext';

export function LocationReminders() {
  const { language } = useLanguage();
  const {
    isSupported, isWatching, currentPosition, reminders,
    startWatching, stopWatching, addReminder, removeReminder, clearTriggered,
  } = useLocationReminders();
  
  const [title, setTitle] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('200');

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'bn' ? 'আপনার ব্রাউজার লোকেশন সমর্থন করে না' : 'Location is not supported in your browser.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleUseCurrentLocation = () => {
    if (currentPosition) {
      setLat(currentPosition.lat.toFixed(6));
      setLng(currentPosition.lng.toFixed(6));
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
        },
        () => toast({ title: 'Error', description: 'Could not get location', variant: 'destructive' })
      );
    }
  };

  const handleAdd = () => {
    if (!title.trim() || !lat || !lng) return;
    addReminder(title.trim(), parseFloat(lat), parseFloat(lng), parseInt(radius) || 200);
    setTitle('');
    setLat('');
    setLng('');
    toast({ title: language === 'bn' ? 'রিমাইন্ডার যোগ হয়েছে' : 'Reminder added' });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={isWatching ? 'destructive' : 'default'}
          size="sm"
          onClick={isWatching ? stopWatching : startWatching}
        >
          {isWatching ? <PowerOff className="h-4 w-4 mr-1" /> : <Power className="h-4 w-4 mr-1" />}
          {isWatching 
            ? (language === 'bn' ? 'ট্র্যাকিং বন্ধ' : 'Stop Tracking')
            : (language === 'bn' ? 'ট্র্যাকিং শুরু' : 'Start Tracking')
          }
        </Button>
        {currentPosition && (
          <Badge variant="outline" className="text-xs">
            <Navigation className="h-3 w-3 mr-1" />
            {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
          </Badge>
        )}
      </div>

      {/* Add reminder form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {language === 'bn' ? 'নতুন লোকেশন রিমাইন্ডার' : 'New Location Reminder'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'রিমাইন্ডার টেক্সট' : 'Reminder text'}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'bn' ? 'কী মনে করিয়ে দিতে হবে?' : 'What to remind?'} className="bg-muted/50" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{language === 'bn' ? 'অক্ষাংশ' : 'Latitude'}</Label>
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="23.8103" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">{language === 'bn' ? 'দ্রাঘিমাংশ' : 'Longitude'}</Label>
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="90.4125" className="bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs">{language === 'bn' ? 'ব্যাসার্ধ (মি)' : 'Radius (m)'}</Label>
              <Input value={radius} onChange={e => setRadius(e.target.value)} placeholder="200" className="bg-muted/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleUseCurrentLocation}>
              <Navigation className="h-3.5 w-3.5 mr-1" />
              {language === 'bn' ? 'বর্তমান অবস্থান' : 'Use My Location'}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!title.trim() || !lat || !lng}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {language === 'bn' ? 'যোগ করুন' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{language === 'bn' ? 'সক্রিয় রিমাইন্ডার' : 'Active Reminders'}</h3>
            {reminders.some(r => r.triggered) && (
              <Button size="sm" variant="ghost" onClick={clearTriggered} className="text-xs h-7">
                {language === 'bn' ? 'রিসেট' : 'Reset triggered'}
              </Button>
            )}
          </div>
          {reminders.map(r => (
            <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${r.triggered ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-card border-border'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className={`h-4 w-4 shrink-0 ${r.triggered ? 'text-green-600' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.lat.toFixed(4)}, {r.lng.toFixed(4)} • {r.radiusMeters}m</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.triggered && <Badge variant="outline" className="text-xs text-green-600">✓</Badge>}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeReminder(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
