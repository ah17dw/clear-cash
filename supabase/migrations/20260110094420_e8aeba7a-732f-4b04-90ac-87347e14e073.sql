-- Create RLS policies for renewal-files bucket
CREATE POLICY "Users can upload their own renewal files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'renewal-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own renewal files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'renewal-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own renewal files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'renewal-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);