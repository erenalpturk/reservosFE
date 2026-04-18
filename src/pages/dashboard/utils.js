export const STATUS_LABELS = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled_by_customer: 'Müşteri İptal',
  cancelled_by_shop: 'Dükkan İptal',
  expired: 'Süresi Doldu',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
  in_pool: 'Havuzda',
};


export const STATUS_BORDER = {
  pending: 'border-orange-400',
  confirmed: 'border-green-400',
  completed: 'border-blue-400',
  no_show: 'border-red-400',
  rejected: 'border-zinc-300',
  cancelled_by_customer: 'border-zinc-300',
  cancelled_by_shop: 'border-zinc-300',
  expired: 'border-zinc-300',
  in_pool: 'border-orange-400',
};

export const STATUS_DOT = {
  pending: 'bg-orange-400',
  confirmed: 'bg-green-400',
  completed: 'bg-blue-400',
  no_show: 'bg-red-400',
  rejected: 'bg-zinc-300',
  cancelled_by_customer: 'bg-zinc-300',
  cancelled_by_shop: 'bg-zinc-300',
  expired: 'bg-zinc-300',
  in_pool: 'bg-orange-400',
};

export const STATUS_HEX = {
  pending: '#fb923c',
  confirmed: '#4ade80',
  completed: '#60a5fa',
  no_show: '#f87171',
  rejected: '#d4d4d8',
  cancelled_by_customer: '#d4d4d8',
  cancelled_by_shop: '#d4d4d8',
  expired: '#d4d4d8',
  in_pool: '#fb923c',
};

export const STATUS_COLORS = {
  pending: 'bg-orange-100 text-orange-600',
  confirmed: 'bg-green-100 text-green-600',
  rejected: 'bg-zinc-100 text-zinc-400',
  cancelled_by_customer: 'bg-zinc-100 text-zinc-400',
  cancelled_by_shop: 'bg-zinc-100 text-zinc-400',
  expired: 'bg-zinc-100 text-zinc-400',
  completed: 'bg-blue-100 text-blue-600',
  no_show: 'bg-red-100 text-red-500',
  in_pool: 'bg-orange-100 text-orange-600',
};

// Yönlendirme türüne göre renk (takvim kartı göstergesi için)
// null = standart rezervasyon (mavi), pool = havuz (turuncu), direct = doğrudan (yeşil)
export const REDIRECT_TYPE_COLORS = {
  standard: 'bg-blue-500',
  pool: 'bg-orange-500',
  direct: 'bg-green-500',
};

export const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const PX_PER_MIN = 0.8;

export function toLocalDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekDays(ws) {
  const [y, m, d] = ws.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mo}-${dd}`;
  });
}

export function getMondayOf(s) {
  const d = toLocalDate(s);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${dd}`;
}

export function todayStr() {
  const d = new Date();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${dd}`;
}

export function toDateStr(dt) {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function getApptPos(appt, startHour) {
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const startMin = start.getHours() * 60 + start.getMinutes() - startHour * 60;
  const durMin = (end - start) / 60000;
  return {
    top: Math.max(0, startMin * PX_PER_MIN),
    height: Math.max(14, durMin * PX_PER_MIN),
  };
}

export function computeColumns(appointments) {
  const sorted = [...appointments].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const columns = [];

  const result = sorted.map(appt => {
    const start = new Date(appt.starts_at).getTime();
    const end = new Date(appt.ends_at).getTime();
    let col = columns.findIndex(colEnd => colEnd <= start);
    if (col === -1) { col = columns.length; columns.push(end); }
    else { columns[col] = end; }
    return { appt, col };
  });

  return result.map(({ appt, col }) => {
    const start = new Date(appt.starts_at).getTime();
    const end = new Date(appt.ends_at).getTime();
    const overlapping = result.filter(({ appt: other }) => {
      const os = new Date(other.starts_at).getTime();
      const oe = new Date(other.ends_at).getTime();
      return os < end && oe > start;
    });
    const totalCols = Math.max(...overlapping.map(o => o.col)) + 1;
    return { appt, col, totalCols };
  });
}
