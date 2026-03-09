
-- Create storage bucket for AI document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-documents', 'ai-documents', false);

-- RLS for ai-documents bucket
CREATE POLICY "Users can upload own ai documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ai-documents' AND (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users can view own ai documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-documents' AND (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users can delete own ai documents" ON storage.objects FOR DELETE
  USING (bucket_id = 'ai-documents' AND (SELECT auth.uid()) IS NOT NULL);
