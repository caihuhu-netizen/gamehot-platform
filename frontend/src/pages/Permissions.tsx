import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Shield, FileText, Users, Plus, Pencil, Trash2, Lock, Unlock,
  UserPlus, ShieldCheck, ShieldAlert, Crown, Eye, Settings, Key, } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "创建", UPDATE: "更新", DELETE: "删除", TOGGLE: "切换", START: "启动", STOP: "停止",
  EXPORT: "导出", IMPORT: "导入", PUBLISH: "发布", ROLLBACK: "回滚", LOGIN: "登录", LOGOUT: "登出",
  ACTIVATE: "激活", DEACTIVATE: "停用", SYNC: "同步", EXECUTE: "执行", APPROVE: "审批", REJECT: "拒绝",
};

const MODULE_LABELS: Record<string, string> = {
  segments: "用户分层", experiments: "A/B实验", difficulty: "难度调度", monetize: "变现触发",
  probes: "探针关卡", levels: "关卡管理", config: "系统配置", permissions: "权限管理",
  users: "用户管理", game_projects: "游戏项目", config_versions: "配置版本", loop_engine: "闭环引擎",
  te_integration: "数数科技", analytics: "数据分析", user_profiles: "用户画像", sdk: "SDK",
  push_center: "推送中心", user_recall: "用户召回", iap_products: "内购商品", export_center: "数据导出",
  alert_rules: "告警规则", inspection: "系统巡检", pricing_engine: "智能定价",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 border-green-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
  PUBLISH: "bg-purple-100 text-purple-700 border-purple-200",
  ROLLBACK: "bg-orange-100 text-orange-700 border-orange-200",
  EXPORT: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  super_admin: Crown,
  admin: ShieldCheck,
  operator: Settings,
  analyst: Eye,
  viewer: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  operator: "bg-green-100 text-green-700 border-green-200",
  analyst: "bg-amber-100 text-amber-700 border-amber-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
};

const ALL_ACTIONS = ["view", "create", "edit", "delete", "export", "rollback", "batch"];

