export interface ApiEndpoint {
  id: string;
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
  requestBody?: {
    type: string;
    properties: Record<string, {
      type: string;
      required: boolean;
      description: string;
    }>;
  };
  response: {
    type: string;
    description: string;
  };
  example?: {
    request?: any;
    response?: any;
  };
}

export const apiEndpoints: ApiEndpoint[] = [
  {
    id: 'health',
    title: 'Health Check',
    method: 'GET',
    path: '/health',
    description: 'Check if the API is running and healthy',
    authRequired: false,
    response: {
      type: 'application/json',
      description: 'Health status of the API'
    },
    example: {
      response: {
        status: 'ok'
      }
    }
  },
  {
    id: 'mistral-chat',
    title: 'Mistral Chat (Streaming)',
    method: 'POST',
    path: '/api/mistral/chat',
    description: 'Stream a chat conversation with Mistral AI. Supports file attachments and tracks usage statistics.',
    authRequired: true,
    requestBody: {
      type: 'application/json',
      properties: {
        prompt: {
          type: 'string',
          required: true,
          description: 'The user message to send to Mistral AI'
        },
        chatId: {
          type: 'string',
          required: false,
          description: 'Optional existing chat session ID to continue conversation'
        },
        filePaths: {
          type: 'array',
          required: false,
          description: 'Optional array of file paths in Supabase storage to include in the conversation'
        }
      }
    },
    response: {
      type: 'text/plain (streamed)',
      description: 'Streamed text response from Mistral AI'
    },
    example: {
      request: {
        prompt: "Hello, how can you help me?",
        chatId: "optional-chat-id",
        filePaths: ["path/to/document.pdf"]
      }
    }
  },
  {
    id: 'mistral-ocr',
    title: 'OCR Processing',
    method: 'POST',
    path: '/api/mistral/ocr',
    description: 'Process documents with OCR to extract text and analyze content using Mistral AI.',
    authRequired: true,
    requestBody: {
      type: 'application/json',
      properties: {
        filePath: {
          type: 'string',
          required: true,
          description: 'Path to the file in Supabase storage'
        },
        includeImageBase64: {
          type: 'boolean',
          required: false,
          description: 'Whether to include base64 image data in response'
        }
      }
    },
    response: {
      type: 'application/json',
      description: 'OCR results with extracted text and analysis'
    },
    example: {
      request: {
        filePath: "documents/invoice.pdf",
        includeImageBase64: true
      }
    }
  },
  {
    id: 'chat-analyze',
    title: 'Document Analysis',
    method: 'POST',
    path: '/api/mistral/chat/:chatId/analyze',
    description: 'Analyze documents within a specific chat session. Provides structured analysis and tracks token usage.',
    authRequired: true,
    requestBody: {
      type: 'application/json',
      properties: {
        prompt: {
          type: 'string',
          required: false,
          description: 'Optional custom prompt for document analysis'
        }
      }
    },
    response: {
      type: 'application/json',
      description: 'Structured analysis results with usage statistics'
    },
    example: {
      request: {
        prompt: "Analyze the legal implications of this contract"
      }
    }
  },
  {
    id: 'analyze-document',
    title: 'Document Analysis (Gemini)',
    method: 'POST',
    path: '/api/analyze',
    description: 'Analyze documents using Google Gemini AI with custom prompts.',
    authRequired: true,
    requestBody: {
      type: 'application/json',
      properties: {
        prompt: {
          type: 'string',
          required: true,
          description: 'Analysis prompt for the document'
        },
        filePath: {
          type: 'string',
          required: true,
          description: 'Path to the file in Supabase storage'
        }
      }
    },
    response: {
      type: 'application/json',
      description: 'Document analysis results'
    },
    example: {
      request: {
        prompt: "Summarize the key points of this document",
        filePath: "documents/report.pdf"
      }
    }
  },
  {
    id: 'assistant-chat',
    title: 'Assistant Chat (Gemini)',
    method: 'POST',
    path: '/api/assistant',
    description: 'Stream a chat conversation with Google Gemini AI assistant. Supports chat history and file attachments.',
    authRequired: true,
    requestBody: {
      type: 'application/json',
      properties: {
        userMessage: {
          type: 'string',
          required: true,
          description: 'The user message to send to the assistant'
        },
        chatSessionId: {
          type: 'string',
          required: false,
          description: 'Optional chat session ID to continue conversation'
        },
        filePaths: {
          type: 'array',
          required: false,
          description: 'Optional array of file paths to include in the conversation'
        }
      }
    },
    response: {
      type: 'text/plain (streamed)',
      description: 'Streamed text response from Gemini AI'
    },
    example: {
      request: {
        userMessage: "Help me understand this document",
        chatSessionId: "session-123",
        filePaths: ["path/to/document.pdf"]
      }
    }
  }
];

export const techStack = {
  backend: [
    {
      name: 'Node.js',
      description: 'JavaScript runtime for server-side development',
      version: '18+',
      purpose: 'Runtime environment'
    },
    {
      name: 'Express.js',
      description: 'Fast, unopinionated web framework for Node.js',
      version: '^5.1.0',
      purpose: 'Web server framework'
    },
    {
      name: 'TypeScript',
      description: 'Typed superset of JavaScript',
      version: '^5.8.2',
      purpose: 'Type safety and better development experience'
    },
    {
      name: 'Mistral AI',
      description: 'Advanced language model for chat and analysis',
      version: '^1.5.2',
      purpose: 'AI chat conversations and document analysis'
    },
    {
      name: 'Google Gemini',
      description: 'Google\'s multimodal AI model',
      version: '^0.7.0',
      purpose: 'Document analysis and assistant functionality'
    },
    {
      name: 'Supabase',
      description: 'Open source Firebase alternative',
      version: '^2.49.4',
      purpose: 'Database, authentication, and file storage'
    }
  ],
  middleware: [
    {
      name: 'class-validator',
      description: 'Decorator-based validation library',
      version: '^0.14.1',
      purpose: 'Request validation'
    },
    {
      name: 'class-transformer',
      description: 'Transform objects to classes and vice versa',
      version: '^0.5.1',
      purpose: 'DTO transformation'
    },
    {
      name: 'jsonwebtoken',
      description: 'JSON Web Token implementation',
      version: '^9.0.2',
      purpose: 'Authentication and authorization'
    },
    {
      name: 'cors',
      description: 'Cross-Origin Resource Sharing middleware',
      version: '^2.8.5',
      purpose: 'Handle cross-origin requests'
    }
  ],
  architecture: {
    pattern: 'Layered Architecture',
    layers: [
      {
        name: 'API Layer',
        description: 'HTTP interface, request validation, response formatting, auth middleware',
        dependencies: ['Application Layer']
      },
      {
        name: 'Application Layer',
        description: 'Use case orchestration, transaction management, business workflows',
        dependencies: ['Infrastructure Layer (interfaces)']
      },
      {
        name: 'Domain Layer',
        description: 'Pure business logic, entities, validation rules',
        dependencies: ['None (zero external dependencies)']
      },
      {
        name: 'Infrastructure Layer',
        description: 'Database, external APIs, file system implementations',
        dependencies: ['Application Layer (implements interfaces)']
      }
    ]
  }
};