/**
 * 安全地将日期值（Date对象或字符串）格式化为 YYYY-MM-DD 字符串
 * 解决 String(Date对象) 输出 "Wed Mar 12 2026..." 乱码问题
 */
export function fmtDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const s = String(val);
  // 如果已经是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  // 尝试解析为 Date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return s;
}

/**
 * 格式化为 MM-DD（去掉年份，用于图表X轴等紧凑场景）
 */
export function fmtDateShort(val: unknown): string {
  const full = fmtDate(val);
  return full.length >= 10 ? full.slice(5) : full;
}
