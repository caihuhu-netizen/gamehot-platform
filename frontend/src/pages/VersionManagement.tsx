import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Rocket, Plus, Search, Calendar, Tag, ArrowUpDown,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus,
  BarChart3, FileCheck2, Loader2, RefreshCw
} from "lucide-react";

const changeTypeLabels: Record<string, string> = {
  feature: "新功能", bugfix: "Bug修复", balance: "数值调整",
  content: "内容更新", monetize: "变现优化", performance: "性能优化", other: "其他",
};
const changeTypeColors: Record<string, string> = {
  feature: "bg-blue-500/10 text-blue-500", bugfix: "bg-red-500/10 text-red-500",
  balance: "bg-amber-500/10 text-amber-500", content: "bg-green-500/10 text-green-500",
  monetize: "bg-purple-500/10 text-purple-500", performance: "bg-cyan-500/10 text-cyan-500",
  other: "bg-muted text-muted-foreground",
};
const verificationLabels: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "待验证", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "验证中", icon: RefreshCw, color: "text-blue-500" },
  verified_positive: { label: "正向验证", icon: TrendingUp, color: "text-green-500" },
  verified_negative: { label: "负向验证", icon: TrendingDown, color: "text-red-500" },
  verified_neutral: { label: "中性验证", icon: Minus, color: "text-amber-500" },
  improved: { label: "已改善", icon: TrendingUp, color: "text-green-500" },
  neutral: { label: "中性", icon: Minus, color: "text-amber-500" },
  degraded: { label: "已恶化", icon: TrendingDown, color: "text-red-500" },
};

