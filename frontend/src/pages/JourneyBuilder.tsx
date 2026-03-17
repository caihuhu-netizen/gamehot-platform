import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GitBranch, Plus, Play, Pause, Archive, Trash2, Loader2,
  Bell, Clock, Filter, Shuffle, Tag, Gift, Square,
  Zap, Users, ArrowRight, Settings2, ChevronRight,
  TrendingUp, CheckCircle2, MousePointerClick, Save
} from "lucide-react";

// ── Node types ────────────────────────────────────────────────
const NODE_TYPES: Record<string, { label: string; icon: typeof Bell; color: string; bgColor: string }> = {
  trigger:   { label: "触发器",   icon: Zap,              color: "#8b5cf6", bgColor: "bg-violet-500/10 border-violet-500/30" },
  push:      { label: "推送消息", icon: Bell,             color: "#3b82f6", bgColor: "bg-blue-500/10 border-blue-500/30" },
  wait:      { label: "等待延迟", icon: Clock,            color: "#6b7280", bgColor: "bg-gray-500/10 border-gray-500/30" },
  condition: { label: "条件判断", icon: Filter,           color: "#f59e0b", bgColor: "bg-amber-500/10 border-amber-500/30" },
  ab_split:  { label: "A/B 分流", icon: Shuffle,          color: "#ec4899", bgColor: "bg-pink-500/10 border-pink-500/30" },
  coupon:    { label: "发放优惠", icon: Gift,             color: "#22c55e", bgColor: "bg-green-500/10 border-green-500/30" },
  tag:       { label: "打标签",   icon: Tag,              color: "#06b6d4", bgColor: "bg-cyan-500/10 border-cyan-500/30" },
  end:       { label: "结束",     icon: Square,           color: "#94a3b8", bgColor: "bg-slate-500/10 border-slate-500/30" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:    { label: "草稿", color: "bg-muted text-muted-foreground" },
  active:   { label: "运行中", color: "bg-green-500/10 text-green-500" },
  paused:   { label: "已暂停", color: "bg-amber-500/10 text-amber-500" },
  archived: { label: "已归档", color: "bg-gray-500/10 text-gray-400" },
};

const TRIGGER_TYPES = [
  { value: "event",      label: "用户事件触发（注册/付费/关卡通过）" },
  { value: "segment",    label: "进入分群触发" },
  { value: "churn_risk", label: "流失风险预警触发" },
  { value: "schedule",   label: "定时触发" },
];

// ── Canvas Node component ─────────────────────────────────────
interface CanvasNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, unknown>;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

function CanvasNodeCard({
  node, selected, onClick, onDelete
}: {
  node: CanvasNode; selected: boolean;
  onClick: () => void; onDelete: () => void;
}) {
  const nt = NODE_TYPES[node.type] ?? NODE_TYPES.end;
  const Icon = nt.icon;
  return (
    <div
      className={`absolute flex flex-col items-center cursor-pointer select-none`}
      style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className={`rounded-xl border-2 p-3 w-32 text-center shadow-sm transition-all
        ${selected ? "ring-2 ring-primary ring-offset-1" : "hover:border-primary/50"}
        ${nt.bgColor}`}>
        <Icon className="h-5 w-5 mx-auto mb-1" style={{ color: nt.color }} />
        <p className="text-xs font-semibold leading-tight">{node.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{nt.label}</p>
      </div>
      {selected && (
        <button
          className="mt-1 text-[10px] text-red-500 hover:text-red-600"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >删除</button>
      )}
    </div>
  );
}

// ── SVG Edge connector ────────────────────────────────────────
function EdgeConnector({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map(e => {
        const s = nodeMap[e.source];
        const t = nodeMap[e.target];
        if (!s || !t) return null;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const cx1 = s.x + dx * 0.5;
        const cy1 = s.y;
        const cx2 = t.x - dx * 0.5;
        const cy2 = t.y;
        return (
          <g key={e.id}>
            <path
              d={`M ${s.x} ${s.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${t.x} ${t.y}`}
              fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)"
            />
            {e.label && (
              <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6}
                textAnchor="middle" className="text-xs" fill="#94a3b8" fontSize="11">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Journey Canvas Editor ─────────────────────────────────────
function JourneyCanvas({
  journey, onSave
}: {
  journey: any;
  onSave: (canvasData: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void;
}) {
  const rawCanvas = typeof journey.canvas_data === "string"
    ? JSON.parse(journey.canvas_data || "{}")
    : journey.canvas_data ?? {};

  const [nodes, setNodes] = useState<CanvasNode[]>(rawCanvas.nodes ?? []);
  const [edges, setEdges] = useState<CanvasEdge[]>(rawCanvas.edges ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNode = (type: string) => {
    const nt = NODE_TYPES[type];
    const id = `n${Date.now()}`;
    const existingX = nodes.map(n => n.x);
    const maxX = existingX.length ? Math.max(...existingX) : 80;
    const newNode: CanvasNode = { id, type, label: nt.label, x: maxX + 160, y: 200 };
    const newNodes = [...nodes, newNode];
    // 自动连接到上一个节点
    let newEdges = [...edges];
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      newEdges = [...newEdges, { id: `e${Date.now()}`, source: lastNode.id, target: id }];
    }
    setNodes(newNodes);
    setEdges(newEdges);
    setSelected(id);
    onSave({ nodes: newNodes, edges: newEdges });
  };

  const deleteNode = (id: string) => {
    const newNodes = nodes.filter(n => n.id !== id);
    const newEdges = edges.filter(e => e.source !== id && e.target !== id);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelected(null);
    onSave({ nodes: newNodes, edges: newEdges });
  };

  const onMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging({ id: nodeId, ox: e.clientX - node.x, oy: e.clientY - node.y });
    setSelected(nodeId);
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setNodes(prev => prev.map(n =>
      n.id === dragging.id ? { ...n, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy } : n
    ));
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    if (dragging) {
      onSave({ nodes, edges });
      setDragging(null);
    }
  }, [dragging, nodes, edges, onSave]);

  const selectedNode = nodes.find(n => n.id === selected);

  return (
    <div className="flex gap-4 h-[480px]">
      {/* Toolbox */}
      <div className="w-36 flex-shrink-0 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">节点库</p>
        {Object.entries(NODE_TYPES).map(([type, nt]) => {
          const Icon = nt.icon;
          return (
            <button key={type}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs hover:border-primary/50 transition-colors ${nt.bgColor}`}
              onClick={() => addNode(type)}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: nt.color }} />
              <span>{nt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden rounded-xl border-2 border-dashed border-muted bg-muted/20"
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={() => setSelected(null)}
      >
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">从左侧拖入节点开始构建旅程</p>
            <p className="text-xs mt-1 opacity-60">点击节点类型即可添加</p>
          </div>
        )}
        <EdgeConnector nodes={nodes} edges={edges} />
        {nodes.map(node => (
          <div key={node.id}
            onMouseDown={(e) => onMouseDown(e, node.id)}
            style={{ position: "absolute", left: node.x, top: node.y, transform: "translate(-50%,-50%)" }}
          >
            <CanvasNodeCard
              node={node}
              selected={selected === node.id}
              onClick={() => setSelected(node.id)}
              onDelete={() => deleteNode(node.id)}
            />
          </div>
        ))}
      </div>

      {/* Node config panel */}
      <div className="w-44 flex-shrink-0">
        {selectedNode ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">节点配置</p>
            <div>
              <Label className="text-xs">节点名称</Label>
              <Input
                className="mt-1 h-7 text-xs"
                value={selectedNode.label}
                onChange={e => {
                  const newNodes = nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n);
                  setNodes(newNodes);
                }}
                onBlur={() => onSave({ nodes, edges })}
              />
            </div>
            {selectedNode.type === "wait" && (
              <div>
                <Label className="text-xs">等待时长</Label>
                <Input className="mt-1 h-7 text-xs" placeholder="如：24h / 3d" />
              </div>
            )}
            {selectedNode.type === "push" && (
              <div>
                <Label className="text-xs">推送内容</Label>
                <Textarea className="mt-1 text-xs" rows={3} placeholder="推送通知文案..." />
              </div>
            )}
            {selectedNode.type === "condition" && (
              <div>
                <Label className="text-xs">判断条件</Label>
                <Input className="mt-1 h-7 text-xs" placeholder="如：is_paying = true" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center pt-8">
            <Settings2 className="h-6 w-6 mx-auto mb-2 opacity-30" />
            点击节点<br />配置参数
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function JourneyBuilder() {
  const { currentGame } = useGame();
  const gameId = currentGame?.id;
  const [view, setView] = useState<"list" | "canvas">("list");
  const [editingJourney, setEditingJourney] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", triggerType: "event" });
  const [saving, setSaving] = useState(false);

  const journeys = trpc.journey.list.useQuery({ gameId }, { enabled: true });
  const jStats   = trpc.journey.stats.useQuery({ gameId }, { enabled: true });

  const createJourney = trpc.journey.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("旅程已创建");
      setShowCreate(false);
      journeys.refetch();
      // 自动进入画布编辑
      const newJ = { ...createForm, id: data?.id, canvas_data: '{"nodes":[],"edges":[]}', status: "draft" };
      setEditingJourney(newJ);
      setView("canvas");
    },
  });

  const updateStatus = trpc.journey.updateStatus.useMutation({
    onSuccess: () => { toast.success("状态已更新"); journeys.refetch(); },
  });

  const saveCanvas = trpc.journey.saveCanvas.useMutation({
    onSuccess: () => { setSaving(false); },
  });

  const handleSaveCanvas = useCallback((canvasData: any) => {
    if (!editingJourney?.id) return;
    setSaving(true);
    saveCanvas.mutate({ id: editingJourney.id, canvasData: JSON.stringify(canvasData) });
  }, [editingJourney?.id]);

  const sts = jStats.data as any;
  const journeyList = (journeys.data ?? []) as any[];

  if (view === "canvas" && editingJourney) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); journeys.refetch(); }}>
            ← 返回列表
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              {editingJourney.name}
            </h1>
            <p className="text-xs text-muted-foreground">{editingJourney.description}</p>
          </div>
          {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />保存中…</span>}
          {!saving && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />已保存</span>}
          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: editingJourney.id, status: "active" })}>
            <Play className="h-4 w-4 mr-1" />激活旅程
          </Button>
        </div>
        <Card>
          <CardContent className="p-4">
            <JourneyCanvas journey={editingJourney} onSave={handleSaveCanvas} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" /> 用户旅程编排
          </h1>
          <p className="text-muted-foreground mt-1">可视化构建自动化用户旅程，精准触达每个生命周期节点</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />新建旅程
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "总旅程数", value: sts?.total ?? "—", icon: GitBranch, color: "text-primary" },
          { label: "运行中", value: sts?.active ?? "—", icon: Play, color: "text-green-500" },
          { label: "草稿", value: sts?.draft ?? "—", icon: Archive, color: "text-muted-foreground" },
          { label: "累计入组", value: sts?.totalEnrolled ?? "—", icon: Users, color: "text-blue-500" },
          { label: "整体转化率", value: sts?.overallConvRate != null ? `${sts.overallConvRate}%` : "—", icon: TrendingUp, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Journey List */}
      {journeys.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
      ) : journeyList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">暂无旅程</p>
            <p className="text-sm mb-4">点击「新建旅程」创建你的第一个自动化用户旅程</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />新建旅程</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {journeyList.map((j: any) => {
            const st = STATUS_MAP[j.status] ?? STATUS_MAP.draft;
            const convRate = j.enrolled_count > 0
              ? ((j.converted_count / j.enrolled_count) * 100).toFixed(1)
              : "0.0";
            return (
              <Card key={j.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{j.name}</h3>
                        <Badge className={st.color} variant="secondary">{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{j.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" />
                          {TRIGGER_TYPES.find(t => t.value === j.trigger_type)?.label ?? j.trigger_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{j.enrolled_count} 入组
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />{convRate}% 转化
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {j.status === "active" && (
                        <Button size="sm" variant="outline"
                          onClick={() => updateStatus.mutate({ id: j.id, status: "paused" })}>
                          <Pause className="h-3.5 w-3.5 mr-1" />暂停
                        </Button>
                      )}
                      {(j.status === "draft" || j.status === "paused") && (
                        <Button size="sm" variant="outline"
                          onClick={() => updateStatus.mutate({ id: j.id, status: "active" })}>
                          <Play className="h-3.5 w-3.5 mr-1" />激活
                        </Button>
                      )}
                      <Button size="sm"
                        onClick={() => { setEditingJourney(j); setView("canvas"); }}>
                        <Settings2 className="h-3.5 w-3.5 mr-1" />编辑画布
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建用户旅程</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>旅程名称 *</Label>
              <Input placeholder="如：新用户激活旅程" value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea placeholder="简述旅程目标..." rows={2} value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>触发方式</Label>
              <Select value={createForm.triggerType} onValueChange={v => setCreateForm(f => ({ ...f, triggerType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createJourney.mutate({ ...createForm, gameId })}
              disabled={!createForm.name || createJourney.isPending}
            >
              {createJourney.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              创建并编辑画布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
