import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calculator, BarChart3, Zap } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { useState, useMemo } from "react";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

const CHANNEL_PRESETS = [
  { name: "AppLovin", cpi: "0.45", color: "#6366f1" },
  { name: "Unity Ads", cpi: "0.55", color: "#10b981" },
  { name: "ironSource", cpi: "0.60", color: "#f59e0b" },
  { name: "Meta", cpi: "0.80", color: "#ef4444" },
  { name: "Google Ads", cpi: "0.70", color: "#8b5cf6" },
];

type ChannelEntry = { name: string; cpi: string; color: string; result?: any };

export default function ROICalculator() {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [cpi, setCpi] = useState("0.50");
  const [dailyAdRev, setDailyAdRev] = useState("0.03");
  const [dailyIapRev, setDailyIapRev] = useState("0.01");
  const [retention, setRetention] = useState({
    d1: "40", d7: "15", d14: "10", d30: "7", d60: "4", d90: "3", d180: "2",
  });
  const [result, setResult] = useState<any>(null);
  const [channels, setChannels] = useState<ChannelEntry[]>([
    { ...CHANNEL_PRESETS[0] }, { ...CHANNEL_PRESETS[1] }, { ...CHANNEL_PRESETS[2] },
  ]);
  const [multiResults, setMultiResults] = useState<ChannelEntry[]>([]);

  const roiMut = trpc.opsTools.roiPrediction.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("计算完成"); },
    onError: () => toast.error("计算失败"),
  });
  const multiMut = trpc.opsTools.roiPrediction.useMutation();

  const getRetentionCurve = () => [
    parseFloat(retention.d1) / 100, parseFloat(retention.d7) / 100,
    parseFloat(retention.d14) / 100, parseFloat(retention.d30) / 100,
    parseFloat(retention.d60) / 100, parseFloat(retention.d90) / 100,
    parseFloat(retention.d180) / 100,
  ];

  const handleCalc = () => {
    roiMut.mutate({
      cpi: parseFloat(cpi) || 0.5,
      dailyAdRevenue: parseFloat(dailyAdRev) || 0.03,
      dailyIapRevenue: parseFloat(dailyIapRev) || 0.01,
      retentionCurve: getRetentionCurve(),
    });
  };

  const handleMultiCalc = async () => {
    const adRev = parseFloat(dailyAdRev) || 0.03;
    const iapRev = parseFloat(dailyIapRev) || 0.01;
    const retCurve = getRetentionCurve();
    const results: ChannelEntry[] = [];
    for (const ch of channels) {
      try {
        const res = await multiMut.mutateAsync({
          cpi: parseFloat(ch.cpi) || 0.5,
          dailyAdRevenue: adRev,
          dailyIapRevenue: iapRev,
          retentionCurve: retCurve,
        });
        results.push({ ...ch, result: res });
      } catch { results.push({ ...ch, result: null }); }
    }
    setMultiResults(results);
    toast.success(`已计算 ${results.length} 个渠道的 ROI`);
  };

  const addChannel = () => {
    const next = CHANNEL_PRESETS[channels.length % CHANNEL_PRESETS.length];
    setChannels(prev => [...prev, { name: `渠道${prev.length + 1}`, cpi: next.cpi, color: next.color }]);
  };
  const removeChannel = (idx: number) => setChannels(prev => prev.filter((_, i) => i !== idx));
  const updateChannel = (idx: number, field: string, val: string) => {
    setChannels(prev => prev.map((ch, i) => i === idx ? { ...ch, [field]: val } : ch));
  };

  const mergedCurveData = useMemo(() => {
    if (multiResults.length === 0) return [];
    const daySet = new Set<number>();
    multiResults.forEach(ch => ch.result?.ltvCurve?.forEach((p: any) => daySet.add(p.day)));
    const days = Array.from(daySet).sort((a, b) => a - b);
    return days.map(day => {
      const point: any = { day };
      multiResults.forEach(ch => {
        const p = ch.result?.ltvCurve?.find((c: any) => c.day === day);
        point[`${ch.name}_ltv`] = p?.ltv || 0;
        point[`${ch.name}_roi`] = p?.roi || 0;
      });
      return point;
    });
  }, [multiResults]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === "single" ? "default" : "outline"} size="sm" onClick={() => setMode("single")}>
          单渠道计算
        </Button>
        <Button variant={mode === "multi" ? "default" : "outline"} size="sm" onClick={() => setMode("multi")}>
          <BarChart3 className="h-3.5 w-3.5 mr-1" />多渠道对比
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-indigo-500" />公共参数
        </CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mode === "single" && (
              <div>
                <label className="text-xs text-muted-foreground">CPI ($)</label>
                <Input value={cpi} onChange={e => setCpi(e.target.value)} type="number" step="0.01" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">日均广告收入/用户 ($)</label>
              <Input value={dailyAdRev} onChange={e => setDailyAdRev(e.target.value)} type="number" step="0.001" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">日均IAP收入/用户 ($)</label>
              <Input value={dailyIapRev} onChange={e => setDailyIapRev(e.target.value)} type="number" step="0.001" />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">留存率曲线 (%)</label>
            <div className="grid grid-cols-7 gap-2 mt-1">
              {Object.entries(retention).map(([key, val]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground uppercase">{key}</label>
                  <Input value={val} onChange={e => setRetention(p => ({ ...p, [key]: e.target.value }))} type="number" className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </div>
          {mode === "single" ? (
            <Button className="mt-3" onClick={handleCalc} disabled={roiMut.isPending}>
              <Zap className="h-4 w-4 mr-1" />{roiMut.isPending ? "计算中..." : "计算 ROI"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {mode === "multi" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />渠道 CPI 配置
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {channels.map((ch, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                  <Input className="flex-1 h-8 text-xs" value={ch.name} onChange={e => updateChannel(idx, "name", e.target.value)} placeholder="渠道名称" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">CPI $</span>
                    <Input className="w-20 h-8 text-xs" value={ch.cpi} onChange={e => updateChannel(idx, "cpi", e.target.value)} type="number" step="0.01" />
                  </div>
                  {channels.length > 2 && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeChannel(idx)}>
                      <span className="text-red-500 text-xs">×</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={addChannel}>+ 添加渠道</Button>
              <Button onClick={handleMultiCalc} disabled={multiMut.isPending}>
                <Zap className="h-4 w-4 mr-1" />{multiMut.isPending ? "计算中..." : `对比计算 (${channels.length} 个渠道)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "single" && result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">回本天数</p>
                <p className="text-2xl font-bold text-indigo-600">{result.paybackDay >= 0 ? `D${result.paybackDay}` : "未回本"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">180天 LTV</p>
                <p className="text-2xl font-bold">${result.totalLtv180?.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">180天 ROI</p>
                <p className={`text-2xl font-bold ${result.roi180 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.roi180?.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">CPI</p>
                <p className="text-2xl font-bold">${parseFloat(cpi).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">LTV & ROI 曲线</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={result.ltvCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: "天数", position: "insideBottom", offset: -5 }} />
                  <YAxis yAxisId="ltv" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="roi" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="ltv" type="monotone" dataKey="ltv" stroke="#6366f1" name="LTV ($)" strokeWidth={2} />
                  <Line yAxisId="roi" type="monotone" dataKey="roi" stroke="#10b981" name="ROI (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {mode === "multi" && multiResults.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">渠道 ROI 对比摘要</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">渠道</th>
                  <th className="text-right">CPI</th>
                  <th className="text-right">回本天数</th>
                  <th className="text-right">180天 LTV</th>
                  <th className="text-right">180天 ROI</th>
                  <th className="text-right">评级</th>
                </tr></thead>
                <tbody>
                  {multiResults.sort((a, b) => (b.result?.roi180 || -999) - (a.result?.roi180 || -999)).map((ch) => {
                    const roi = ch.result?.roi180 || 0;
                    const grade = roi >= 100 ? "S" : roi >= 50 ? "A" : roi >= 0 ? "B" : roi >= -30 ? "C" : "D";
                    const gradeColor = { S: "text-green-600", A: "text-emerald-600", B: "text-yellow-600", C: "text-orange-600", D: "text-red-600" }[grade];
                    return (
                      <tr key={ch.name} className="border-b hover:bg-muted/50">
                        <td className="py-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: ch.color }} />
                          <span className="font-medium">{ch.name}</span>
                        </td>
                        <td className="text-right">${parseFloat(ch.cpi).toFixed(2)}</td>
                        <td className="text-right font-medium">{ch.result?.paybackDay >= 0 ? `D${ch.result.paybackDay}` : "未回本"}</td>
                        <td className="text-right">${ch.result?.totalLtv180?.toFixed(2)}</td>
                        <td className={`text-right font-bold ${gradeColor}`}>{roi.toFixed(1)}%</td>
                        <td className="text-right"><Badge variant="outline" className={`text-[10px] ${gradeColor}`}>{grade}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">多渠道 LTV 曲线对比</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedCurveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {multiResults.map((ch, i) => (
                    <Line key={ch.name} type="monotone" dataKey={`${ch.name}_ltv`}
                      stroke={ch.color || COLORS[i % COLORS.length]} name={`${ch.name} LTV`} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
