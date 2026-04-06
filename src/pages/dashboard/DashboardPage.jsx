import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/Button';
import WalkInModal from './WalkInModal';
import SettingsTab from './SettingsTab';
import { useAuthStore } from '../../stores/authStore';

// ─── Sabitler ───────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled_by_customer: 'Müşteri İptal',
  cancelled_by_shop: 'Dükkan İptal',
  expired: 'Süresi Doldu',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};


const STATUS_DOT = {
  pending: 'bg-orange-400',
  confirmed: 'bg-green-400',
  completed: 'bg-blue-400',
  no_show: 'bg-red-400',
  rejected: 'bg-zinc-300',
  cancelled_by_customer: 'bg-zinc-300',
  cancelled_by_shop: 'bg-zinc-300',
  expired: 'bg-zinc-300',
};

const STATUS_COLORS = {
  pending: 'bg-orange-100 text-orange-600',
  confirmed: 'bg-green-100 text-green-600',
  rejected: 'bg-zinc-100 text-zinc-400',
  cancelled_by_customer: 'bg-zinc-100 text-zinc-400',
  cancelled_by_shop: 'bg-zinc-100 text-zinc-400',
  expired: 'bg-zinc-100 text-zinc-400',
  completed: 'bg-blue-100 text-blue-600',
  no_show: 'bg-red-100 text-red-500',
};

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

function toLocalDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getWeekDays(ws) {
  const [y, m, d] = ws.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    return dt.toISOString().split('T')[0];
  });
}

