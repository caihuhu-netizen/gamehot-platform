import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, Database, BarChart3, Users, FlaskConical, Bell,
  ChevronRight, ChevronLeft, X, CheckCircle2, Circle,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  actionLabel: string;
  tips: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "sdk",
    title: "1. 接入 SDK",
    description: "将游戏客户端的埋点数据接入系统，这是所有数据分析和智能运营的基础。",
    icon: <Database className="h-6 w-6" />,
    path: "/sdk-docs",
    actionLabel: "查看 SDK 文档",
    tips: [
      "在「游戏项目」中获取 API Key",
      "集成 SDK 后调用 /api/sdk/events 上报事件",
      "支持 Unity C# 和 Cocos TypeScript SDK",
    ],
  },
  {
    id: "data",
    title: "2. 查看数据",
    description: "SDK 接入后，在仪表盘和分析页面查看实时数据流入情况。",
    icon: <BarChart3 className="h-6 w-6" />,
    path: "/",
    actionLabel: "前往仪表盘",
    tips: [
      "仪表盘支持日期范围选择（今日/近7天/近30天）",
      "关注 DAU、收入、留存三大核心指标",
      "异常指标会自动触发告警通知",
    ],
  },
  {
    id: "segments",
    title: "3. 配置用户分层",
    description: "基于玩家行为数据，将用户划分为不同价值层级，实现精细化运营。",
    icon: <Users className="h-6 w-6" />,
    path: "/segments",
    actionLabel: "配置分层规则",
    tips: [
      "系统预置了鲸鱼/海豚/小鱼/免费用户四级分层",
      "可自定义分层条件（付费金额、活跃天数等）",
      "分层结果会自动关联到推送和召回策略",
    ],
  },
  {
    id: "experiments",
    title: "4. 设置 A/B 实验",
    description: "通过科学的 A/B 测试验证运营策略效果，数据驱动决策。",
    icon: <FlaskConical className="h-6 w-6" />,
    path: "/experiments",
    actionLabel: "创建实验",
    tips: [
      "支持关卡难度、定价策略、UI 布局等多种实验类型",
      "自动计算统计显著性，避免过早下结论",
      "实验胜出后可一键应用到生产配置",
    ],
  },
  {
    id: "alerts",
    title: "5. 配置告警规则",
    description: "设置关键指标的异常告警，第一时间发现并响应数据波动。",
    icon: <Bell className="h-6 w-6" />,
    path: "/alert-rules",
    actionLabel: "配置告警",
    tips: [
      "支持收入下降、留存异常、CPI 飙升等多种告警类型",
      "告警可通过飞书机器人实时推送",
      "智能运营中心会自动扫描并生成告警",
    ],
  },
];

const STORAGE_KEY = "gamehot_onboarding_completed";
const TOUR_DISMISSED_KEY = "gamehot_tour_dismissed";

export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(TOUR_DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const complete = useCallback(() => {
    setIsCompleted(true);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try { localStorage.setItem(TOUR_DISMISSED_KEY, "true"); } catch {}
  }, []);

  const reset = useCallback(() => {
    setIsCompleted(false);
    setIsDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOUR_DISMISSED_KEY);
    } catch {}
  }, []);

  return { isCompleted, isDismissed, complete, dismiss, reset, shouldShow: !isCompleted && !isDismissed };
}

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("gamehot_onboarding_steps");
      return saved ? new Set<string>(JSON.parse(saved) as string[]) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem("gamehot_onboarding_steps", JSON.stringify(Array.from(completedSteps)));
    } catch {}
  }, [completedSteps]);

  const step = TOUR_STEPS[currentStep];
  const progress = (completedSteps.size / TOUR_STEPS.length) * 100;

  const handleGoToStep = (path: string, stepId: string) => {
    setCompletedSteps((prev) => { const next = new Set<string>(Array.from(prev)); next.add(stepId); return next; });
    setLocation(path);
  };

  const handleComplete = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    onClose();
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">快速上手指南</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {completedSteps.size}/{TOUR_STEPS.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-4">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                i === currentStep
                  ? "bg-primary/10 text-primary font-medium"
                  : completedSteps.has(s.id)
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {completedSteps.has(s.id) ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              <span className="hidden lg:inline">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Current step content */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              {step.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={() => handleGoToStep(step.path, step.id)}
          >
            {step.actionLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((p) => p - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          上一步
        </Button>

        {currentStep < TOUR_STEPS.length - 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep((p) => p + 1)}
          >
            下一步
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" variant="default" onClick={handleComplete}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            完成引导
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
