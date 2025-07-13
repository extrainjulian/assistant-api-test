-- Create document analysis table with RLS
CREATE TABLE IF NOT EXISTS document_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    analysis JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own analysis
CREATE POLICY document_analysis_select_policy ON document_analysis
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert only their own analysis
CREATE POLICY document_analysis_insert_policy ON document_analysis
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX document_analysis_chat_id_idx ON document_analysis(chat_id);
CREATE INDEX document_analysis_user_id_idx ON document_analysis(user_id);