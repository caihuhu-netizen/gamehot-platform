import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Target, TrendingUp, Wallet } from "lucide-react";
import ROICalculator from "./opstools/ROICalculator";
import CampaignTracker from "./opstools/CampaignTracker";
import LTVPrediction from "./opstools/LTVPrediction";
import BudgetSuggestion from "./opstools/BudgetSuggestion";

export default function OpsToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">运营工具箱</h1>
        <p className="text-muted-foreground text-sm mt-1">ROI 预测计算器、活动追踪、LTV 预测、预算分配建议</p>
      </div>
      <Tabs defaultValue="roi-calc">
        <TabsList className="flex-wrap">
          <TabsTrigger value="roi-calc"><Calculator className="h-3.5 w-3.5 mr-1" />ROI 计算器</TabsTrigger>
          <TabsTrigger value="campaigns"><Target className="h-3.5 w-3.5 mr-1" />活动追踪</TabsTrigger>
          <TabsTrigger value="ltv"><TrendingUp className="h-3.5 w-3.5 mr-1" />LTV 预测</TabsTrigger>
          <TabsTrigger value="budget"><Wallet className="h-3.5 w-3.5 mr-1" />预算建议</TabsTrigger>
        </TabsList>
        <TabsContent value="roi-calc" className="mt-4"><ROICalculator /></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><CampaignTracker /></TabsContent>
        <TabsContent value="ltv" className="mt-4"><LTVPrediction /></TabsContent>
        <TabsContent value="budget" className="mt-4"><BudgetSuggestion /></TabsContent>
      </Tabs>
    </div>
  );
}
