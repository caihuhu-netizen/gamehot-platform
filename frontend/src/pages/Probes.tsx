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
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Plus, Target, Pencil } from "lucide-react";
import { toast } from "sonner";
const PROBE_TYPES = [
  { value: "UNLOCK_SEQ", label: "解锁序列", desc: "测试用户解锁策略偏好" },
  { value: "BOMB_PRESSURE", label: "炸弹压力", desc: "测试用户压力承受能力" },
  { value: "COLOR_CHAIN", label: "颜色链", desc: "测试用户颜色匹配能力" },
  { value: "ICE_RESOURCE", label: "冰块资源", desc: "测试用户资源管理能力" },
];

export default function Probes() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();
  const { data: probes, isLoading } = trpc.levels.listProbes.useQuery({ gameId: currentGameId ?? undefined });

  const createProbe = trpc.levels.createProbe.useMutation({
    onSuccess: () => {
      utils.levels.listProbes.invalidate();
      setShowCreate(false);
      toast.success("探针创建成功");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProbe = trpc.levels.updateProbe.useMutation({
    onSuccess: () => {
      utils.levels.listProbes.invalidate();
      toast.success("探针更新成功");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">探针关卡管理</h1>
          <p className="text-muted-foreground text-sm mt-1">配置探针类型、触发条件和信号提取规则</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新建探针</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>创建探针关卡</DialogTitle>
            </DialogHeader>
            <ProbeForm onSubmit={(data) => createProbe.mutate(data)} loading={createProbe.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROBE_TYPES.map((pt) => {
          const count = probes?.filter((p: any) => p.probeType === pt.value).length || 0;
          const active = probes?.filter((p: any) => p.probeType === pt.value && p.isActive).length || 0;
          return (
            <Card key={pt.value}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{pt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{pt.desc}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span>总计: <strong>{count}</strong></span>
                  <span className="text-emerald-600">活跃: <strong>{active}</strong></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">探针配置列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>探针编码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>关联关卡</TableHead>
                <TableHead>插入比例</TableHead>
                <TableHead>对照组</TableHead>
                <TableHead>冷却关卡</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : probes?.length ? (
                probes.map((probe: any) => {
                  const typeInfo = PROBE_TYPES.find(t => t.value === probe.probeType);
                  return (
                    <TableRow key={probe.id}>
                      <TableCell className="font-mono text-xs">{probe.probeCode}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{typeInfo?.label || probe.probeType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">#{probe.levelId}</TableCell>
                      <TableCell className="text-sm">{(Number(probe.insertRatio) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm">{(Number(probe.controlGroupRatio) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm">{probe.cooldownLevels}</TableCell>
                      <TableCell>
                        <Switch
                          checked={!!probe.isActive}
                          onCheckedChange={(checked) => updateProbe.mutate({ id: probe.id, isActive: checked ? 1 : 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无探针配置，点击"新建探针"开始
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

function ProbeForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    probeCode: "",
    probeType: "UNLOCK_SEQ",
    levelId: 1,
    insertRatio: "0.13",
    controlGroupRatio: "0.10",
    cooldownLevels: 3,
    activeDays: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
    isActive: 1,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>探针编码</Label>
          <Input value={form.probeCode} onChange={(e) => setForm({ ...form, probeCode: e.target.value })} placeholder="PROBE_001" />
        </div>
        <div>
          <Label>探针类型</Label>
          <Select value={form.probeType} onValueChange={(v) => setForm({ ...form, probeType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROBE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>关联关卡ID</Label>
          <Input type="number" value={form.levelId} onChange={(e) => setForm({ ...form, levelId: Number(e.target.value) })} />
        </div>
        <div>
          <Label>插入比例</Label>
          <Input value={form.insertRatio} onChange={(e) => setForm({ ...form, insertRatio: e.target.value })} placeholder="0.13" />
        </div>
        <div>
          <Label>对照组比例</Label>
          <Input value={form.controlGroupRatio} onChange={(e) => setForm({ ...form, controlGroupRatio: e.target.value })} placeholder="0.10" />
        </div>
      </div>
      <div>
        <Label>冷却关卡数</Label>
        <Input type="number" value={form.cooldownLevels} onChange={(e) => setForm({ ...form, cooldownLevels: Number(e.target.value) })} />
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.probeCode} className="w-full">
        {loading ? "创建中..." : "创建探针"}
      </Button>
    </div>
  );
}
