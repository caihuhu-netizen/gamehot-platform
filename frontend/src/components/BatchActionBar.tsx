import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, CheckSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReactNode, useState } from "react";

export type BatchAction = {
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary";
  /** If true, shows confirmation dialog before executing */
  needsConfirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
};

type BatchActionBarProps = {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  actions: BatchAction[];
};

export default function BatchActionBar({
  selectedCount,
  totalCount,
  onClear,
  actions,
}: BatchActionBarProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BatchAction) => {
    setLoadingAction(action.label);
    try {
      await action.onClick();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">
          已选 <Badge variant="secondary" className="mx-1">{selectedCount}</Badge>
          <span className="hidden sm:inline text-muted-foreground">/ {totalCount}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {actions.map((action) =>
          action.needsConfirm ? (
            <AlertDialog key={action.label}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant={action.variant || "outline"}
                  className="h-7 text-xs"
                  disabled={action.disabled || loadingAction !== null}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {action.confirmTitle || `确认${action.label}`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {action.confirmDescription ||
                      `确定要对选中的 ${selectedCount} 项执行「${action.label}」操作吗？此操作不可撤销。`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction(action)}>
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant || "outline"}
              className="h-7 text-xs"
              disabled={action.disabled || loadingAction !== null}
              onClick={() => handleAction(action)}
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          )
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 ml-auto shrink-0"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
