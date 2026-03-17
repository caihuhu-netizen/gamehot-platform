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
import { Plus, Layers, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";
const PROBE_TYPES = ["UNLOCK_SEQ", "BOMB_PRESSURE", "COLOR_CHAIN", "ICE_RESOURCE"];

export default function Levels() {
  const { currentGameId } = useGame();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.levels.list.useQuery({ page, pageSize: 20, search: search || undefined,
  gameId: currentGameId ?? undefined,
});
  const createLevel = trpc.levels.create.useMutation({
    onSuccess: () => { utils.levels.list.invalidate(); setShowCreate(false); toast.success("关卡创建成功"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteLevel = trpc.levels.delete.useMutation({
    onSuccess: () => { utils.levels.list.invalidate(); toast.success("关卡已删除"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <CrossModuleLinks links={MODULE_LINKS.levels} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">关卡管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理关卡配置、难度分、布局和障碍物</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新建关卡</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>创建关卡</DialogTitle></DialogHeader>
            <LevelForm onSubmit={(data) => createLevel.mutate(data)} loading={createLevel.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">关卡列表</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索关卡编码或名称..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>关卡编码</TableHead>
                <TableHead>关卡名称</TableHead>
                <TableHead>难度分</TableHead>
                <TableHead>颜色数</TableHead>
                <TableHead>网格</TableHead>
                <TableHead>目标通过率</TableHead>
                <TableHead>变现点</TableHead>
                <TableHead>探针类型</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  ))}</TableRow>
                ))
              ) : data?.data?.length ? (
                data?.data?.map((level: any) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-mono text-xs">{level.levelCode}</TableCell>
                    <TableCell className="text-sm">{level.levelName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${Number(level.difficultyScore) >= 80 ? "bg-red-100 text-red-800" : Number(level.difficultyScore) >= 50 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {level.difficultyScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{level.colorCount}</TableCell>
                    <TableCell className="text-sm">{level.gridSize}</TableCell>
                    <TableCell className="text-sm">{level.targetPassRate ? `${(Number(level.targetPassRate) * 100).toFixed(0)}%` : "-"}</TableCell>
                    <TableCell>{level.isMonetizePoint ? <Badge className="bg-violet-100 text-violet-800 text-xs">是</Badge> : <span className="text-muted-foreground text-xs">否</span>}</TableCell>
                    <TableCell className="text-xs">{level.probeType || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("确认删除？")) deleteLevel.mutate({ id: level.id }); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无关卡数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {data && data.total > 20 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>共 {data.total} 条</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
                <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>下一页</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LevelForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    levelCode: "", levelName: "", difficultyScore: "50", colorCount: 4, gridSize: "6x6",
    targetPassRate: "0.70", isMonetizePoint: 0, probeType: "",
    layoutConfig: JSON.stringify({ grid: "6x6", blocks: [] }, null, 2),
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>关卡编码</Label><Input value={form.levelCode} onChange={(e) => setForm({ ...form, levelCode: e.target.value })} placeholder="LVL_001" /></div>
        <div><Label>关卡名称</Label><Input value={form.levelName} onChange={(e) => setForm({ ...form, levelName: e.target.value })} placeholder="入门关卡1" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>难度分</Label><Input value={form.difficultyScore} onChange={(e) => setForm({ ...form, difficultyScore: e.target.value })} /></div>
        <div><Label>颜色数</Label><Input type="number" value={form.colorCount} onChange={(e) => setForm({ ...form, colorCount: Number(e.target.value) })} /></div>
        <div><Label>网格大小</Label><Input value={form.gridSize} onChange={(e) => setForm({ ...form, gridSize: e.target.value })} placeholder="6x6" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>目标通过率</Label><Input value={form.targetPassRate} onChange={(e) => setForm({ ...form, targetPassRate: e.target.value })} /></div>
        <div><Label>探针类型</Label>
          <Select value={form.probeType || "none"} onValueChange={(v) => setForm({ ...form, probeType: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无</SelectItem>
              {PROBE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>布局配置 (JSON)</Label><Textarea rows={4} value={form.layoutConfig} onChange={(e) => setForm({ ...form, layoutConfig: e.target.value })} className="font-mono text-xs" /></div>
      <Button onClick={() => {
        try { onSubmit({ ...form, layoutConfig: JSON.parse(form.layoutConfig) }); } catch { toast.error("布局配置JSON格式错误"); }
      }} disabled={loading || !form.levelCode || !form.levelName} className="w-full">{loading ? "创建中..." : "创建关卡"}</Button>
    </div>
  );
}
