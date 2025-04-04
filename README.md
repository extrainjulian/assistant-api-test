# Express Gemini Chat API

A simple Express.js API that uses Google's Gemini model to generate chat responses.

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Replace `your_gemini_api_key_here` with your actual Gemini API key

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

### Chat (Streaming)

- **URL**: `/api/chat`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "prompt": "Write a 100-word poem."
  }
  ```
- **Response**: Server-sent events stream with the generated content

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ``` 