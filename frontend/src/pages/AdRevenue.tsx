import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Monitor, DollarSign, Eye, MousePointer, BarChart3, Tv, Layers } from "lucide-react";
function fmt(val: number) {
  const { currentGameId } = useGame(); return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ==================== 广告网络管理 ====================
function NetworkManagement() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: networks = [], isLoading } = trpc.adRevenue.listNetworks.useQuery({ gameId: currentGameId ?? undefined });
  const createMut = trpc.adRevenue.createNetwork.useMutation({
    onSuccess: () => { utils.adRevenue.listNetworks.invalidate(); setOpen(false); toast.success("广告网络已添加"); },
  });
  const deleteMut = trpc.adRevenue.deleteNetwork.useMutation({
    onSuccess: () => { utils.adRevenue.listNetworks.invalidate(); toast.success("广告网络已删除"); },
  });

  const [open, setOpen] = useState(false);
  type NetworkType = "MEDIATION" | "DIRECT" | "DSP" | "EXCHANGE";
  const [form, setForm] = useState<{ networkCode: string; networkName: string; networkType: NetworkType }>({
    networkCode: "", networkName: "", networkType: "MEDIATION",
  });

  const networkIcons: Record<string, { bg: string; label: string }> = {
    applovin: { bg: "from-blue-600 to-blue-800", label: "AL" },
    admob: { bg: "from-yellow-500 to-orange-600", label: "AM" },
    ironsource: { bg: "from-purple-500 to-purple-700", label: "IS" },
    unity: { bg: "from-gray-700 to-gray-900", label: "UA" },
    meta: { bg: "from-blue-500 to-indigo-600", label: "FB" },
    vungle: { bg: "from-green-500 to-green-700", label: "VG" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">广告网络</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> 添加网络</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>添加广告网络</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="网络编码 (如 applovin)" value={form.networkCode} onChange={e => setForm(p => ({ ...p, networkCode: e.target.value }))} />
              <Input placeholder="网络名称 (如 AppLovin MAX)" value={form.networkName} onChange={e => setForm(p => ({ ...p, networkName: e.target.value }))} />
              <Select value={form.networkType} onValueChange={v => setForm(p => ({ ...p, networkType: v as NetworkType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDIATION">聚合平台</SelectItem>
                  <SelectItem value="DIRECT">直接网络</SelectItem>
                  <SelectItem value="DSP">DSP</SelectItem>
                  <SelectItem value="EXCHANGE">交易所</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.networkCode || !form.networkName}>
                {createMut.isPending ? "添加中..." : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-4">加载中...</div>
      ) : networks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Monitor className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>暂无广告网络</p>
          <p className="text-xs mt-1">建议先添加 AppLovin MAX 作为主要聚合平台</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {networks.map((n: any) => {
            const icon = networkIcons[n.networkCode.toLowerCase()] || { bg: "from-gray-500 to-gray-700", label: n.networkCode.slice(0, 2).toUpperCase() };
            return (
              <Card key={n.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${icon.bg} flex items-center justify-center text-white font-bold text-sm`}>
                      {icon.label}
                    </div>
                    <div>
                      <div className="font-medium">{n.networkName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{n.networkCode}</span>
                        <Badge variant="outline" className="text-[10px] px-1">{n.networkType}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={n.isActive ? "default" : "secondary"}>{n.isActive ? "启用" : "停用"}</Badge>
                    <Button variant="ghost" size="icon" aria-label="删除" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate({ id: n.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* API 对接状态 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">数据源对接 <Badge variant="outline" className="text-xs">双通道采集</Badge></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">AL</div>
              <div>
                <div className="font-medium text-sm">AppLovin MAX Reporting API</div>
                <div className="text-xs text-muted-foreground">聚合维度广告收入报表，数据最精确</div>
              </div>
            </div>
            <Badge variant="secondary">待配置</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xs font-bold">AF</div>
              <div>
                <div className="font-medium text-sm">AppsFlyer Ad Revenue</div>
                <div className="text-xs text-muted-foreground">带归因维度的广告收入，知道每个用户的广告价值</div>
              </div>
            </div>
            <Badge variant="secondary">待配置</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-xs font-bold">SDK</div>
              <div>
                <div className="font-medium text-sm">SDK Impression-Level Revenue</div>
                <div className="text-xs text-muted-foreground">客户端实时上报单次展示收入，实时性最好</div>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-600 border-green-200">已就绪</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 广告收入报表 ====================
function RevenueReport() {
  const { currentGameId } = useGame();
  const [dateRange] = useState({ startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0] });
  const { data: total } = trpc.adRevenue.getTotalRevenue.useQuery(dateRange);
  const { data: networks = [] } = trpc.adRevenue.listNetworks.useQuery({ gameId: currentGameId ?? undefined });
  const { data: rawByNetwork = [] } = trpc.adRevenue.getRevenueSummary.useQuery({ ...dateRange, groupBy: "network",
  gameId: currentGameId ?? undefined,
});
  const { data: byDate = [] } = trpc.adRevenue.getRevenueSummary.useQuery({ ...dateRange, groupBy: "date",
  gameId: currentGameId ?? undefined,
});
  const { data: byCountry = [] } = trpc.adRevenue.getRevenueSummary.useQuery({ ...dateRange, groupBy: "country",
  gameId: currentGameId ?? undefined,
});

  const totalRev = total?.total || 0;
  // Enrich byNetwork with network names and ensure numeric types
  const byNetwork = rawByNetwork.map((n: any) => {
    const net = networks.find((net: any) => net.id === n.networkId);
    return {
      ...n,
      networkName: net?.networkName || `网络 ${n.networkId}`,
      totalImpressions: Number(n.totalImpressions) || 0,
      totalClicks: Number(n.totalClicks) || 0,
      totalCompletions: Number(n.totalCompletions) || 0,
      totalRevenue: n.totalRevenue,
    };
  });

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> 广告总收入</div>
          <div className="text-xl font-bold mt-1 text-green-600">{fmt(totalRev)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> 总展示</div>
          <div className="text-xl font-bold mt-1">{byNetwork.reduce((s: number, n: any) => s + (n.totalImpressions || 0), 0).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><MousePointer className="w-3 h-3" /> 总点击</div>
          <div className="text-xl font-bold mt-1">{byNetwork.reduce((s: number, n: any) => s + (n.totalClicks || 0), 0).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" /> 平均 eCPM</div>
          <div className="text-xl font-bold mt-1">{(() => {
            const imp = byNetwork.reduce((s: number, n: any) => s + (n.totalImpressions || 0), 0);
            return imp > 0 ? fmt((totalRev / imp) * 1000) : "$0.00";
          })()}</div>
        </CardContent></Card>
      </div>

      {/* 按网络拆分 */}
      {byNetwork.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">按广告网络</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">网络</th>
                  <th className="text-right py-2 font-medium">收入</th>
                  <th className="text-right py-2 font-medium">展示</th>
                  <th className="text-right py-2 font-medium">eCPM</th>
                  <th className="text-right py-2 font-medium">占比</th>
                </tr>
              </thead>
              <tbody>
                {byNetwork.map((n: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium">{n.networkName || `#${n.networkId}`}</td>
                    <td className="py-2 text-right">{fmt(parseFloat(n.totalRevenue) || 0)}</td>
                    <td className="py-2 text-right">{(n.totalImpressions || 0).toLocaleString()}</td>
                    <td className="py-2 text-right">{n.totalImpressions > 0 ? fmt(((parseFloat(n.totalRevenue) || 0) / n.totalImpressions) * 1000) : "-"}</td>
                    <td className="py-2 text-right">{totalRev > 0 ? ((parseFloat(n.totalRevenue) || 0) / totalRev * 100).toFixed(1) + "%" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 按国家拆分 */}
      {byCountry.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">按国家/地区</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {byCountry.slice(0, 12).map((c: any, i: number) => (
                <div key={i} className="p-2 rounded-lg border text-center">
                  <div className="text-lg font-bold">{c.countryCode || "未知"}</div>
                  <div className="text-sm text-green-600">{fmt(parseFloat(c.totalRevenue) || 0)}</div>
                  <div className="text-xs text-muted-foreground">{(c.totalImpressions || 0).toLocaleString()} 展示</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {totalRev === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Tv className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>暂无广告收入数据</p>
          <p className="text-xs mt-1">数据来源：SDK 实时上报 / AppLovin MAX API / AppsFlyer Ad Revenue</p>
        </CardContent></Card>
      )}
    </div>
  );
}

// ==================== 广告位管理 ====================
function PlacementManagement() {
  const { currentGameId } = useGame();
  const utils = trpc.useUtils();
  const { data: placements = [], isLoading } = trpc.adRevenue.listPlacements.useQuery({ gameId: currentGameId ?? undefined });
  const createMut = trpc.adRevenue.createPlacement.useMutation({
    onSuccess: () => { utils.adRevenue.listPlacements.invalidate(); setOpen(false); toast.success("广告位已添加"); },
  });

  const [open, setOpen] = useState(false);
  type AdFormat = "BANNER" | "INTERSTITIAL" | "REWARDED_VIDEO" | "NATIVE" | "APP_OPEN" | "MREC";
  const [form, setForm] = useState<{ placementCode: string; placementName: string; adFormat: AdFormat }>({
    placementCode: "", placementName: "", adFormat: "REWARDED_VIDEO",
  });

  const formatLabels: Record<string, string> = {
    BANNER: "横幅", INTERSTITIAL: "插屏", REWARDED_VIDEO: "激励视频",
    NATIVE: "原生", APP_OPEN: "开屏", MREC: "MREC",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">广告位配置</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> 添加广告位</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>添加广告位</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="广告位编码 (如 rewarded_level_complete)" value={form.placementCode} onChange={e => setForm(p => ({ ...p, placementCode: e.target.value }))} />
              <Input placeholder="广告位名称 (如 关卡完成激励视频)" value={form.placementName} onChange={e => setForm(p => ({ ...p, placementName: e.target.value }))} />
              <Select value={form.adFormat} onValueChange={v => setForm(p => ({ ...p, adFormat: v as AdFormat }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REWARDED_VIDEO">激励视频</SelectItem>
                  <SelectItem value="INTERSTITIAL">插屏广告</SelectItem>
                  <SelectItem value="BANNER">横幅广告</SelectItem>
                  <SelectItem value="NATIVE">原生广告</SelectItem>
                  <SelectItem value="APP_OPEN">开屏广告</SelectItem>
                  <SelectItem value="MREC">MREC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.placementCode || !form.placementName}>
                {createMut.isPending ? "添加中..." : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-4">加载中...</div>
      ) : placements.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>暂无广告位</p>
          <p className="text-xs mt-1">建议添加：关卡完成激励视频、失败复活插屏、商店横幅等</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {placements.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{formatLabels[p.adFormat] || p.adFormat}</Badge>
                  <div>
                    <div className="font-medium text-sm">{p.placementName}</div>
                    <div className="text-xs text-muted-foreground">{p.placementCode}</div>
                  </div>
                </div>
                <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "启用" : "停用"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 主页面 ====================
export default function AdRevenuePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">广告聚合管理</h2>
        <p className="text-sm text-muted-foreground">管理广告网络、广告位配置、追踪广告收入（AppLovin + AppsFlyer + SDK 三通道采集）</p>
      </div>

      <Tabs defaultValue="report" className="space-y-4">
        <TabsList>
          <TabsTrigger value="report">收入报表</TabsTrigger>
          <TabsTrigger value="networks">广告网络</TabsTrigger>
          <TabsTrigger value="placements">广告位管理</TabsTrigger>
        </TabsList>

        <TabsContent value="report"><RevenueReport /></TabsContent>
        <TabsContent value="networks"><NetworkManagement /></TabsContent>
        <TabsContent value="placements"><PlacementManagement /></TabsContent>
      </Tabs>
    </div>
  );
}
