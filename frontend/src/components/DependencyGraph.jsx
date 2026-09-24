import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';

function DependencyNode({ data }) {
  const isVuln = data.is_vulnerable;
  const isDirect = data.depth === 'direct';

  return (
    <div
      className={`px-3.5 py-2.5 rounded-lg border text-xs shadow-none min-w-[160px] ${
        isVuln
          ? 'border-red-300 bg-red-50/60 text-red-950 font-medium'
          : isDirect
          ? 'border-slate-300 bg-white text-slate-900'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      <div className="font-mono font-medium truncate max-w-[140px] text-slate-900">{data.label}</div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5 pt-1 border-t border-slate-100">
        <span>v{data.version}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDirect ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100' : 'bg-slate-100 text-slate-600'}`}>
          {data.depth}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  depNode: DependencyNode,
};

export default function DependencyGraph({ dependencies, filename }) {
  const { nodes, edges } = useMemo(() => {
    if (!dependencies || dependencies.length === 0) {
      return { nodes: [], edges: [] };
    }

    const flowNodes = [];
    const flowEdges = [];

    const rootId = 'root_project';
    flowNodes.push({
      id: rootId,
      type: 'default',
      data: { label: filename || 'Project Root' },
      position: { x: 320, y: 20 },
      style: {
        background: '#0f172a',
        color: '#ffffff',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        padding: '8px 16px',
      },
    });

    const directDeps = dependencies.filter((d) => d.depth === 'direct');
    const transitiveDeps = dependencies.filter((d) => d.depth === 'transitive');

    const directSpacing = 220;
    const directStartX = Math.max(20, 320 - ((directDeps.length - 1) * directSpacing) / 2);

    directDeps.forEach((dep, idx) => {
      const depId = `dep_${dep.name}`;
      flowNodes.push({
        id: depId,
        type: 'depNode',
        data: {
          label: dep.name,
          version: dep.version,
          depth: dep.depth,
          is_vulnerable: dep.is_vulnerable,
        },
        position: { x: directStartX + idx * directSpacing, y: 140 },
      });

      flowEdges.push({
        id: `e_root_${depId}`,
        source: rootId,
        target: depId,
        style: { stroke: dep.is_vulnerable ? '#ef4444' : '#94a3b8', strokeWidth: 1.5 },
      });
    });

    const transSpacing = 190;
    const transStartX = Math.max(20, 320 - ((transitiveDeps.length - 1) * transSpacing) / 2);

    transitiveDeps.forEach((dep, idx) => {
      const depId = `trans_${dep.name}_${idx}`;
      flowNodes.push({
        id: depId,
        type: 'depNode',
        data: {
          label: dep.name,
          version: dep.version,
          depth: dep.depth,
          is_vulnerable: dep.is_vulnerable,
        },
        position: { x: transStartX + idx * transSpacing, y: 270 },
      });

      const parentId = dep.parent ? `dep_${dep.parent}` : directDeps.length > 0 ? `dep_${directDeps[0].name}` : rootId;
      flowEdges.push({
        id: `e_parent_${depId}`,
        source: parentId,
        target: depId,
        style: { stroke: dep.is_vulnerable ? '#ef4444' : '#cbd5e1', strokeWidth: 1.5, strokeDasharray: dep.is_vulnerable ? undefined : '4 4' },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [dependencies, filename]);

  if (!dependencies || dependencies.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-slate-200">
        No dependency hierarchy to display.
      </div>
    );
  }

  return (
    <div className="w-full h-[390px] bg-slate-50 rounded-lg border border-slate-200 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={18} size={1} />
        <Controls className="!bg-white !border-slate-200 !text-slate-700" />
      </ReactFlow>
    </div>
  );
}
