import { useState, useRef, useCallback, useEffect } from 'react';

interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'deploy';
    title: string;
    description: string;
    position: { x: number; y: number };
    config: Record<string, any>;
    connections: string[];
}

interface Connection {
    from: string;
    to: string;
    fromPort: string;
    toPort: string;
}

interface NodeType {
    color: string;
    icon: string;
    ports: {
        inputs?: string[];
        outputs: string[];
    };
}

const NODE_TYPES: Record<string, NodeType> = {
    trigger: {
        color: 'bg-green-500',
        icon: '⚡',
        ports: { outputs: ['success'] }
    },
    action: {
        color: 'bg-blue-500',
        icon: '⚙️',
        ports: { inputs: ['input'], outputs: ['success', 'error'] }
    },
    condition: {
        color: 'bg-yellow-500',
        icon: '❓',
        ports: { inputs: ['input'], outputs: ['true', 'false'] }
    },
    deploy: {
        color: 'bg-purple-500',
        icon: '🚀',
        ports: { inputs: ['input'], outputs: ['success', 'error'] }
    }
};

const PREDEFINED_NODES = [
    { type: 'trigger', title: 'Git Push', description: 'Triggered on git push' },
    { type: 'trigger', title: 'PR Created', description: 'Triggered on pull request' },
    { type: 'action', title: 'Run Tests', description: 'Execute test suite' },
    { type: 'action', title: 'Build Docker', description: 'Build Docker image' },
    { type: 'condition', title: 'Branch Check', description: 'Check branch name' },
    { type: 'deploy', title: 'Deploy to Production', description: 'Deploy to production environment' },
    { type: 'deploy', title: 'Deploy to Staging', description: 'Deploy to staging environment' },
];

