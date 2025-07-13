import React, { useState } from 'react';
import { Menu, Code, Layers, Server, Database, Zap } from 'lucide-react';
import ApiDocumentation from './pages/ApiDocumentation';
import TechStack from './pages/TechStack';
import Architecture from './pages/Architecture';
import './App.css';

type Page = 'api' | 'tech-stack' | 'architecture';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('api');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { id: 'api' as Page, name: 'API Documentation', icon: Code },
    { id: 'tech-stack' as Page, name: 'Tech Stack', icon: Layers },
    { id: 'architecture' as Page, name: 'Architecture', icon: Server },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'api':
        return <ApiDocumentation />;
      case 'tech-stack':
        return <TechStack />;
      case 'architecture':
        return <Architecture />;
      default:
        return <ApiDocumentation />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className={`flex items-center space-x-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <h1 className="text-xl font-bold text-gray-900">API Docs</h1>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center px-3 py-2 mb-2 rounded-lg text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Assistant API</span>
              </div>
              <p className="text-sm opacity-90">
                Interactive documentation for the Express Mistral Chat API
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {navigation.find(item => item.id === currentPage)?.name}
              </h2>
              <p className="text-gray-600 mt-1">
                {currentPage === 'api' && 'Explore available endpoints and their usage'}
                {currentPage === 'tech-stack' && 'Technologies powering this API'}
                {currentPage === 'architecture' && 'System design and architectural patterns'}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>API Status: Online</span>
            </div>
          </div>
        </header>

        <main className="p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;