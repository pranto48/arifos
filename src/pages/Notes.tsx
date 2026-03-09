import { useState, useEffect } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { FileText, Pin, Star, Search, Lock, LockOpen, Plus, X, Eye, EyeOff, Trash2, MoreVertical } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { encryptContent, decryptContent, validatePassphrase } from '@/lib/encryption';
import { format } from 'date-fns';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { FieldVisibility } from '@/components/shared/FieldVisibility';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import ReactMarkdown from 'react-markdown';

export default function Notes() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  
  // Create note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isVault, setIsVault] = useState(false);
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) loadNotes();
  }, [user, mode]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user?.id)
      .eq('note_type', mode)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const filtered = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    (!n.is_vault && n.content?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setDecryptedContent(null);
    setPassphrase('');
    setIsViewDialogOpen(true);
  };

  const handleDecrypt = async () => {
    if (!selectedNote || !passphrase) return;
    
    setIsDecrypting(true);
    try {
      const decrypted = await decryptContent(selectedNote.encrypted_content, passphrase);
      setDecryptedContent(decrypted);
      toast({ title: 'Unlocked', description: 'Note decrypted successfully.' });
    } catch (error) {
      toast({ 
        title: 'Decryption failed', 
        description: 'Incorrect passphrase. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newTitle.trim() || !user) return;

    // Validate vault passphrase if creating vault note
    if (isVault) {
      if (!vaultPassphrase) {
        toast({ title: 'Error', description: 'Passphrase is required for vault notes', variant: 'destructive' });
        return;
      }
      if (vaultPassphrase !== confirmPassphrase) {
        toast({ title: 'Error', description: 'Passphrases do not match', variant: 'destructive' });
        return;
      }
      const validation = validatePassphrase(vaultPassphrase);
      if (!validation.valid) {
        toast({ title: 'Weak passphrase', description: validation.message, variant: 'destructive' });
        return;
      }
    }

    setIsCreating(true);
    try {
      let encrypted_content = null;
      let content = newContent;

      if (isVault && newContent) {
        encrypted_content = await encryptContent(newContent, vaultPassphrase);
        content = null; // Don't store plaintext for vault notes
      }

      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);

      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        title: newTitle.trim(),
        content: isVault ? null : content,
        encrypted_content,
        tags: tagsArray,
        is_vault: isVault,
        note_type: mode,
      });

      if (error) throw error;

      toast({ 
        title: isVault ? '🔒 Vault note created' : 'Note created', 
        description: isVault ? 'Your note is securely encrypted.' : 'Your note has been saved.'
      });
      
      // Reset form
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setIsVault(false);
      setVaultPassphrase('');
      setConfirmPassphrase('');
      setIsCreateDialogOpen(false);
      loadNotes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    await supabase.from('notes').update({ is_pinned: !currentPinned }).eq('id', noteId);
    loadNotes();
  };

  const toggleFavorite = async (noteId: string, currentFav: boolean) => {
    await supabase.from('notes').update({ is_favorite: !currentFav }).eq('id', noteId);
    loadNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Note deleted successfully' });
      loadNotes();
    }
  };

  const handleMoveNote = async (noteId: string, currentType: string) => {
    const newType = currentType === 'office' ? 'personal' : 'office';
    const { error } = await supabase.from('notes').update({ note_type: newType }).eq('id', noteId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to move note', variant: 'destructive' });
    } else {
      toast({ title: 'Moved', description: `Note moved to ${newType}` });
      loadNotes();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t('notes.title')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportActions
            variant="compact"
            headers={['Title', 'Type', 'Tags', 'Pinned', 'Vault', 'Created']}
            rows={filtered.map(n => [n.title, n.note_type || '', (n.tags || []).join(', '), n.is_pinned ? 'Yes' : 'No', n.is_vault ? 'Yes' : 'No', n.created_at ? format(new Date(n.created_at), 'yyyy-MM-dd') : ''])}
            filename={`lifeos-notes-${new Date().toISOString().split('T')[0]}`}
            title="Notes Report"
            summaryCards={[
              { label: 'Total', value: filtered.length },
              { label: 'Vault', value: filtered.filter(n => n.is_vault).length },
              { label: 'Pinned', value: filtered.filter(n => n.is_pinned).length },
            ]}
          />
          <DataExportImportButton preset="notes" />
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {t('notes.newNote')}
          </Button>
        </div>
      </div>

      {/* Search Bar - Full width on mobile */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder={t('notes.searchNotes')} 
          className="pl-9 bg-muted/50" 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('notes.noNotesYet')}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(note => (
            <Card 
              key={note.id} 
              className="bg-card border-border hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => handleViewNote(note)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {note.is_vault && <Lock className="h-4 w-4 text-primary" />}
                    <h3 className="font-medium text-foreground">{note.title}</h3>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePin(note.id, note.is_pinned); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pin className={`h-4 w-4 ${note.is_pinned ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id, note.is_favorite); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className={`h-4 w-4 ${note.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={(e) => { e.stopPropagation(); handleMoveNote(note.id, note.note_type); }}
                                        >
                                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                                          Move to {note.note_type === 'office' ? 'Personal' : 'Office'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {note.is_vault ? (
                  <p className="text-sm text-muted-foreground italic">🔒 {t('notes.encryptedNote')}</p>
                ) : note.content ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                ) : null}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-1">
                    {note.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                    {note.is_vault && <Badge className="bg-primary/20 text-primary text-xs">Vault</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM d')}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Note Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedNote?.is_vault && <Lock className="h-5 w-5 text-primary" />}
              {selectedNote?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNote?.is_vault && !decryptedContent ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t('notes.passphraseWarning').split('.')[0]}.
              </p>
              <div className="space-y-2">
                <Label>{t('notes.passphrase')}</Label>
                <div className="relative">
                  <Input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder={t('notes.enterPassphrase')}
                    className="bg-muted/50 pr-10"
                    onKeyDown={e => e.key === 'Enter' && handleDecrypt()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleDecrypt} disabled={!passphrase || isDecrypting} className="w-full">
                <LockOpen className="h-4 w-4 mr-2" />
                {isDecrypting ? t('notes.decrypting') : t('notes.unlockNote')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-muted/30 rounded-lg p-4 min-h-[200px] text-foreground">
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
                  prose-strong:text-foreground prose-a:text-primary prose-code:text-primary
                  prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border
                  prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown>{selectedNote?.is_vault ? (decryptedContent || '') : (selectedNote?.content || t('notes.noContent'))}</ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex gap-1">
                  {selectedNote?.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <span>{t('notes.created')} {selectedNote && format(new Date(selectedNote.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('notes.createNewNote')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('notes.title')}</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={t('notes.noteTitlePlaceholder')}
                className="bg-muted/50"
              />
            </div>

            <FieldVisibility entityType="note" fieldName="content">
              <div className="space-y-2">
                <Label>{t('notes.content')}</Label>
                <MarkdownEditor
                  value={newContent}
                  onChange={setNewContent}
                  placeholder={t('notes.writeNote')}
                  minHeight="200px"
                />
              </div>
            </FieldVisibility>

            <FieldVisibility entityType="note" fieldName="tags">
              <div className="space-y-2">
                <Label>{t('notes.tagsComma')}</Label>
                <Input
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="work, ideas, important"
                  className="bg-muted/50"
                />
              </div>
            </FieldVisibility>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t('notes.vaultNote')}</p>
                  <p className="text-xs text-muted-foreground">{t('notes.encryptPassphrase')}</p>
                </div>
              </div>
              <Switch checked={isVault} onCheckedChange={setIsVault} />
            </div>

            <AnimatePresence>
              {isVault && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-foreground mb-3">
                      ⚠️ <strong>{t('notes.passphraseWarning')}</strong>
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t('notes.passphrase')}</Label>
                        <Input
                          type="password"
                          value={vaultPassphrase}
                          onChange={e => setVaultPassphrase(e.target.value)}
                          placeholder={t('notes.enterPassphrase')}
                          className="bg-background"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('notes.passphraseHint')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('notes.confirmPassphrase')}</Label>
                        <Input
                          type="password"
                          value={confirmPassphrase}
                          onChange={e => setConfirmPassphrase(e.target.value)}
                          placeholder={t('notes.confirmPassphrase')}
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreateNote} disabled={!newTitle.trim() || isCreating}>
                {isCreating ? t('notes.creating') : isVault ? `🔒 ${t('notes.createVaultNote')}` : t('notes.createNote')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
