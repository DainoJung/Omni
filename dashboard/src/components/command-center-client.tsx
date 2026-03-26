'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Cpu,
  Database,
  Layers,
  Zap,
  Box,
  ChevronRight,
  Network,
  Users,
  TrendingUp,
  AlertCircle,
  Bot,
  Brain,
  Eye,
  Plug,
  Radio,
  MessageSquare,
  Globe,
  Hash,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// --- Types ---

type OmniLayer = 'ALL' | 'META' | 'BUSINESS' | 'OPERATIONS'

interface Division {
  id: string
  name: string
  slug: string
  status: string
  description: string | null
  agents: { id: string; name: string; role: string; status: string; model: string }[]
}

interface OmniNodeData {
  id: string
  label: string
  type: 'ORCHESTRATOR' | 'META' | 'DIVISION' | 'AGENT'
  layer: OmniLayer
  icon: React.ComponentType<{ size?: number }>
  details: Record<string, string | number>
  isSelected: boolean
  status?: string
  subItems?: string[]
  navigateTo?: string
  [key: string]: unknown
}

interface CommandCenterProps {
  divisions: Division[]
  pendingDecisionCount: number
  todayEvents: number
  dailyCost: number
  totalAgents: number
}

// --- Blueprint Card ---

function BlueprintCard({
  title,
  children,
  className,
  icon,
}: {
  title: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <div className={cn('blueprint-card flex flex-col overflow-hidden', className)}>
      <div className="blueprint-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        <ChevronRight size={12} className="opacity-40" />
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

// --- Custom Node ---

function OmniFlowNode({ data }: { data: OmniNodeData }) {
  const Icon = data.icon
  const isSelected = data.isSelected

  const typeColor: Record<string, string> = {
    ORCHESTRATOR: 'border-amber-500 text-amber-600',
    META: 'border-purple-500 text-purple-600',
    DIVISION: 'border-blue-500 text-blue-600',
    AGENT: 'border-emerald-500 text-emerald-600',
  }

  const typeBg: Record<string, string> = {
    ORCHESTRATOR: 'bg-amber-500',
    META: 'bg-purple-500',
    DIVISION: 'bg-blue-500',
    AGENT: 'bg-emerald-500',
  }

  const statusDot: Record<string, string> = {
    operating: 'bg-emerald-500',
    building: 'bg-blue-500',
    designing: 'bg-purple-500',
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    error: 'bg-red-500',
    paused: 'bg-yellow-500',
  }

  return (
    <div className="flex flex-col items-center group relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-slate-300 border-2 border-white shadow-sm"
      />
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-white relative z-10',
          typeColor[data.type] || 'border-slate-400 text-slate-600',
          isSelected &&
            cn(typeBg[data.type], 'text-white shadow-xl scale-110 border-transparent')
        )}
      >
        <Icon size={28} />
      </div>
      <div className="mt-2 flex flex-col items-center">
        <span
          className={cn(
            'text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-bold transition-colors text-center max-w-[120px] leading-tight',
            isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]/80'
          )}
        >
          {data.label}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse',
              data.status ? statusDot[data.status] || 'bg-slate-400' : 'bg-emerald-500'
            )}
          />
          <span className="text-[8px] font-[family-name:var(--font-mono)] opacity-40 uppercase tracking-tighter">
            {data.type}
          </span>
        </div>
      </div>
      {isSelected && (
        <div className="absolute -inset-4 rounded-[2rem] border-2 border-[var(--accent-blue)]/20 animate-pulse pointer-events-none z-0" />
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-slate-300 border-2 border-white shadow-sm"
      />
    </div>
  )
}

const nodeTypes = { omniNode: OmniFlowNode }

// --- Build Graph ---

