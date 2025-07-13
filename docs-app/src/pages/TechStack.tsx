import React from 'react';
import { Server, Database, Shield, Zap, Package, Code } from 'lucide-react';
import { techStack } from '../data/apiData';

const TechCard: React.FC<{ 
  title: string; 
  items: Array<{name: string; description: string; version: string; purpose: string}>; 
  icon: React.ReactNode;
  color: string;
}> = ({ title, items, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border-l-4 border-gray-200 pl-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.version}</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">{item.description}</p>
            <p className="text-blue-600 text-xs font-medium">{item.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ArchitectureCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Architecture Pattern</h2>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">{techStack.architecture.pattern}</h3>
        <p className="text-gray-600 text-sm mb-4">
          A clean, maintainable layered architecture that separates concerns and ensures proper dependency management.
        </p>
      </div>
      <div className="space-y-3">
        {techStack.architecture.layers.map((layer, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">{layer.name}</h4>
            <p className="text-gray-600 text-sm mb-2">{layer.description}</p>
            <div className="flex flex-wrap gap-1">
              {layer.dependencies.map((dep, depIndex) => (
                <span key={depIndex} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TechStack: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Technology Stack</h1>
        <p className="text-gray-600">
          Overview of technologies, frameworks, and libraries powering the Assistant API.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TechCard
          title="Backend Core"
          items={techStack.backend}
          icon={<Server className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        
        <TechCard
          title="Middleware & Security"
          items={techStack.middleware}
          icon={<Shield className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      <div className="mb-6">
        <ArchitectureCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Development</h3>
          </div>
          <p className="text-blue-700 text-sm">TypeScript for type safety, nodemon for hot reloading</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Storage</h3>
          </div>
          <p className="text-green-700 text-sm">Supabase for PostgreSQL database and file storage</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">AI Models</h3>
          </div>
          <p className="text-purple-700 text-sm">Mistral AI and Google Gemini for various AI tasks</p>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🚀 Performance</h4>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• Streaming responses for real-time chat</li>
              <li>• Efficient token usage tracking</li>
              <li>• Optimized database queries</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔒 Security</h4>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• JWT-based authentication</li>
              <li>• Request validation middleware</li>
              <li>• CORS protection</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📊 Analytics</h4>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• Usage statistics tracking</li>
              <li>• Token consumption monitoring</li>
              <li>• Chat session management</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔧 Developer Experience</h4>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• TypeScript for better DX</li>
              <li>• Class-based validation</li>
              <li>• Comprehensive error handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechStack;