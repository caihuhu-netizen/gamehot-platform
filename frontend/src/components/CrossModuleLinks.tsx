import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

interface RelatedLink {
  label: string;
  path: string;
  description?: string;
}

interface CrossModuleLinksProps {
  links: RelatedLink[];
  title?: string;
}

/**
 * Cross-module quick navigation component.
 * Place at the top or bottom of a page to link to related modules.
 */
export default function CrossModuleLinks({ links, title = "相关模块" }: CrossModuleLinksProps) {
  const [, setLocation] = useLocation();

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="text-muted-foreground font-medium shrink-0">{title}:</span>
      {links.map((link) => (
        <button
          key={link.path}
          onClick={() => setLocation(link.path)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          title={link.description}
        >
          {link.label}
          <ArrowRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

/**
 * Pre-defined cross-module link maps.
 * Each key is a page identifier, and the value is an array of related links.
 */
export const MODULE_LINKS: Record<string, RelatedLink[]> = {
  anomalyMonitor: [
    { label: "A/B 实验", path: "/experiments", description: "查看相关实验" },
    { label: "告警规则", path: "/alert-rules", description: "配置告警规则" },
    { label: "AI 产品顾问", path: "/ai-assistant", description: "智能分析建议" },
  ],
  alertRules: [
    { label: "异常监控", path: "/anomaly-monitor", description: "查看告警触发情况" },
    { label: "飞书通知", path: "/feishu-notification", description: "配置通知渠道" },
    { label: "调度中心", path: "/scheduler", description: "定时扫描任务" },
  ],
  userProfiles: [
    { label: "用户分层", path: "/segments", description: "查看分层规则" },
    { label: "用户分群", path: "/audience", description: "创建精细分群" },
    { label: "推送中心", path: "/push-center", description: "向用户推送消息" },
    { label: "用户召回", path: "/user-recall", description: "召回流失用户" },
  ],
  segments: [
    { label: "用户画像", path: "/user-profiles", description: "查看用户详情" },
    { label: "用户分群", path: "/audience", description: "基于分层创建分群" },
    { label: "分群模板", path: "/audience-templates", description: "使用预设模板" },
    { label: "推送中心", path: "/push-center", description: "向分层用户推送" },
  ],
  audience: [
    { label: "用户分层", path: "/segments", description: "查看分层配置" },
    { label: "分群模板", path: "/audience-templates", description: "使用预设模板快速创建" },
    { label: "推送中心", path: "/push-center", description: "向分群推送消息" },
    { label: "用户召回", path: "/user-recall", description: "召回流失用户" },
  ],
  experiments: [
    { label: "难度调度", path: "/difficulty", description: "调整关卡难度" },
    { label: "变现触发", path: "/monetize", description: "变现策略配置" },
    { label: "定价引擎", path: "/pricing-engine", description: "动态定价策略" },
    { label: "闭环仪表盘", path: "/loop-dashboard", description: "查看闭环效果" },
  ],
  monetize: [
    { label: "A/B 实验", path: "/experiments", description: "验证变现策略" },
    { label: "定价引擎", path: "/pricing-engine", description: "动态定价" },
    { label: "IAP 商品", path: "/iap-products", description: "内购商品管理" },
    { label: "广告收入", path: "/ad-revenue", description: "广告变现数据" },
  ],
  difficulty: [
    { label: "关卡配置", path: "/levels", description: "关卡数据管理" },
    { label: "探针关卡", path: "/probes", description: "探针关卡配置" },
    { label: "A/B 实验", path: "/experiments", description: "难度实验" },
    { label: "闭环仪表盘", path: "/loop-dashboard", description: "查看闭环效果" },
  ],
  pushCenter: [
    { label: "用户分群", path: "/audience", description: "选择推送目标" },
    { label: "用户分层", path: "/segments", description: "按分层推送" },
    { label: "飞书通知", path: "/feishu-notification", description: "飞书渠道配置" },
    { label: "用户召回", path: "/user-recall", description: "召回策略" },
  ],
  userRecall: [
    { label: "用户分群", path: "/audience", description: "选择召回目标" },
    { label: "推送中心", path: "/push-center", description: "发送召回消息" },
    { label: "用户画像", path: "/user-profiles", description: "查看用户详情" },
  ],
  productOptimization: [
    { label: "告警规则", path: "/alert-rules", description: "配置触发条件" },
    { label: "异常监控", path: "/anomaly-monitor", description: "查看异常详情" },
    { label: "调度中心", path: "/scheduler", description: "自动化任务" },
    { label: "AI 产品顾问", path: "/ai-assistant", description: "AI 优化建议" },
  ],
  costProfit: [
    { label: "获客渠道", path: "/acquisition", description: "渠道投放数据" },
    { label: "广告收入", path: "/ad-revenue", description: "广告变现" },
    { label: "IAP 商品", path: "/iap-products", description: "内购收入" },
    { label: "变现日报", path: "/monetize-daily", description: "每日变现数据" },
  ],
  acquisition: [
    { label: "成本利润", path: "/cost-profit", description: "ROI 分析" },
    { label: "用户质量", path: "/user-quality-daily", description: "渠道用户质量" },
    { label: "留存分析", path: "/cohort-retention", description: "渠道留存" },
  ],
  levels: [
    { label: "难度调度", path: "/difficulty", description: "难度策略" },
    { label: "探针关卡", path: "/probes", description: "探针配置" },
    { label: "巡检报告", path: "/inspection-report", description: "关卡巡检" },
  ],
};
