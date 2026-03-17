import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";

type DateRange = { from: Date; to: Date };

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "近7天", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "近14天", range: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { label: "近30天", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "近90天", range: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
  { label: "本月", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "上月", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({ from: value.from, to: value.to });

  const label = useMemo(() => {
    if (!value.from || !value.to) return "选择日期范围";
    return `${format(value.from, "yyyy/MM/dd")} - ${format(value.to, "yyyy/MM/dd")}`;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 text-xs font-normal ${className || ""}`}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5 opacity-60" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="border-r p-2 space-y-1 min-w-[90px]">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">快捷选择</p>
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-7"
                onClick={() => {
                  const r = p.range();
                  onChange(r);
                  setTempRange(r);
                  setOpen(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={tempRange as { from: Date; to?: Date }}
              onSelect={(range: any) => {
                setTempRange(range || {});
                if (range?.from && range?.to) {
                  onChange({ from: range.from, to: range.to });
                  setOpen(false);
                }
              }}
              numberOfMonths={2}
              locale={zhCN}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Helper to convert DateRange to API params */
export function toDateParams(range: DateRange) {
  return {
    startDate: format(range.from, "yyyy-MM-dd"),
    endDate: format(range.to, "yyyy-MM-dd"),
  };
}
