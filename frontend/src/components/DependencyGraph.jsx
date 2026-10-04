import React, { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import dagre from 'dagre';

function CustomDependencyNode({ data }) {
  const [hovered, setHovered] = useState(false);
  const { label, version, depth, is_vulnerable, severity, onSelect } = data;

  // Determine severity border indicator color
  let severityBorder = 'border-slate-200 dark:border-[#30363D]';
  let severityIndicator = 'bg-emerald-500';

  if (is_vulnerable) {
    const sev = (severity || 'HIGH').toUpperCase();
    if (sev === 'CRITICAL' || sev === 'HIGH') {
      severityBorder = 'border-red-500 dark:border-red-500';
      severityIndicator = 'bg-red-600';
    } else if (sev === 'MEDIUM') {
      severityBorder = 'border-orange-500 dark:border-orange-500';
      severityIndicator = 'bg-orange-500';
    } else {
      severityBorder = 'border-blue-500 dark:border-blue-500';
      severityIndicator = 'bg-blue-500';
    }
  }

  const isDirect = depth === 'direct';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (is_vulnerable && onSelect) {
          onSelect(data);
        }
      }}
      className={`px-3 py-2 rounded-lg border bg-white dark:bg-[#161B22] text-xs min-w-[170px] transition-all duration-150 relative overflow-hidden cursor-pointer ${severityBorder} ${
        hovered ? 'border-blue-600 dark:border-blue-400 ring-1 ring-blue-600/30' : ''
      }`}
    >
      {/* Colored Left-Edge Severity Indicator Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${severityIndicator}`} />

      <Handle type="target" position={Position.Top} className="!bg-slate-400 dark:!bg-slate-600 !w-2 !h-2" />
      
      <div className="pl-1.5 space-y-1">
        <div className="font-mono font-medium text-slate-900 dark:text-[#E6EDF3] truncate max-w-[140px]">
          {label}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#8B949E]">
          <span>v{version}</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
            isDirect 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 font-medium' 
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {depth}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 dark:!bg-slate-600 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  customDepNode: CustomDependencyNode,
};

// Dagre Layout Helper Function
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 190;
  const nodeHeight = 65;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 60,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function DependencyGraph({ dependencies, filename, onSelectVulnPackage }) {
  const { nodes, edges } = useMemo(() => {
    if (!dependencies || dependencies.length === 0) {
      return { nodes: [], edges: [] };
    }

    const rawNodes = [];
    const rawEdges = [];

    const rootId = 'root_project';
    rawNodes.push({
      id: rootId,
      type: 'default',
      data: { label: filename || 'Project Root' },
      position: { x: 0, y: 0 },
      style: {
        background: '#0D1117',
        color: '#E6EDF3',
        border: '1px solid #30363D',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        padding: '8px 16px',
        fontFamily: 'monospace',
      },
    });

    const directDeps = dependencies.filter((d) => d.depth === 'direct');
    const transitiveDeps = dependencies.filter((d) => d.depth === 'transitive');

    directDeps.forEach((dep) => {
      const depId = `dep_${dep.name}`;
      const firstVuln = dep.vulnerabilities && dep.vulnerabilities.length > 0 ? dep.vulnerabilities[0] : null;

      rawNodes.push({
        id: depId,
        type: 'customDepNode',
        data: {
          label: dep.name,
          version: dep.version,
          depth: dep.depth,
          is_vulnerable: dep.is_vulnerable,
          severity: firstVuln ? firstVuln.severity : 'LOW',
          package_name: dep.name,
          installed_version: dep.version,
          vuln_id: firstVuln ? firstVuln.id : undefined,
          fixed_version: firstVuln ? firstVuln.fixed_version : undefined,
          summary: firstVuln ? firstVuln.summary : undefined,
          details: firstVuln ? firstVuln.details : undefined,
          ai_explanation: dep.ai_explanation,
          onSelect: onSelectVulnPackage,
        },
        position: { x: 0, y: 0 },
      });

      rawEdges.push({
        id: `e_root_${depId}`,
        source: rootId,
        target: depId,
        style: {
          stroke: dep.is_vulnerable ? '#ef4444' : '#64748b',
          strokeWidth: 1.5,
        },
      });
    });

    transitiveDeps.forEach((dep, idx) => {
      const depId = `trans_${dep.name}_${idx}`;
      const firstVuln = dep.vulnerabilities && dep.vulnerabilities.length > 0 ? dep.vulnerabilities[0] : null;

      rawNodes.push({
        id: depId,
        type: 'customDepNode',
        data: {
          label: dep.name,
          version: dep.version,
          depth: dep.depth,
          is_vulnerable: dep.is_vulnerable,
          severity: firstVuln ? firstVuln.severity : 'LOW',
          package_name: dep.name,
          installed_version: dep.version,
          vuln_id: firstVuln ? firstVuln.id : undefined,
          fixed_version: firstVuln ? firstVuln.fixed_version : undefined,
          summary: firstVuln ? firstVuln.summary : undefined,
          details: firstVuln ? firstVuln.details : undefined,
          ai_explanation: dep.ai_explanation,
          onSelect: onSelectVulnPackage,
        },
        position: { x: 0, y: 0 },
      });

      const parentId = dep.parent ? `dep_${dep.parent}` : directDeps.length > 0 ? `dep_${directDeps[0].name}` : rootId;
      rawEdges.push({
        id: `e_parent_${depId}`,
        source: parentId,
        target: depId,
        style: {
          stroke: dep.is_vulnerable ? '#ef4444' : '#94a3b8',
          strokeWidth: 1.5,
          strokeDasharray: dep.is_vulnerable ? undefined : '4 4',
        },
      });
    });

    // Run Dagre Auto-Layout Algorithm
    return getLayoutedElements(rawNodes, rawEdges, 'TB');
  }, [dependencies, filename, onSelectVulnPackage]);

  if (!dependencies || dependencies.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-[#8B949E] text-xs bg-slate-50 dark:bg-[#161B22] rounded-lg border border-slate-200 dark:border-[#30363D]">
        No dependency hierarchy to display.
      </div>
    );
  }

  return (
    <div className="w-full h-[420px] bg-slate-50 dark:bg-[#0D1117] rounded-lg border border-slate-200 dark:border-[#30363D] overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#94a3b8" gap={18} size={1} opacity={0.3} />
        <Controls className="!bg-white dark:!bg-[#161B22] !border-slate-200 dark:!border-[#30363D] !text-slate-700 dark:!text-[#C9D1D9]" />
      </ReactFlow>
    </div>
  );
}