export default function VisualWorkflowBuilder() {
    const [nodes, setNodes] = useState<WorkflowNode[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [connectionStart, setConnectionStart] = useState<{ nodeId: string; port: string } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const addNode = (nodeType: any, position: { x: number; y: number }) => {
        const newNode: WorkflowNode = {
            id: `node_${Date.now()}`,
            type: nodeType.type,
            title: nodeType.title,
            description: nodeType.description,
            position,
            config: {},
            connections: []
        };
        setNodes(prev => [...prev, newNode]);
    };

    const updateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
        setNodes(prev => prev.map(node =>
            node.id === nodeId ? { ...node, position } : node
        ));
    };

    const deleteNode = (nodeId: string) => {
        setNodes(prev => prev.filter(node => node.id !== nodeId));
        setConnections(prev => prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    };

    const startConnection = (nodeId: string, port: string) => {
        setConnectionStart({ nodeId, port });
    };

    const endConnection = (nodeId: string, port: string) => {
        if (connectionStart && connectionStart.nodeId !== nodeId) {
            const newConnection: Connection = {
                from: connectionStart.nodeId,
                to: nodeId,
                fromPort: connectionStart.port,
                toPort: port
            };
            setConnections(prev => [...prev, newConnection]);
        }
        setConnectionStart(null);
    };

    const onDragStart = (nodeId: string, e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const node = nodes.find(n => n.id === nodeId);
        if (rect && node) {
            setDraggedNode(nodeId);
            setDragOffset({
                x: e.clientX - rect.left - node.position.x * zoom,
                y: e.clientY - rect.top - node.position.y * zoom
            });
        }
    };

    const onDragMove = useCallback((e: MouseEvent) => {
        if (draggedNode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const newPosition = {
                x: (e.clientX - rect.left - dragOffset.x) / zoom,
                y: (e.clientY - rect.top - dragOffset.y) / zoom
            };
            updateNodePosition(draggedNode, newPosition);
        }
    }, [draggedNode, dragOffset, zoom]);

    const onDragEnd = useCallback(() => {
        setDraggedNode(null);
    }, []);

    // Add event listeners for drag
    useEffect(() => {
        if (draggedNode) {
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            return () => {
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
            };
        }
    }, [draggedNode, onDragMove, onDragEnd]);

    const NodeComponent = ({ node }: { node: WorkflowNode }) => {
        const nodeType = NODE_TYPES[node.type];

        return (
            <div
                className={`absolute cursor-move select-none ${selectedNode === node.id ? 'ring-2 ring-blue-400' : ''
                    }`}
                style={{
                    left: node.position.x * zoom + pan.x,
                    top: node.position.y * zoom + pan.y,
                    transform: `scale(${zoom})`
                }}
                onMouseDown={(e) => onDragStart(node.id, e)}
                onClick={() => setSelectedNode(node.id)}
            >
                <div className={`${nodeType.color} text-white rounded-lg p-4 min-w-48 shadow-lg`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{nodeType.icon}</span>
                        <h3 className="font-semibold">{node.title}</h3>
                    </div>
                    <p className="text-sm opacity-90">{node.description}</p>

                    {/* Input ports */}
                    {nodeType.ports.inputs && (
                        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
                            {nodeType.ports.inputs.map((port: string, index: number) => (
                                <div
                                    key={port}
                                    className="w-4 h-4 bg-white rounded-full border-2 border-gray-300 cursor-pointer hover:bg-blue-100"
                                    style={{ top: `${index * 20}px` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        endConnection(node.id, port);
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Output ports */}
                    {nodeType.ports.outputs && (
                        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                            {nodeType.ports.outputs.map((port: string, index: number) => (
                                <div
                                    key={port}
                                    className="w-4 h-4 bg-white rounded-full border-2 border-gray-300 cursor-pointer hover:bg-green-100"
                                    style={{ top: `${index * 20}px` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startConnection(node.id, port);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete button */}
                <button
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                    }}
                >
                    ×
                </button>
            </div>
        );
    };

    const ConnectionLine = ({ connection }: { connection: Connection }) => {
        const fromNode = nodes.find(n => n.id === connection.from);
        const toNode = nodes.find(n => n.id === connection.to);

        if (!fromNode || !toNode) return null;

        const fromX = (fromNode.position.x + 192) * zoom + pan.x; // 192 is node width
        const fromY = (fromNode.position.y + 50) * zoom + pan.y; // 50 is approximately center
        const toX = toNode.position.x * zoom + pan.x;
        const toY = (toNode.position.y + 50) * zoom + pan.y;

        return (
            <svg className="absolute inset-0 pointer-events-none">
                <path
                    d={`M ${fromX} ${fromY} Q ${fromX + 50} ${fromY} ${toX} ${toY}`}
                    stroke="#3B82F6"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                />
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#3B82F6"
                        />
                    </marker>
                </defs>
            </svg>
        );
    };

    const generateYAML = () => {
        // Convert visual workflow to YAML
        const yaml = `name: Generated Workflow

on:
  push:
    branches: [ main ]

jobs:
  workflow:
    runs-on: ubuntu-latest
    steps:
${nodes.map(node => `    - name: ${node.title}
      run: echo "Executing ${node.title}"`).join('\n')}`;

        navigator.clipboard.writeText(yaml);
        alert('Workflow YAML copied to clipboard!');
    };

    return (
        <div className="h-full flex">
            {/* Toolbar */}
            <div className="w-64 bg-white border-r border-gray-200 p-4">
                <h3 className="font-semibold mb-4">Workflow Nodes</h3>

                <div className="space-y-2 mb-6">
                    {PREDEFINED_NODES.map((nodeType, index) => (
                        <div
                            key={index}
                            className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                            draggable
                            onDragEnd={(e) => {
                                const rect = canvasRef.current?.getBoundingClientRect();
                                if (rect) {
                                    addNode(nodeType, {
                                        x: (e.clientX - rect.left - pan.x) / zoom,
                                        y: (e.clientY - rect.top - pan.y) / zoom
                                    });
                                }
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${NODE_TYPES[nodeType.type as keyof typeof NODE_TYPES].color}`} />
                                <div>
                                    <div className="font-medium text-sm">{nodeType.title}</div>
                                    <div className="text-xs text-gray-500">{nodeType.description}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <button
                        onClick={generateYAML}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Generate YAML
                    </button>

                    <button
                        onClick={() => {
                            setNodes([]);
                            setConnections([]);
                        }}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Clear All
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">Zoom: {Math.round(zoom * 100)}%</label>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden bg-gray-50">
                <div
                    ref={canvasRef}
                    className="w-full h-full relative"
                    onClick={() => setSelectedNode(null)}
                >
                    {/* Grid background */}
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `radial-gradient(circle, #9ca3af 1px, transparent 1px)`,
                            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                            backgroundPosition: `${pan.x}px ${pan.y}px`
                        }}
                    />

                    {/* Connections */}
                    {connections.map((connection, index) => (
                        <ConnectionLine key={index} connection={connection} />
                    ))}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <NodeComponent key={node.id} node={node} />
                    ))}
                </div>

                {/* Instructions */}
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <h3 className="text-lg font-medium mb-2">Visual Workflow Builder</h3>
                            <p>Drag nodes from the sidebar to start building your workflow</p>
                            <p className="text-sm mt-2">Connect nodes by clicking on their ports</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Properties panel */}
            {selectedNode && (
                <div className="w-64 bg-white border-l border-gray-200 p-4">
                    <h3 className="font-semibold mb-4">Node Properties</h3>
                    {(() => {
                        const node = nodes.find(n => n.id === selectedNode);
                        if (!node) return null;

                        return (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={node.title}
                                        onChange={(e) => {
                                            setNodes(prev => prev.map(n =>
                                                n.id === selectedNode
                                                    ? { ...n, title: e.target.value }
                                                    : n
                                            ));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        value={node.description}
                                        onChange={(e) => {
                                            setNodes(prev => prev.map(n =>
                                                n.id === selectedNode
                                                    ? { ...n, description: e.target.value }
                                                    : n
                                            ));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <div className={`px-3 py-2 rounded-lg text-white ${NODE_TYPES[node.type].color}`}>
                                        {NODE_TYPES[node.type].icon} {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
