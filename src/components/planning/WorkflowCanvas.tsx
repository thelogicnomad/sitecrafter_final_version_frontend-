import React, { useMemo } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowNode as WorkflowNodeType, WorkflowEdge } from '../../types/planning.types';
import CustomNode from './CustomNode';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeType[];
  edges: WorkflowEdge[];
}

const nodeTypes = {
  custom: CustomNode,
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ nodes: workflowNodes, edges: workflowEdges }) => {
  
  // Detect if project is fullstack
  const isFullstack = useMemo(() => {
    const categories = new Set(workflowNodes.map(n => n.category));
    const hasFrontend = categories.has('Frontend');
    const hasBackend = categories.has('Backend') || categories.has('Database');
    return hasFrontend && hasBackend;
  }, [workflowNodes]);

  const calculateSmartLayout = (nodes: WorkflowNodeType[]) => {
    const positions: Record<string, { x: number; y: number }> = {};

    if (!isFullstack) {
      // Simple grid layout: 3 nodes per row
      const nodesPerRow = 3;
      const horizontalSpacing = 320;
      const verticalSpacing = 200;
      const startX = 100;
      const startY = 80;

      nodes.forEach((node, idx) => {
        const row = Math.floor(idx / nodesPerRow);
        const col = idx % nodesPerRow;
        positions[node.id] = {
          x: startX + (col * horizontalSpacing),
          y: startY + (row * verticalSpacing)
        };
      });
    } else {
      // Layered layout for fullstack
      const layers: Record<string, WorkflowNodeType[]> = {
        'Frontend': [],
        'Backend': [],
        'Database': [],
        'Integration': [],
        'Auth': []
      };

      nodes.forEach(node => {
        if (node.category && layers[node.category]) {
          layers[node.category].push(node);
        } else {
          layers['Backend'].push(node);
        }
      });

      let currentY = 50;
      const layerSpacing = 220;
      const nodeSpacing = 280;
      const layerOrder = ['Frontend', 'Backend', 'Database', 'Integration', 'Auth'];

      layerOrder.forEach(category => {
        const layerNodes = layers[category];
        if (layerNodes.length === 0) return;

        const layerWidth = layerNodes.length * nodeSpacing;
        let currentX = Math.max(50, (1400 - layerWidth) / 2);

        layerNodes.forEach(node => {
          positions[node.id] = { x: currentX, y: currentY };
          currentX += nodeSpacing;
        });

        currentY += layerSpacing;
      });
    }

    return positions;
  };

  const positions = useMemo(() => calculateSmartLayout(workflowNodes), [workflowNodes, isFullstack]);

  const initialNodes: Node[] = useMemo(() => {
    return workflowNodes.map(node => ({
      id: node.id,
      type: 'custom',
      position: positions[node.id] || { x: 0, y: 0 },
      data: {
        ...node,
        label: node.label,
        type: node.type,
        category: node.category,
      },
    }));
  }, [workflowNodes, positions]);

  const initialEdges: Edge[] = useMemo(() => {
    return workflowEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 25,
        height: 25,
        color: 
          edge.type === 'database' ? '#a78bfa' : 
          edge.type === 'websocket' ? '#fbbf24' : 
          '#34d399',
      },
      style: {
        stroke: 
          edge.type === 'database' ? '#a78bfa' : 
          edge.type === 'websocket' ? '#fbbf24' : 
          '#34d399',
        strokeWidth: 2.5,
        strokeDasharray: edge.type === 'database' ? '5, 5' : undefined,
      },
      labelStyle: {
        fontSize: 11,
        fontWeight: 600,
        fill: '#f3f4f6',
        backgroundColor: '#1f2937',
      },
      labelBgStyle: {
        fill: '#1f2937',
        fillOpacity: 0.9,
        rx: 4,
        ry: 4,
      },
    }));
  }, [workflowEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    workflowNodes.forEach(node => {
      if (node.category) {
        stats[node.category] = (stats[node.category] || 0) + 1;
      }
    });
    return stats;
  }, [workflowNodes]);

  const projectTypeLabel = useMemo(() => {
    if (!isFullstack) {
      const categories = new Set(workflowNodes.map(n => n.category));
      if (categories.has('Frontend') && !categories.has('Backend')) return 'Frontend Only';
      if (categories.has('Backend') && !categories.has('Frontend')) return 'Backend Only';
    }
    return 'Fullstack';
  }, [isFullstack, workflowNodes]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🏗️</span>
          Interactive Project Workflow
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full font-semibold border border-indigo-500/30">
            {projectTypeLabel}
          </span>
          <span className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full font-semibold border border-blue-500/30">
            {nodes.length} Nodes
          </span>
          <span className="bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full font-semibold border border-green-500/30">
            {edges.length} Connections
          </span>
        </div>
      </div>

      {isFullstack && (
        <div className="flex gap-2 mb-4 text-xs flex-wrap">
          {Object.entries(categoryStats).map(([category, count]) => (
            <div key={category} className="flex items-center gap-2 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600">
              <span className={`w-3 h-3 rounded-full ${
                category === 'Frontend' ? 'bg-blue-500' :
                category === 'Backend' ? 'bg-green-500' :
                category === 'Database' ? 'bg-purple-500' :
                category === 'Integration' ? 'bg-orange-500' :
                'bg-red-500'
              }`}></span>
              <span className="font-medium text-gray-300">{category}: {count}</span>
            </div>
          ))}
        </div>
      )}
      
      <div 
        className="rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-900 shadow-lg relative"
        style={{ height: '900px', width: '100%' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 1.2,
          }}
          attributionPosition="bottom-left"
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1.5} 
            color="#374151"
          />
          <Controls 
            showInteractive={true}
            position="top-right"
            className="bg-gray-800 border-gray-600"
          />
          <MiniMap 
            nodeColor={(node) => {
              const category = node.data?.category;
              if (category === 'Frontend') return '#3b82f6';
              if (category === 'Backend') return '#10b981';
              if (category === 'Database') return '#8b5cf6';
              if (category === 'Integration') return '#f59e0b';
              if (category === 'Auth') return '#ef4444';
              return '#6366f1';
            }}
            maskColor="rgba(0, 0, 0, 0.3)"
            position="bottom-left"
            style={{
              backgroundColor: '#1f2937',
              border: '2px solid #4b5563',
              borderRadius: '8px',
            }}
          />
        </ReactFlow>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border-2 border-green-500/30">
          <div className="relative">
            <div className="w-4 h-0.5 bg-green-400"></div>
            <div className="absolute top-0 left-0 w-4 h-0.5 bg-green-300 animate-pulse"></div>
          </div>
          <span className="font-semibold text-green-300">HTTP/REST</span>
        </div>
        
        <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full border-2 border-purple-500/30">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-purple-400"></div>
          <span className="font-semibold text-purple-300">Database</span>
        </div>
        
        <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full border-2 border-yellow-500/30">
          <div className="w-4 h-1 bg-yellow-400 rounded animate-pulse"></div>
          <span className="font-semibold text-yellow-300">WebSocket</span>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border-2 border-blue-500/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-blue-200">
            <strong>Interactive Controls:</strong> Zoom with mouse wheel • Pan by dragging • 
            Use minimap (bottom-left) for navigation • All edges are animated showing data flow • 
            {isFullstack 
              ? 'Nodes organized by architecture layers (Frontend → Backend → Database)' 
              : `Clean grid layout with ${workflowNodes.length} ${projectTypeLabel.toLowerCase()} components`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;
