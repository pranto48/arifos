import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface AttachmentManagerProps {
  entityId: string;
  entityType: 'task' | 'note' | 'project';
  compact?: boolean;
}

export function AttachmentManager({ entityId, entityType, compact = false }: AttachmentManagerProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && entityId) loadAttachments();
  }, [user, entityId]);

  const loadAttachments = async () => {
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 20MB limit`);
          continue;
        }

        const filePath = `${user.id}/${entityType}/${entityId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        await supabase.from('attachments').insert({
          user_id: user.id,
          entity_id: entityId,
          entity_type: entityType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        });
      }

      toast.success('Files uploaded');
      loadAttachments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (att: Attachment) => {
    if (!confirm('Delete this attachment?')) return;
    
    // Extract path from URL
    const urlParts = att.file_url.split('/attachments/');
    if (urlParts[1]) {
      await supabase.storage.from('attachments').remove([urlParts[1]]);
    }
    
    await supabase.from('attachments').delete().eq('id', att.id);
    toast.success('Attachment deleted');
    loadAttachments();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4 text-muted-foreground" />;
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-400" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 group">
              {getIcon(att.file_type)}
              <span className="text-xs text-foreground truncate flex-1">{att.file_name}</span>
              <span className="text-[10px] text-muted-foreground">{formatSize(att.file_size)}</span>
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
              <button
                onClick={() => handleDelete(att)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
