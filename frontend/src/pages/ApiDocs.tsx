import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search, Code, Shield, Zap, ChevronRight,
  Database, ArrowRight, Copy, Check, FileJson, Server,
  BarChart3, Users, Bell, Settings, Brain, Package } from "lucide-react";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ReactNode> = {
  "概览": <BarChart3 className="w-4 h-4" />,
  "用户增长": <Zap className="w-4 h-4" />,
  "用户运营": <Users className="w-4 h-4" />,
  "变现管理": <Package className="w-4 h-4" />,
  "实验": <Code className="w-4 h-4" />,
  "数据分析": <Database className="w-4 h-4" />,
  "产品优化": <Brain className="w-4 h-4" />,
  "监控告警": <Bell className="w-4 h-4" />,
  "报表": <FileJson className="w-4 h-4" />,
  "系统管理": <Settings className="w-4 h-4" />,
  "系统": <Server className="w-4 h-4" />,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost" size="sm"
      className="h-6 w-6 p-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("已复制: " + text.slice(0, 50));
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}

export default function ApiDocs() {
  const { data, isLoading } = trpc.apiDocs.getAll.useQuery();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedRouter, setExpandedRouter] = useState<string | null>(null);

  const filteredRouters = useMemo(() => {
    if (!data) return [];
    return data.routers.filter(r => {
      const matchCategory = selectedCategory === "all" || r.category === selectedCategory;
      const matchSearch = !search ||
        r.displayName.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.procedures.some(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
        );
      return matchCategory && matchSearch;
    });
  }, [data, search, selectedCategory]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            API 文档中心
          </h1>
          <p className="text-muted-foreground mt-1">GAMEHOT CDP 系统 tRPC API 完整参考文档</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            v1.0
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
            {data.stats.totalRouters} 模块
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            {data.stats.totalProcedures} 接口
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{data.stats.totalRouters}</div>
                <div className="text-xs text-muted-foreground">路由模块</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{data.stats.totalProcedures}</div>
                <div className="text-xs text-muted-foreground">API 接口</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{data.stats.totalQueries}</div>
                <div className="text-xs text-muted-foreground">Query 查询</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{data.stats.totalMutations}</div>
                <div className="text-xs text-muted-foreground">Mutation 变更</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            快速上手
          </CardTitle>
          <CardDescription>所有 tRPC API 通过 /api/trpc 端点访问，需要登录认证</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                调用约定
              </div>
              <p className="text-xs text-muted-foreground">
                Query 使用 GET 请求，Mutation 使用 POST 请求。所有请求需携带认证 Cookie。
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                路径格式
              </div>
              <p className="text-xs text-muted-foreground">
                <code className="bg-background px-1 rounded">/api/trpc/router.procedure</code>
                <br />例如：<code className="bg-background px-1 rounded">/api/trpc/dashboard.stats</code>
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                前端调用
              </div>
              <p className="text-xs text-muted-foreground">
                使用 <code className="bg-background px-1 rounded">trpc.router.procedure.useQuery()</code> 或
                <code className="bg-background px-1 rounded">.useMutation()</code>
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">前端调用示例 (React)</span>
              <CopyButton text={`const { data } = trpc.dashboard.stats.useQuery();\nconst mutation = trpc.pushCenter.create.useMutation();`} />
            </div>
            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">{`// Query 查询
const { data, isLoading } = trpc.dashboard.stats.useQuery();

// Mutation 变更
const mutation = trpc.pushCenter.create.useMutation({
  onSuccess: () => {
    trpc.useUtils().pushCenter.list.invalidate();
  }
});`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索模块名、接口名或描述..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs + Router List */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="all" className="text-xs">
            全部 ({data.routers.length})
          </TabsTrigger>
          {data.categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs flex items-center gap-1">
              {categoryIcons[cat]}
              {cat} ({data.routers.filter(r => r.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-0">
          <div className="space-y-3">
            {filteredRouters.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>未找到匹配的API模块</p>
                </CardContent>
              </Card>
            ) : (
              filteredRouters.map(r => (
                <Card
                  key={r.name}
                  className={`transition-all cursor-pointer hover:shadow-md ${expandedRouter === r.name ? "ring-1 ring-primary" : ""}`}
                  onClick={() => setExpandedRouter(expandedRouter === r.name ? null : r.name)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {categoryIcons[r.category] || <Code className="w-4 h-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {r.displayName}
                            <code className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {r.name}
                            </code>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">{r.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {r.procedures.length} 接口
                        </Badge>
                        <Badge className="bg-muted text-muted-foreground text-xs">
                          {r.category}
                        </Badge>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedRouter === r.name ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>

                  {expandedRouter === r.name && (
                    <CardContent className="pt-0" onClick={e => e.stopPropagation()}>
                      {r.procedures.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                          该模块的详细接口文档正在补充中
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {r.procedures.map(p => (
                            <div
                              key={p.name}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <Badge
                                className={`mt-0.5 text-[10px] font-mono shrink-0 ${
                                  p.type === "query"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {p.type === "query" ? "GET" : "POST"}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono font-semibold">
                                    {r.name}.{p.name}
                                  </code>
                                  <CopyButton text={`trpc.${r.name}.${p.name}.${p.type === "query" ? "useQuery" : "useMutation"}()`} />
                                  {p.auth === "protected" && (
                                    <Shield className="w-3 h-3 text-amber-500" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                                {p.inputSchema && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <code className="text-xs bg-background px-1.5 py-0.5 rounded text-muted-foreground">
                                      input: {p.inputSchema}
                                    </code>
                                  </div>
                                )}
                              </div>
                              <code className="text-[10px] text-muted-foreground shrink-0 bg-background px-1.5 py-0.5 rounded">
                                /api/trpc/{r.name}.{p.name}
                              </code>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            架构概览
          </CardTitle>
          <CardDescription>GAMEHOT CDP 系统技术架构</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">技术栈</h4>
              <div className="space-y-2">
                {[
                  { label: "前端", tech: "React 19 + Tailwind 4 + shadcn/ui", color: "bg-blue-100 text-blue-700" },
                  { label: "后端", tech: "Express 4 + tRPC 11 + Drizzle ORM", color: "bg-emerald-100 text-emerald-700" },
                  { label: "数据库", tech: "MySQL / TiDB", color: "bg-amber-100 text-amber-700" },
                  { label: "认证", tech: "飞书 OAuth 2.0", color: "bg-purple-100 text-purple-700" },
                  { label: "AI", tech: "LLM (GPT) + 结构化输出", color: "bg-rose-100 text-rose-700" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <Badge className={`${item.color} text-xs w-12 justify-center`}>{item.label}</Badge>
                    <span className="text-sm text-muted-foreground">{item.tech}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">核心特性</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                  <span>端到端类型安全：tRPC 保证前后端类型一致</span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                  <span>Superjson 序列化：Date、BigInt 等类型自动处理</span>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                  <span>Drizzle ORM：类型安全的数据库查询</span>
                </div>
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 mt-0.5 text-purple-500 shrink-0" />
                  <span>AI 驱动：智能巡检、运营助手、异常检测</span>
                </div>
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
                  <span>飞书集成：登录、通知、权限同步</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
