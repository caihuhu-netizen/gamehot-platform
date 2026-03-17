import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, PlusCircle, Play, Trash2, Loader2, BarChart3, Database, Code, Filter, Columns, Clock, Download, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CrossModuleLinks from "@/components/CrossModuleLinks";

const AGGREGATIONS = [
  { value: "SUM", label: "求和" },
  { value: "AVG", label: "平均值" },
  { value: "COUNT", label: "计数" },
  { value: "MIN", label: "最小值" },
  { value: "MAX", label: "最大值" },
];

const OPERATORS = [
  { value: "=", label: "等于" },
  { value: "!=", label: "不等于" },
  { value: ">", label: "大于" },
  { value: "<", label: "小于" },
  { value: ">=", label: "大于等于" },
  { value: "<=", label: "小于等于" },
  { value: "LIKE", label: "包含" },
  { value: "IS NULL", label: "为空" },
  { value: "IS NOT NULL", label: "不为空" },
];

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "活跃", variant: "default" },
  draft: { label: "草稿", variant: "secondary" },
  archived: { label: "归档", variant: "outline" },
};

export default function CustomReport() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: reports = [], isLoading } = trpc.customReports.list.useQuery({ gameId: currentGameId ?? undefined });
  const { data: schema = [] } = trpc.customReports.schema.useQuery();

  const createMutation = trpc.customReports.create.useMutation({
    onSuccess: () => { utils.customReports.list.invalidate(); toast.success("报表创建成功"); setShowCreate(false); resetForm(); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const executeMutation = trpc.customReports.execute.useMutation({
    onSuccess: (data: any) => { setResultData(data.data); setResultReportName(executingName); setShowResult(true); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const deleteMutation = trpc.customReports.delete.useMutation({
    onSuccess: () => { utils.customReports.list.invalidate(); toast.success("报表已删除"); },
  });
  const adHocMutation = trpc.customReports.adHocQuery.useMutation({
    onSuccess: (data: any) => { setAdHocResult(data); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [resultReportName, setResultReportName] = useState("");
  const [executingName, setExecutingName] = useState("");

  // Ad-hoc query state
  const [adHocTable, setAdHocTable] = useState("");
  const [adHocMetrics, setAdHocMetrics] = useState<{ column: string; aggregation: string }[]>([]);
  const [adHocDimensions, setAdHocDimensions] = useState<string[]>([]);
  const [adHocFilters, setAdHocFilters] = useState<{ column: string; operator: string; value: string }[]>([]);
  const [adHocResult, setAdHocResult] = useState<any>(null);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    table: "",
    metrics: [] as { key: string; label: string; aggregation: string }[],
    dimensions: [] as { key: string; label: string }[],
    dateRange: "7d",
  });

  const resetForm = () => setForm({ name: "", table: "", metrics: [], dimensions: [], dateRange: "7d" });

  // Get columns for selected table
  const selectedTableSchema = useMemo(() => {
    return schema.find((t: any) => t.table === (adHocTable || form.table));
  }, [schema, adHocTable, form.table]);

  const aggregatableColumns = useMemo(() => {
    return selectedTableSchema?.columns?.filter((c: Record<string,unknown>) => c.aggregatable) || [];
  }, [selectedTableSchema]);

  const dimensionableColumns = useMemo(() => {
    return selectedTableSchema?.columns?.filter((c: Record<string,unknown>) => c.dimensionable) || [];
  }, [selectedTableSchema]);

  const filterableColumns = useMemo(() => {
    return selectedTableSchema?.columns?.filter((c: Record<string,unknown>) => c.filterable) || [];
  }, [selectedTableSchema]);

  const handleCreate = () => {
    if (!form.name) { toast.error("请输入报表名称"); return; }
    if (form.metrics.length === 0) { toast.error("请至少选择一个指标"); return; }
    createMutation.mutate({
      name: form.name,
      metrics: form.metrics,
      dimensions: form.dimensions,
      dateRange: form.dateRange,
    });
  };

  const handleExecute = (id: number, name: string) => {
    setExecutingName(name);
    executeMutation.mutate({ id });
  };

  const handleAdHocQuery = () => {
    if (!adHocTable) { toast.error("请选择数据表"); return; }
    if (adHocMetrics.length === 0 && adHocDimensions.length === 0) {
      toast.error("请至少选择一个指标或维度"); return;
    }
    adHocMutation.mutate({
      table: adHocTable,
      metrics: adHocMetrics,
      dimensions: adHocDimensions.map(d => ({ column: d })),
      filters: adHocFilters.filter(f => f.column && f.operator),
    });
  };

  const exportToCSV = (data: any) => {
    if (!data?.rows?.length) return;
    const headers = data.columns.join(",");
    const rows = (data.rows ?? []).map((r: Record<string,unknown>) => data.columns.map((c: string) => {
      const val = r[c];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-result-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 已下载");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CrossModuleLinks links={[
        { label: "数据导出", path: "/export-center", description: "导出报表数据" },
        { label: "事件分析", path: "/event-analysis", description: "漏斗与留存分析" },
        { label: "仪表盘", path: "/", description: "数据总览" },
      ]} />

      <Tabs defaultValue="list">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list"><FileText className="mr-1 h-4 w-4" />报表列表</TabsTrigger>
            <TabsTrigger value="query-builder"><Database className="mr-1 h-4 w-4" />查询构建器</TabsTrigger>
          </TabsList>
          <Button onClick={() => { resetForm(); setShowCreate(true); }}><PlusCircle className="mr-2 h-4 w-4" />创建报表</Button>
        </div>

        {/* Reports List Tab */}
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : reports.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">暂无自定义报表</p>
              <p className="mt-1">创建自定义报表来分析您关心的数据维度</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(reports ?? []).map((r: Record<string,unknown>) => {
                const st = statusMap[r.status] || statusMap.draft;
                const config = r.config as Record<string, unknown> & { metrics?: Array<{ label?: string; key?: string }>; dimensions?: Array<{ label?: string; key?: string }> };
                return (
                  <Card key={r.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{r.name}</CardTitle>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <CardDescription>
                        指标: {(config?.metrics || []).map((m: Record<string,unknown>) => m.label || m.key || m).join(", ") || "未配置"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-3">
                        <div>维度: {(config?.dimensions || []).map((d: Record<string,unknown>) => d.label || d.key || d).join(", ") || "无"}</div>
                        <div>创建于: {new Date(r.createdAt).toLocaleDateString()}</div>
                        {r.lastRunAt && <div>上次运行: {new Date(r.lastRunAt).toLocaleString()}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleExecute(r.id, r.name)} disabled={executeMutation.isPending}>
                          {executeMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                          运行
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("确认删除?")) deleteMutation.mutate({ id: r.id }); }}>
                          <Trash2 className="mr-1 h-3 w-3" />删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Query Builder Tab */}
        <TabsContent value="query-builder" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />可视化查询构建器</CardTitle>
              <CardDescription>选择数据表、指标和维度，安全地构建并执行 SQL 查询（白名单机制 + 参数化查询 + 最多返回 1000 行）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Select Table */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1"><Database className="h-3.5 w-3.5" />选择数据表</label>
                <Select value={adHocTable} onValueChange={(v) => { setAdHocTable(v); setAdHocMetrics([]); setAdHocDimensions([]); setAdHocFilters([]); }}>
                  <SelectTrigger><SelectValue placeholder="选择要查询的数据表..." /></SelectTrigger>
                  <SelectContent>
                    {schema.map((t: Record<string,unknown>) => (
                      <SelectItem key={t.table} value={t.table}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({t.table})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTableSchema && (
                  <p className="text-xs text-muted-foreground">{selectedTableSchema.description} - {selectedTableSchema.columns.length} 个可用列</p>
                )}
              </div>

              {adHocTable && (
                <>
                  {/* Step 2: Select Metrics */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />选择指标（聚合）</label>
                    <div className="space-y-2">
                      {adHocMetrics.map((m, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Select value={m.aggregation} onValueChange={v => {
                            const updated = [...adHocMetrics];
                            updated[i] = { ...updated[i], aggregation: v };
                            setAdHocMetrics(updated);
                          }}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {AGGREGATIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={m.column} onValueChange={v => {
                            const updated = [...adHocMetrics];
                            updated[i] = { ...updated[i], column: v };
                            setAdHocMetrics(updated);
                          }}>
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {aggregatableColumns.map((c: Record<string,unknown>) => (
                                <SelectItem key={c.column} value={c.column}>{c.label} ({c.column})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" aria-label="删除" onClick={() => setAdHocMetrics(adHocMetrics.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setAdHocMetrics([...adHocMetrics, { column: aggregatableColumns[0]?.column || "", aggregation: "SUM" }])} disabled={aggregatableColumns.length === 0}>
                        <PlusCircle className="mr-1 h-3 w-3" />添加指标
                      </Button>
                    </div>
                  </div>

                  {/* Step 3: Select Dimensions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1"><Columns className="h-3.5 w-3.5" />选择维度（分组）</label>
                    <div className="flex flex-wrap gap-2">
                      {dimensionableColumns.map((c: Record<string,unknown>) => (
                        <Badge
                          key={c.column}
                          variant={adHocDimensions.includes(c.column) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setAdHocDimensions(prev =>
                              prev.includes(c.column) ? prev.filter(x => x !== c.column) : [...prev, c.column]
                            );
                          }}
                        >
                          {c.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Filters */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1"><Filter className="h-3.5 w-3.5" />过滤条件</label>
                    <div className="space-y-2">
                      {adHocFilters.map((f, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Select value={f.column} onValueChange={v => {
                            const updated = [...adHocFilters];
                            updated[i] = { ...updated[i], column: v };
                            setAdHocFilters(updated);
                          }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="选择列" /></SelectTrigger>
                            <SelectContent>
                              {filterableColumns.map((c: Record<string,unknown>) => (
                                <SelectItem key={c.column} value={c.column}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={f.operator} onValueChange={v => {
                            const updated = [...adHocFilters];
                            updated[i] = { ...updated[i], operator: v };
                            setAdHocFilters(updated);
                          }}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="操作符" /></SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {!["IS NULL", "IS NOT NULL"].includes(f.operator) && (
                            <Input
                              className="flex-1"
                              placeholder="值"
                              value={f.value}
                              onChange={e => {
                                const updated = [...adHocFilters];
                                updated[i] = { ...updated[i], value: e.target.value };
                                setAdHocFilters(updated);
                              }}
                            />
                          )}
                          <Button variant="ghost" size="icon" aria-label="删除" onClick={() => setAdHocFilters(adHocFilters.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setAdHocFilters([...adHocFilters, { column: "", operator: "=", value: "" }])}>
                        <PlusCircle className="mr-1 h-3 w-3" />添加过滤
                      </Button>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="flex gap-2">
                    <Button onClick={handleAdHocQuery} disabled={adHocMutation.isPending}>
                      {adHocMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      执行查询
                    </Button>
                    {adHocResult?.rows?.length > 0 && (
                      <Button variant="outline" onClick={() => exportToCSV(adHocResult)}>
                        <Download className="mr-2 h-4 w-4" />导出 CSV
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ad-hoc Query Result */}
          {adHocResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />查询结果
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{adHocResult.executionTimeMs}ms</span>
                    <span>{adHocResult.totalRows} 行</span>
                  </div>
                </div>
                {adHocResult.error && (
                  <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                    <AlertCircle className="h-4 w-4" />{adHocResult.error}
                  </div>
                )}
              </CardHeader>
              {adHocResult.rows?.length > 0 && (
                <CardContent>
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {adHocResult.columns.map((c: string) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(adHocResult.rows ?? []).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {adHocResult.columns.map((c: string) => (
                              <TableCell key={c} className="whitespace-nowrap">
                                {typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c] ?? "-")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Show generated SQL */}
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Code className="h-3 w-3" />生成的 SQL（参数化）</p>
                    <code className="text-xs break-all">{adHocResult.sql}</code>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建自定义报表</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">报表名称 *</label><Input placeholder="例如：每周收入分析" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">数据表</label>
              <Select value={form.table} onValueChange={v => setForm({ ...form, table: v, metrics: [], dimensions: [] })}>
                <SelectTrigger><SelectValue placeholder="选择数据表..." /></SelectTrigger>
                <SelectContent>
                  {schema.map((t: Record<string,unknown>) => (
                    <SelectItem key={t.table} value={t.table}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.table && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择指标 *</label>
                  <div className="flex flex-wrap gap-2">
                    {(schema.find((t: any) => t.table === form.table)?.columns?.filter((c: Record<string,unknown>) => c.aggregatable) || []).map((c: Record<string,unknown>) => (
                      <Badge
                        key={c.column}
                        variant={form.metrics.some(m => m.key === c.column) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            metrics: prev.metrics.some(m => m.key === c.column)
                              ? prev.metrics.filter(m => m.key !== c.column)
                              : [...prev.metrics, { key: c.column, label: c.label, aggregation: "SUM" }],
                          }));
                        }}
                      >
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择维度</label>
                  <div className="flex flex-wrap gap-2">
                    {(schema.find((t: any) => t.table === form.table)?.columns?.filter((c: Record<string,unknown>) => c.dimensionable) || []).map((c: Record<string,unknown>) => (
                      <Badge
                        key={c.column}
                        variant={form.dimensions.some(d => d.key === c.column) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            dimensions: prev.dimensions.some(d => d.key === c.column)
                              ? prev.dimensions.filter(d => d.key !== c.column)
                              : [...prev.dimensions, { key: c.column, label: c.label }],
                          }));
                        }}
                      >
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2"><label className="text-sm font-medium">时间范围</label>
              <Select value={form.dateRange} onValueChange={v => setForm({ ...form, dateRange: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="14d">最近14天</SelectItem>
                  <SelectItem value="30d">最近30天</SelectItem>
                  <SelectItem value="90d">最近90天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "创建中..." : "创建报表"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>报表结果: {resultReportName}</DialogTitle>
            {resultData?.executionTimeMs !== undefined && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{resultData.executionTimeMs}ms</span>
                <span>{resultData.totalRows} 行</span>
              </div>
            )}
          </DialogHeader>
          {resultData ? (
            <div className="space-y-4">
              {resultData.error && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4" />{resultData.error}
                </div>
              )}
              {resultData.rows && resultData.rows.length > 0 && (
                <>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV(resultData)}>
                      <Download className="mr-1 h-3 w-3" />导出 CSV
                    </Button>
                  </div>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {resultData.columns.map((k: string) => <TableHead key={k} className="whitespace-nowrap">{k}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(resultData.rows ?? []).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {resultData.columns.map((c: string) => (
                              <TableCell key={c} className="whitespace-nowrap">
                                {typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c] ?? "-")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {resultData.sql && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Code className="h-3 w-3" />生成的 SQL</p>
                      <code className="text-xs break-all">{resultData.sql}</code>
                    </div>
                  )}
                </>
              )}
              {(!resultData.rows || resultData.rows.length === 0) && !resultData.error && (
                <p className="text-center text-muted-foreground py-8">查询无结果</p>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setShowResult(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
