import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RefreshCw, Users, Building2, Shield, ChevronRight, ChevronDown,
  Loader2, UserPlus, Settings2, FolderTree, Folder, FolderOpen, User, Hash } from "lucide-react";

export default function FeishuSync() {
  const [activeTab, setActiveTab] = useState("departments");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">飞书集成</h1>
          <p className="text-muted-foreground mt-1">通讯录同步、人员管理、角色权限配置</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />部门管理
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />人员列表
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />角色管理
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Settings2 className="h-4 w-4" />权限配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments"><DepartmentTab /></TabsContent>
        <TabsContent value="users"><UserTab /></TabsContent>
        <TabsContent value="roles"><RoleTab /></TabsContent>
        <TabsContent value="permissions"><PermissionConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 部门树形节点组件 ====================
function DepartmentTreeNode({ node, level = 0, expandedIds, toggleExpand, onSelectDept }: {
  node: any;
  level?: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onSelectDept: (dept: any) => void;
}) {
  const isExpanded = expandedIds.has(node.departmentId);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <div
        className={`flex items-center gap-2 py-2.5 px-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors group ${
          level === 0 ? "" : ""
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => onSelectDept(node)}
      >
        {/* 展开/折叠按钮 */}
        <button
          className={`h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors ${
            hasChildren ? "" : "invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(node.departmentId);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* 文件夹图标 */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4.5 w-4.5 text-blue-500 shrink-0" />
        ) : (
          <Folder className="h-4.5 w-4.5 text-blue-400 shrink-0" />
        )}

        {/* 部门名称 */}
        <span className={`font-medium text-sm flex-1 truncate ${
          level === 0 ? "text-foreground" : "text-foreground/90"
        }`}>
          {node.name}
        </span>

        {/* 部门人数 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{node.memberCount}</span>
          </div>
          {hasChildren && node.totalMemberCount > node.memberCount && (
            <span className="text-xs text-muted-foreground/60">
              (含子部门 {node.totalMemberCount})
            </span>
          )}
        </div>

        {/* 状态 */}
        <Badge
          variant={node.status === "ACTIVE" ? "default" : "secondary"}
          className="text-xs shrink-0"
        >
          {node.status === "ACTIVE" ? "正常" : node.status}
        </Badge>
      </div>

      {/* 子部门递归渲染 */}
      {isExpanded && hasChildren && (
        <div className="relative">
          {/* 层级连接线 */}
          <div
            className="absolute top-0 bottom-0 border-l border-border/50"
            style={{ left: `${level * 24 + 24}px` }}
          />
          {node.children.map((child: any) => (
            <DepartmentTreeNode
              key={child.departmentId}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelectDept={onSelectDept}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ==================== 部门详情侧边栏 ====================
function DepartmentDetail({ dept, onClose }: { dept: any; onClose: () => void }) {
  const users = trpc.feishu.listUsers.useQuery(
    { departmentId: dept.departmentId },
    { enabled: !!dept.departmentId }
  );

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              {dept.name}
            </CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              {dept.departmentId}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">直属人数</span>
            <p className="font-medium">{dept.memberCount} 人</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">含子部门总人数</span>
            <p className="font-medium">{dept.totalMemberCount} 人</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">子部门数</span>
            <p className="font-medium">{dept.children?.length ?? 0} 个</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">同步时间</span>
            <p className="font-medium text-xs">{new Date(dept.syncedAt).toLocaleString()}</p>
          </div>
        </div>

        {/* 部门人员列表 */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            部门人员
          </h4>
          {users.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />加载中...
            </div>
          ) : users.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">暂无人员</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {users.data?.map((user: any) => (
                <div key={user.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 text-sm">
                  {user.avatar ? (
                    <img src={user.avatar} className="h-7 w-7 rounded-full" alt="" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {user.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.jobTitle || user.email || "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {user.status === "ACTIVE" ? "在职" : user.status === "RESIGNED" ? "离职" : "未激活"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 部门管理 ====================
function DepartmentTab() {
  const deptTree = trpc.feishu.getDepartmentTree.useQuery();
  const flatDepts = trpc.feishu.listDepartments.useQuery();
  const [permError, setPermError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<any>(null);

  const syncMutation = trpc.feishu.syncContacts.useMutation({
    onSuccess: (data) => {
      setPermError(null);
      toast.success(`同步完成：${data.deptCount} 个部门，${data.userCount} 个人员`);
      deptTree.refetch();
      flatDepts.refetch();
    },
    onError: (err) => {
      if (err.message.includes("PERMISSION_DENIED")) {
        setPermError(err.message.replace("PERMISSION_DENIED:", ""));
      } else {
        toast.error(`同步失败: ${err.message}`);
      }
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!deptTree.data) return;
    const allIds = new Set<string>();
    const collect = (nodes: Array<{ departmentId: string; children?: unknown[] }>) => {
      for (const n of nodes) {
        allIds.add(n.departmentId);
        if (n.children) collect(n.children as Array<{ departmentId: string; children?: unknown[] }>);
      }
    };
    collect(deptTree.data);
    setExpandedIds(allIds);
  };

  const collapseAll = () => setExpandedIds(new Set());

  // 统计数据
  const totalDepts = flatDepts.data?.length ?? 0;
  const totalMembers = flatDepts.data?.reduce((sum: number, d: any) => sum + (d.memberCount || 0), 0) ?? 0;
  const activeDepts = flatDepts.data?.filter((d: any) => d.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">部门组织架构</h3>
          {totalDepts > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />{totalDepts} 个部门
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />{totalMembers} 人
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalDepts > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5 text-xs">
                <FolderOpen className="h-3.5 w-3.5" />展开全部
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5 text-xs">
                <Folder className="h-3.5 w-3.5" />折叠全部
              </Button>
            </>
          )}
          <Button
            onClick={() => syncMutation.mutate({ parentDeptId: "0" })}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            从飞书同步
          </Button>
        </div>
      </div>

      {/* 权限错误提示 */}
      {permError && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">飞书通讯录权限未开通</p>
                <div className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-line">{permError}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open("https://open.feishu.cn/app/cli_a93e6d790df85cce/auth", "_blank")}
                >
                  前往飞书开放平台申请权限
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主内容区 */}
      <div className={`grid gap-4 ${selectedDept ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
        {/* 树形结构 */}
        <Card>
          <CardContent className="p-2">
            {deptTree.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />加载部门数据...
              </div>
            ) : !deptTree.data || deptTree.data.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">暂无部门数据</p>
                <p className="text-sm mt-1">请点击“从飞书同步”拉取通讯录</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {deptTree.data.map((root: any) => (
                  <DepartmentTreeNode
                    key={root.departmentId}
                    node={root}
                    level={0}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onSelectDept={setSelectedDept}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 部门详情侧边栏 */}
        {selectedDept && (
          <DepartmentDetail
            dept={selectedDept}
            onClose={() => setSelectedDept(null)}
          />
        )}
      </div>
    </div>
  );
}

// ==================== 人员列表 ====================
function UserTab() {
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const departments = trpc.feishu.listDepartments.useQuery();
  const users = trpc.feishu.listUsers.useQuery(
    deptFilter ? { departmentId: deptFilter } : undefined
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">人员列表</h3>
        <Select value={deptFilter ?? "all"} onValueChange={(v) => setDeptFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="全部部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部部门</SelectItem>
            {departments.data?.map((dept: any) => (
              <SelectItem key={dept.departmentId} value={dept.departmentId}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>手机</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>职位</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>系统角色</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    暂无人员数据
                  </TableCell>
                </TableRow>
              )}
              {users.data?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img src={user.avatar} className="h-6 w-6 rounded-full" alt="" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                          {user.name?.charAt(0)}
                        </div>
                      )}
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{user.email || "—"}</TableCell>
                  <TableCell className="text-xs">{user.mobile || "—"}</TableCell>
                  <TableCell className="text-xs">{user.departmentId || "—"}</TableCell>
                  <TableCell className="text-xs">{user.jobTitle || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                      {user.status === "ACTIVE" ? "在职" : user.status === "RESIGNED" ? "离职" : "未激活"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AssignRoleButton userId={user.userId} userName={user.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignRoleButton({ userId, userName }: { userId: number | null; userName: string }) {
  const roles = trpc.feishu.listRoles.useQuery();
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const userRoles = trpc.feishu.getUserRoles.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  const setRolesMutation = trpc.feishu.setUserRoles.useMutation({
    onSuccess: () => {
      toast.success(`已更新 ${userName} 的角色`);
      userRoles.refetch();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!userId) return <span className="text-xs text-muted-foreground">未关联</span>;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && userRoles.data) {
        setSelectedRoles(userRoles?.data?.map((r: any) => r.roleId));
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <UserPlus className="h-3 w-3" />
          {userRoles.data?.length ? userRoles?.data?.map((r: any) => r.roleName).join(", ") : "分配角色"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配角色 - {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {roles.data?.map((role: any) => (
            <div key={role.id} className="flex items-center gap-3">
              <Checkbox
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={(checked) => {
                  setSelectedRoles(prev =>
                    checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                  );
                }}
              />
              <div>
                <p className="text-sm font-medium">{role.roleName}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={() => setRolesMutation.mutate({ userId: userId!, roleIds: selectedRoles })}
          disabled={setRolesMutation.isPending}
        >
          {setRolesMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 角色管理 ====================
function RoleTab() {
  const roles = trpc.feishu.listRoles.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ roleCode: "", roleName: "", description: "", level: 0 });

  const createMutation = trpc.feishu.createRole.useMutation({
    onSuccess: () => {
      toast.success("角色创建成功");
      roles.refetch();
      setShowCreate(false);
      setNewRole({ roleCode: "", roleName: "", description: "", level: 0 });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.feishu.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("角色已删除");
      roles.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">角色列表</h3>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Shield className="h-4 w-4" />新建角色
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新建角色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>角色编码</Label>
                <Input value={newRole.roleCode} onChange={e => setNewRole({ ...newRole, roleCode: e.target.value })} placeholder="如 editor" />
              </div>
              <div>
                <Label>角色名称</Label>
                <Input value={newRole.roleName} onChange={e => setNewRole({ ...newRole, roleName: e.target.value })} placeholder="如 编辑" />
              </div>
            </div>
            <div>
              <Label>描述</Label>
              <Input value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="角色描述" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(newRole)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {roles.data?.map((role: any) => (
          <Card key={role.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.roleName}</span>
                    <Badge variant="outline" className="text-xs font-mono">{role.roleCode}</Badge>
                    {role.isSystem ? <Badge className="text-xs">系统</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.description || "无描述"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Level {role.level}</Badge>
                {!role.isSystem && (
                  <Button
                    variant="ghost" size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`确定删除角色"${role.roleName}"？`)) {
                        deleteMutation.mutate({ id: role.id });
                      }
                    }}
                  >
                    删除
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== 权限配置 ====================
function PermissionConfigTab() {
  const roles = trpc.feishu.listRoles.useQuery();
  const menus = trpc.feishu.listMenuPermissions.useQuery();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const rolePerms = trpc.feishu.getRolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId }
  );

  const setPermsMutation = trpc.feishu.setRolePermissions.useMutation({
    onSuccess: () => {
      toast.success("权限已更新");
      rolePerms.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [editPerms, setEditPerms] = useState<Map<number, string[]>>(new Map());

  const initEditPerms = () => {
    if (!rolePerms.data || !menus.data) return;
    const map = new Map<number, string[]>();
    for (const perm of rolePerms.data) {
      const menu = menus?.data?.find((m: any) => m.menuCode === perm.menuCode);
      if (menu) {
        map.set((menu as Record<string, unknown>).id as number, perm.actions as string[]);
      }
    }
    setEditPerms(map);
  };

  // Build menu tree
  const menuTree = menus.data?.reduce((acc: any[], menu: any) => {
    if (!menu.parentMenuCode) {
      acc.push({
        ...menu,
        children: menus.data?.filter((m: any) => m.parentMenuCode === menu.menuCode) ?? [],
      });
    }
    return acc;
  }, [] as Record<string, unknown>[]) ?? [];

  const allActions = ["view", "create", "edit", "delete", "export"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">权限配置</h3>
        <Select
          value={selectedRoleId?.toString() ?? ""}
          onValueChange={(v) => {
            setSelectedRoleId(parseInt(v));
            setTimeout(initEditPerms, 500);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            {roles.data?.map((role: any) => (
              <SelectItem key={role.id} value={role.id.toString()}>
                {role.roleName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRoleId && (
          <Button
            onClick={() => {
              const perms = Array.from(editPerms.entries()).map(([menuPermissionId, actions]) => ({
                menuPermissionId,
                actions,
              }));
              setPermsMutation.mutate({ roleId: selectedRoleId, permissions: perms });
            }}
            disabled={setPermsMutation.isPending}
            size="sm"
          >
            {setPermsMutation.isPending ? "保存中..." : "保存权限"}
          </Button>
        )}
      </div>

      {!selectedRoleId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            请先选择一个角色来配置权限
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">菜单</TableHead>
                  {allActions.map(a => (
                    <TableHead key={a} className="text-center w-20">
                      {{view: "查看", create: "创建", edit: "编辑", delete: "删除", export: "导出"}[a]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuTree.map((group: any) => (
                  <>
                    <TableRow key={group.id} className="bg-muted/30">
                      <TableCell colSpan={6} className="font-medium text-sm">
                        {group.menuName}
                      </TableCell>
                    </TableRow>
                    {group.children.map((menu: any) => {
                      const currentActions = editPerms.get(menu.id) ?? [];
                      return (
                        <TableRow key={menu.id}>
                          <TableCell className="pl-8 text-sm">{menu.menuName}</TableCell>
                          {allActions.map(action => (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={currentActions.includes(action)}
                                onCheckedChange={(checked) => {
                                  const newMap = new Map(editPerms);
                                  const acts = [...(newMap.get(menu.id) ?? [])];
                                  if (checked) {
                                    if (!acts.includes(action)) acts.push(action);
                                  } else {
                                    const idx = acts.indexOf(action);
                                    if (idx >= 0) acts.splice(idx, 1);
                                  }
                                  newMap.set(menu.id, acts);
                                  setEditPerms(newMap);
                                }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
