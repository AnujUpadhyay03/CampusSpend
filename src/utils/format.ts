export function formatInr(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.abs(safe % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals || hasFraction ? 2 : 0,
    maximumFractionDigits: showDecimals || hasFraction ? 2 : 0,
  }).format(safe);
}

export function formatCompactInr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (safe >= 100000) {
    return `₹${(safe / 100000).toFixed(1)}L`;
  }
  if (safe >= 1000) {
    const k = safe / 1000;
    return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `₹${Math.round(safe)}`;
}

export function getMonthInfo(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = referenceDate.getDate();
  const daysLeftIncludingToday = Math.max(1, daysInMonth - currentDay + 1);
  const monthLabel = referenceDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  return {
    year,
    month,
    daysInMonth,
    currentDay,
    daysLeftIncludingToday,
    monthLabel,
  };
}

export function isSameMonth(timestampMillis: number, ref = new Date()): boolean {
  const d = new Date(timestampMillis);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function isSameDay(timestampMillis: number, ref = new Date()): boolean {
  const d = new Date(timestampMillis);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateTimeShort(timestampMillis: number): string {
  const d = new Date(timestampMillis);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (isSameDay(timestampMillis, now)) {
    return `Today, ${timeStr}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(timestampMillis, yesterday)) {
    return `Yesterday, ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr}, ${timeStr}`;
}

export function toDatetimeLocalValue(timestampMillis: number): string {
  const d = new Date(timestampMillis);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