function formatDetail(detail: any): string {
  if (!detail) return "-";
  const str = typeof detail === "string" ? detail : "";
  try {
    const obj = typeof detail === "object" ? detail : JSON.parse(str);
    if (typeof obj === "object" && obj !== null) {
      const entries = Object.entries(obj).slice(0, 4);
      return entries.map(([k, v]) => {
        const val = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${k}: ${val.length > 30 ? val.slice(0, 30) + "..." : val}`;
      }).join(" | ");
    }
    return str;
  } catch {
    return str.length > 80 ? str.slice(0, 80) + "..." : str;
  }
}

export default function Permissions() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [logPage, setLogPage] = useState(1);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [userRoleDialogOpen, setUserRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: roles, refetch: refetchRoles } = trpc.feishu.listRoles.useQuery();
  const { data: logs, isLoading: logsLoading } = trpc.logs.list.useQuery({ page: logPage, pageSize: 20 });
  const { data: menuPerms } = trpc.feishu.listMenuPermissions.useQuery();
  const { data: myPerms } = trpc.feishu.myPermissions.useQuery();
  const { data: allUsers } = trpc.feishu.listUsers.useQuery();

  const createRole = trpc.feishu.createRole.useMutation({
    onSuccess: () => { toast.success(isEn ? "Role created" : "角色已创建"); refetchRoles(); setRoleDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateRole = trpc.feishu.updateRole.useMutation({
    onSuccess: () => { toast.success(isEn ? "Role updated" : "角色已更新"); refetchRoles(); setRoleDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRole = trpc.feishu.deleteRole.useMutation({
    onSuccess: () => { toast.success(isEn ? "Role deleted" : "角色已删除"); refetchRoles(); },
    onError: (e) => toast.error(e.message),
  });

  const setRolePerms = trpc.feishu.setRolePermissions.useMutation({
    onSuccess: () => { toast.success(isEn ? "Permissions saved" : "权限已保存"); setPermDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const setUserRoles = trpc.feishu.setUserRoles.useMutation({
    onSuccess: () => { toast.success(isEn ? "User roles updated" : "用户角色已更新"); setUserRoleDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  // Role form state
  const [roleForm, setRoleForm] = useState({
    roleCode: "", roleName: "", description: "", level: 0,
  });

  // Permission matrix state
  const [permMatrix, setPermMatrix] = useState<Record<number, string[]>>({});
  const { data: rolePermsData } = trpc.feishu.getRolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId && permDialogOpen }
  );

  // User role assignment state
  const [userSelectedRoles, setUserSelectedRoles] = useState<number[]>([]);
  const { data: userRolesData } = trpc.feishu.getUserRoles.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId && userRoleDialogOpen }
  );

  function openCreateRole() {
    setEditingRole(null);
    setRoleForm({ roleCode: "", roleName: "", description: "", level: 0 });
    setRoleDialogOpen(true);
  }

  function openEditRole(role: any) {
    setEditingRole(role);
    setRoleForm({
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description || "",
      level: role.level,
    });
    setRoleDialogOpen(true);
  }

  function handleSaveRole() {
    if (editingRole) {
      updateRole.mutate({ id: editingRole.id, ...roleForm });
    } else {
      createRole.mutate(roleForm);
    }
  }

  function openPermMatrix(roleId: number) {
    setSelectedRoleId(roleId);
    setPermDialogOpen(true);
    // Initialize matrix from existing permissions
    if (rolePermsData) {
      const matrix: Record<number, string[]> = {};
      // Will be populated when data loads
      setPermMatrix(matrix);
    }
  }

  function handleSavePerms() {
    if (!selectedRoleId || !menuPerms) return;
    const permissions = Object.entries(permMatrix)
      .filter(([_, actions]) => actions.length > 0)
      .map(([menuPermId, actions]) => ({
        menuPermissionId: Number(menuPermId),
        actions,
      }));
    setRolePerms.mutate({ roleId: selectedRoleId, permissions });
  }

  function togglePermAction(menuPermId: number, action: string) {
    setPermMatrix(prev => {
      const current = prev[menuPermId] || [];
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [menuPermId]: next };
    });
  }

  function openUserRoleDialog(userId: number) {
    setSelectedUserId(userId);
    setUserRoleDialogOpen(true);
  }

  function handleSaveUserRoles() {
    if (!selectedUserId) return;
    setUserRoles.mutate({ userId: selectedUserId, roleIds: userSelectedRoles });
  }

  // Populate perm matrix when data loads
  useMemo(() => {
    if (rolePermsData && menuPerms) {
      const matrix: Record<number, string[]> = {};
      for (const perm of rolePermsData) {
        const menuPerm = menuPerms.find((m: any) => m.menuCode === perm.menuCode);
        if (menuPerm) {
          matrix[menuPerm.id] = (perm.actions as string[]) || [];
        }
      }
      setPermMatrix(matrix);
    }
  }, [rolePermsData, menuPerms]);

  // Populate user roles when data loads
  useMemo(() => {
    if (userRolesData) {
      setUserSelectedRoles(userRolesData.map((r: any) => r.roleId));
    }
  }, [userRolesData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          {isEn ? "Permission Management" : "权限管理"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isEn ? "Role management, permission matrix, user role assignment, operation logs" : "角色管理、权限矩阵、用户角色分配、操作日志"}
        </p>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-1.5" />
            {isEn ? "Roles" : "角色管理"}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1.5" />
            {isEn ? "User Roles" : "用户角色"}
          </TabsTrigger>
          <TabsTrigger value="myPerms">
            <Key className="h-4 w-4 mr-1.5" />
            {isEn ? "My Permissions" : "我的权限"}
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-1.5" />
            {isEn ? "Logs" : "操作日志"}
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateRole} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {isEn ? "Create Role" : "创建角色"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles?.map((role: any) => {
              const Icon = ROLE_ICONS[role.roleCode] || Shield;
              const colorClass = ROLE_COLORS[role.roleCode] || ROLE_COLORS.viewer;
              return (
                <Card key={role.id} className="relative">
                  {role.isSystem ? (
                    <Badge variant="outline" className="absolute top-3 right-3 text-xs">
                      <Lock className="h-3 w-3 mr-1" />{isEn ? "System" : "系统"}
                    </Badge>
                  ) : null}
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{role.roleName}</p>
                        <p className="text-xs text-muted-foreground">{role.roleCode} · Level {role.level}</p>
                      </div>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPermMatrix(role.id)}>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        {isEn ? "Permissions" : "权限配置"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {isEn ? "Edit" : "编辑"}
                      </Button>
                      {!role.isSystem && (
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600"
                          onClick={() => { if (confirm(isEn ? "Delete this role?" : "确认删除此角色？")) deleteRole.mutate({ id: role.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* User Roles Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isEn ? "User Role Assignment" : "用户角色分配"}</CardTitle>
              <CardDescription>{isEn ? "Assign roles to users for fine-grained access control" : "为用户分配角色，实现精细化访问控制"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isEn ? "User" : "用户"}</TableHead>
                      <TableHead>{isEn ? "Login Method" : "登录方式"}</TableHead>
                      <TableHead>{isEn ? "System Role" : "系统角色"}</TableHead>
                      <TableHead>{isEn ? "Status" : "状态"}</TableHead>
                      <TableHead>{isEn ? "Actions" : "操作"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {(user.name || "U")[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium">{user.name || `User #${user.id}`}</p>
                              <p className="text-xs text-muted-foreground">{user.email || user.openId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {user.loginMethod === "feishu" ? "飞书" : user.loginMethod === "google" ? "Google" : user.loginMethod === "apple" ? "Apple" : user.loginMethod === "feishu_only" ? "飞书(未关联)" : user.loginMethod || "未知"}
                            </Badge>
                            {user.feishuLinked && user.loginMethod !== "feishu_only" && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">飞书已关联</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={user.role === "admin" ? "text-indigo-600 border-indigo-200" : ""}>
                            {user.role === "admin" ? (isEn ? "Admin" : "管理员") : (isEn ? "User" : "普通用户")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                            {user.status === "ACTIVE" ? (isEn ? "Active" : "活跃") : user.status === "RESIGNED" ? (isEn ? "Resigned" : "已离职") : (isEn ? "Inactive" : "未活跃")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openUserRoleDialog(user.id)}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            {isEn ? "Assign Roles" : "分配角色"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Permissions Tab */}
        <TabsContent value="myPerms" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isEn ? "My Permissions" : "我的权限"}</CardTitle>
              <CardDescription>{isEn ? "View your current access permissions" : "查看您当前的访问权限"}</CardDescription>
            </CardHeader>
            <CardContent>
              {myPerms?.permissions?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myPerms.permissions.map((perm: any) => (
                    <div key={perm.menuCode} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{perm.menuName}</p>
                        <Badge variant="outline" className="text-xs">{perm.menuType}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(perm.actions as string[] || []).map((action: string) => (
                          <Badge key={action} variant="secondary" className="text-xs">
                            {ACTION_LABELS[action.toUpperCase()] || action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{isEn ? "No custom permissions assigned. Using default role permissions." : "未分配自定义权限，使用默认角色权限。"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {isEn ? "Operation Logs" : "操作日志"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isEn ? "Time" : "时间"}</TableHead>
                      <TableHead>{isEn ? "User" : "操作人"}</TableHead>
                      <TableHead>{isEn ? "Action" : "操作类型"}</TableHead>
                      <TableHead>{isEn ? "Module" : "模块"}</TableHead>
                      <TableHead>{isEn ? "Target" : "目标"}</TableHead>
                      <TableHead>{isEn ? "Details" : "详情"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                        ))}</TableRow>
                      ))
                    ) : logs?.data?.length ? (
                      logs.data.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</TableCell>
                          <TableCell className="text-sm">{log.userName || `User #${log.userId}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${ACTION_COLORS[log.action] || ""}`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{MODULE_LABELS[log.module] || log.module}</TableCell>
                          <TableCell className="font-mono text-xs">{log.targetId || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                            <span className="line-clamp-2">{formatDetail(log.detail)}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {isEn ? "No operation logs" : "暂无操作日志"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {logs && logs.total > 20 && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>{isEn ? `Total ${logs.total}` : `共 ${logs.total} 条`}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}>
                      {isEn ? "Previous" : "上一页"}
                    </Button>
                    <Button variant="outline" size="sm" disabled={logPage * 20 >= logs.total} onClick={() => setLogPage(p => p + 1)}>
                      {isEn ? "Next" : "下一页"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Create/Edit Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? (isEn ? "Edit Role" : "编辑角色") : (isEn ? "Create Role" : "创建角色")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isEn ? "Role Code" : "角色编码"}</Label>
              <Input value={roleForm.roleCode} onChange={(e) => setRoleForm(f => ({ ...f, roleCode: e.target.value }))}
                disabled={!!editingRole} placeholder="e.g. operator" />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? "Role Name" : "角色名称"}</Label>
              <Input value={roleForm.roleName} onChange={(e) => setRoleForm(f => ({ ...f, roleName: e.target.value }))}
                placeholder={isEn ? "e.g. Operator" : "例如：运营人员"} />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? "Description" : "描述"}</Label>
              <Textarea value={roleForm.description} onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))}
                placeholder={isEn ? "Role description..." : "角色描述..."} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? "Level" : "权限等级"} ({isEn ? "higher = more access" : "数字越大权限越高"})</Label>
              <Input type="number" value={roleForm.level} onChange={(e) => setRoleForm(f => ({ ...f, level: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
            <Button onClick={handleSaveRole} disabled={createRole.isPending || updateRole.isPending}>
              {isEn ? "Save" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Matrix Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEn ? "Permission Matrix" : "权限矩阵"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">{isEn ? "Menu" : "菜单"}</TableHead>
                  {ALL_ACTIONS.map(action => (
                    <TableHead key={action} className="text-center text-xs w-16">
                      {ACTION_LABELS[action.toUpperCase()] || action}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuPerms?.map((menu: any) => (
                  <TableRow key={menu.id}>
                    <TableCell className="text-sm">
                      {menu.parentMenuCode && <span className="text-muted-foreground mr-1">└</span>}
                      {menu.menuName}
                    </TableCell>
                    {ALL_ACTIONS.map(action => (
                      <TableCell key={action} className="text-center">
                        <Checkbox
                          checked={(permMatrix[menu.id] || []).includes(action)}
                          onCheckedChange={() => togglePermAction(menu.id, action)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
            <Button onClick={handleSavePerms} disabled={setRolePerms.isPending}>
              {isEn ? "Save Permissions" : "保存权限"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Role Assignment Dialog */}
      <Dialog open={userRoleDialogOpen} onOpenChange={setUserRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEn ? "Assign Roles" : "分配角色"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {roles?.map((role: any) => (
              <label key={role.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
                <Checkbox
                  checked={userSelectedRoles.includes(role.id)}
                  onCheckedChange={(checked) => {
                    setUserSelectedRoles(prev =>
                      checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                    );
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{role.roleName}</p>
                  <p className="text-xs text-muted-foreground">{role.roleCode} · Level {role.level}</p>
                </div>
                {role.isSystem ? <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />{isEn ? "System" : "系统"}</Badge> : null}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserRoleDialogOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
            <Button onClick={handleSaveUserRoles} disabled={setUserRoles.isPending}>
              {isEn ? "Save" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
