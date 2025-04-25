# Express Mistral Chat API

A simple Express.js API that uses Mistral AI to generate chat responses, process documents with OCR, and analyze legal documents.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory (see `.env.example` for required variables)
4. Obtain a Mistral API key from [Mistral AI](https://console.mistral.ai/)
5. Set up a Supabase project for authentication and storage
6. Run the Supabase migrations in the `src/migrations` folder, including the new `create_user_usage_table.sql`

## Environment Variables

Required environment variables:
- `PORT`: Port for the server (default: 3000)
- `MISTRAL_API_KEY`: Your Mistral API key
- `SUPABASE_URL`: URL to your Supabase project
- `SUPABASE_ANON_KEY`: Anon/public key for Supabase client
- `SUPABASE_JWT_SECRET`: Secret used for JWT verification

See `.env.example` for a template.

## Running the application

### Development mode
```
npm run dev
```

### Production mode
```
npm run build
npm start
```

## API Endpoints

### Mistral Chat (Streaming)

- **URL**: `/api/mistral/chat`
- **Method**: `POST`
- **Auth**: Bearer token required
- **Request Body**:
  ```json
  {
    "prompt": "Your message here",
    "chatId": "optional-existing-chat-id",
    "filePaths": ["optional-file-paths-in-supabase"]
  }
  ```
- **Response**: Streamed text response
- **Features**: Usage statistics (token count) tracked in `user_usage` table

### OCR Processing

- **URL**: `/api/mistral/ocr`
- **Method**: `POST`
- **Auth**: Bearer token required
- **Request Body**:
  ```json
  {
    "filePath": "path/to/file/in/supabase",
    "includeImageBase64": true
  }
  ```
- **Response**: OCR results with extracted text

### Document Analysis

- **URL**: `/api/mistral/chat/:chatId/analyze`
- **Method**: `POST`
- **Auth**: Bearer token required
- **Request Body**:
  ```json
  {
    "prompt": "Optional custom prompt for analysis"
  }
  ```
- **Response**: Structured analysis of documents in the chat
- **Features**: Usage statistics (token count) tracked in `user_usage` table and included in the response

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

## Usage Tracking

The API now tracks token usage for the following operations:
- Chat conversations (prompt and completion tokens)
- Document analysis requests

This data is stored in the `user_usage` table with the following structure:
- `id`: Unique identifier for the usage record
- `user_id`: The ID of the user who made the request
- `usage_type`: Either 'chat' or 'analysis'
- `token_count`: The number of tokens used in the request
- `created_at`: Timestamp when the usage was recorded

You can query this data for reporting or billing purposes. 