export default function VersionManagement() {
  const { currentGame } = useGame();
  const gameId = currentGame?.id ?? 0;
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const versions = trpc.productOptimization.versions.list.useQuery(
    { gameId, limit: 50 },
    { enabled: !!gameId }
  );

  const filteredVersions = useMemo(() => {
    const list = versions.data ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (v: any) => v.versionCode?.toLowerCase().includes(q) || v.releaseNotes?.toLowerCase().includes(q)
    );
  }, [versions.data, search]);

  const selectedData = useMemo(
    () => filteredVersions.find((v: any) => v.id === selectedVersion),
    [filteredVersions, selectedVersion]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> 版本管理
          </h1>
          <p className="text-muted-foreground mt-1">追踪每个版本的变更内容和效果指标，驱动产品持续优化</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新建版本</Button>
          </DialogTrigger>
          <CreateVersionDialog gameId={gameId} onSuccess={() => { setShowCreate(false); versions.refetch(); }} />
        </Dialog>
      </div>

      {!gameId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">请先在顶部选择一个游戏项目</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Version List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索版本号或备注..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {versions.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
              ) : filteredVersions.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">暂无版本记录</CardContent></Card>
              ) : (
                filteredVersions.map((v: any) => {
                  const vStatus = verificationLabels[v.verificationStatus || "pending"] || verificationLabels.pending;
                  const StatusIcon = vStatus.icon;
                  return (
                    <Card
                      key={v.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${selectedVersion === v.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                      onClick={() => setSelectedVersion(v.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-semibold text-lg">{v.versionCode}</span>
                          <StatusIcon className={`h-4 w-4 ${vStatus.color}`} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {v.changeType && (
                            <Badge variant="secondary" className={changeTypeColors[v.changeType] || ""}>
                              {changeTypeLabels[v.changeType] || v.changeType}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {v.releaseDate ? new Date(v.releaseDate).toLocaleDateString("zh-CN") : "未发布"}
                          </span>
                        </div>
                        {v.releaseNotes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{v.releaseNotes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Version Detail */}
          <div className="lg:col-span-2">
            {selectedData ? (
              <VersionDetail version={selectedData} onRefresh={() => versions.refetch()} />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground py-20">
                  <Rocket className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>选择左侧版本查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateVersionDialog({ gameId, onSuccess }: { gameId: number; onSuccess: () => void }) {
  const [form, setForm] = useState({
    versionCode: "", releaseNotes: "", changeType: "feature", releaseDate: new Date().toISOString().slice(0, 10),
  });
  const create = trpc.productOptimization.versions.create.useMutation({
    onSuccess: () => { toast.success("版本创建成功"); onSuccess(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>新建版本</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>版本号 *</Label><Input placeholder="1.2.0" value={form.versionCode} onChange={e => setForm(f => ({ ...f, versionCode: e.target.value }))} /></div>
          <div><Label>发布日期</Label><Input type="date" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} /></div>
        </div>
        <div>
          <Label>变更类型</Label>
          <Select value={form.changeType} onValueChange={v => setForm(f => ({ ...f, changeType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(changeTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>版本说明</Label><Textarea placeholder="描述本次版本的主要变更..." value={form.releaseNotes} onChange={e => setForm(f => ({ ...f, releaseNotes: e.target.value }))} rows={4} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate({ gameId, versionCode: form.versionCode, changeLog: form.releaseNotes || undefined, changeType: form.changeType as any, releaseDate: form.releaseDate || new Date().toISOString().slice(0, 10) })} disabled={!form.versionCode || create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}创建
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function VersionDetail({ version, onRefresh }: { version: any; onRefresh: () => void }) {
  const metrics = trpc.productOptimization.versions.metrics.useQuery(
    { gameId: version.gameId, versionCode: version.versionCode },
    { enabled: !!version.id }
  );
  // metrics returns an array of snapshots, use the latest one
  const latestMetric = metrics.data?.[0];
  const vStatus = verificationLabels[version.verificationStatus || "pending"] || verificationLabels.pending;
  const StatusIcon = vStatus.icon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Tag className="h-5 w-5" /> v{version.versionCode}
              </CardTitle>
              <CardDescription className="mt-1">
                {version.releaseDate ? `发布于 ${new Date(version.releaseDate).toLocaleDateString("zh-CN")}` : "未发布"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {version.changeType && (
                <Badge variant="secondary" className={changeTypeColors[version.changeType] || ""}>
                  {changeTypeLabels[version.changeType] || version.changeType}
                </Badge>
              )}
              <Badge variant="outline" className={`flex items-center gap-1 ${vStatus.color}`}>
                <StatusIcon className="h-3 w-3" /> {vStatus.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {version.releaseNotes && (
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{version.releaseNotes}</p>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics"><BarChart3 className="h-4 w-4 mr-1" />核心指标</TabsTrigger>
          <TabsTrigger value="comparison"><ArrowUpDown className="h-4 w-4 mr-1" />版本对比</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics">
          {metrics.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : latestMetric ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="DAU" value={latestMetric.dau} />
              <MetricCard label="D1 留存" value={latestMetric.retentionD1 ? `${(Number(latestMetric.retentionD1) * 100).toFixed(1)}%` : "-"} />
              <MetricCard label="D7 留存" value={latestMetric.retentionD7 ? `${(Number(latestMetric.retentionD7) * 100).toFixed(1)}%` : "-"} />
              <MetricCard label="D30 留存" value={latestMetric.retentionD30 ? `${(Number(latestMetric.retentionD30) * 100).toFixed(1)}%` : "-"} />
              <MetricCard label="平均时长" value={latestMetric.avgSessionMinutes ? `${Number(latestMetric.avgSessionMinutes).toFixed(0)}分钟` : "-"} />
              <MetricCard label="总收入" value={latestMetric.totalRevenue ? `¥${Number(latestMetric.totalRevenue).toLocaleString()}` : "-"} />
              <MetricCard label="ARPU" value={latestMetric.arpu ? `¥${Number(latestMetric.arpu).toFixed(2)}` : "-"} />
              <MetricCard label="ARPPU" value={latestMetric.arppu ? `¥${Number(latestMetric.arppu).toFixed(2)}` : "-"} />
              <MetricCard label="付费率" value={latestMetric.payingRate ? `${(Number(latestMetric.payingRate) * 100).toFixed(2)}%` : "-"} />
              <MetricCard label="崩溃率" value={latestMetric.crashRate ? `${(Number(latestMetric.crashRate) * 100).toFixed(3)}%` : "-"} />
              <MetricCard label="广告收入" value={latestMetric.adRevenue ? `¥${Number(latestMetric.adRevenue).toLocaleString()}` : "-"} />
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">暂无指标数据，等待数据同步后自动填充</CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="comparison">
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <ArrowUpDown className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>版本对比功能即将上线</p>
            <p className="text-xs mt-1">将自动对比相邻版本的核心指标变化</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-lg font-semibold">{value ?? "-"}</p>
      </CardContent>
    </Card>
  );
}
