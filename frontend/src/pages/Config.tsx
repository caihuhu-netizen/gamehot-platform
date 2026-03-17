import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Plus, Globe, Package, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Config() {
  const utils = trpc.useUtils();
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [editingRegion, setEditingRegion] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: regions, isLoading: regionsLoading } = trpc.config.listRegionGroups.useQuery();
  const { data: countries, isLoading: countriesLoading } = trpc.config.listCountries.useQuery();
  const { data: items, isLoading: itemsLoading } = trpc.config.listItems.useQuery();

  const createRegion = trpc.config.createRegionGroup.useMutation({
    onSuccess: () => { utils.config.listRegionGroups.invalidate(); setShowCreateRegion(false); toast.success("大区创建成功"); },
    onError: (err) => toast.error(err.message),
  });
  const createItem = trpc.config.createItem.useMutation({
    onSuccess: () => { utils.config.listItems.invalidate(); setShowCreateItem(false); toast.success("道具创建成功"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统配置</h1>
        <p className="text-muted-foreground text-sm mt-1">地区配置、道具管理、全局参数设置</p>
      </div>

      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions">地区配置</TabsTrigger>
          <TabsTrigger value="countries">国家列表</TabsTrigger>
          <TabsTrigger value="items">道具管理</TabsTrigger>
        </TabsList>

        <TabsContent value="regions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />大区配置
                </CardTitle>
                <Dialog open={showCreateRegion} onOpenChange={setShowCreateRegion}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建大区</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>创建大区</DialogTitle></DialogHeader>
                    <RegionForm onSubmit={(data) => createRegion.mutate(data)} loading={createRegion.isPending} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>大区编码</TableHead>
                    <TableHead>大区名称</TableHead>
                    <TableHead>默认货币</TableHead>
                    <TableHead>默认语言</TableHead>
                    <TableHead>价格等级</TableHead>
                    <TableHead>广告</TableHead>
                    <TableHead>内购</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : regions?.length ? (
                    regions.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.groupCode}</TableCell>
                        <TableCell className="text-sm">{r.groupName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.defaultCurrency}</Badge></TableCell>
                        <TableCell className="text-xs">{r.defaultLanguage}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{r.priceLevel}</Badge></TableCell>
                        <TableCell>{r.hasAdsEnabled ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">开启</Badge> : <Badge variant="outline" className="text-xs">关闭</Badge>}</TableCell>
                        <TableCell>{r.hasIapEnabled ? <Badge className="bg-blue-100 text-blue-800 text-xs">开启</Badge> : <Badge variant="outline" className="text-xs">关闭</Badge>}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setEditingRegion(r)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">暂无大区配置</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Region Dialog */}
          <Dialog open={!!editingRegion} onOpenChange={(open) => { if (!open) setEditingRegion(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>编辑大区: {editingRegion?.groupCode}</DialogTitle></DialogHeader>
              {editingRegion && (
                <RegionEditForm
                  region={editingRegion}
                  onSubmit={() => {
                    setEditingRegion(null);
                    toast.success("大区配置已更新（演示模式）");
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="countries" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />国家列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>国家代码</TableHead>
                    <TableHead>国家名称</TableHead>
                    <TableHead>大区</TableHead>
                    <TableHead>货币</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead>时区</TableHead>
                    <TableHead>价格倍率</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countriesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : countries?.length ? (
                    countries.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.countryCode}</TableCell>
                        <TableCell className="text-sm">{c.countryName}</TableCell>
                        <TableCell className="text-xs">#{c.regionGroupId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.currencyCode}</Badge></TableCell>
                        <TableCell className="text-xs">{c.languageCode}</TableCell>
                        <TableCell className="text-xs">{c.timezone}</TableCell>
                        <TableCell className="text-sm">{c.priceMultiplier}x</TableCell>
                        <TableCell>{c.isActive ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">活跃</Badge> : <Badge variant="outline" className="text-xs">停用</Badge>}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">暂无国家数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />道具管理
                </CardTitle>
                <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建道具</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>创建道具</DialogTitle></DialogHeader>
                    <ItemForm onSubmit={(data) => createItem.mutate(data)} loading={createItem.isPending} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>道具编码</TableHead>
                    <TableHead>道具名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>消耗品</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}</TableRow>
                    ))
                  ) : items?.length ? (
                    items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                        <TableCell className="text-sm">{item.itemName}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{item.itemType}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{item.description || "-"}</TableCell>
                        <TableCell>{item.isConsumable ? "是" : "否"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无道具数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Item Dialog */}
          <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>编辑道具: {editingItem?.itemName}</DialogTitle></DialogHeader>
              {editingItem && (
                <ItemEditForm
                  item={editingItem}
                  onSubmit={() => {
                    setEditingItem(null);
                    toast.success("道具配置已更新（演示模式）");
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RegionForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    groupCode: "", groupName: "", defaultCurrency: "USD", defaultLanguage: "en", priceLevel: "MID",
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>大区编码</Label><Input value={form.groupCode} onChange={(e) => setForm({ ...form, groupCode: e.target.value })} placeholder="ASIA" /></div>
        <div><Label>大区名称</Label><Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} placeholder="亚太地区" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>默认货币</Label><Input value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })} /></div>
        <div><Label>默认语言</Label><Input value={form.defaultLanguage} onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })} /></div>
        <div><Label>价格等级</Label><Input value={form.priceLevel} onChange={(e) => setForm({ ...form, priceLevel: e.target.value })} /></div>
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.groupCode || !form.groupName} className="w-full">{loading ? "创建中..." : "创建大区"}</Button>
    </div>
  );
}

function RegionEditForm({ region, onSubmit }: { region: any; onSubmit: () => void }) {
  const [form, setForm] = useState({
    groupCode: region.groupCode || "",
    groupName: region.groupName || "",
    defaultCurrency: region.defaultCurrency || "USD",
    defaultLanguage: region.defaultLanguage || "en",
    priceLevel: region.priceLevel || "MID",
    hasAdsEnabled: !!region.hasAdsEnabled,
    hasIapEnabled: !!region.hasIapEnabled,
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>大区编码</Label><Input value={form.groupCode} disabled className="bg-muted" /></div>
        <div><Label>大区名称</Label><Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>默认货币</Label><Input value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })} /></div>
        <div><Label>默认语言</Label><Input value={form.defaultLanguage} onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })} /></div>
        <div><Label>价格等级</Label><Input value={form.priceLevel} onChange={(e) => setForm({ ...form, priceLevel: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.hasAdsEnabled} onCheckedChange={(v) => setForm({ ...form, hasAdsEnabled: v })} />
          <Label>广告开关</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.hasIapEnabled} onCheckedChange={(v) => setForm({ ...form, hasIapEnabled: v })} />
          <Label>内购开关</Label>
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full">保存修改</Button>
    </div>
  );
}

function ItemForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    itemCode: "", itemName: "", itemType: "BOOSTER", description: "", isConsumable: 1,
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>道具编码</Label><Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} placeholder="ITEM_HAMMER" /></div>
        <div><Label>道具名称</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="锤子" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>类型</Label><Input value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} placeholder="BOOSTER" /></div>
        <div><Label>描述</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="消除单个方块" /></div>
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.itemCode || !form.itemName} className="w-full">{loading ? "创建中..." : "创建道具"}</Button>
    </div>
  );
}

function ItemEditForm({ item, onSubmit }: { item: any; onSubmit: () => void }) {
  const [form, setForm] = useState({
    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    itemType: item.itemType || "BOOSTER",
    description: item.description || "",
    isConsumable: !!item.isConsumable,
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>道具编码</Label><Input value={form.itemCode} disabled className="bg-muted" /></div>
        <div><Label>道具名称</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>类型</Label><Input value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} /></div>
        <div><Label>描述</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.isConsumable} onCheckedChange={(v) => setForm({ ...form, isConsumable: v })} />
        <Label>消耗品</Label>
      </div>
      <Button onClick={onSubmit} className="w-full">保存修改</Button>
    </div>
  );
}
