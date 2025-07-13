import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Unlock, Copy, Check } from 'lucide-react';
import { apiEndpoints, ApiEndpoint } from '../data/apiData';

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${colors[method as keyof typeof colors]}`}>
      {method}
    </span>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'json' }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
      </button>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

const EndpointCard: React.FC<{ endpoint: ApiEndpoint }> = ({ endpoint }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-4">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MethodBadge method={endpoint.method} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{endpoint.title}</h3>
              <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {endpoint.authRequired ? (
              <Lock className="w-4 h-4 text-red-500" title="Authentication required" />
            ) : (
              <Unlock className="w-4 h-4 text-green-500" title="No authentication required" />
            )}
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </div>
        <p className="text-gray-600 mt-2">{endpoint.description}</p>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Authentication */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Authentication</h4>
            <p className={`text-sm ${endpoint.authRequired ? 'text-red-600' : 'text-green-600'}`}>
              {endpoint.authRequired ? 'Bearer token required in Authorization header' : 'No authentication required'}
            </p>
          </div>

          {/* Request Body */}
          {endpoint.requestBody && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Request Body</h4>
              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-gray-600 mb-2">Content-Type: {endpoint.requestBody.type}</p>
                <div className="space-y-2">
                  {Object.entries(endpoint.requestBody.properties).map(([key, prop]) => (
                    <div key={key} className="flex items-start space-x-2">
                      <code className="text-sm bg-white px-2 py-1 rounded border">{key}</code>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{prop.type}</span>
                          {prop.required && <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">required</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{prop.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {endpoint.example?.request && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Example Request:</p>
                  <CodeBlock code={JSON.stringify(endpoint.example.request, null, 2)} />
                </div>
              )}
            </div>
          )}

          {/* Response */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Response</h4>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-sm text-gray-600 mb-1">Content-Type: {endpoint.response.type}</p>
              <p className="text-sm text-gray-700">{endpoint.response.description}</p>
            </div>
            {endpoint.example?.response && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Example Response:</p>
                <CodeBlock code={JSON.stringify(endpoint.example.response, null, 2)} />
              </div>
            )}
          </div>

          {/* cURL Example */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">cURL Example</h4>
            <CodeBlock 
              language="bash"
              code={`curl -X ${endpoint.method} "${endpoint.path}" \\
${endpoint.authRequired ? '  -H "Authorization: Bearer YOUR_TOKEN" \\\n' : ''}  -H "Content-Type: application/json"${endpoint.requestBody ? ` \\\n  -d '${JSON.stringify(endpoint.example?.request || {}, null, 2)}'` : ''}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ApiDocumentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">API Documentation</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Base URL</h3>
          <code className="text-blue-700 bg-blue-100 px-3 py-1 rounded">http://localhost:3000</code>
          <p className="text-blue-700 mt-2 text-sm">
            All endpoints require HTTPS in production. Authentication is handled via JWT Bearer tokens.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {apiEndpoints.map((endpoint) => (
          <EndpointCard key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Usage Notes</h3>
        <ul className="text-yellow-800 text-sm space-y-1">
          <li>• All streaming endpoints return chunked responses</li>
          <li>• Token usage is tracked for billing and analytics</li>
          <li>• File uploads must be done to Supabase storage first</li>
          <li>• Rate limiting applies to all authenticated endpoints</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiDocumentation;