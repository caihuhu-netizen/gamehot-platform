import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LucideIcon } from "lucide-react";

const HEALTH_COLORS = {
  good: "#10b981",
  warning: "#f59e0b",
  poor: "#ef4444",
};

export function getHealthColor(score: number) {
  if (score >= 75) return HEALTH_COLORS.good;
  if (score >= 50) return HEALTH_COLORS.warning;
  return HEALTH_COLORS.poor;
}

export function getHealthLabel(score: number) {
  if (score >= 75) return "健康";
  if (score >= 50) return "一般";
  return "需关注";
}

interface HealthMetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

export function HealthMetricCard({ label, value, icon: Icon }: HealthMetricCardProps) {
  const color = getHealthColor(value);
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold" style={{ color }}>{value.toFixed(1)}%</p>
        <Progress value={value} className="h-1.5 mt-2" />
        <p className="text-[10px] mt-1" style={{ color }}>{getHealthLabel(value)}</p>
      </CardContent>
    </Card>
  );
}
