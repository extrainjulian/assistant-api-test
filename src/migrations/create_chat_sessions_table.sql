-- Migration: Create chat_sessions table and RLS policies

-- 1. Create the chat_sessions table
CREATE TABLE public.chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    messages jsonb,
    documents jsonb -- Storing the full OCRResponse structure might be large, consider storing only essential parts if needed.
);

-- 2. Add comments to the table and columns for clarity
COMMENT ON TABLE public.chat_sessions IS 'Stores chat sessions including messages and associated documents.';
COMMENT ON COLUMN public.chat_sessions.id IS 'Unique identifier for the chat session.';
COMMENT ON COLUMN public.chat_sessions.user_id IS 'Identifier for the user who owns the chat session, references auth.users.';
COMMENT ON COLUMN public.chat_sessions.created_at IS 'Timestamp when the chat session was created.';
COMMENT ON COLUMN public.chat_sessions.updated_at IS 'Timestamp when the chat session was last updated.';
COMMENT ON COLUMN public.chat_sessions.messages IS 'Stores the array of Mistral messages for the chat history (MistralMessage[]).';
COMMENT ON COLUMN public.chat_sessions.documents IS 'Stores the array of OCR responses associated with the chat session (OCRResponse[]).';

-- 3. Enable Row Level Security (RLS) on the table
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Policy: Allow users to select their own chat sessions
CREATE POLICY "Allow SELECT for own chat sessions"
ON public.chat_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to insert new chat sessions for themselves
CREATE POLICY "Allow INSERT for own chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own chat sessions
CREATE POLICY "Allow UPDATE for own chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Add a policy for DELETE if needed, otherwise it's restricted by default RLS.
-- CREATE POLICY "Allow DELETE for own chat sessions"
-- ON public.chat_sessions
-- FOR DELETE
-- USING (auth.uid() = user_id);


-- 5. Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_chat_session_update
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Add indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
