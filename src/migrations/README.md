# Supabase Database Migrations

This directory contains SQL migrations that should be applied to the Supabase project.

## How to Apply Migrations

### Using the Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to the "SQL Editor" section
3. Create a new query
4. Copy and paste the contents of the migration file (e.g., `create_document_tables.sql`)
5. Run the query

### Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
# Apply migration file
supabase db push -f src/migrations/create_document_tables.sql
supabase db push -f src/migrations/create_storage_trigger.sql
```

## Migration Files

- `create_document_tables.sql`: Creates tables for document storage and document annotations with proper Row Level Security (RLS) policies.
- `create_storage_trigger.sql`: Sets up database triggers that automatically create document records when files are uploaded to the "document-storage" bucket, and delete document records when files are removed.

## Schema Overview

### Documents Table

Stores information about uploaded documents:

- `id`: UUID primary key
- `user_id`: Foreign key to Supabase auth.users table
- `file_path`: Path to the file in Supabase storage
- `file_name`: Name of the file
- `created_at`: Timestamp when the record was created
- `updated_at`: Timestamp when the record was last updated

### Document Annotations Table

Stores annotations generated for documents:

- `id`: UUID primary key
- `document_id`: Foreign key to documents table
- `annotations`: JSONB array of annotations, each with level, description, and metadata
- `created_at`: Timestamp when the record was created

## Database Triggers

### Storage Insert Trigger

When a file is uploaded to the "document-storage" bucket, this trigger automatically:
- Creates a new record in the `documents` table
- Sets the `user_id` to the file owner
- Sets the `file_path` to the full path in storage
- Extracts and sets the `file_name` from the path

### Storage Delete Trigger

When a file is deleted from the "document-storage" bucket, this trigger automatically:
- Deletes the corresponding record(s) from the `documents` table that match the file path 