import React from 'react';
import { ArrowDown, Database, Server, Shield, Code, GitBranch, Layers } from 'lucide-react';

const LayerCard: React.FC<{
  title: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  color: string;
  icon: React.ReactNode;
}> = ({ title, description, responsibilities, dependencies, color, icon }) => {
  return (
    <div className={`${color} rounded-lg p-6 text-white`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <p className="text-white text-opacity-90 mb-4">{description}</p>
      
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Responsibilities:</h4>
        <ul className="space-y-1 text-sm text-white text-opacity-80">
          {responsibilities.map((resp, index) => (
            <li key={index}>• {resp}</li>
          ))}
        </ul>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">Dependencies:</h4>
        <div className="flex flex-wrap gap-2">
          {dependencies.map((dep, index) => (
            <span key={index} className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
              {dep}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Architecture: React.FC = () => {
  const layers = [
    {
      title: "API Layer",
      description: "HTTP interface handling requests, responses, and middleware",
      responsibilities: [
        "Route definition and HTTP method handling",
        "Request validation using class-validator",
        "Response formatting and error handling",
        "Authentication middleware (JWT verification)",
        "CORS configuration"
      ],
      dependencies: ["Application Layer"],
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      icon: <Server className="w-5 h-5" />
    },
    {
      title: "Application Layer",
      description: "Business workflow orchestration and use case implementation",
      responsibilities: [
        "Chat session management",
        "File upload coordination",
        "AI model interaction orchestration",
        "Transaction management",
        "Usage tracking and analytics"
      ],
      dependencies: ["Infrastructure Interfaces"],
      color: "bg-gradient-to-br from-green-500 to-green-600",
      icon: <GitBranch className="w-5 h-5" />
    },
    {
      title: "Domain Layer",
      description: "Pure business logic with zero external dependencies",
      responsibilities: [
        "Entity definitions (User, Chat, Document)",
        "Business validation rules",
        "Domain-specific calculations",
        "Core business types and interfaces",
        "Business rule enforcement"
      ],
      dependencies: ["None (Pure Domain Logic)"],
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      icon: <Code className="w-5 h-5" />
    },
    {
      title: "Infrastructure Layer",
      description: "External service implementations and data persistence",
      responsibilities: [
        "Supabase database operations",
        "Mistral AI service integration",
        "Google Gemini service integration",
        "File storage management",
        "External API communications"
      ],
      dependencies: ["Application Interfaces"],
      color: "bg-gradient-to-br from-red-500 to-red-600",
      icon: <Database className="w-5 h-5" />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">System Architecture</h1>
        <p className="text-gray-600">
          The Assistant API follows a clean layered architecture pattern that ensures maintainability, 
          testability, and separation of concerns.
        </p>
      </div>

      {/* Architecture Overview */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Layers className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Layered Architecture Pattern</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Core Principles</h3>
            <ul className="text-gray-600 space-y-1 text-sm">
              <li>• <strong>Separation of Concerns:</strong> Each layer has a specific responsibility</li>
              <li>• <strong>Dependency Rule:</strong> Dependencies only point inward</li>
              <li>• <strong>Interface Segregation:</strong> Clean boundaries between layers</li>
              <li>• <strong>Testability:</strong> Easy to test each layer in isolation</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Benefits</h3>
            <ul className="text-gray-600 space-y-1 text-sm">
              <li>• <strong>Maintainability:</strong> Changes are isolated to specific layers</li>
              <li>• <strong>Scalability:</strong> Easy to add new features and endpoints</li>
              <li>• <strong>Flexibility:</strong> Can swap implementations without affecting other layers</li>
              <li>• <strong>Team Collaboration:</strong> Clear boundaries for parallel development</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Architecture Layers */}
      <div className="space-y-6">
        {layers.map((layer, index) => (
          <div key={layer.title}>
            <LayerCard {...layer} />
            {index < layers.length - 1 && (
              <div className="flex justify-center py-4">
                <ArrowDown className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Data Flow */}
      <div className="mt-12 bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Request Flow Example</h2>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">POST /api/mistral/chat</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
              <div>
                <strong>API Layer:</strong> Receives HTTP request, validates JWT token, validates request body using DTOs
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
              <div>
                <strong>Application Layer:</strong> Orchestrates chat session logic, manages file attachments, coordinates AI interaction
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
              <div>
                <strong>Domain Layer:</strong> Applies business rules for chat validation, user permissions, usage limits
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
              <div>
                <strong>Infrastructure Layer:</strong> Persists chat to Supabase, calls Mistral AI API, manages file storage
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Structure */}
      <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Project Structure</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{`src/
├── controllers/          # API Layer
│   ├── assistant.controller.ts
│   ├── mistral.controller.ts
│   └── analyze.controller.ts
├── dto/                  # Data Transfer Objects
│   ├── chat.dto.ts
│   ├── analyze.dto.ts
│   └── ocr.dto.ts
├── middleware/           # API Middleware
│   ├── auth.middleware.ts
│   └── validation.middleware.ts
├── services/             # Infrastructure Layer
│   ├── mistral.service.ts
│   ├── gemini.service.ts
│   └── supabase.service.ts
├── utils/                # Domain Layer
│   ├── types.ts
│   └── prompts.ts
├── routes/               # Route Configuration
│   └── routes.ts
├── config/               # Configuration
│   └── env.ts
└── migrations/           # Database Migrations
    └── *.sql`}</pre>
        </div>
      </div>
    </div>
  );
};

export default Architecture;