function buildGraphData(divisions: Division[]): {
  nodes: RFNode<OmniNodeData>[]
  edges: RFEdge[]
} {
  const nodes: RFNode<OmniNodeData>[] = []
  const edges: RFEdge[] = []

  const divCount = divisions.length
  const totalSecondRow = 1 + divCount // meta + divisions
  const secondRowSpacing = 250
  const secondRowStart = 500 - ((totalSecondRow - 1) * secondRowSpacing) / 2

  // Orchestrator
  nodes.push({
    id: 'omni',
    type: 'omniNode',
    position: { x: 500, y: 50 },
    data: {
      id: 'omni',
      label: 'OMNI OS',
      type: 'ORCHESTRATOR',
      layer: 'ALL',
      icon: Layers,
      isSelected: true,
      details: {
        Role: 'Orchestrator',
        Phase: '0 — OS Foundation',
        'Active Divisions': divCount,
      },
    },
  })

  // Meta Layer
  const metaX = secondRowStart
  nodes.push({
    id: 'meta',
    type: 'omniNode',
    position: { x: metaX, y: 220 },
    data: {
      id: 'meta',
      label: 'META LAYER',
      type: 'META',
      layer: 'META',
      icon: Brain,
      isSelected: false,
      subItems: ['Builder', 'Memory', 'Self-Awareness'],
      details: {
        Builder: 'Active',
        Memory: 'Active',
        'Self-Awareness': 'Active',
      },
    },
  })
  edges.push({
    id: 'e-omni-meta',
    source: 'omni',
    target: 'meta',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#8B5CF6', strokeWidth: 2, strokeDasharray: '5 5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' },
  })

  // Meta sub-nodes
  const metaSubs = [
    { id: 'meta-builder', label: 'Builder', icon: Box },
    { id: 'meta-memory', label: 'Memory', icon: Database },
    { id: 'meta-awareness', label: 'Self-Awareness', icon: Eye },
  ]
  metaSubs.forEach((sub, i) => {
    const subX = metaX - 120 + i * 120
    nodes.push({
      id: sub.id,
      type: 'omniNode',
      position: { x: subX, y: 400 },
      data: {
        id: sub.id,
        label: sub.label,
        type: 'AGENT',
        layer: 'META',
        icon: sub.icon,
        isSelected: false,
        status: 'active',
        details: { Status: 'Active', Type: 'Meta Service' },
      },
    })
    edges.push({
      id: `e-meta-${sub.id}`,
      source: 'meta',
      target: sub.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94A3B8', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
    })
  })

  // Divisions
  divisions.forEach((div, i) => {
    const divX = secondRowStart + (i + 1) * secondRowSpacing
    const divNodeId = `div-${div.id}`

    nodes.push({
      id: divNodeId,
      type: 'omniNode',
      position: { x: divX, y: 220 },
      data: {
        id: divNodeId,
        label: div.name.replace(/^Division . — /, ''),
        type: 'DIVISION',
        layer: 'BUSINESS',
        icon: Network,
        isSelected: false,
        status: div.status,
        navigateTo: `/division/${div.id}`,
        details: {
          Status: div.status.charAt(0).toUpperCase() + div.status.slice(1),
          Agents: div.agents?.length ?? 0,
          ...(div.description ? { Description: div.description.slice(0, 30) } : {}),
        },
      },
    })
    edges.push({
      id: `e-omni-${divNodeId}`,
      source: 'omni',
      target: divNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
    })

    // Agents under this division
    const agents = div.agents || []
    const agentSpacing = 120
    const agentStart = divX - ((agents.length - 1) * agentSpacing) / 2

    agents.forEach((agent, j) => {
      const agentNodeId = `agent-${agent.id}`
      nodes.push({
        id: agentNodeId,
        type: 'omniNode',
        position: { x: agentStart + j * agentSpacing, y: 400 },
        data: {
          id: agentNodeId,
          label: agent.name,
          type: 'AGENT',
          layer: 'OPERATIONS',
          icon: Cpu,
          isSelected: false,
          status: agent.status,
          navigateTo: `/agent/${agent.id}`,
          details: {
            Role: agent.role,
            Model: agent.model || 'gpt-5-mini',
            Status: agent.status,
          },
        },
      })
      edges.push({
        id: `e-${divNodeId}-${agentNodeId}`,
        source: divNodeId,
        target: agentNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
      })
    })
  })

  return { nodes, edges }
}