function getMondayOf(s) {
  const d = toLocalDate(s);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Randevu Detay Popup ─────────────────────────────────────────────────────

const DetailModal = ({ appt, user, onClose, onAction, onCancel }) => {
  const [loading, setLoading] = useState(null);
  const isPast = new Date(appt.starts_at) < new Date();

  const doAction = async (action) => {
    setLoading(action);
    try { await onAction(appt.id, action); onClose(); }
    catch { alert('İşlem başarısız.'); setLoading(null); }
  };

  const doCancel = async () => {
    if (!window.confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) return;
    setLoading('cancel');
    try { await onCancel(appt.id); onClose(); }
    catch { alert('İptal başarısız.'); setLoading(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 shadow-2xl animate-fadeIn">

        {/* Başlık satırı */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-black text-xl uppercase tracking-tight leading-tight">
              {appt.phone_customers?.full_name || 'Walk-In'}
            </div>
            {appt.phone_customers?.phone && (
              <div className="text-xs font-bold text-zinc-400 mt-0.5">{appt.phone_customers.phone}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[appt.status] || 'bg-zinc-100 text-zinc-400'}`}>
              {STATUS_LABELS[appt.status]}
            </span>
            <button onClick={onClose} className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Detaylar */}
        <div className="bg-zinc-50 rounded-2xl px-4 py-3 space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">📅</span>
            <span className="font-bold text-zinc-700">
              {new Date(appt.starts_at).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">⏱</span>
            <span className="font-bold text-zinc-700">{fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">✂️</span>
            <span className="font-bold text-zinc-700">{appt.services?.name}</span>
            <span className="text-xs text-zinc-400">({appt.services?.duration_min} dk)</span>
          </div>
          {user?.isOwner && appt.barbers && (
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: appt.barbers.color_hex }} />
              <span className="font-bold text-zinc-700">{appt.barbers.full_name}</span>
            </div>
          )}
        </div>

        {/* Aksiyonlar */}
        {appt.status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="primary" loading={loading === 'confirm'} onClick={() => doAction('confirm')}>Onayla</Button>
            <Button variant="secondary" loading={loading === 'reject'} onClick={() => doAction('reject')}>Reddet</Button>
          </div>
        )}
        {appt.status === 'confirmed' && !isPast && (
          <Button variant="danger" loading={loading === 'cancel'} onClick={doCancel}>İptal Et</Button>
        )}
        {appt.status === 'confirmed' && isPast && (
          <div className="flex gap-2">
            <Button variant="primary" loading={loading === 'complete'} onClick={() => doAction('complete')}>Tamamlandı</Button>
            <Button variant="secondary" loading={loading === 'no-show'} onClick={() => doAction('no-show')}>Gelmedi</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Çakışma hesaplama ───────────────────────────────────────────────────────

function computeColumns(appointments) {
  // Her randevuya column index ve toplam column sayısı ata
  const sorted = [...appointments].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const columns = []; // columns[i] = son biten zaman

  const result = sorted.map(appt => {
    const start = new Date(appt.starts_at).getTime();
    const end = new Date(appt.ends_at).getTime();
    let col = columns.findIndex(colEnd => colEnd <= start);
    if (col === -1) { col = columns.length; columns.push(end); }
    else { columns[col] = end; }
    return { appt, col };
  });

  // Her randevu için çakıştığı grubun genişliğini bul
  return result.map(({ appt, col }) => {
    const start = new Date(appt.starts_at).getTime();
    const end = new Date(appt.ends_at).getTime();
    // Bu randevu ile çakışan diğerlerini bul
    const overlapping = result.filter(({ appt: other }) => {
      const os = new Date(other.starts_at).getTime();
      const oe = new Date(other.ends_at).getTime();
      return os < end && oe > start;
    });
    const totalCols = Math.max(...overlapping.map(o => o.col)) + 1;
    return { appt, col, totalCols };
  });
}

// ─── Gün Görünümü ────────────────────────────────────────────────────────────

function useNowLine(dateStr) {
  const [nowTop, setNowTop] = useState(null);

  useEffect(() => {
    const calc = () => {
      const today = todayStr();
      if (dateStr !== today) { setNowTop(null); return; }
      const now = new Date();
      const min = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      if (min < 0 || min > (END_HOUR - START_HOUR) * 60) { setNowTop(null); return; }
      setNowTop(min * PX_PER_MIN);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [dateStr]);

  return nowTop;
}

const DayView = ({ appointments, loading, onSelect, date }) => {
  const nowTop = useNowLine(date);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 border-t-transparent rounded-full" />
    </div>
  );

  const positioned = computeColumns(appointments);

  return (
    <div className="overflow-y-auto overflow-x-hidden rounded-xl" style={{ maxHeight: '520px' }}>
      <div className="flex" style={{ height: `${TOTAL_HEIGHT}px`, position: 'relative' }}>

        {/* Saat etiketleri */}
        <div className="flex-shrink-0 relative" style={{ width: '36px' }}>
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute text-[9px] font-bold text-zinc-300 leading-none text-right pr-1.5"
              style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN - 5}px`, width: '100%' }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Randevu kolonu */}
        <div className="flex-1 relative">
          {/* Saat çizgileri */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-zinc-100"
              style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN}px` }}
            />
          ))}
          {/* Yarım saat çizgileri */}
          {HOURS.map(h => (
            <div
              key={`${h}h`}
              className="absolute left-0 right-0 border-t border-dashed border-zinc-50"
              style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN + 30 * PX_PER_MIN}px` }}
            />
          ))}

          {/* Şu anki saat çizgisi */}
          {nowTop !== null && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
              style={{ top: `${nowTop}px` }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          )}

          {appointments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 pointer-events-none">
              <div className="text-3xl">☕️</div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Henüz randevu yok</p>
            </div>
          )}

          {positioned.map(({ appt, col, totalCols }) => {
            const { top, height } = getApptPos(appt);
            const color = appt.barbers?.color_hex || '#71717a';
            const GAP = 2;
            const colW = `calc((100% - ${GAP * (totalCols + 1)}px) / ${totalCols})`;
            const colL = `calc(${GAP}px + (${col} * (100% - ${GAP * (totalCols + 1)}px) / ${totalCols}) + ${col * GAP}px)`;
            return (
              <button
                key={appt.id}
                onClick={() => onSelect(appt)}
                className="absolute rounded-l overflow-hidden text-left transition-all hover:opacity-80 active:scale-[0.98] flex items-stretch"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: colL,
                  width: colW,
                  backgroundColor: color + '18',
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex items-center gap-1.5 px-2 py-1 flex-1 min-w-0">
                  {/* Saat */}
                  <div className="flex-shrink-0">
                    <div className="text-[10px] font-black text-zinc-700 whitespace-nowrap">{fmtTime(appt.starts_at)}</div>
                    {height > 28 && (
                      <div className="text-[9px] font-bold text-zinc-300 whitespace-nowrap">{fmtTime(appt.ends_at)}</div>
                    )}
                  </div>

                  {height > 20 && totalCols < 3 && (
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xs uppercase tracking-tight truncate leading-tight text-zinc-800">
                        {appt.phone_customers?.full_name || 'Walk-In'}
                      </div>
                      {height > 34 && (
                        <div className="text-[9px] font-bold text-zinc-400 truncate">{appt.services?.name}</div>
                      )}
                    </div>
                  )}

                  <div className="flex-shrink-0 flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[appt.status] || 'bg-zinc-300'}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Hafta Görünümü ──────────────────────────────────────────────────────────

const START_HOUR = 9;
const END_HOUR = 21;
const PX_PER_MIN = 0.8; // 48px/saat
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function getApptPos(appt) {
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const startMin = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
  const durMin = (end - start) / 60000;
  return {
    top: Math.max(0, startMin * PX_PER_MIN),
    height: Math.max(14, durMin * PX_PER_MIN),
  };
}

const WeekView = ({ weekDays, appointments, loading, onSelect, onDayClick }) => {
  const today = todayStr();
  const nowTop = useNowLine(today); // haftalık görünümde bugünün sütununda gösterilir

  const byDay = {};
  weekDays.forEach(d => { byDay[d] = []; });
  appointments.forEach(appt => {
    const day = appt.starts_at.split('T')[0];
    if (byDay[day]) byDay[day].push(appt);
  });

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div>
      {/* Gün başlıkları */}
      <div className="flex mb-1.5" style={{ paddingLeft: '30px' }}>
        {weekDays.map((day, i) => {
          const isToday = day === today;
          const hasPending = (byDay[day] || []).some(a => a.status === 'pending');
          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              className={`flex-1 rounded-lg py-1 mx-px text-center transition-all ${
                isToday ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              <div className="text-[8px] font-black uppercase tracking-widest">{DAY_NAMES[i]}</div>
              <div className="text-xs font-black leading-tight">{toLocalDate(day).getDate()}</div>
              <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${hasPending ? 'bg-orange-400' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {/* Saat grid */}
      <div className="overflow-y-auto overflow-x-hidden rounded-xl" style={{ maxHeight: '440px' }}>
        <div className="flex" style={{ height: `${TOTAL_HEIGHT}px`, position: 'relative' }}>

          {/* Saat etiketleri */}
          <div className="flex-shrink-0 relative" style={{ width: '30px' }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute text-[8px] font-bold text-zinc-300 leading-none text-right pr-1"
                style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN - 5}px`, width: '100%' }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Gün kolonları */}
          <div className="flex flex-1 relative">
            {/* Saat çizgileri */}
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-zinc-100"
                style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN}px` }}
              />
            ))}
            {/* Yarım saat çizgileri */}
            {HOURS.map(h => (
              <div
                key={`${h}h`}
                className="absolute left-0 right-0 border-t border-dashed border-zinc-50"
                style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN + 30 * PX_PER_MIN}px` }}
              />
            ))}

            {weekDays.map((day) => {
              const dayAppts = byDay[day] || [];
              const positioned = computeColumns(dayAppts);
              const isToday = day === today;
              return (
                <div key={day} className="flex-1 relative mx-px">
                  {/* Şu anki saat çizgisi — sadece bugün */}
                  {isToday && nowTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                      style={{ top: `${nowTop}px` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  )}
                  {positioned.map(({ appt, col, totalCols }) => {
                    const { top, height } = getApptPos(appt);
                    const color = appt.barbers?.color_hex || '#71717a';
                    const GAP = 1;
                    const colW = `calc((100% - ${GAP * (totalCols + 1)}px) / ${totalCols})`;
                    const colL = `calc(${GAP}px + ${col} * ((100% - ${GAP * (totalCols + 1)}px) / ${totalCols} + ${GAP}px))`;
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onSelect(appt)}
                        className="absolute rounded overflow-hidden text-left transition-opacity hover:opacity-80 active:scale-[0.97]"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: colL,
                          width: colW,
                          backgroundColor: color + '28',
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        <div className="px-0.5 pt-px">
                          <div className="text-[7px] font-black leading-tight truncate" style={{ color }}>
                            {fmtTime(appt.starts_at)}
                          </div>
                          {height > 22 && totalCols < 3 && (
                            <div className="text-[7px] font-bold text-zinc-500 truncate leading-tight">
                              {(appt.phone_customers?.full_name || 'Walk').split(' ')[0]}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hafta özeti */}
      <div className="flex gap-2 mt-3">
        {[
          { label: 'Toplam', count: appointments.length, cls: 'text-zinc-700' },
          { label: 'Bekleyen', count: appointments.filter(a => a.status === 'pending').length, cls: 'text-orange-500' },
          { label: 'Onaylı', count: appointments.filter(a => a.status === 'confirmed').length, cls: 'text-green-600' },
          { label: 'Tamam', count: appointments.filter(a => a.status === 'completed').length, cls: 'text-blue-500' },
        ].map(({ label, count, cls }) => (
          <div key={label} className="flex-1 bg-white rounded-xl p-2 border border-zinc-100 text-center">
            <div className={`text-base font-black ${cls}`}>{count}</div>
            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Ana Dashboard ───────────────────────────────────────────────────────────

const DashboardPage = () => {
  const [tab, setTab] = useState('program');
  const [viewMode, setViewMode] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [weekStart, setWeekStart] = useState(getMondayOf(todayStr()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const weekDays = getWeekDays(weekStart);

  const fetchShop = useCallback(async () => {
    try { const r = await api.get('/shops/me'); setShop(r.data.shop); }
    catch (e) { console.error(e); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = viewMode === 'week'
        ? { startDate: weekDays[0], endDate: weekDays[6] }
        : { date };
      const r = await api.get('/appointments', { params });
      setAppointments(r.data.appointments);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewMode, date, weekStart]);

  useEffect(() => { fetchShop(); }, []);
  useEffect(() => {
    if (tab !== 'program') return;
    fetchAppointments();
    const iv = setInterval(fetchAppointments, 30000);
    return () => clearInterval(iv);
  }, [tab, fetchAppointments]);

  const handleAction = async (id, action) => {
    await api.patch(`/appointments/${id}/${action}`);
    fetchAppointments();
  };
  const handleCancel = async (id) => {
    await api.delete(`/appointments/${id}`);
    fetchAppointments();
  };

  const shiftWeek = (dir) => {
    const [y, m, d] = weekStart.split('-').map(Number);
    const dt = new Date(y, m - 1, d + dir * 7);
    setWeekStart(dt.toISOString().split('T')[0]);
  };
  const shiftDay = (dir) => {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d + dir);
    setDate(dt.toISOString().split('T')[0]);
  };
  const handleDayClick = (day) => { setDate(day); setViewMode('day'); };

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  return (
    <div className="bg-zinc-50 min-h-screen w-full overflow-x-hidden">
      <div className="w-full max-w-md mx-auto">

        {/* ── Header kompakt ── */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-tighter">
              {tab === 'program' ? 'Program' : 'Ayarlar'}
            </h1>
            {tab === 'program' && pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-400 text-white rounded-full text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden sm:block">
              {user?.fullName}
            </span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3 py-1.5 border-2 border-zinc-200 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1.5 px-5 pb-3">
          {[['program', '📅 Program'], ['ayarlar', '⚙️ Ayarlar']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === val ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Program ── */}
        {tab === 'program' && (
          <div className="px-5 pb-10">
            {/* Kontrol satırı */}
            <div className="flex items-center gap-1.5 mb-3">
              {/* Gün/Hafta */}
              <div className="flex bg-white border-2 border-zinc-100 rounded-xl overflow-hidden flex-shrink-0">
                {[['day', 'Gün'], ['week', 'Hafta']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setViewMode(val)}
                    className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                      viewMode === val ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tarih gezintisi */}
              <div className="flex flex-1 min-w-0 items-center gap-1">
                <button
                  onClick={() => viewMode === 'day' ? shiftDay(-1) : shiftWeek(-1)}
                  className="px-2.5 py-2 bg-white border-2 border-zinc-100 rounded-xl text-zinc-500 hover:border-zinc-300 font-black text-sm transition-all"
                >‹</button>
                {viewMode === 'day' ? (
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="flex-1 min-w-0 w-0 py-2 px-2 border-2 border-zinc-100 rounded-xl text-[10px] font-bold focus:border-zinc-900 focus:outline-none bg-white text-center uppercase"
                  />
                ) : (
                  <div className="flex-1 min-w-0 py-2 px-2 bg-white border-2 border-zinc-100 rounded-xl text-[10px] font-black text-zinc-600 text-center uppercase tracking-widest truncate">
                    {toLocalDate(weekDays[0]).getDate()}–{toLocalDate(weekDays[6]).getDate()}{' '}
                    {toLocalDate(weekDays[6]).toLocaleDateString('tr-TR', { month: 'short' })}
                  </div>
                )}
                <button
                  onClick={() => viewMode === 'day' ? shiftDay(1) : shiftWeek(1)}
                  className="px-2.5 py-2 bg-white border-2 border-zinc-100 rounded-xl text-zinc-500 hover:border-zinc-300 font-black text-sm transition-all"
                >›</button>
              </div>

              {/* Walk-in */}
              <button
                onClick={() => setShowWalkIn(true)}
                className="px-3 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex-shrink-0"
              >
                +
              </button>
            </div>

            {viewMode === 'day'
              ? <DayView appointments={appointments} loading={loading} onSelect={setSelectedAppt} date={date} />
              : <WeekView weekDays={weekDays} appointments={appointments} loading={loading} onSelect={setSelectedAppt} onDayClick={handleDayClick} />
            }
          </div>
        )}

        {tab === 'ayarlar' && (
          <SettingsTab shop={shop} user={user} onShopUpdated={fetchShop} />
        )}
      </div>

      {selectedAppt && (
        <DetailModal
          appt={selectedAppt}
          user={user}
          onClose={() => setSelectedAppt(null)}
          onAction={handleAction}
          onCancel={handleCancel}
        />
      )}

      {showWalkIn && shop && (
        <WalkInModal
          shop={shop}
          currentUser={user}
          onClose={() => setShowWalkIn(false)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
};

export default DashboardPage;
