-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_storage_insert()
RETURNS TRIGGER AS $$
DECLARE
  file_owner_id UUID;
  base_file_name TEXT;
BEGIN
  -- Get the owner of the file from the owner column in storage.objects
  -- This is the user who uploaded the file
  file_owner_id := NEW.owner;
  
  -- Extract the base filename from the path (might include user directories)
  -- This takes the part after the last slash, or the whole name if no slash
  base_file_name := substring(NEW.name from '([^/]+)$');

  -- Only process files in the document-storage bucket
  IF NEW.bucket_id = 'document-storage' THEN
    -- Insert a new record in the documents table
    INSERT INTO public.documents (
      user_id,
      file_path,
      file_name
    ) VALUES (
      file_owner_id,
      NEW.name,
      base_file_name
    );
    
    -- Log the file upload event
    RAISE NOTICE 'Created document record for file % uploaded by user %', base_file_name, file_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that will be called when files are deleted
CREATE OR REPLACE FUNCTION public.handle_storage_delete()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Only process files in the document-storage bucket
  IF OLD.bucket_id = 'document-storage' THEN
    -- Delete matching document records
    DELETE FROM public.documents
    WHERE file_path = OLD.name;
    
    -- Get number of affected rows
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Log the file deletion event
    RAISE NOTICE 'Deleted % document record(s) for file %', affected_rows, OLD.name;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires when a new file is inserted into storage.objects
DROP TRIGGER IF EXISTS on_storage_object_insert ON storage.objects;

CREATE TRIGGER on_storage_object_insert
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_insert();

-- Create a trigger that fires when a file is deleted from storage.objects
DROP TRIGGER IF EXISTS on_storage_object_delete ON storage.objects;

CREATE TRIGGER on_storage_object_delete
  AFTER DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_delete();

-- Update the handle_storage_insert function to include more information
COMMENT ON FUNCTION public.handle_storage_insert() IS 'Automatically creates document records when files are uploaded to the document-storage bucket';
COMMENT ON FUNCTION public.handle_storage_delete() IS 'Automatically deletes document records when files are removed from the document-storage bucket'; 