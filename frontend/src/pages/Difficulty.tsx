import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, TrendingUp, Pencil, Waves } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
const SEGMENT_LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"];

export default function Difficulty() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.levels.listTemplates.useQuery({ gameId: currentGameId ?? undefined });

  const createTemplate = trpc.levels.createTemplate.useMutation({
    onSuccess: () => {
      utils.levels.listTemplates.invalidate();
      setShowCreate(false);
      toast.success("难度曲线模板创建成功");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTemplate = trpc.levels.updateTemplate.useMutation({
    onSuccess: () => {
      utils.levels.listTemplates.invalidate();
      toast.success("模板更新成功");
    },
    onError: (err) => toast.error(err.message),
  });

  // Generate sample flow curve data for visualization
  const flowCurveData = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    const cycle = Math.floor(i / 7);
    const posInCycle = i % 7;
    const baseFlow = 0.5;
    const flowPattern = [0.3, 0.4, 0.55, 0.7, 0.85, 0.65, 0.45];
    return {
      level: `L${level}`,
      L1: Math.min(1, baseFlow + flowPattern[posInCycle] * 0.3 + Math.random() * 0.1),
      L3: Math.min(1, baseFlow + flowPattern[posInCycle] * 0.5 + Math.random() * 0.1),
      L5: Math.min(1, baseFlow + flowPattern[posInCycle] * 0.7 + Math.random() * 0.1),
    };
  });

  return (
    <div className="space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.difficulty} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">难度调度管理</h1>
          <p className="text-muted-foreground text-sm mt-1">心流算法配置、难度曲线模板、分层差异化基准</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新建模板</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>创建难度曲线模板</DialogTitle>
            </DialogHeader>
            <TemplateForm onSubmit={(data) => createTemplate.mutate(data)} loading={createTemplate.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Waves className="h-4 w-4 text-muted-foreground" />
            心流难度曲线示意
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={flowCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="L1" stroke="#6366f1" strokeWidth={2} dot={false} name="鲸鱼用户" />
              <Line type="monotone" dataKey="L3" stroke="#10b981" strokeWidth={2} dot={false} name="小鱼用户" />
              <Line type="monotone" dataKey="L5" stroke="#f59e0b" strokeWidth={2} dot={false} name="新用户" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            7关一循环：渐进 → 挑战 → 高峰 → 缓冲 → 再挑战 → 巅峰 → 放松
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">难度曲线模板列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板编码</TableHead>
                <TableHead>目标分层</TableHead>
                <TableHead>作用域</TableHead>
                <TableHead>循环长度</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>生效时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : templates?.length ? (
                (templates ?? []).map((t: Record<string,unknown>) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.templateCode}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{t.segmentLevel}</Badge></TableCell>
                    <TableCell className="text-sm">{t.scopeType}</TableCell>
                    <TableCell className="text-sm">{t.cycleLength} 关</TableCell>
                    <TableCell>
                      {t.isDefault ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">默认</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{t.effectiveFrom ? new Date(t.effectiveFrom).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无难度曲线模板，点击"新建模板"开始配置
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    templateCode: "",
    segmentLevel: "L3",
    cycleLength: 7,
    levelConfigs: JSON.stringify({
      positions: [
        { pos: 1, type: "WARM_UP", difficultyRange: [0.3, 0.4] },
        { pos: 2, type: "RAMP_UP", difficultyRange: [0.4, 0.55] },
        { pos: 3, type: "CHALLENGE", difficultyRange: [0.55, 0.7] },
        { pos: 4, type: "PEAK", difficultyRange: [0.7, 0.85] },
        { pos: 5, type: "RELIEF", difficultyRange: [0.5, 0.6] },
        { pos: 6, type: "CHALLENGE", difficultyRange: [0.65, 0.8] },
        { pos: 7, type: "COOL_DOWN", difficultyRange: [0.35, 0.45] },
      ],
    }, null, 2),
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>模板编码</Label>
          <Input value={form.templateCode} onChange={(e) => setForm({ ...form, templateCode: e.target.value })} placeholder="CURVE_L3_DEFAULT" />
        </div>
        <div>
          <Label>目标分层</Label>
          <Select value={form.segmentLevel} onValueChange={(v) => setForm({ ...form, segmentLevel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEGMENT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>循环长度</Label>
          <Input type="number" value={form.cycleLength} onChange={(e) => setForm({ ...form, cycleLength: Number(e.target.value) })} />
        </div>
        <div>
          <Label>生效日期</Label>
          <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>关卡配置 (JSON)</Label>
        <Textarea rows={8} value={form.levelConfigs} onChange={(e) => setForm({ ...form, levelConfigs: e.target.value })} className="font-mono text-xs" />
      </div>
      <Button onClick={() => {
        try {
          const configs = JSON.parse(form.levelConfigs);
          onSubmit({ ...form, levelConfigs: configs });
        } catch {
          toast.error("关卡配置JSON格式错误");
        }
      }} disabled={loading || !form.templateCode} className="w-full">
        {loading ? "创建中..." : "创建模板"}
      </Button>
    </div>
  );
}
