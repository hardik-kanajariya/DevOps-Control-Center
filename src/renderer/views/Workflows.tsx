import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import VisualWorkflowBuilder from '../components/workflow/VisualWorkflowBuilder';

const WORKFLOW_TEMPLATES = {
    'nodejs': `name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test`,

    'docker': `name: Docker Build and Push

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-and-push-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to the Container registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}`,

    'deploy': `name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to server
      run: |
        echo "Deploying to production server..."
        # Add your deployment commands here`
};

// Mock data for demonstration
const mockWorkflows = [
    { id: 1, name: 'CI/CD Pipeline', status: 'completed', head_branch: 'main', created_at: '2024-08-14T10:00:00Z', run_number: 42 },
    { id: 2, name: 'Deploy to Staging', status: 'in_progress', head_branch: 'develop', created_at: '2024-08-14T09:30:00Z', run_number: 38 },
    { id: 3, name: 'Security Scan', status: 'failure', head_branch: 'feature/auth', created_at: '2024-08-14T08:15:00Z', run_number: 15 }
];

export default function Workflows() {
    const [workflows] = useState(mockWorkflows);
    const [selectedWorkflow, setSelectedWorkflow] = useState(mockWorkflows[0]);
    const [workflowYAML, setWorkflowYAML] = useState(WORKFLOW_TEMPLATES.nodejs);
    const [isEditing, setIsEditing] = useState(false);
    const [editedYAML, setEditedYAML] = useState('');
    const [showNewWorkflow, setShowNewWorkflow] = useState(false);
    const [newWorkflowName, setNewWorkflowName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof WORKFLOW_TEMPLATES | ''>('');
    const [viewMode, setViewMode] = useState<'code' | 'visual'>('code');

    const handleSelectWorkflow = (id: number) => {
        const workflow = workflows.find(w => w.id === id);
        if (workflow) {
            setSelectedWorkflow(workflow);
            // Mock different YAML content based on workflow
            const yamlContent = id === 1 ? WORKFLOW_TEMPLATES.nodejs :
                id === 2 ? WORKFLOW_TEMPLATES.deploy :
                    WORKFLOW_TEMPLATES.docker;
            setWorkflowYAML(yamlContent);
            setIsEditing(false);
        }
    };

    const handleEditWorkflow = () => {
        setEditedYAML(workflowYAML || '');
        setIsEditing(true);
    };

    const handleSaveWorkflow = () => {
        setWorkflowYAML(editedYAML);
        setIsEditing(false);
        // In real implementation, would save to backend
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedYAML('');
    };

    const handleCreateNewWorkflow = () => {
        if (newWorkflowName && selectedTemplate) {
            const yaml = WORKFLOW_TEMPLATES[selectedTemplate];
            // In real implementation, would create workflow via API
            setWorkflowYAML(yaml);
            setShowNewWorkflow(false);
            setNewWorkflowName('');
            setSelectedTemplate('');
        }
    };

    const handleTemplateSelect = (template: keyof typeof WORKFLOW_TEMPLATES) => {
        setSelectedTemplate(template);
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Workflows</h1>
                        <button
                            onClick={() => setShowNewWorkflow(true)}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                            + New
                        </button>
                    </div>
                </div>

                {/* Workflow List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {workflows.map((wf) => (
                            <button
                                key={wf.id}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedWorkflow?.id === wf.id
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                                onClick={() => handleSelectWorkflow(wf.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 truncate">{wf.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${wf.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        wf.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            wf.status === 'failure' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {wf.status}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {wf.head_branch} • {new Date(wf.created_at).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedWorkflow ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{selectedWorkflow.name}</h2>
                                    <p className="text-sm text-gray-500">
                                        Run #{selectedWorkflow.run_number} • {selectedWorkflow.head_branch}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {/* View Mode Toggle */}
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setViewMode('code')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'code'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Code
                                        </button>
                                        <button
                                            onClick={() => setViewMode('visual')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'visual'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Visual
                                        </button>
                                    </div>

                                    {!isEditing ? (
                                        <button
                                            onClick={handleEditWorkflow}
                                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveWorkflow}
                                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                            >
                                                Save
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4">
                            {viewMode === 'visual' ? (
                                <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
                                    <VisualWorkflowBuilder />
                                </div>
                            ) : (
                                <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
                                    <MonacoEditor
                                        height="100%"
                                        defaultLanguage="yaml"
                                        value={isEditing ? editedYAML : workflowYAML}
                                        onChange={(value) => isEditing && setEditedYAML(value || '')}
                                        options={{
                                            readOnly: !isEditing,
                                            fontSize: 14,
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            theme: 'vs-light',
                                            wordWrap: 'on',
                                            folding: true,
                                            lineNumbers: 'on',
                                            renderWhitespace: 'boundary'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a workflow</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a workflow from the sidebar to view and edit its configuration</p>
                        </div>
                    </div>
                )}
            </div>

            {/* New Workflow Modal */}
            {showNewWorkflow && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Create New Workflow</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Workflow Name
                                </label>
                                <input
                                    type="text"
                                    value={newWorkflowName}
                                    onChange={(e) => setNewWorkflowName(e.target.value)}
                                    placeholder="e.g., Deploy to Production"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Template
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(WORKFLOW_TEMPLATES).map(([key]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleTemplateSelect(key as keyof typeof WORKFLOW_TEMPLATES)}
                                            className={`text-left p-3 border rounded-lg transition-colors ${selectedTemplate === key
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {key === 'nodejs' && 'Build and test Node.js applications'}
                                                {key === 'docker' && 'Build and push Docker images'}
                                                {key === 'deploy' && 'Deploy applications to production'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowNewWorkflow(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateNewWorkflow}
                                disabled={!newWorkflowName || !selectedTemplate}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Create Workflow
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