// --- Mock Chart Data ---

const ANALYTICS_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 40 + Math.random() * 20 + Math.sin(i / 2) * 10,
}))

// --- Main Component ---

export function CommandCenterClient({
  divisions,
  pendingDecisionCount,
  todayEvents,
  dailyCost,
  totalAgents,
}: CommandCenterProps) {
  const router = useRouter()
  const [activeLayer, setActiveLayer] = useState<OmniLayer>('ALL')

  const { nodes: initialNodes, edges: initialEdges } = buildGraphData(divisions)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const selectedNode = nodes.find((n) => (n.data as OmniNodeData).isSelected)?.data as OmniNodeData | undefined
  const selectedData = selectedNode || initialNodes[0]?.data

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: n.id === node.id } as OmniNodeData,
        }))
      )
    },
    [setNodes]
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      const data = node.data as OmniNodeData
      if (data.navigateTo) router.push(data.navigateTo)
    },
    [router]
  )

  // Filter by layer
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const data = n.data as OmniNodeData
        const visible =
          activeLayer === 'ALL' ||
          data.layer === activeLayer ||
          data.layer === 'ALL'
        return { ...n, hidden: !visible }
      })
    )
  }, [activeLayer, setNodes])

  // Agent status summary
  const allAgents = divisions.flatMap((d) => d.agents || [])
  const agentsByStatus = {
    active: allAgents.filter((a) => a.status === 'active').length,
    inactive: allAgents.filter((a) => a.status === 'inactive').length,
    error: allAgents.filter((a) => a.status === 'error').length,
    building: allAgents.filter((a) => a.status === 'building' || a.status === 'paused').length,
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Layer Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--border)] bg-white/50 backdrop-blur-sm shrink-0">
        <div className="flex bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border)]">
          {(['ALL', 'META', 'BUSINESS', 'OPERATIONS'] as OmniLayer[]).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={cn(
                'px-3 py-1 text-[10px] font-[family-name:var(--font-mono)] uppercase rounded-md transition-all',
                activeLayer === layer
                  ? 'bg-white text-[var(--accent-blue)] shadow-sm font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {layer}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6 text-[10px] font-[family-name:var(--font-mono)] uppercase">
          <span className="text-[var(--text-muted)]">
            Divisions: <strong className="text-[var(--text-primary)]">{divisions.length}</strong>
          </span>
          <span className="text-[var(--text-muted)]">
            Agents: <strong className="text-[var(--text-primary)]">{totalAgents}</strong>
          </span>
          <span className="text-[var(--text-muted)]">
            Events Today: <strong className="text-[var(--text-primary)]">{todayEvents}</strong>
          </span>
          {pendingDecisionCount > 0 && (
            <a href="/decisions" className="text-[var(--accent-yellow)] font-bold flex items-center gap-1">
              <AlertCircle size={12} />
              {pendingDecisionCount} Pending
            </a>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-12 gap-4 p-4">
          {/* === Top Row: 3 Panels === */}
          <div className="col-span-4">
            <BlueprintCard title="Strategic Performance" icon={<TrendingUp size={12} />} className="h-48">
              <div className="h-full flex flex-col">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ANALYTICS_DATA}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3B82F6"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-50">
                      MAR
                    </span>
                    <span className="text-xs font-[family-name:var(--font-mono)] font-bold">$0.00</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-50">
                      Daily Cost
                    </span>
                    <span className="text-xs font-[family-name:var(--font-mono)] font-bold">
                      ${dailyCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-50">
                      Growth
                    </span>
                    <span className="text-xs font-[family-name:var(--font-mono)] font-bold text-emerald-600">
                      Phase 0
                    </span>
                  </div>
                </div>
              </div>
            </BlueprintCard>
          </div>

          <div className="col-span-4">
            <BlueprintCard title="Agent Automations" icon={<Bot size={12} />} className="h-48">
              <div className="space-y-2.5">
                {allAgents.length > 0 ? (
                  allAgents.slice(0, 4).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Cpu size={12} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-[10px] font-medium truncate">{agent.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded shrink-0',
                          agent.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : agent.status === 'error'
                              ? 'bg-red-100 text-red-700'
                              : agent.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {agent.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Bot size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-[10px] text-[var(--text-muted)]">No agents yet</p>
                  </div>
                )}

                {/* Summary bar */}
                <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
                  <StatusBadge label="Running" count={agentsByStatus.active} color="emerald" />
                  <StatusBadge label="Idle" count={agentsByStatus.inactive} color="slate" />
                  <StatusBadge label="Error" count={agentsByStatus.error} color="red" />
                </div>
              </div>
            </BlueprintCard>
          </div>

          <div className="col-span-4">
            <BlueprintCard title="Technical Infrastructure" icon={<Zap size={12} />} className="h-48">
              <div className="grid grid-cols-2 gap-2">
                <InfraItem icon={<Network size={20} />} label="Gateway" status="OpenClaw" />
                <InfraItem icon={<Plug size={20} />} label="ClawHub" status="Connected" />
                <InfraItem icon={<Database size={20} />} label="Supabase" status="Online" />
                <InfraItem icon={<Radio size={20} />} label="Cron" status="Active" />
              </div>
            </BlueprintCard>
          </div>

          {/* === Central Hierarchy Graph === */}
          <div className="col-span-12 blueprint-card min-h-[500px] flex flex-col">
            <div className="blueprint-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Network size={14} />
                <span>Enterprise Hierarchy Graph</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-[family-name:var(--font-mono)] opacity-50">
                  Layer: {activeLayer}
                </span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] opacity-50">
                  Active Nodes: {nodes.filter((n) => !n.hidden).length}
                </span>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden technical-grid">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
                minZoom={0.3}
                maxZoom={2}
              >
                <Background
                  color="#CBD5E1"
                  gap={25}
                  size={1}
                  variant={'lines' as any}
                  className="opacity-20"
                />
                <Controls />
              </ReactFlow>

              {/* Floating Inspector */}
              {selectedData && (
                <div className="absolute top-6 left-6 w-64 blueprint-card bg-white/90 backdrop-blur-sm shadow-2xl z-20 pointer-events-none">
                  <div
                    className={cn(
                      'blueprint-header !opacity-100 text-white flex justify-between items-center',
                      selectedData.type === 'ORCHESTRATOR'
                        ? 'bg-amber-600'
                        : selectedData.type === 'META'
                          ? 'bg-purple-600'
                          : selectedData.type === 'DIVISION'
                            ? 'bg-blue-600'
                            : 'bg-emerald-600'
                    )}
                  >
                    <span>{String(selectedData.label).toUpperCase()}</span>
                    <AlertCircle size={12} className="text-white/60" />
                  </div>
                  <div className="p-4 space-y-2.5">
                    {Object.entries(selectedData.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-[10px] font-[family-name:var(--font-mono)] opacity-50">
                          {key}
                        </span>
                        <span className="text-[10px] font-[family-name:var(--font-mono)] font-bold">
                          {value}
                        </span>
                      </div>
                    ))}

                    {selectedData.navigateTo && (
                      <a
                        href={selectedData.navigateTo}
                        className="pointer-events-auto mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-[family-name:var(--font-mono)] text-[var(--accent-blue)] hover:underline uppercase"
                      >
                        <span>View Details</span>
                        <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Breadcrumb Legend */}
              <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm z-10">
                <Search size={12} className="opacity-40" />
                <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-widest">
                  OMNI / {selectedData?.layer || 'ALL'} / {selectedData?.label || 'System'}
                </span>
              </div>
            </div>
          </div>

          {/* === Bottom Row: 3 Panels === */}
          <div className="col-span-4">
            <BlueprintCard title="Data Sources" icon={<Database size={12} />} className="h-40">
              <div className="grid grid-cols-2 gap-2 h-full">
                {[
                  { label: 'Supabase', icon: <Database size={14} /> },
                  { label: 'YouTube API', icon: <Globe size={14} /> },
                  { label: 'Gemini API', icon: <Zap size={14} /> },
                  { label: 'Coupang API', icon: <Hash size={14} /> },
                ].map((source) => (
                  <div
                    key={source.label}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 flex items-center gap-2 hover:border-[var(--accent-blue)] transition-all cursor-pointer"
                  >
                    <span className="text-[var(--text-muted)]">{source.icon}</span>
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase">
                      {source.label}
                    </span>
                  </div>
                ))}
              </div>
            </BlueprintCard>
          </div>

          <div className="col-span-4">
            <BlueprintCard title="Skills" icon={<Plug size={12} />} className="h-40">
              <div className="grid grid-cols-2 gap-2 h-full">
                {[
                  { label: 'ClawHub', icon: <Box size={14} /> },
                  { label: 'Workspace', icon: <Layers size={14} /> },
                  { label: 'Custom Tools', icon: <Cpu size={14} /> },
                  { label: 'Integrations', icon: <Plug size={14} /> },
                ].map((skill) => (
                  <div
                    key={skill.label}
                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 flex items-center gap-2 hover:border-[var(--accent-blue)] transition-all cursor-pointer"
                  >
                    <span className="text-[var(--text-muted)]">{skill.icon}</span>
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase">
                      {skill.label}
                    </span>
                  </div>
                ))}
              </div>
            </BlueprintCard>
          </div>

          <div className="col-span-4">
            <BlueprintCard title="Channels" icon={<MessageSquare size={12} />} className="h-40">
              <div className="grid grid-cols-2 gap-2 h-full">
                {[
                  { label: 'Discord', icon: <MessageSquare size={14} />, active: true },
                  { label: 'WebChat', icon: <Globe size={14} />, active: true },
                  { label: 'WhatsApp', icon: <MessageSquare size={14} />, active: false },
                  { label: 'Telegram', icon: <MessageSquare size={14} />, active: false },
                ].map((channel) => (
                  <div
                    key={channel.label}
                    className={cn(
                      'bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 flex items-center gap-2 transition-all cursor-pointer',
                      channel.active
                        ? 'hover:border-[var(--accent-blue)]'
                        : 'opacity-40'
                    )}
                  >
                    <span className="text-[var(--text-muted)]">{channel.icon}</span>
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase">
                      {channel.label}
                    </span>
                    {!channel.active && (
                      <span className="text-[7px] font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                        Soon
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </BlueprintCard>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub Components ---

function StatusBadge({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'emerald' | 'slate' | 'red' | 'yellow'
}) {
  const colors = {
    emerald: 'text-emerald-600',
    slate: 'text-slate-500',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  }
  return (
    <div className="flex items-center gap-1">
      <span className={cn('text-[10px] font-[family-name:var(--font-mono)] font-bold', colors[color])}>
        {count}
      </span>
      <span className="text-[8px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] uppercase">
        {label}
      </span>
    </div>
  )
}

function InfraItem({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode
  label: string
  status: string
}) {
  return (
    <div className="border border-[var(--border)] rounded p-1.5 flex items-center gap-2 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer group">
      <span className="text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-[family-name:var(--font-mono)] uppercase leading-tight">{label}</span>
        <span className="block text-[8px] font-[family-name:var(--font-mono)] text-emerald-600 leading-tight">{status}</span>
      </div>
    </div>
  )
}
