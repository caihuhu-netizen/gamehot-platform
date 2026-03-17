import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo, useRef, useCallback } from "react";
import { Users, Layers, Brain, Calculator, Pencil, Gift, Volume2,
  Download, Upload, FlaskConical, FileSpreadsheet, ArrowRight,
  CheckCircle2, AlertCircle, MinusCircle, Plus, Minus, Zap,
  ChevronDown, ChevronUp, Eye } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/contexts/GameContext";
import CrossModuleLinks, { MODULE_LINKS } from "@/components/CrossModuleLinks";

// ==================== Shared Helpers ====================
const getLayerColor = (layerId: number) => {
  const colors = [
    "bg-gray-100 text-gray-700", "bg-red-100 text-red-700",
    "bg-orange-100 text-orange-700", "bg-amber-100 text-amber-700",
    "bg-yellow-100 text-yellow-700", "bg-lime-100 text-lime-700",
    "bg-emerald-100 text-emerald-700", "bg-cyan-100 text-cyan-700",
    "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  ];
  return colors[layerId] || colors[0];
};

const formatFrequency = (freq: any) => {
  const arr = typeof freq === 'string' ? JSON.parse(freq) : freq;
  if (!Array.isArray(arr)) return '-';
  return arr.map((f: Record<string,unknown>) => {
    const to = f.to >= 99999999 ? '∞' : f.to;
    return `${f.from}-${to}关: 每${f.interval}关`;
  }).join(' | ');
};

const formatPushGifts = (gifts: any): string[] => {
  const arr = typeof gifts === 'string' ? JSON.parse(gifts) : gifts;
  if (!Array.isArray(arr)) return [];
  return arr.map((g: string) => g.split('.')[1] || g);
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)}天`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}小时`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(0)}分钟`;
  return `${seconds}秒`;
};

// ==================== Import/Export Toolbar ====================
function ImportExportToolbar() {
  const { currentGameId } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  const exportMutation = trpc.segmentTools.exportExcel.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success("导出成功，文件已开始下载");
    },
    onError: (e) => toast.error("导出失败: " + e.message),
  });

  const previewMutation = trpc.segmentTools.importPreview.useMutation({
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreview(true);
    },
    onError: (e) => toast.error("解析失败: " + e.message),
  });

  const applyMutation = trpc.segmentTools.importApply.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`导入成功！逻辑表: ${data.stats!.logic.created}新增/${data.stats!.logic.updated}更新, 行为表: ${data.stats!.behavior.created}新增/${data.stats!.behavior.updated}更新, 计算表: ${data.stats!.calc.created}新增/${data.stats!.calc.updated}更新`);
        setShowPreview(false);
        setPreviewData(null);
        // Invalidate all segment config queries
        window.location.reload();
      } else {
        toast.error("导入失败: " + data.errors?.join(", "));
      }
    },
    onError: (e) => toast.error("导入失败: " + e.message),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("请选择 .xlsx 或 .xls 格式的Excel文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
      previewMutation.mutate({ fileBase64: base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleApply = () => {
    if (!fileBase64) return;
    setIsImporting(true);
    applyMutation.mutate({ fileBase64 }, {
      onSettled: () => setIsImporting(false),
    });
  };

  const getDiffIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="h-3.5 w-3.5 text-emerald-600" />;
      case 'modify': return <Pencil className="h-3.5 w-3.5 text-amber-600" />;
      case 'unchanged': return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return null;
    }
  };

  const getDiffBadge = (type: string) => {
    switch (type) {
      case 'add': return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">新增</Badge>;
      case 'modify': return <Badge className="bg-amber-100 text-amber-700 text-[10px]">修改</Badge>;
      case 'unchanged': return <Badge variant="outline" className="text-[10px]">无变化</Badge>;
      default: return null;
    }
  };

  const totalChanges = previewData ? [
    ...previewData.diff.logic,
    ...previewData.diff.behavior,
    ...previewData.diff.calc,
  ].filter((d: { type: string }) => d.type !== 'unchanged').length : 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? "导出中..." : "导出Excel"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={previewMutation.isPending}
        >
          <Upload className="h-4 w-4" />
          {previewMutation.isPending ? "解析中..." : "导入Excel"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Import Preview Dialog with Diff */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              配置导入预览 - 变更对比
            </DialogTitle>
            <DialogDescription>
              以下是Excel文件与当前配置的差异对比，确认无误后点击"确认导入"
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-muted-foreground">逻辑表</p>
                    <p className="text-lg font-bold">{previewData.parsed.logicCount} 条</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-emerald-600">{previewData.diff.logic.filter((d: { type: string }) => d.type === 'add').length} 新增</span>
                      <span className="text-xs text-amber-600">{previewData.diff.logic.filter((d: { type: string }) => d.type === 'modify').length} 修改</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-muted-foreground">行为表</p>
                    <p className="text-lg font-bold">{previewData.parsed.behaviorCount} 条</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-emerald-600">{previewData.diff.behavior.filter((d: { type: string }) => d.type === 'add').length} 新增</span>
                      <span className="text-xs text-amber-600">{previewData.diff.behavior.filter((d: { type: string }) => d.type === 'modify').length} 修改</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-muted-foreground">计算表</p>
                    <p className="text-lg font-bold">{previewData.parsed.calcCount} 条</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-emerald-600">{previewData.diff.calc.filter((d: { type: string }) => d.type === 'add').length} 新增</span>
                      <span className="text-xs text-amber-600">{previewData.diff.calc.filter((d: { type: string }) => d.type === 'modify').length} 修改</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {previewData.errors.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">解析错误</span>
                    </div>
                    {previewData.errors.map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-600 ml-6">{err}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Diff Details - Logic */}
              {previewData.diff.logic.some((d: { type: string }) => d.type !== 'unchanged') && (
                <DiffSection title="逻辑表变更" items={previewData.diff.logic} renderItem={(d: any) => (
                  <div className="flex items-center gap-2">
                    {getDiffBadge(d.type)}
                    <span className="text-sm font-medium">Layer {d.layerId}</span>
                    {d.changes?.length > 0 && (
                      <span className="text-xs text-muted-foreground">({d.changes.length} 个字段变更)</span>
                    )}
                  </div>
                )} renderChanges={(d: any) => d.changes?.map((c: { field: string; oldVal: unknown; newVal: unknown }, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-t border-dashed">
                    <span className="text-muted-foreground w-32 shrink-0">{fieldLabel(c.field)}</span>
                    <span className="text-red-600 line-through max-w-[200px] truncate">{formatDiffVal(c.oldVal)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-emerald-600 font-medium max-w-[200px] truncate">{formatDiffVal(c.newVal)}</span>
                  </div>
                ))} />
              )}

              {/* Diff Details - Behavior */}
              {previewData.diff.behavior.some((d: { type: string }) => d.type !== 'unchanged') && (
                <DiffSection title="行为表变更" items={previewData.diff.behavior} renderItem={(d: any) => (
                  <div className="flex items-center gap-2">
                    {getDiffBadge(d.type)}
                    <span className="text-sm font-medium">{d.strategyId}</span>
                    {d.changes?.length > 0 && (
                      <span className="text-xs text-muted-foreground">({d.changes.length} 个字段变更)</span>
                    )}
                  </div>
                )} renderChanges={(d: any) => d.changes?.map((c: { field: string; oldVal: unknown; newVal: unknown }, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-t border-dashed">
                    <span className="text-muted-foreground w-32 shrink-0">{fieldLabel(c.field)}</span>
                    <span className="text-red-600 line-through">{String(c.oldVal ?? "空")}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-emerald-600 font-medium">{String(c.newVal ?? "空")}</span>
                  </div>
                ))} />
              )}

              {/* Diff Details - Calc */}
              {previewData.diff.calc.some((d: { type: string }) => d.type !== 'unchanged') && (
                <DiffSection title="计算表变更" items={previewData.diff.calc} renderItem={(d: any) => (
                  <div className="flex items-center gap-2">
                    {getDiffBadge(d.type)}
                    <span className="text-sm font-medium">{d.ruleType === 1 ? "升层" : "降层"} → Layer {d.targetLayer}</span>
                    {d.changes?.length > 0 && (
                      <span className="text-xs text-muted-foreground">({d.changes.length} 个字段变更)</span>
                    )}
                  </div>
                )} renderChanges={(d: any) => d.changes?.map((c: { field: string; oldVal: unknown; newVal: unknown }, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-t border-dashed">
                    <span className="text-muted-foreground w-32 shrink-0">{fieldLabel(c.field)}</span>
                    <span className="text-red-600 line-through">{String(c.oldVal ?? "空")}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-emerald-600 font-medium">{String(c.newVal ?? "空")}</span>
                  </div>
                ))} />
              )}

              {totalChanges === 0 && previewData.errors.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">导入数据与当前配置完全一致，无需更新</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>取消</Button>
            <Button
              onClick={handleApply}
              disabled={isImporting || applyMutation.isPending || previewData?.errors?.length > 0}
              className="gap-1.5"
            >
              {isImporting ? "导入中..." : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  确认导入 ({totalChanges} 项变更)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== Diff Section Component ====================
function DiffSection({ title, items, renderItem, renderChanges }: {
  title: string;
  items: Array<{ type: string; changes?: Array<{ field: string; oldVal: unknown; newVal: unknown }>; [key: string]: unknown }>;
  renderItem: (d: { type: string; changes?: Array<{ field: string; oldVal: unknown; newVal: unknown }>; [key: string]: unknown }) => React.ReactNode;
  renderChanges: (d: { type: string; changes?: Array<{ field: string; oldVal: unknown; newVal: unknown }>; [key: string]: unknown }) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const changedItems = (items ?? []).filter(d => d.type !== 'unchanged');

  if (changedItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{title} ({changedItems.length} 项变更)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1">
        {changedItems.map((d, idx: number) => (
          <div key={idx} className="border rounded-md">
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
              onClick={() => {
                const next = new Set(expanded);
                next.has(idx) ? next.delete(idx) : next.add(idx);
                setExpanded(next);
              }}
            >
              {renderItem(d)}
              {(d.changes?.length ?? 0) > 0 && (
                expanded.has(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              )}
            </div>
            {expanded.has(idx) && (d.changes?.length ?? 0) > 0 && (
              <div className="px-3 pb-2 bg-muted/30">
                {renderChanges(d)}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    layerName: "层级名称",
    interstitialAdFirstLevel: "首播关卡",
    interstitialAdFrequency: "广告频率",
    pushGifts: "推送礼包",
    giftType: "礼包类型",
    firstPushConditionType: "首推条件类型",
    firstPushConditionParam: "首推条件参数",
    pushConditionType: "再推条件类型",
    pushConditionParam: "再推条件参数",
    pushGiftId: "礼包ID",
    pushGiftPlace: "推送时机",
    cooldownRule: "冷却规则",
    cooldownRuleParam1: "冷却参数1",
    cooldownRuleParam2: "冷却参数2",
    purchaseAmount: "付费金额",
    streakLoginTimes: "连续登录",
    totalLoginTimes: "总登录",
    onlineDuration: "在线时长",
    avgDailyOnlineTime: "日均在线",
    completeLevelNum: "闯关总数",
    avgDailyCompleteLevelNum: "日均闯关",
    refreshTime: "刷新时间",
  };
  return labels[field] || field;
}

function formatDiffVal(val: any): string {
  if (val === null || val === undefined) return "空";
  if (typeof val === "string" && val.length > 60) return val.substring(0, 60) + "...";
  return String(val);
}

// ==================== Segment Simulator ====================
function SegmentSimulator() {
  const [params, setParams] = useState({
    purchaseAmount: 0,
    streakLoginTimes: 0,
    totalLoginTimes: 0,
    onlineDuration: 0,
    avgDailyOnlineTime: 0,
    completeLevelNum: 0,
    avgDailyCompleteLevelNum: 0,
  });
  const [result, setResult] = useState<any>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const simulateMutation = trpc.segmentTools.simulate.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (e) => toast.error("模拟失败: " + e.message),
  });

  const handleSimulate = () => {
    simulateMutation.mutate(params);
  };

  const presets = [
    { label: "新手玩家", desc: "刚注册，低活跃", values: { purchaseAmount: 0, streakLoginTimes: 1, totalLoginTimes: 2, onlineDuration: 300, avgDailyOnlineTime: 150, completeLevelNum: 5, avgDailyCompleteLevelNum: 3 } },
    { label: "活跃免费用户", desc: "高活跃，不付费", values: { purchaseAmount: 0, streakLoginTimes: 7, totalLoginTimes: 30, onlineDuration: 36000, avgDailyOnlineTime: 1200, completeLevelNum: 150, avgDailyCompleteLevelNum: 5 } },
    { label: "轻度付费用户", desc: "少量付费", values: { purchaseAmount: 4.99, streakLoginTimes: 5, totalLoginTimes: 20, onlineDuration: 18000, avgDailyOnlineTime: 900, completeLevelNum: 80, avgDailyCompleteLevelNum: 4 } },
    { label: "中度付费用户", desc: "中等付费", values: { purchaseAmount: 29.99, streakLoginTimes: 10, totalLoginTimes: 50, onlineDuration: 72000, avgDailyOnlineTime: 1440, completeLevelNum: 300, avgDailyCompleteLevelNum: 6 } },
    { label: "重度付费鲸鱼", desc: "高付费高活跃", values: { purchaseAmount: 199.99, streakLoginTimes: 30, totalLoginTimes: 120, onlineDuration: 216000, avgDailyOnlineTime: 1800, completeLevelNum: 800, avgDailyCompleteLevelNum: 8 } },
    { label: "流失风险用户", desc: "曾活跃，近期不活跃", values: { purchaseAmount: 9.99, streakLoginTimes: 0, totalLoginTimes: 15, onlineDuration: 7200, avgDailyOnlineTime: 120, completeLevelNum: 40, avgDailyCompleteLevelNum: 1 } },
  ];

  const sliderFields = [
    { key: "purchaseAmount", label: "累计付费金额 ($)", max: 500, step: 0.01, format: (v: number) => `$${v.toFixed(2)}` },
    { key: "streakLoginTimes", label: "连续登录天数", max: 90, step: 1, format: (v: number) => `${v}天` },
    { key: "totalLoginTimes", label: "总登录次数", max: 365, step: 1, format: (v: number) => `${v}次` },
    { key: "onlineDuration", label: "在线总时长", max: 360000, step: 60, format: formatDuration },
    { key: "avgDailyOnlineTime", label: "日均在线时长", max: 7200, step: 60, format: formatDuration },
    { key: "completeLevelNum", label: "闯关总次数", max: 2000, step: 1, format: (v: number) => `${v}关` },
    { key: "avgDailyCompleteLevelNum", label: "日均闯关次数", max: 30, step: 1, format: (v: number) => `${v}关/天` },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setShowSimulator(true)}
      >
        <FlaskConical className="h-4 w-4" />
        分层模拟器
      </Button>

      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              分层效果模拟器
            </DialogTitle>
            <DialogDescription>
              输入用户行为数据，实时预览该用户会被分配到哪一层，验证配置正确性
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">快速预设</h4>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      className="text-left px-3 py-2 rounded-md border hover:bg-accent hover:border-primary/30 transition-colors"
                      onClick={() => { setParams(p.values); setResult(null); }}
                    >
                      <span className="text-xs font-medium">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground block">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">行为参数调节</h4>
                {sliderFields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{f.label}</Label>
                      <span className="text-xs font-mono font-medium text-primary">
                        {f.format((params as Record<string, number>)[f.key])}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[(params as Record<string, number>)[f.key]]}
                        onValueChange={([v]) => { setParams(prev => ({ ...prev, [f.key]: v })); setResult(null); }}
                        max={f.max}
                        step={f.step}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={(params as Record<string, number>)[f.key]}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setParams(prev => ({ ...prev, [f.key]: Math.min(v, f.max) }));
                          setResult(null);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleSimulate} className="w-full gap-2" disabled={simulateMutation.isPending}>
                <Zap className="h-4 w-4" />
                {simulateMutation.isPending ? "计算中..." : "开始模拟"}
              </Button>
            </div>

            {/* Right: Result */}
            <div className="space-y-4">
              {result ? (
                <>
                  {/* Result Layer */}
                  <Card className="border-2 border-primary/20">
                    <CardContent className="py-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">模拟分层结果</p>
                        <div className="flex items-center justify-center gap-3">
                          <Badge className={`${getLayerColor(result.resultLayer)} text-lg px-4 py-1`}>
                            Layer {result.resultLayer}
                          </Badge>
                          <Badge variant={result.matchType === 'upgrade' ? 'default' : result.matchType === 'downgrade' ? 'destructive' : 'secondary'}>
                            {result.matchType === 'upgrade' ? '升层匹配' : result.matchType === 'downgrade' ? '降层匹配' : '默认层'}
                          </Badge>
                        </div>
                        {result.layerInfo && (
                          <p className="text-sm text-muted-foreground mt-2">{result.layerInfo.layerName}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Match Details */}
                  {result.details.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">匹配详情</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">指标</TableHead>
                              <TableHead className="text-xs">用户值</TableHead>
                              <TableHead className="text-xs">阈值</TableHead>
                              <TableHead className="text-xs w-16">结果</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.details.map((d: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{d.field}</TableCell>
                                <TableCell className="text-xs font-mono">{d.value}</TableCell>
                                <TableCell className="text-xs font-mono">{result.matchType === 'upgrade' ? '≥' : '<'} {d.threshold}</TableCell>
                                <TableCell>
                                  {d.pass ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Layer Strategy Preview */}
                  {result.layerInfo && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">该层运营策略预览</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium">插屏广告</p>
                            <p className="text-xs text-muted-foreground">
                              首次播放: 第 {result.layerInfo.interstitialAdFirstLevel} 关 | {formatFrequency(result.layerInfo.interstitialAdFrequency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Gift className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium">推送礼包</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {formatPushGifts(result.layerInfo.pushGifts).map((g: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{g}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        {result.behaviorStrategies.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">行为推送策略 ({result.behaviorStrategies.length} 种)</p>
                            <div className="grid grid-cols-2 gap-1">
                              {result.behaviorStrategies.map((b: any, i: number) => (
                                <div key={i} className="text-[10px] px-2 py-1 bg-muted rounded">
                                  <span className="font-medium">{b.giftType}</span>
                                  {b.pushGiftPlace && <span className="text-muted-foreground ml-1">@ {b.pushGiftPlace}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="h-full min-h-[300px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">调整左侧参数后点击"开始模拟"</p>
                    <p className="text-xs text-muted-foreground mt-1">或选择一个快速预设开始</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== Layer Logic Tab ====================
function LayerLogicTab() {
  const { currentGameId } = useGame();
  const { data: layers, isLoading, refetch } = trpc.segmentConfig.listLayerLogic.useQuery({ gameId: currentGameId ?? undefined });
  const { data: distribution } = trpc.segmentConfig.getSegmentDistribution.useQuery({ gameId: currentGameId ?? undefined });
  const [editingLayer, setEditingLayer] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [newLayer, setNewLayer] = useState({ layerId: 11, layerName: '', comment: '', interstitialAdFirstLevel: 10, interstitialAdFrequency: [{ from: 1, to: 99999999, interval: 3 }], pushGifts: ['gift.coin_100'] });

  const updateMutation = trpc.segmentConfig.updateLayerLogic.useMutation({
    onSuccess: () => { toast.success("分层配置已更新"); refetch(); setShowEdit(false); },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const createMutation = trpc.segmentConfig.createLayerLogic.useMutation({
    onSuccess: () => { toast.success("新分层已创建"); refetch(); setShowAdd(false); setNewLayer({ layerId: (layers?.length || 10) + 1, layerName: '', comment: '', interstitialAdFirstLevel: 10, interstitialAdFrequency: [{ from: 1, to: 99999999, interval: 3 }], pushGifts: ['gift.coin_100'] }); },
    onError: (e) => toast.error("创建失败: " + e.message),
  });

  const deleteMutation = trpc.segmentConfig.deleteLayerLogic.useMutation({
    onSuccess: () => { toast.success("分层已删除"); refetch(); setShowDelete(null); },
    onError: (e) => toast.error("删除失败: " + e.message),
  });

  const toggleMutation = trpc.segmentConfig.toggleLayerActive.useMutation({
    onSuccess: () => { toast.success("状态已更新"); refetch(); },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const totalUsers = distribution?.reduce((s: number, d: any) => s + Number(d.userCount), 0) || 0;

  const handleEdit = (layer: any) => {
    setEditingLayer({
      ...layer,
      interstitialAdFrequency: typeof layer.interstitialAdFrequency === 'string'
        ? JSON.parse(layer.interstitialAdFrequency) : layer.interstitialAdFrequency,
      pushGifts: typeof layer.pushGifts === 'string'
        ? JSON.parse(layer.pushGifts) : layer.pushGifts,
    });
    setShowEdit(true);
  };

  const handleSave = () => {
    if (!editingLayer) return;
    updateMutation.mutate({
      id: editingLayer.id,
      layerName: editingLayer.layerName,
      comment: editingLayer.comment,
      interstitialAdFirstLevel: editingLayer.interstitialAdFirstLevel,
      interstitialAdFrequency: editingLayer.interstitialAdFrequency,
      pushGifts: editingLayer.pushGifts,
    });
  };

  return (
    <div className="space-y-4">
      <CrossModuleLinks links={MODULE_LINKS.segments} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">分层逻辑配置</h3>
          <p className="text-sm text-muted-foreground">管理用户分层的广告频率和推送礼包策略</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> 新增分层
        </Button>
      </div>

      {/* Distribution Preview */}
      {distribution && distribution.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h4 className="text-sm font-semibold mb-3">用户分布预览 <span className="text-muted-foreground font-normal">（共 {totalUsers.toLocaleString()} 用户）</span></h4>
            <div className="flex gap-1 h-8 rounded-md overflow-hidden">
              {distribution.map((d: Record<string,unknown>) => {
                const pct = totalUsers > 0 ? (Number(d.userCount) / totalUsers * 100) : 0;
                return pct > 0 ? (
                  <div key={d.segmentLevel} className={`${getLayerColor(d.segmentLevel)} flex items-center justify-center text-[10px] font-bold transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} title={`Layer ${d.segmentLevel}: ${Number(d.userCount).toLocaleString()} (${pct.toFixed(1)}%)`}>
                    {pct > 5 ? `L${d.segmentLevel}` : ''}
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {distribution.map((d: Record<string,unknown>) => (
                <span key={d.segmentLevel} className="text-[10px] text-muted-foreground">
                  L{d.segmentLevel}: {Number(d.userCount).toLocaleString()} ({totalUsers > 0 ? (Number(d.userCount) / totalUsers * 100).toFixed(1) : 0}%)
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))
        ) : layers?.length ? (
          layers.map((layer: Record<string,unknown>) => (
            <Card key={layer.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getLayerColor(layer.layerId)} text-xs font-bold`}>
                        Layer {layer.layerId}
                      </Badge>
                      <span className="font-medium text-sm">{layer.layerName}</span>
                      {layer.comment && (
                        <span className="text-xs text-muted-foreground">({layer.comment})</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-start gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">插屏广告策略</p>
                          <p className="text-xs mt-0.5">首次播放: <span className="font-semibold">第 {layer.interstitialAdFirstLevel} 关</span></p>
                          <p className="text-xs mt-0.5 text-muted-foreground">{formatFrequency(layer.interstitialAdFrequency)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">推送礼包</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formatPushGifts(layer.pushGifts).map((g: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{g}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button variant={layer.isActive ? "ghost" : "outline"} size="sm" className={`text-xs h-7 px-2 ${layer.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} onClick={() => toggleMutation.mutate({ id: layer.id, isActive: layer.isActive ? 0 : 1 })}>
                      {layer.isActive ? '已启用' : '已禁用'}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="编辑" className="h-7 w-7" onClick={() => handleEdit(layer)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="删除" className="h-7 w-7 text-destructive" onClick={() => setShowDelete(layer.id)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">暂无分层逻辑配置</CardContent></Card>
        )}
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑分层逻辑 - Layer {editingLayer?.layerId}</DialogTitle>
          </DialogHeader>
          {editingLayer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>分层名称</Label><Input value={editingLayer.layerName} onChange={e => setEditingLayer({ ...editingLayer, layerName: e.target.value })} /></div>
                <div><Label>备注</Label><Input value={editingLayer.comment || ''} onChange={e => setEditingLayer({ ...editingLayer, comment: e.target.value })} /></div>
              </div>
              <div><Label>插屏广告首次播放等级</Label><Input type="number" value={editingLayer.interstitialAdFirstLevel} onChange={e => setEditingLayer({ ...editingLayer, interstitialAdFirstLevel: parseInt(e.target.value) || 0 })} /></div>
              <div>
                <Label>广告频率规则 (JSON)</Label>
                <textarea className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={JSON.stringify(editingLayer.interstitialAdFrequency, null, 2)} onChange={e => { try { setEditingLayer({ ...editingLayer, interstitialAdFrequency: JSON.parse(e.target.value) }); } catch {} }} />
              </div>
              <div>
                <Label>推送礼包列表 (JSON)</Label>
                <textarea className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={JSON.stringify(editingLayer.pushGifts, null, 2)} onChange={e => { try { setEditingLayer({ ...editingLayer, pushGifts: JSON.parse(e.target.value) }); } catch {} }} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Layer Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增分层</DialogTitle>
            <DialogDescription>创建新的用户分层，配置广告策略和推送礼包</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>分层ID</Label><Input type="number" value={newLayer.layerId} onChange={e => setNewLayer({ ...newLayer, layerId: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>分层名称</Label><Input value={newLayer.layerName} onChange={e => setNewLayer({ ...newLayer, layerName: e.target.value })} placeholder="如：超级鲸鱼" /></div>
            </div>
            <div><Label>备注</Label><Input value={newLayer.comment} onChange={e => setNewLayer({ ...newLayer, comment: e.target.value })} placeholder="分层描述" /></div>
            <div><Label>插屏广告首次播放等级</Label><Input type="number" value={newLayer.interstitialAdFirstLevel} onChange={e => setNewLayer({ ...newLayer, interstitialAdFirstLevel: parseInt(e.target.value) || 0 })} /></div>
            <div>
              <Label>广告频率规则 (JSON)</Label>
              <textarea className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={JSON.stringify(newLayer.interstitialAdFrequency, null, 2)} onChange={e => { try { setNewLayer({ ...newLayer, interstitialAdFrequency: JSON.parse(e.target.value) }); } catch {} }} />
            </div>
            <div>
              <Label>推送礼包列表 (JSON)</Label>
              <textarea className="w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={JSON.stringify(newLayer.pushGifts, null, 2)} onChange={e => { try { setNewLayer({ ...newLayer, pushGifts: JSON.parse(e.target.value) }); } catch {} }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={() => createMutation.mutate(newLayer)} disabled={createMutation.isPending || !newLayer.layerName}>{createMutation.isPending ? '创建中...' : '创建分层'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete !== null} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除分层</DialogTitle>
            <DialogDescription>删除后该分层配置将不可恢复，确定要继续吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>取消</Button>
            <Button variant="destructive" onClick={() => showDelete && deleteMutation.mutate({ id: showDelete })} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Behavior Strategy Tab ====================
function BehaviorStrategyTab() {
  const [selectedLayer, setSelectedLayer] = useState<string>("all");
  const { data: strategies, isLoading, refetch } = trpc.segmentConfig.listBehaviorStrategies.useQuery(
    selectedLayer === "all" ? undefined : { layerId: parseInt(selectedLayer) }
  );
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  const updateMutation = trpc.segmentConfig.updateBehaviorStrategy.useMutation({
    onSuccess: () => { toast.success("行为策略已更新"); refetch(); setShowEdit(false); },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const handleSave = () => {
    if (!editingStrategy) return;
    const { id, strategyId, layerId, createdAt, updatedAt, deleted, isActive, ...data } = editingStrategy;
    updateMutation.mutate({ id, ...data });
  };

  const giftTypeLabels: Record<string, { label: string; icon: string }> = {
    Review: { label: "评价引导", icon: "⭐" },
    StarterPack: { label: "新手礼包", icon: "🎁" },
    Comeback: { label: "回归礼包", icon: "🔄" },
    RemoveAds: { label: "去广告", icon: "🚫" },
    Pass: { label: "通行证", icon: "🎫" },
    FreeCoins: { label: "免费金币", icon: "🪙" },
  };

  const grouped = useMemo(() => {
    if (!strategies) return {};
    const map: Record<number, any[]> = {};
    (strategies ?? []).forEach((s: any) => {
      if (!map[s.layerId]) map[s.layerId] = [];
      map[s.layerId].push(s);
    });
    return map;
  }, [strategies]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">行为推送策略</h3>
          <p className="text-sm text-muted-foreground">每层6种推送策略的触发条件、时机和冷却规则</p>
        </div>
        <Select value={selectedLayer} onValueChange={setSelectedLayer}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部层级</SelectItem>
            {Array.from({ length: 10 }).map((_, i) => (
              <SelectItem key={i} value={String(i)}>Layer {i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-4"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>
      ) : Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([layerId, items]) => (
          <Card key={layerId}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={`${getLayerColor(Number(layerId))} text-xs`}>Layer {layerId}</Badge>
                <span className="text-muted-foreground font-normal">{items.length} 种推送策略</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>首次推送条件</TableHead>
                    <TableHead>再次推送条件</TableHead>
                    <TableHead>推送时机</TableHead>
                    <TableHead>冷却规则</TableHead>
                    <TableHead className="w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items ?? []).map((s: Record<string,unknown>) => {
                    const gt = giftTypeLabels[s.giftType] || { label: s.giftType, icon: "📦" };
                    return (
                      <TableRow key={s.id}>
                        <TableCell><span className="text-sm">{gt.icon} {gt.label}</span></TableCell>
                        <TableCell className="text-xs">{s.firstPushConditionType ? `${s.firstPushConditionType}=${s.firstPushConditionParam}` : '-'}</TableCell>
                        <TableCell className="text-xs">{s.pushConditionType ? `${s.pushConditionType}=${s.pushConditionParam}` : '-'}</TableCell>
                        <TableCell className="text-xs">{s.pushGiftPlace || '-'}</TableCell>
                        <TableCell className="text-xs">{s.cooldownRule ? `${s.cooldownRule}(${s.cooldownRuleParam1 ?? ''}${s.cooldownRuleParam2 ? ',' + s.cooldownRuleParam2 : ''})` : '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" aria-label="编辑" className="h-7 w-7" onClick={() => { setEditingStrategy({ ...s }); setShowEdit(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无行为策略配置</CardContent></Card>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑行为策略 - {editingStrategy?.giftType}</DialogTitle>
          </DialogHeader>
          {editingStrategy && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">首推条件类型</Label><Input value={editingStrategy.firstPushConditionType || ''} onChange={e => setEditingStrategy({ ...editingStrategy, firstPushConditionType: e.target.value || null })} /></div>
                <div><Label className="text-xs">首推条件参数</Label><Input type="number" value={editingStrategy.firstPushConditionParam ?? ''} onChange={e => setEditingStrategy({ ...editingStrategy, firstPushConditionParam: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">再推条件类型</Label><Input value={editingStrategy.pushConditionType || ''} onChange={e => setEditingStrategy({ ...editingStrategy, pushConditionType: e.target.value || null })} /></div>
                <div><Label className="text-xs">再推条件参数</Label><Input type="number" value={editingStrategy.pushConditionParam ?? ''} onChange={e => setEditingStrategy({ ...editingStrategy, pushConditionParam: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div><Label className="text-xs">推送时机</Label><Input value={editingStrategy.pushGiftPlace || ''} onChange={e => setEditingStrategy({ ...editingStrategy, pushGiftPlace: e.target.value || null })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">冷却规则</Label><Input value={editingStrategy.cooldownRule || ''} onChange={e => setEditingStrategy({ ...editingStrategy, cooldownRule: e.target.value || null })} /></div>
                <div><Label className="text-xs">冷却参数1</Label><Input type="number" value={editingStrategy.cooldownRuleParam1 ?? ''} onChange={e => setEditingStrategy({ ...editingStrategy, cooldownRuleParam1: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label className="text-xs">冷却参数2</Label><Input type="number" value={editingStrategy.cooldownRuleParam2 ?? ''} onChange={e => setEditingStrategy({ ...editingStrategy, cooldownRuleParam2: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Calc Rules Tab ====================
function CalcRulesTab() {
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>("all");
  const { data: rules, isLoading, refetch } = trpc.segmentConfig.listCalcRules.useQuery(
    ruleTypeFilter === "all" ? undefined : { ruleType: parseInt(ruleTypeFilter) }
  );
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  const updateMutation = trpc.segmentConfig.updateCalcRule.useMutation({
    onSuccess: () => { toast.success("计算规则已更新"); refetch(); setShowEdit(false); },
    onError: (e) => toast.error("更新失败: " + e.message),
  });

  const handleSave = () => {
    if (!editingRule) return;
    const { id, createdAt, updatedAt, deleted, isActive, ...data } = editingRule;
    updateMutation.mutate({ id, ...data });
  };

  const upgradeRules = useMemo(() => (rules || []).filter((r: Record<string,unknown>) => r.ruleType === 1), [rules]);
  const downgradeRules = useMemo(() => (rules || []).filter((r: Record<string,unknown>) => r.ruleType === 2), [rules]);

  const renderRuleTable = (ruleList: any[], isUpgrade: boolean) => (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Badge className={isUpgrade ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>
            {isUpgrade ? "升层规则" : "降层规则"}
          </Badge>
          <span className="text-muted-foreground font-normal">{isUpgrade ? "满足条件时用户升入目标层" : "低于条件阈值时用户降入目标层"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>目标层</TableHead>
              <TableHead>付费金额 ($)</TableHead>
              <TableHead>连续登录</TableHead>
              <TableHead>总登录</TableHead>
              <TableHead>在线总时长</TableHead>
              <TableHead>日均在线</TableHead>
              <TableHead>闯关总数</TableHead>
              <TableHead>日均闯关</TableHead>
              <TableHead>刷新周期</TableHead>
              <TableHead className="w-[60px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ruleList.map((r: Record<string,unknown>) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="secondary" className="text-xs">Layer {r.targetLayer}</Badge></TableCell>
                <TableCell className={isUpgrade ? "font-medium text-emerald-600" : ""}>{r.purchaseAmount ? `${isUpgrade ? '≥' : '<'} $${r.purchaseAmount}` : '-'}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {r.streakLoginTimes ?? '-'}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {r.totalLoginTimes ?? '-'}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {formatDuration(r.onlineDuration)}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {formatDuration(r.avgDailyOnlineTime)}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {r.completeLevelNum ?? '-'}</TableCell>
                <TableCell className={!isUpgrade ? "text-red-600" : ""}>{isUpgrade ? '≥' : '<'} {r.avgDailyCompleteLevelNum ?? '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDuration(r.refreshTime)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="编辑" className="h-7 w-7" onClick={() => { setEditingRule({ ...r }); setShowEdit(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">升降层计算规则</h3>
          <p className="text-sm text-muted-foreground">配置用户升层和降层的多维度行为阈值条件，每24小时刷新计算</p>
        </div>
        <Select value={ruleTypeFilter} onValueChange={setRuleTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部规则</SelectItem>
            <SelectItem value="1">升层规则</SelectItem>
            <SelectItem value="2">降层规则</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-4"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(ruleTypeFilter === "all" || ruleTypeFilter === "1") && upgradeRules.length > 0 && renderRuleTable(upgradeRules, true)}
          {(ruleTypeFilter === "all" || ruleTypeFilter === "2") && downgradeRules.length > 0 && renderRuleTable(downgradeRules, false)}
          {!upgradeRules.length && !downgradeRules.length && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">暂无计算规则配置</CardContent></Card>
          )}
        </div>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑{editingRule?.ruleType === 1 ? '升层' : '降层'}规则 → Layer {editingRule?.targetLayer}</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">目标层</Label><Input type="number" value={editingRule.targetLayer} onChange={e => setEditingRule({ ...editingRule, targetLayer: parseInt(e.target.value) || 0 })} /></div>
                <div><Label className="text-xs">付费金额 ($)</Label><Input value={editingRule.purchaseAmount ?? ''} onChange={e => setEditingRule({ ...editingRule, purchaseAmount: e.target.value || null })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">连续登录次数</Label><Input type="number" value={editingRule.streakLoginTimes ?? ''} onChange={e => setEditingRule({ ...editingRule, streakLoginTimes: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label className="text-xs">总登录次数</Label><Input type="number" value={editingRule.totalLoginTimes ?? ''} onChange={e => setEditingRule({ ...editingRule, totalLoginTimes: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">在线总时长 (秒)</Label><Input type="number" value={editingRule.onlineDuration ?? ''} onChange={e => setEditingRule({ ...editingRule, onlineDuration: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label className="text-xs">日均在线时长 (秒)</Label><Input type="number" value={editingRule.avgDailyOnlineTime ?? ''} onChange={e => setEditingRule({ ...editingRule, avgDailyOnlineTime: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">闯关总次数</Label><Input type="number" value={editingRule.completeLevelNum ?? ''} onChange={e => setEditingRule({ ...editingRule, completeLevelNum: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label className="text-xs">日均闯关次数</Label><Input type="number" value={editingRule.avgDailyCompleteLevelNum ?? ''} onChange={e => setEditingRule({ ...editingRule, avgDailyCompleteLevelNum: e.target.value ? parseInt(e.target.value) : null })} /></div>
              </div>
              <div>
                <Label className="text-xs">刷新时间 (秒)</Label>
                <Input type="number" value={editingRule.refreshTime} onChange={e => setEditingRule({ ...editingRule, refreshTime: parseInt(e.target.value) || 86400 })} />
                <p className="text-xs text-muted-foreground mt-1">默认 86400 秒 = 24 小时</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== User Segment Data Tab ====================
function UserSegmentDataTab() {
  const { currentGameId } = useGame();
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { data: segmentData, isLoading } = trpc.userProfiles.listSegments.useQuery({
    page, pageSize: 20,
    segmentLevel: filter === "all" ? undefined : filter,
    gameId: currentGameId ?? undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">用户分层数据</h3>
          <p className="text-sm text-muted-foreground">查看实际用户的四维评分和分层结果</p>
        </div>
        <Select value={filter} onValueChange={v => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部分层" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分层</SelectItem>
            {Array.from({ length: 10 }).map((_, i) => (
              <SelectItem key={i} value={`L${i}`}>Layer {i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户ID</TableHead>
                <TableHead>分层</TableHead>
                <TableHead>付费评分</TableHead>
                <TableHead>广告评分</TableHead>
                <TableHead>技能评分</TableHead>
                <TableHead>流失风险</TableHead>
                <TableHead>置信度</TableHead>
                <TableHead>探针完成</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  ))}</TableRow>
                ))
              ) : segmentData?.data?.length ? (
                segmentData?.data?.map((seg: Record<string,unknown>) => (
                  <TableRow key={seg.id}>
                    <TableCell className="font-mono text-xs">{seg.userId.substring(0, 16)}...</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{seg.segmentLevel}</Badge></TableCell>
                    <TableCell><ScoreBar value={seg.payScore} color="bg-violet-500" /></TableCell>
                    <TableCell><ScoreBar value={seg.adScore} color="bg-blue-500" /></TableCell>
                    <TableCell><ScoreBar value={seg.skillScore} color="bg-emerald-500" /></TableCell>
                    <TableCell><ScoreBar value={seg.churnRisk} color="bg-red-500" /></TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${Number(seg.confidence) >= 0.7 ? "text-emerald-600" : Number(seg.confidence) >= 0.4 ? "text-amber-600" : "text-red-600"}`}>
                        {(Number(seg.confidence) * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{seg.probeCompletedCount}</TableCell>
                    <TableCell>
                      {seg.isInRecovery ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">恢复中</Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">正常</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    暂无用户分层数据，待游戏用户产生行为后自动计算
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {segmentData && segmentData.total > 20 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>共 {segmentData.total} 条</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
                <button className="px-3 py-1 rounded border hover:bg-accent disabled:opacity-50" disabled={page * 20 >= segmentData.total} onClick={() => setPage(p => p + 1)}>下一页</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-6">{value}</span>
    </div>
  );
}

// ==================== Segment Templates Tab ====================
function SegmentTemplatesTab() {
  const { currentGameId } = useGame();
  const { data: templates, isLoading, refetch } = trpc.segmentConfig.listTemplates.useQuery({ gameId: currentGameId ?? undefined });
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveType, setSaveType] = useState('休闲游戏');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveTags, setSaveTags] = useState('');

  const saveMutation = trpc.segmentConfig.saveCurrentAsTemplate.useMutation({
    onSuccess: () => { toast.success('模板已保存'); refetch(); setShowSave(false); setSaveName(''); setSaveDesc(''); },
    onError: (e) => toast.error('保存失败: ' + e.message),
  });

  const deleteMutation = trpc.segmentConfig.deleteTemplate.useMutation({
    onSuccess: () => { toast.success('模板已删除'); refetch(); },
    onError: (e) => toast.error('删除失败: ' + e.message),
  });

  const applyMutation = trpc.segmentConfig.applyTemplate.useMutation({
    onSuccess: () => toast.success('模板已应用，请刷新查看配置变化'),
    onError: (e) => toast.error('应用失败: ' + e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">分层模板库</h3>
          <p className="text-sm text-muted-foreground">保存和复用分层配置方案，方便快速应用到新游戏</p>
        </div>
        <Button size="sm" onClick={() => setShowSave(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> 保存当前配置为模板
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Card key={i}><CardContent className="py-4"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>)
        ) : templates?.length ? (
          (templates ?? []).map((t: Record<string,unknown>) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{t.templateName}</span>
                      <Badge variant="outline" className="text-xs">{t.gameType}</Badge>
                      {t.usageCount > 0 && <Badge variant="secondary" className="text-xs">已使用 {t.usageCount} 次</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {t.tags?.map((tag: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">创建于 {new Date(t.createdAt).toLocaleDateString()} · {t.createdBy || '系统'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => applyMutation.mutate({ templateId: t.id, gameId: 1 })} disabled={applyMutation.isPending}>应用</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate({ id: t.id })}><Minus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">暂无分层模板，点击上方按钮保存当前配置</CardContent></Card>
        )}
      </div>

      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存当前配置为模板</DialogTitle>
            <DialogDescription>将当前分层配置保存为可复用模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>模板名称</Label><Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="如：休闲游戏10层标准方案" /></div>
            <div><Label>游戏类型</Label>
              <Select value={saveType} onValueChange={setSaveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="休闲游戏">休闲游戏</SelectItem>
                  <SelectItem value="中度游戏">中度游戏</SelectItem>
                  <SelectItem value="重度游戏">重度游戏</SelectItem>
                  <SelectItem value="SLG">SLG</SelectItem>
                  <SelectItem value="RPG">RPG</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>描述</Label><Input value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="模板用途说明" /></div>
            <div><Label>标签（逗号分隔）</Label><Input value={saveTags} onChange={e => setSaveTags(e.target.value)} placeholder="如：高留存,低付费" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSave(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate({ templateName: saveName, gameType: saveType, description: saveDesc, tags: saveTags ? saveTags.split(',').map(t => t.trim()) : [] })} disabled={saveMutation.isPending || !saveName}>{saveMutation.isPending ? '保存中...' : '保存模板'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Main Page ====================
export default function Segments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">用户分层管理</h1>
          <p className="text-muted-foreground text-sm mt-1">基于Luban配置表的用户分层体系，管理广告频率、推送策略和升降层规则</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentSimulator />
          <ImportExportToolbar />
        </div>
      </div>

      <Tabs defaultValue="logic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="logic" className="gap-1.5">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">逻辑配置</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-1.5">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">行为策略</span>
          </TabsTrigger>
          <TabsTrigger value="calc" className="gap-1.5">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">计算规则</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">用户数据</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">模板库</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logic"><LayerLogicTab /></TabsContent>
        <TabsContent value="behavior"><BehaviorStrategyTab /></TabsContent>
        <TabsContent value="calc"><CalcRulesTab /></TabsContent>
        <TabsContent value="data"><UserSegmentDataTab /></TabsContent>
        <TabsContent value="templates"><SegmentTemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
