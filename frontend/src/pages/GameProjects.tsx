import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Gamepad2, Plus, Settings, Key, Trash2, Copy, Eye, EyeOff, BarChart3, Globe, RefreshCw, Plug, CheckCircle2, XCircle, AlertCircle, Loader2, Pencil, ShieldCheck } from "lucide-react";

export default function GameProjects() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState({ gameCode: '', gameName: '', genre: 'CASUAL', platform: 'ALL', bundleId: '', storeUrl: '', timezone: 'UTC' });

  const { data: games, isLoading: gamesLoading, refetch } = trpc.gameProjects.list.useQuery();
  const createMut = trpc.gameProjects.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success("游戏项目创建成功"); } });
  const deleteMut = trpc.gameProjects.delete.useMutation({ onSuccess: () => { refetch(); toast.success("已删除"); } });
  const regenKeysMut = trpc.gameProjects.regenerateKeys.useMutation({ onSuccess: () => { refetch(); toast.success("API密钥已重新生成"); } });

  const selected = games?.find(g => g.id === selectedGame);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制到剪贴板`);
  };

  const statusColor = (s: string) => s === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : s === 'PAUSED' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
  const genreLabel: Record<string, string> = { CASUAL: '休闲', PUZZLE: '益智', MATCH3: '三消', IDLE: '放置', MERGE: '合成' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">游戏项目管理</h1>
          <p className="text-muted-foreground mt-1">管理多个游戏项目，每个游戏独立的SDK密钥和配置体系</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新建游戏项目</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新建游戏项目</DialogTitle>
              <DialogDescription>创建新游戏后将自动生成SDK API密钥</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>游戏代码</Label>
                  <Input placeholder="如 color_block_jam" value={form.gameCode} onChange={e => setForm({...form, gameCode: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>游戏名称</Label>
                  <Input placeholder="如 GAMEHOT Puzzle" value={form.gameName} onChange={e => setForm({...form, gameName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>游戏类型</Label>
                  <Select value={form.genre} onValueChange={v => setForm({...form, genre: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASUAL">休闲</SelectItem>
                      <SelectItem value="PUZZLE">益智</SelectItem>
                      <SelectItem value="MATCH3">三消</SelectItem>
                      <SelectItem value="IDLE">放置</SelectItem>
                      <SelectItem value="MERGE">合成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>平台</Label>
                  <Select value={form.platform} onValueChange={v => setForm({...form, platform: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全平台</SelectItem>
                      <SelectItem value="IOS">iOS</SelectItem>
                      <SelectItem value="ANDROID">Android</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bundle ID</Label>
                <Input placeholder="com.gamehot.xxx" value={form.bundleId} onChange={e => setForm({...form, bundleId: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={() => createMut.mutate(form)} disabled={!form.gameCode || !form.gameName}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games?.map(game => (
          <Card key={game.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedGame === game.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedGame(game.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{game.gameName}</CardTitle>
                    <CardDescription className="text-xs">{game.gameCode}</CardDescription>
                  </div>
                </div>
                <Badge className={statusColor(game.status)}>{game.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{game.platform}</span>
                <span>{genreLabel[game.genre] || game.genre}</span>
                {game.bundleId && <span className="text-xs truncate max-w-[120px]">{game.bundleId}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />{selected.gameName} - 项目详情</CardTitle>
                <CardDescription>SDK密钥管理、第三方服务配置、访问统计</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { if (confirm('确定删除此游戏项目？')) deleteMut.mutate({ id: selected.id }); }}>
                  <Trash2 className="w-4 h-4 mr-1" />删除
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sdk">
              <TabsList>
                <TabsTrigger value="sdk"><Key className="w-4 h-4 mr-1" />SDK密钥</TabsTrigger>
                <TabsTrigger value="services"><Plug className="w-4 h-4 mr-1" />第三方服务</TabsTrigger>
                <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-1" />访问统计</TabsTrigger>
              </TabsList>

              <TabsContent value="sdk" className="space-y-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-sm">SDK 认证密钥</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="w-24 text-right text-sm">API Key:</Label>
                      <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono">
                        {showSecrets[selected.id] ? selected.sdkApiKey : '••••••••••••••••••••'}
                      </code>
                      <Button variant="ghost" size="icon" aria-label="查看" onClick={() => setShowSecrets(prev => ({...prev, [selected.id]: !prev[selected.id]}))}>
                        {showSecrets[selected.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="复制" onClick={() => copyToClipboard(selected.sdkApiKey, 'API Key')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-24 text-right text-sm">Secret:</Label>
                      <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono">
                        {showSecrets[selected.id] ? selected.sdkSecret : '••••••••••••••••••••••••••••'}
                      </code>
                      <Button variant="ghost" size="icon" aria-label="查看" onClick={() => setShowSecrets(prev => ({...prev, [selected.id]: !prev[selected.id]}))}>
                        {showSecrets[selected.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="复制" onClick={() => copyToClipboard(selected.sdkSecret, 'Secret')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { if (confirm('重新生成将使旧密钥失效，确定？')) regenKeysMut.mutate({ id: selected.id }); }}>
                    <RefreshCw className="w-4 h-4 mr-1" />重新生成密钥
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm">SDK API 端点</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">GET</Badge><code className="text-xs">/api/sdk/segment?userId=xxx</code><span className="text-muted-foreground text-xs">查询用户分层</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">GET</Badge><code className="text-xs">/api/sdk/difficulty?userId=xxx</code><span className="text-muted-foreground text-xs">获取难度配置</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">POST</Badge><code className="text-xs">/api/sdk/monetize/check</code><span className="text-muted-foreground text-xs">变现触发检查</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">POST</Badge><code className="text-xs">/api/sdk/event</code><span className="text-muted-foreground text-xs">上报行为事件</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">POST</Badge><code className="text-xs">/api/sdk/segment/compute</code><span className="text-muted-foreground text-xs">计算用户分层</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">GET</Badge><code className="text-xs">/api/sdk/config</code><span className="text-muted-foreground text-xs">获取完整配置</span></div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="font-mono text-xs">GET</Badge><code className="text-xs">/api/sdk/experiment?userId=xxx</code><span className="text-muted-foreground text-xs">获取实验分组</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">所有请求需在Header中携带 <code className="bg-background px-1 rounded">X-API-Key: {"<your_api_key>"}</code></p>
                </div>
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <ServiceConfigPanel gameId={selected.id} />
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <SdkAccessStats gameId={selected.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 第三方服务配置面板 ====================
function ServiceConfigPanel({ gameId }: { gameId: number }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: configs, refetch } = trpc.gameServiceConfigs.list.useQuery({ gameId });
  const { data: serviceTypes } = trpc.gameServiceConfigs.serviceTypes.useQuery();
  const deleteMut = trpc.gameServiceConfigs.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("配置已删除"); },
    onError: (e) => toast.error(e.message),
  });
  const verifyMut = trpc.gameServiceConfigs.verify.useMutation({
    onSuccess: (result) => {
      refetch();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    },
    onError: (e) => toast.error(e.message),
  });

  // 已配置的服务类型
  const configuredTypes = new Set(configs?.map(c => c.serviceType) || []);
  // 可添加的服务类型
  const availableTypes = serviceTypes?.filter(t => !configuredTypes.has(t.value)) || [];

  const verifyStatusIcon = (status: string | null) => {
    if (status === "SUCCESS") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "FAILED") return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">第三方服务配置</h3>
          <p className="text-sm text-muted-foreground mt-1">配置 AppsFlyer、AppLovin 等第三方平台的 API 凭证，用于数据同步</p>
        </div>
        {availableTypes.length > 0 && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />添加服务
          </Button>
        )}
      </div>

      {/* 已配置的服务列表 */}
      {configs && configs.length > 0 ? (
        <div className="space-y-3">
          {configs.map((config: any) => {
            const meta = serviceTypes?.find(t => t.value === config.serviceType);
            return (
              <div key={config.id} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plug className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {config.serviceName}
                        <Badge variant={config.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                          {config.status === 'ACTIVE' ? '启用' : '停用'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{meta?.label || config.serviceType} — {meta?.description || ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => verifyMut.mutate({ id: config.id })} disabled={verifyMut.isPending}>
                      {verifyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span className="ml-1 text-xs">验证</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(config.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('确定删除此服务配置？')) deleteMut.mutate({ id: config.id }); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {config.appId && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">App ID</div>
                      <code className="text-xs bg-background px-2 py-1 rounded">{config.appId}</code>
                    </div>
                  )}
                  {config.appName && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">App Name</div>
                      <span className="text-xs">{config.appName}</span>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">API Key</div>
                    <code className="text-xs bg-background px-2 py-1 rounded">{config.apiKey || '未配置'}</code>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">验证状态</div>
                    <div className="flex items-center gap-1">
                      {verifyStatusIcon(config.lastVerifiedStatus)}
                      <span className="text-xs">
                        {config.lastVerifiedStatus === 'SUCCESS' ? '已验证' : config.lastVerifiedStatus === 'FAILED' ? '验证失败' : '未验证'}
                      </span>
                    </div>
                  </div>
                </div>

                {config.lastVerifiedMessage && config.lastVerifiedStatus === 'FAILED' && (
                  <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded">
                    {config.lastVerifiedMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Plug className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂未配置任何第三方服务</p>
          <p className="text-xs mt-1">点击「添加服务」配置 AppsFlyer、AppLovin 等平台凭证</p>
        </div>
      )}

      {/* 添加服务对话框 */}
      {showAddDialog && (
        <AddServiceDialog
          gameId={gameId}
          availableTypes={availableTypes}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => { refetch(); setShowAddDialog(false); }}
        />
      )}

      {/* 编辑服务对话框 */}
      {editingId && (
        <EditServiceDialog
          configId={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => { refetch(); setEditingId(null); }}
        />
      )}
    </div>
  );
}

// ==================== 添加服务对话框 ====================
function AddServiceDialog({ gameId, availableTypes, onClose, onSuccess }: {
  gameId: number;
  availableTypes: Array<{ value: string; label: string; description: string; requiredFields: string[]; optionalFields: string[]; appIdPlaceholder?: string; apiKeyPlaceholder?: string }>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState({ serviceName: '', appId: '', appName: '', apiKey: '', apiSecret: '' });

  const createMut = trpc.gameServiceConfigs.create.useMutation({
    onSuccess: () => { toast.success("服务配置已添加"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const selectedMeta = availableTypes.find(t => t.value === selectedType);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const meta = availableTypes.find(t => t.value === type);
    setForm({ serviceName: meta?.label || '', appId: '', appName: '', apiKey: '', apiSecret: '' });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加第三方服务</DialogTitle>
          <DialogDescription>选择服务类型并填写 API 凭证信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>服务类型 <span className="text-red-500">*</span></Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue placeholder="选择服务类型" /></SelectTrigger>
              <SelectContent>
                {availableTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">— {t.description?.slice(0, 20)}...</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && selectedMeta && (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                {selectedMeta.description}
              </div>

              <div className="space-y-2">
                <Label>配置名称 <span className="text-red-500">*</span></Label>
                <Input
                  value={form.serviceName}
                  onChange={e => setForm({...form, serviceName: e.target.value})}
                  placeholder={`如 My Game - ${selectedMeta.label}`}
                />
              </div>

              {selectedMeta.requiredFields.includes('appId') && (
                <div className="space-y-2">
                  <Label>App ID {selectedMeta.requiredFields.includes('appId') && <span className="text-red-500">*</span>}</Label>
                  <Input
                    value={form.appId}
                    onChange={e => setForm({...form, appId: e.target.value})}
                    placeholder={selectedMeta.appIdPlaceholder || '平台应用 ID'}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>App Name</Label>
                <Input
                  value={form.appName}
                  onChange={e => setForm({...form, appName: e.target.value})}
                  placeholder="应用名称（可选）"
                />
              </div>

              <div className="space-y-2">
                <Label>API Key / Token {selectedMeta.requiredFields.includes('apiKey') && <span className="text-red-500">*</span>}</Label>
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={e => setForm({...form, apiKey: e.target.value})}
                  placeholder={selectedMeta.apiKeyPlaceholder || 'API Key'}
                />
              </div>

              {(selectedMeta.requiredFields.includes('apiSecret') || selectedMeta.optionalFields.includes('apiSecret')) && (
                <div className="space-y-2">
                  <Label>API Secret {selectedMeta.requiredFields.includes('apiSecret') && <span className="text-red-500">*</span>}</Label>
                  <Input
                    type="password"
                    value={form.apiSecret}
                    onChange={e => setForm({...form, apiSecret: e.target.value})}
                    placeholder="API Secret（如需要）"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => createMut.mutate({ gameId, serviceType: selectedType, ...form })}
            disabled={!selectedType || !form.serviceName || createMut.isPending}
          >
            {createMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 编辑服务对话框 ====================
function EditServiceDialog({ configId, onClose, onSuccess }: {
  configId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: config, isLoading } = trpc.gameServiceConfigs.getById.useQuery({ id: configId });
  const { data: serviceTypes } = trpc.gameServiceConfigs.serviceTypes.useQuery();
  const [form, setForm] = useState<{ serviceName: string; appId: string; appName: string; apiKey: string; apiSecret: string; status: string }>({
    serviceName: '', appId: '', appName: '', apiKey: '', apiSecret: '', status: 'ACTIVE',
  });
  const [initialized, setInitialized] = useState(false);

  // 初始化表单
  if (config && !initialized) {
    setForm({
      serviceName: config.serviceName || '',
      appId: config.appId || '',
      appName: config.appName || '',
      apiKey: '', // 不回填脱敏后的值
      apiSecret: '',
      status: config.status || 'ACTIVE',
    });
    setInitialized(true);
  }

  const updateMut = trpc.gameServiceConfigs.update.useMutation({
    onSuccess: () => { toast.success("配置已更新"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const meta = serviceTypes?.find(t => t.value === config?.serviceType);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑服务配置 — {meta?.label || config?.serviceType}</DialogTitle>
          <DialogDescription>修改 API 凭证信息。留空的字段将保持原值不变。</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>配置名称</Label>
              <Input value={form.serviceName} onChange={e => setForm({...form, serviceName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>App ID</Label>
              <Input
                value={form.appId}
                onChange={e => setForm({...form, appId: e.target.value})}
                placeholder={meta?.appIdPlaceholder || '平台应用 ID'}
              />
              {config?.appId && <p className="text-xs text-muted-foreground">当前值: {config.appId}</p>}
            </div>

            <div className="space-y-2">
              <Label>App Name</Label>
              <Input value={form.appName} onChange={e => setForm({...form, appName: e.target.value})} placeholder="应用名称" />
            </div>

            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={e => setForm({...form, apiKey: e.target.value})}
                placeholder="留空则保持原值不变"
              />
              {config?.apiKey && <p className="text-xs text-muted-foreground">当前值: {config.apiKey}</p>}
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input
                type="password"
                value={form.apiSecret}
                onChange={e => setForm({...form, apiSecret: e.target.value})}
                placeholder="留空则保持原值不变"
              />
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">启用</SelectItem>
                  <SelectItem value="INACTIVE">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => {
              const data: any = { id: configId };
              if (form.serviceName) data.serviceName = form.serviceName;
              if (form.appId) data.appId = form.appId;
              if (form.appName) data.appName = form.appName;
              if (form.apiKey) data.apiKey = form.apiKey;
              if (form.apiSecret) data.apiSecret = form.apiSecret;
              if (form.status) data.status = form.status;
              updateMut.mutate(data);
            }}
            disabled={updateMut.isPending}
          >
            {updateMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== SDK 访问统计 ====================
function SdkAccessStats({ gameId }: { gameId: number }) {
  const { data: stats } = trpc.gameProjects.accessStats.useQuery({ gameId });
  const { data: logs } = trpc.gameProjects.accessLogs.useQuery({ gameId, page: 1, pageSize: 20 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats?.map((s: any) => (
          <Card key={s.endpoint} className="p-3">
            <div className="text-xs text-muted-foreground truncate">{s.endpoint}</div>
            <div className="text-lg font-bold mt-1">{s.count}</div>
            <div className="text-xs text-muted-foreground">平均 {Math.round(Number(s.avgResponseTime) || 0)}ms</div>
          </Card>
        ))}
        {(!stats || stats.length === 0) && (
          <div className="col-span-4 text-center py-8 text-muted-foreground">暂无SDK访问记录</div>
        )}
      </div>

      {logs && logs.data.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">最近访问日志</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">端点</th>
                  <th className="px-3 py-2 text-left">用户ID</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">耗时</th>
                  <th className="px-3 py-2 text-left">时间</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log: any) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{log.endpoint}</td>
                    <td className="px-3 py-2 text-xs">{log.userId || '-'}</td>
                    <td className="px-3 py-2"><Badge variant={log.responseStatus === 200 ? 'default' : 'destructive'} className="text-xs">{log.responseStatus}</Badge></td>
                    <td className="px-3 py-2 text-xs">{log.responseTimeMs}ms</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
