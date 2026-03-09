import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckSquare, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceCaptureProps {
  onClose: () => void;
}

export function VoiceCapture({ onClose }: VoiceCaptureProps) {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [savedText, setSavedText] = useState('');
  const [saveType, setSaveType] = useState<'task' | 'note'>('task');

  const { isListening, transcript, isSupported, toggleListening } = useVoiceInput({
    language: language === 'bn' ? 'bn-BD' : 'en-US',
    continuous: true,
    onError: (err) => {
      toast({ title: 'Voice Error', description: err, variant: 'destructive' });
    },
  });

  const handleSave = async () => {
    const text = transcript || savedText;
    if (!text.trim() || !user) return;

    setSaving(true);
    try {
      if (saveType === 'task') {
        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: text.trim(),
          status: 'todo',
          task_type: mode,
          priority: 'medium',
        });
        if (error) throw error;
        toast({ title: language === 'bn' ? 'কাজ তৈরি হয়েছে' : 'Task created', description: text.trim() });
        window.dispatchEvent(new CustomEvent('tasks-updated'));
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id,
          title: text.trim().slice(0, 100),
          content: text.trim(),
          note_type: mode,
        });
        if (error) throw error;
        toast({ title: language === 'bn' ? 'নোট সংরক্ষিত' : 'Note saved', description: text.trim().slice(0, 60) });
      }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-center py-8 space-y-2">
        <MicOff className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Voice input is not supported in this browser.</p>
        <p className="text-xs text-muted-foreground">Try Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={saveType === 'task' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSaveType('task')}
        >
          <CheckSquare className="h-4 w-4 mr-1" />
          {language === 'bn' ? 'কাজ' : 'Task'}
        </Button>
        <Button
          variant={saveType === 'note' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSaveType('note')}
        >
          <FileText className="h-4 w-4 mr-1" />
          {language === 'bn' ? 'নোট' : 'Note'}
        </Button>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center gap-4 py-4">
        <motion.button
          onClick={toggleListening}
          whileTap={{ scale: 0.9 }}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
            isListening 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full bg-destructive/30"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {isListening ? <MicOff className="h-8 w-8 relative z-10" /> : <Mic className="h-8 w-8" />}
        </motion.button>
        
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Badge variant="destructive" className="animate-pulse">
                {language === 'bn' ? 'শুনছি...' : 'Listening...'}
              </Badge>
            </motion.div>
          ) : (
            <motion.p key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground">
              {language === 'bn' ? 'কথা বলতে ট্যাপ করুন' : 'Tap to speak'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Transcript */}
      {transcript && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-muted/50 border border-border min-h-[60px]">
          <p className="text-sm text-foreground">{transcript}</p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          {language === 'bn' ? 'বাতিল' : 'Cancel'}
        </Button>
        <Button onClick={handleSave} disabled={!transcript?.trim() || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {language === 'bn' ? `${saveType === 'task' ? 'কাজ' : 'নোট'} সংরক্ষণ` : `Save as ${saveType === 'task' ? 'Task' : 'Note'}`}
        </Button>
      </div>
    </div>
  );
}
