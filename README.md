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

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ``` 