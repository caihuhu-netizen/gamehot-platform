import { trpc } from "@/lib/trpc";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, ScatterChart, Scatter, ZAxis, Cell, } from "recharts";
import { GitCompare, Globe, Image, Layers, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csvExport";
import { useState, useMemo, useEffect } from "react";
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

// ==================== 版本对比 ====================
function VersionCompare() {
  const { currentGameId } = useGame();
  const { data: versions = [], isLoading: vLoading } = trpc.comparison.listVersions.useQuery({ gameId: currentGameId ?? undefined });
  const [vA, setVA] = useState("");
  const [vB, setVB] = useState("");
  const vList = (Array.isArray(versions) ? versions : []) as Record<string, unknown>[];

  // Auto-select first two versions when data loads
  useEffect(() => {
    if (vList.length >= 2 && !vA && !vB) {
      setVA(String(vList[0]?.version_code ?? vList[0]?.versionCode ?? ""));
      setVB(String(vList[1]?.version_code ?? vList[1]?.versionCode ?? ""));
    }
  }, [vList, vA, vB]);

  if (vLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;

  const { data: comparison } = trpc.comparison.versionComparison.useQuery(
    { gameId: 1, versionA: vA, versionB: vB },
    { enabled: !!vA && !!vB }
  );

  // Parse version metrics
  const parseMetrics = (arr: unknown[]) => arr.map((d: any) => ({
    day: Number(d.days_after_release || 0),
    retentionD1: Number(d.retention_d1 || 0),
    retentionD7: Number(d.retention_d7 || 0),
    dau: Number(d.dau || 0),
    iapRevenue: Number(d.iap_revenue || 0),
    adRevenue: Number(d.ad_revenue || 0),
    totalRevenue: Number(d.iap_revenue || 0) + Number(d.ad_revenue || 0),
    avgSession: Number(d.avg_session_minutes || 0),
    payingRate: Number(d.paying_rate || 0),
  }));

  const metricsA = comparison && Array.isArray((comparison as any).versionA) ? parseMetrics((comparison as any).versionA) : [];
  const metricsB = comparison && Array.isArray((comparison as any).versionB) ? parseMetrics((comparison as any).versionB) : [];

  // Build combined chart data
  const combinedData = metricsA.map((a, i) => ({
    day: a.day,
    [`${vA}_d1`]: a.retentionD1,
    [`${vB}_d1`]: metricsB[i]?.retentionD1 || 0,
    [`${vA}_revenue`]: a.totalRevenue,
    [`${vB}_revenue`]: metricsB[i]?.totalRevenue || 0,
    [`${vA}_session`]: a.avgSession,
    [`${vB}_session`]: metricsB[i]?.avgSession || 0,
    [`${vA}_payRate`]: a.payingRate,
    [`${vB}_payRate`]: metricsB[i]?.payingRate || 0,
  }));

  // Summary cards
  const sumA = metricsA.length > 0 ? {
    avgD1: metricsA.reduce((s, r) => s + r.retentionD1, 0) / metricsA.length,
    totalRev: metricsA.reduce((s, r) => s + r.totalRevenue, 0),
    avgSession: metricsA.reduce((s, r) => s + r.avgSession, 0) / metricsA.length,
    avgPayRate: metricsA.reduce((s, r) => s + r.payingRate, 0) / metricsA.length,
  } : null;
  const sumB = metricsB.length > 0 ? {
    avgD1: metricsB.reduce((s, r) => s + r.retentionD1, 0) / metricsB.length,
    totalRev: metricsB.reduce((s, r) => s + r.totalRevenue, 0),
    avgSession: metricsB.reduce((s, r) => s + r.avgSession, 0) / metricsB.length,
    avgPayRate: metricsB.reduce((s, r) => s + r.payingRate, 0) / metricsB.length,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <Button variant="outline" size="sm" onClick={() => {
          exportToCsv("版本对比", combinedData.map(d => ({ "天数": d.day, ...d })));
        }}><Download className="h-3.5 w-3.5 mr-1" />导出CSV</Button>
        <Select value={vA} onValueChange={setVA}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择版本 A" /></SelectTrigger>
          <SelectContent>
            {vList.map((v: any) => (
              <SelectItem key={String(v.version_code ?? v.versionCode ?? v.id ?? Math.random())} value={String(v.version_code ?? v.versionCode ?? "")}>
                {String(v.version_name ?? v.versionName ?? v.version_code ?? v.versionCode ?? "unknown")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground font-medium">vs</span>
        <Select value={vB} onValueChange={setVB}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择版本 B" /></SelectTrigger>
          <SelectContent>
            {vList.map((v: any) => (
              <SelectItem key={String(v.version_code ?? v.versionCode ?? v.id ?? Math.random())} value={String(v.version_code ?? v.versionCode ?? "")}>
                {String(v.version_name ?? v.versionName ?? v.version_code ?? v.versionCode ?? "unknown")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary comparison cards */}
      {sumA && sumB && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "平均D1留存", a: `${sumA.avgD1.toFixed(1)}%`, b: `${sumB.avgD1.toFixed(1)}%`, better: sumA.avgD1 > sumB.avgD1 ? "A" : "B" },
            { label: "累计收入", a: `$${sumA.totalRev.toFixed(2)}`, b: `$${sumB.totalRev.toFixed(2)}`, better: sumA.totalRev > sumB.totalRev ? "A" : "B" },
            { label: "平均时长(分)", a: sumA.avgSession.toFixed(1), b: sumB.avgSession.toFixed(1), better: sumA.avgSession > sumB.avgSession ? "A" : "B" },
            { label: "平均付费率", a: `${sumA.avgPayRate.toFixed(2)}%`, b: `${sumB.avgPayRate.toFixed(2)}%`, better: sumA.avgPayRate > sumB.avgPayRate ? "A" : "B" },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-2">{m.label}</p>
                <div className="flex justify-between items-center">
                  <div className={`text-sm font-bold ${m.better === "A" ? "text-green-600" : ""}`}>
                    <Badge variant="outline" className="text-[10px] mr-1">{vA}</Badge>{m.a}
                  </div>
                  <div className={`text-sm font-bold ${m.better === "B" ? "text-green-600" : ""}`}>
                    <Badge variant="outline" className="text-[10px] mr-1">{vB}</Badge>{m.b}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {combinedData.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">D1留存对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: "发布后天数", position: "insideBottom", offset: -5, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={`${vA}_d1`} stroke="#6366f1" name={`${vA} D1留存%`} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={`${vB}_d1`} stroke="#f59e0b" name={`${vB} D1留存%`} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">收入对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey={`${vA}_revenue`} fill="#6366f1" name={`${vA} 收入`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={`${vB}_revenue`} fill="#f59e0b" name={`${vB} 收入`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">平均时长对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={`${vA}_session`} stroke="#6366f1" name={`${vA} 时长(分)`} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={`${vB}_session`} stroke="#f59e0b" name={`${vB} 时长(分)`} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">付费率对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={`${vA}_payRate`} fill="#6366f1" name={`${vA} 付费率%`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={`${vB}_payRate`} fill="#f59e0b" name={`${vB} 付费率%`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{vA && vB ? "暂无版本指标数据" : "请选择两个版本进行对比"}</p>
        </CardContent></Card>
      )}

      {vList.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">版本列表</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-muted-foreground">
                <th className="py-2 text-left">版本号</th><th className="text-left">版本名</th>
                <th className="text-left">发布日期</th><th className="text-left">平台</th><th className="text-left">状态</th>
              </tr></thead>
              <tbody>
                {vList.map((v: any) => (
                  <tr key={v.id} className="border-b hover:bg-muted/50">
                    <td className="py-1.5 font-mono">{v.version_code || v.versionCode}</td>
                    <td>{v.version_name || v.versionName || "-"}</td>
                    <td>{v.release_date || v.releaseDate}</td>
                    <td><Badge variant="outline" className="text-[10px]">{v.platform || "all"}</Badge></td>
                    <td><Badge variant={v.status === "active" ? "default" : "secondary"} className="text-[10px]">{v.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 国家/地区对比 ====================
function CountryCompare() {
  const { currentGameId } = useGame();
  const { data: rawData = [], isLoading } = trpc.comparison.countryComparison.useQuery({ gameId: currentGameId ?? undefined });
  const data = useMemo(() => (Array.isArray(rawData) ? rawData : []).map((d: any) => ({
    country: d.country || "Unknown",
    users: Number(d.users || 0),
    avgPayScore: Number(d.avg_pay_score || 0),
    avgAdScore: Number(d.avg_ad_score || 0),
    avgSkillScore: Number(d.avg_skill_score || 0),
    avgChurnRisk: Number(d.avg_churn_risk || 0),
    totalRevenue: Number(d.total_revenue || 0),
  })), [rawData]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if ((data ?? []).length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无地区对比数据</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => {
          exportToCsv("国家对比", (data ?? []).map(d => ({
            "国家": d.country, "用户数": d.users,
            "付费评分": d.avgPayScore, "广告评分": d.avgAdScore,
            "技能评分": d.avgSkillScore, "流失风险": d.avgChurnRisk,
            "总收入": d.totalRevenue,
          })));
        }}><Download className="h-3.5 w-3.5 mr-1" />导出CSV</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">用户分布 & 收入</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="users" fill="#6366f1" name="用户数" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalRevenue" fill="#10b981" name="总收入($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">四维评分雷达图</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={[
                { metric: "付费力", ...Object.fromEntries(data.slice(0, 5).map(d => [d.country, d.avgPayScore])) },
                { metric: "广告价值", ...Object.fromEntries(data.slice(0, 5).map(d => [d.country, d.avgAdScore])) },
                { metric: "技能水平", ...Object.fromEntries(data.slice(0, 5).map(d => [d.country, d.avgSkillScore])) },
                { metric: "留存风险", ...Object.fromEntries(data.slice(0, 5).map(d => [d.country, 100 - d.avgChurnRisk])) },
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                {data.slice(0, 5).map((d, i) => (
                  <Radar key={d.country} name={d.country} dataKey={d.country} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">地区指标明细</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">地区</th><th className="text-right">用户数</th>
              <th className="text-right">付费评分</th><th className="text-right">广告评分</th>
              <th className="text-right">技能评分</th><th className="text-right">流失风险</th>
              <th className="text-right">总收入</th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.country} className="border-b hover:bg-muted/50">
                  <td className="py-1.5 font-medium">{row.country}</td>
                  <td className="text-right">{row.users.toLocaleString()}</td>
                  <td className="text-right">{row.avgPayScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgAdScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgSkillScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgChurnRisk.toFixed(2)}</td>
                  <td className="text-right font-medium">${row.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 素材效果追踪 ====================
function CreativeCompare() {
  const { currentGameId } = useGame();
  const { data: rawData = [], isLoading } = trpc.comparison.creativeComparison.useQuery({ gameId: currentGameId ?? undefined });
  const data = useMemo(() => (Array.isArray(rawData) ? rawData : []).map((d: any) => ({
    creativeId: d.creative_id || d.creativeId,
    creativeName: d.creative_name || d.creativeName,
    creativeType: d.creative_type || d.creativeType,
    channelName: d.channel_name || d.channelName,
    impressions: Number(d.total_impressions || 0),
    clicks: Number(d.total_clicks || 0),
    installs: Number(d.total_installs || 0),
    spend: Number(d.total_spend || 0),
    ctr: Number(d.avg_ctr || 0),
    cvr: Number(d.avg_cvr || 0),
    cpi: Number(d.avg_cpi || 0),
  })), [rawData]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if ((data ?? []).length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Image className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无素材追踪数据</p>
      <p className="text-xs mt-1">数据将从投放平台自动同步</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => {
          exportToCsv("素材追踪", (data ?? []).map(d => ({
            "素材名称": d.creativeName, "类型": d.creativeType,
            "渠道": d.channelName, "展示量": d.impressions,
            "点击量": d.clicks, "安装量": d.installs,
            "花费": d.spend, "CTR%": d.ctr, "CVR%": d.cvr, "CPI": d.cpi,
          })));
        }}><Download className="h-3.5 w-3.5 mr-1" />导出CSV</Button>
      </div>
      {/* Scatter: CTR vs CVR (bubble size = installs) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">CTR vs CVR 散点图（气泡大小 = 安装量）</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="ctr" name="CTR%" tick={{ fontSize: 11 }} label={{ value: "CTR%", position: "insideBottom", offset: -5, fontSize: 10 }} />
              <YAxis type="number" dataKey="cvr" name="CVR%" tick={{ fontSize: 11 }} label={{ value: "CVR%", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <ZAxis type="number" dataKey="installs" range={[40, 400]} name="安装量" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: number, name: string) => [name === "安装量" ? v.toLocaleString() : `${v.toFixed(2)}%`, name]} />
              <Legend />
              <Scatter name="素材" data={data} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">CTR 排名</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="creativeName" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="ctr" fill="#6366f1" name="CTR%" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">CPI 排名</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="creativeName" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="cpi" fill="#f59e0b" name="CPI ($)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">素材效果明细</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">素材名称</th><th className="text-left">类型</th><th className="text-left">渠道</th>
              <th className="text-right">展示</th><th className="text-right">点击</th><th className="text-right">安装</th>
              <th className="text-right">花费</th><th className="text-right">CTR</th><th className="text-right">CVR</th><th className="text-right">CPI</th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.creativeId} className="border-b hover:bg-muted/50">
                  <td className="py-1.5 font-medium max-w-[150px] truncate">{row.creativeName}</td>
                  <td><Badge variant="outline" className="text-[10px]">{row.creativeType}</Badge></td>
                  <td className="text-muted-foreground">{row.channelName || "-"}</td>
                  <td className="text-right">{row.impressions.toLocaleString()}</td>
                  <td className="text-right">{row.clicks.toLocaleString()}</td>
                  <td className="text-right">{row.installs.toLocaleString()}</td>
                  <td className="text-right">${row.spend.toFixed(2)}</td>
                  <td className="text-right">{row.ctr.toFixed(2)}%</td>
                  <td className="text-right">{row.cvr.toFixed(2)}%</td>
                  <td className="text-right font-medium">${row.cpi.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 分层效果对比 ====================
function SegmentCompare() {
  const { currentGameId } = useGame();
  const { data: rawData = [], isLoading } = trpc.comparison.segmentComparison.useQuery({ gameId: currentGameId ?? undefined });
  const data = useMemo(() => (Array.isArray(rawData) ? rawData : []).map((d: any) => ({
    layerId: Number(d.layer_id || 0),
    layerName: `L${d.layer_name || d.layer_id}`,
    userCount: Number(d.user_count || 0),
    avgPayScore: Number(d.avg_pay_score || 0),
    avgAdScore: Number(d.avg_ad_score || 0),
    avgSkillScore: Number(d.avg_skill_score || 0),
    avgChurnRisk: Number(d.avg_churn_risk || 0),
    payingRate: Number(d.paying_rate || 0),
    avgLtv: Number(d.avg_ltv || 0),
  })), [rawData]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  if ((data ?? []).length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>暂无分层对比数据</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => {
          exportToCsv("分层对比", (data ?? []).map(d => ({
            "分层": d.layerName, "用户数": d.userCount,
            "付费评分": d.avgPayScore, "广告评分": d.avgAdScore,
            "技能评分": d.avgSkillScore, "流失风险": d.avgChurnRisk,
            "付费率%": d.payingRate, "平均LTV": d.avgLtv,
          })));
        }}><Download className="h-3.5 w-3.5 mr-1" />导出CSV</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">各层付费率 & LTV</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="layerName" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="payingRate" fill="#6366f1" name="付费率%" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgLtv" fill="#10b981" name="平均LTV($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">四维评分雷达</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={[
                { metric: "付费力", ...Object.fromEntries(data.slice(0, 5).map(d => [d.layerName, d.avgPayScore])) },
                { metric: "广告价值", ...Object.fromEntries(data.slice(0, 5).map(d => [d.layerName, d.avgAdScore])) },
                { metric: "技能水平", ...Object.fromEntries(data.slice(0, 5).map(d => [d.layerName, d.avgSkillScore])) },
                { metric: "留存力", ...Object.fromEntries(data.slice(0, 5).map(d => [d.layerName, 100 - d.avgChurnRisk])) },
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                {data.slice(0, 5).map((d, i) => (
                  <Radar key={d.layerName} name={d.layerName} dataKey={d.layerName} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {/* User count distribution */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">各层用户分布</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="layerName" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="userCount" name="用户数" radius={[4, 4, 0, 0]}>
                {(data ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">分层指标明细</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">层级</th><th className="text-right">用户数</th>
              <th className="text-right">付费评分</th><th className="text-right">广告评分</th>
              <th className="text-right">技能评分</th><th className="text-right">流失风险</th>
              <th className="text-right">付费率</th><th className="text-right">平均LTV</th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.layerId} className="border-b hover:bg-muted/50">
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[row.layerId % COLORS.length] }} />
                      <span className="font-medium">{row.layerName}</span>
                    </div>
                  </td>
                  <td className="text-right">{row.userCount.toLocaleString()}</td>
                  <td className="text-right">{row.avgPayScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgAdScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgSkillScore.toFixed(2)}</td>
                  <td className="text-right">{row.avgChurnRisk.toFixed(2)}</td>
                  <td className="text-right font-medium">{row.payingRate.toFixed(2)}%</td>
                  <td className="text-right font-medium">${row.avgLtv.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面 ====================
export default function ComparisonAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">对比分析</h1>
        <p className="text-muted-foreground text-sm mt-1">版本对比、国家/地区对比、素材效果追踪、分层效果对比</p>
      </div>
      <Tabs defaultValue="version">
        <TabsList className="flex-wrap">
          <TabsTrigger value="version"><GitCompare className="h-3.5 w-3.5 mr-1" />版本对比</TabsTrigger>
          <TabsTrigger value="country"><Globe className="h-3.5 w-3.5 mr-1" />国家/地区</TabsTrigger>
          <TabsTrigger value="creative"><Image className="h-3.5 w-3.5 mr-1" />素材追踪</TabsTrigger>
          <TabsTrigger value="segment"><Layers className="h-3.5 w-3.5 mr-1" />分层对比</TabsTrigger>
        </TabsList>
        <TabsContent value="version" className="mt-4"><VersionCompare /></TabsContent>
        <TabsContent value="country" className="mt-4"><CountryCompare /></TabsContent>
        <TabsContent value="creative" className="mt-4"><CreativeCompare /></TabsContent>
        <TabsContent value="segment" className="mt-4"><SegmentCompare /></TabsContent>
      </Tabs>
    </div>
  );
}
