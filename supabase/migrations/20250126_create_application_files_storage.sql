-- Create Storage Bucket for Application Files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-files',
  'application-files',
  true,
  10485760, -- 10MB limit
  '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png"}'::text[]
) ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow authenticated users to upload their own application files
CREATE POLICY "Users can upload their own application files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage Policy: Allow authenticated users to view their own application files
CREATE POLICY "Users can view their own application files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage Policy: Allow employers to view application files for their job posts
CREATE POLICY "Employers can view application files for their posts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-files'
  AND EXISTS (
    SELECT 1
    FROM applications a
    JOIN posts p ON a.post_id = p.id
    WHERE p.user_id = auth.uid()
    AND (
      a.resume_file_url = 'https://yourproject.supabase.co/storage/v1/object/public/application-files/' || name
      OR a.cover_letter_file_url = 'https://yourproject.supabase.co/storage/v1/object/public/application-files/' || name
      OR name = ANY(
        SELECT unnest(
          CASE
            WHEN a.additional_files IS NOT NULL
            THEN ARRAY(
              SELECT replace(url, 'https://yourproject.supabase.co/storage/v1/object/public/application-files/', '')
              FROM unnest(a.additional_files) AS url
            )
            ELSE ARRAY[]::text[]
          END
        )
      )
    )
  )
);

-- Storage Policy: Allow admins to view all application files
CREATE POLICY "Admins can view all application files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-files'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Storage Policy: Allow users to delete their own application files
CREATE POLICY "Users can delete their own application files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;