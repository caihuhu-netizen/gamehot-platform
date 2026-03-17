import { Card, CardContent } from "@/components/ui/card";
import { Eye, Brain, Gauge, Crosshair, Target, FlaskConical, RefreshCw, ArrowRight } from "lucide-react";

interface LoopPipelineProps {
  loopHealth: {
    eventTrackingRate: number | string;
    segmentCoverage: number | string;
    difficultyAdaptRate: number | string;
    avgPassRate: number | string;
    triggerPrecision: number | string;
    activeExperiments: number;
  } | null | undefined;
}

export function LoopPipeline({ loopHealth }: LoopPipelineProps) {
  const steps = [
    { icon: Eye, label: "用户行为", sub: "事件采集", color: "bg-blue-100 text-blue-700", metric: loopHealth ? `${(Number(loopHealth.eventTrackingRate) * 100).toFixed(0)}%` : "--" },
    { icon: Brain, label: "分层标签", sub: "预测计算", color: "bg-violet-100 text-violet-700", metric: loopHealth ? `${(Number(loopHealth.segmentCoverage) * 100).toFixed(0)}%` : "--" },
    { icon: Gauge, label: "难度调度", sub: "心流适配", color: "bg-emerald-100 text-emerald-700", metric: loopHealth ? `${(Number(loopHealth.difficultyAdaptRate) * 100).toFixed(0)}%` : "--" },
    { icon: Crosshair, label: "埋点监控", sub: "卡点分析", color: "bg-amber-100 text-amber-700", metric: loopHealth ? `${Number(loopHealth.avgPassRate) * 100 > 0 ? (Number(loopHealth.avgPassRate) * 100).toFixed(0) : "--"}%` : "--" },
    { icon: Target, label: "变现触发", sub: "精准弹窗", color: "bg-rose-100 text-rose-700", metric: loopHealth ? `${(Number(loopHealth.triggerPrecision) * 100).toFixed(0)}%` : "--" },
    { icon: FlaskConical, label: "A/B验证", sub: "反哺分层", color: "bg-cyan-100 text-cyan-700", metric: loopHealth ? `${loopHealth?.activeExperiments}个` : "--" },
  ];

  return (
    <Card className="border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-1 mb-3">
          <RefreshCw className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">六步闭环数据流</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex-1 rounded-lg p-2 sm:p-3 ${step.color} text-center`}>
                <step.icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1" />
                <p className="text-[10px] sm:text-xs font-semibold">{step.label}</p>
                <p className="text-[9px] sm:text-[10px] opacity-70 hidden sm:block">{step.sub}</p>
                <p className="text-xs sm:text-sm font-bold mt-0.5 sm:mt-1">{step.metric}</p>
              </div>
              {i < 5 && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50 mx-0.5 shrink-0 hidden sm:block" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
