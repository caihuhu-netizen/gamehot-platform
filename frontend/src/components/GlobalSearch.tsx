import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import {
  Search, X, User, Layers, FlaskConical, Bell, FileText,
  Package, BarChart3, Gamepad2, AlertTriangle, BookOpen,
  DollarSign, Loader2, ArrowRight, Command,
} from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  user: <User className="w-4 h-4 text-blue-500" />,
  segment: <Layers className="w-4 h-4 text-purple-500" />,
  experiment: <FlaskConical className="w-4 h-4 text-green-500" />,
  push: <Bell className="w-4 h-4 text-orange-500" />,
  recall: <ArrowRight className="w-4 h-4 text-cyan-500" />,
  product: <Package className="w-4 h-4 text-pink-500" />,
  level: <BarChart3 className="w-4 h-4 text-yellow-500" />,
  game: <Gamepad2 className="w-4 h-4 text-indigo-500" />,
  alert: <AlertTriangle className="w-4 h-4 text-red-500" />,
  report: <FileText className="w-4 h-4 text-teal-500" />,
  monetize: <DollarSign className="w-4 h-4 text-emerald-500" />,
  knowledge: <BookOpen className="w-4 h-4 text-amber-500" />,
};

const typeLabels: Record<string, { zh: string; en: string }> = {
  user: { zh: "用户", en: "User" },
  segment: { zh: "分层", en: "Segment" },
  experiment: { zh: "实验", en: "Experiment" },
  push: { zh: "推送", en: "Push" },
  recall: { zh: "召回", en: "Recall" },
  product: { zh: "商品", en: "Product" },
  level: { zh: "关卡", en: "Level" },
  game: { zh: "游戏", en: "Game" },
  alert: { zh: "告警", en: "Alert" },
  report: { zh: "报告", en: "Report" },
  monetize: { zh: "变现", en: "Monetize" },
  knowledge: { zh: "知识库", en: "Knowledge" },
};

export default function GlobalSearch() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKw, setDebouncedKw] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce keyword
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Query
  const { data, isLoading } = trpc.globalSearch.search.useQuery(
    { keyword: debouncedKw, limit: 20 },
    { enabled: open && debouncedKw.length > 0 }
  );

  const results = data?.results || [];

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setKeyword("");
      setDebouncedKw("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Navigate to result
  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate(url);
    },
    [navigate]
  );

  // Keyboard navigation in list
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].url);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll("[data-search-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const lang = i18n.language === "zh" ? "zh" : "en";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border/50 bg-muted/30 text-muted-foreground text-xs hover:bg-muted/60 transition-colors"
        title={`${t("search.title")} (⌘K)`}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("search.placeholder")}</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/50 bg-background px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Search Panel */}
      <div
        className="relative w-full max-w-xl mx-4 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "zh" ? "搜索用户、配置、实验、报告..." : "Search users, configs, experiments, reports..."}
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {debouncedKw.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{lang === "zh" ? "输入关键词开始搜索" : "Type to start searching"}</p>
              <p className="text-xs mt-1 opacity-60">
                {lang === "zh"
                  ? "支持搜索用户、分层、实验、推送、召回、商品、关卡、告警、报告等"
                  : "Search across users, segments, experiments, pushes, recalls, products, levels, alerts, reports"}
              </p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              <p>{lang === "zh" ? `未找到 "${debouncedKw}" 相关结果` : `No results for "${debouncedKw}"`}</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  data-search-item
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    {typeIcons[item.type] || <Search className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                  </div>
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {typeLabels[item.type]?.[lang] || item.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">↑↓</kbd> {lang === "zh" ? "导航" : "Navigate"}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">↵</kbd> {lang === "zh" ? "选择" : "Select"}</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">Esc</kbd> {lang === "zh" ? "关闭" : "Close"}</span>
          </div>
          <span>{results.length} {lang === "zh" ? "个结果" : "results"}</span>
        </div>
      </div>
    </div>
  );
}
