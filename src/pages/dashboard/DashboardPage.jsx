import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import WalkInModal from './WalkInModal';
import SettingsTab from './SettingsTab';
import DetailModal from './DetailModal';
import PendingAppointmentsModal from './PendingAppointmentsModal';
import DayView from './DayView';
import WeekView from './WeekView';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';
import { setupFcmForCurrentDevice } from '../../lib/fcm';
import { todayStr, getMondayOf, getWeekDays, toLocalDate, toDateStr } from './utils';

const REGISTERED_TOKEN_KEY = 'fcm:registered-token';

function getFcmErrorMessage(result) {
  const reason = result?.reason;
  if (reason === 'permission_denied') return 'Bildirim izni kapali. Tarayici ayarlarindan izin verin.';
  if (reason === 'ios_requires_standalone') return 'iPhone icin uygulamayi Ana Ekrana ekleyip oradan acin.';
  if (reason === 'insecure_context') return 'Bildirimler icin HTTPS veya localhost gerekir.';
  if (reason === 'missing_config') {
    const missing = Array.isArray(result?.missingKeys) ? result.missingKeys : [];
    if (missing.length > 0) {
      return `Firebase ayarlari eksik: ${missing.join(', ')}`;
    }
    return 'Firebase ayarlari eksik. Ortam degiskenlerini kontrol edin.';
  }
  return 'Bu cihazda bildirim desteklenmiyor veya kurulum tamamlanmamis.';
}

const DashboardPage = ({ isDark, onToggleTheme }) => {
  const [tab, setTab] = useState('program');
  const [viewMode, setViewMode] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [weekStart, setWeekStart] = useState(getMondayOf(todayStr()));
  const [appointments, setAppointments] = useState([]);
  const [allPendingAppointments, setAllPendingAppointments] = useState([]);
  const [poolAppointments, setPoolAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [highlightApptId, setHighlightApptId] = useState(null);
  const [highlightTick, setHighlightTick] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInStartsAt, setWalkInStartsAt] = useState(null);
  const [expandGaps, setExpandGaps] = useState(false);
  const [staffScope, setStaffScope] = useState('shop'); // 'shop' | 'personal'
  const [contentHeight, setContentHeight] = useState('auto');
  const { user, logout } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const topFixedRef = useRef(null);
  const bottomFixedRef = useRef(null);

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

  const fetchAllPendingAppointments = useCallback(async () => {
    try {
      const r = await api.get('/appointments');
      const pending = (r.data.appointments || []).filter(a => a.status === 'pending');
      setAllPendingAppointments(pending);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPoolAppointments = useCallback(async () => {
    try {
      const r = await api.get('/appointments/pool');
      setPoolAppointments(r.data.appointments || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchShop(); }, []);

  useEffect(() => {
    fetchAllPendingAppointments();
    const iv = setInterval(fetchAllPendingAppointments, 30000);
    return () => clearInterval(iv);
  }, [fetchAllPendingAppointments]);

  useEffect(() => {
    fetchPoolAppointments();
    const iv = setInterval(fetchPoolAppointments, 30000);
    return () => clearInterval(iv);
  }, [fetchPoolAppointments]);

  useEffect(() => {
    if (tab !== 'program') return;
    fetchAppointments();
    const iv = setInterval(fetchAppointments, 30000);
    return () => clearInterval(iv);
  }, [tab, fetchAppointments]);

  const handleAction = async (id, action) => {
    await api.patch(`/appointments/${id}/${action}`);
    await Promise.all([fetchAppointments(), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleCancel = async (id) => {
    await api.delete(`/appointments/${id}`);
    await Promise.all([fetchAppointments(), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleClaimed = async () => {
    await Promise.all([fetchAppointments(), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleRedirected = async () => {
    await Promise.all([fetchAppointments(), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };

  const ensureNotificationPermission = async () => {
    try {
      const result = await setupFcmForCurrentDevice({ forceRefresh: true });
      if (!result.ok) {
        toast(getFcmErrorMessage(result), 'info');
        return;
      }

      await api.post('/notifications/fcm-token', {
        token: result.token,
        platform: 'web',
      });
      localStorage.setItem(REGISTERED_TOKEN_KEY, result.token);
      toast('Bildirimler etkinlestirildi.', 'success');
    } catch (err) {
      console.error('FCM manuel kayit hatasi:', err.message);
    }
  };

  const shiftWeek = (dir) => {
    const [y, m, d] = weekStart.split('-').map(Number);
    setWeekStart(toDateStr(new Date(y, m - 1, d + dir * 7)));
  };
  const shiftDay = (dir) => {
    const [y, m, d] = date.split('-').map(Number);
    setDate(toDateStr(new Date(y, m - 1, d + dir)));
  };
  const handleDayClick = (day) => { setDate(day); setViewMode('day'); };


  const shopHours = shop?.business_hours || [];
  const startHour = shopHours.length
    ? Math.min(...shopHours.filter(h => !h.is_closed).map(h => parseInt(h.open_time, 10)))
    : 9;
  const endHour = shopHours.length
    ? Math.max(...shopHours.filter(h => !h.is_closed).map(h => parseInt(h.close_time, 10)))
    : 21;

  const isOwner = user?.isOwner === true;
  const scopedAppointments = (isOwner && staffScope === 'personal')
    ? appointments.filter(a => a.staff?.id === user.staffId)
    : appointments;

  const pendingCount = allPendingAppointments.length;
  const poolCount = poolAppointments.length;
  const attentionCount = pendingCount + poolCount;
  const businessStaff = (shop?.staff || []).filter(s => s.is_active);
  const programSummary = [
    { label: 'Toplam', count: scopedAppointments.length, cls: 'text-zinc-700 dark:text-zinc-100' },
    { label: 'Bekleyen', count: pendingCount, cls: 'text-orange-500' },
    { label: 'Onaylı', count: scopedAppointments.filter(a => a.status === 'confirmed').length, cls: 'text-green-600' },
    { label: 'Tamam', count: scopedAppointments.filter(a => a.status === 'completed').length, cls: 'text-blue-500' },
  ];
  const summaryTitle = viewMode === 'day'
    ? toLocalDate(date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })
    : `${toLocalDate(weekDays[0]).getDate()}-${toLocalDate(weekDays[6]).getDate()} ${toLocalDate(weekDays[6]).toLocaleDateString('tr-TR', { month: 'short' })}`;

  useLayoutEffect(() => {
    const updateContentHeight = () => {
      const topHeight = topFixedRef.current?.offsetHeight || 0;
      const bottomHeight = tab === 'program' ? (bottomFixedRef.current?.offsetHeight || 0) : 0;
      setContentHeight(`calc(100dvh - ${topHeight + bottomHeight}px)`);
    };

    updateContentHeight();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateContentHeight);
      if (topFixedRef.current) ro.observe(topFixedRef.current);
      if (bottomFixedRef.current) ro.observe(bottomFixedRef.current);
    }

    window.addEventListener('resize', updateContentHeight);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateContentHeight);
    };
  }, [tab, viewMode]);

  useEffect(() => {
    if (!highlightApptId) return undefined;
    const to = setTimeout(() => setHighlightApptId(null), 5000);
    return () => clearTimeout(to);
  }, [highlightApptId, highlightTick]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 h-dvh w-full overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="w-full max-w-md mx-auto h-full min-h-0 flex flex-col">

        {/* Üst sabit blok */}
        <div ref={topFixedRef} className="flex-shrink-0 bg-zinc-50/95 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-100 dark:border-zinc-800">
          {/* ── Header ── */}
          <div className="flex justify-between items-center px-5 pt-5 pb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-black uppercase tracking-tighter">
                {tab === 'program' ? 'Program' : 'Ayarlar'}
              </h1>
              {tab === 'program' && attentionCount > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-400 text-white rounded-full text-[9px] font-black">
                  {attentionCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onToggleTheme && (
                <ThemeToggle isDark={!!isDark} onToggle={onToggleTheme} />
              )}
              <button
                type="button"
                onClick={() => {
                  ensureNotificationPermission();
                  setShowPendingModal(true);
                }}
                className="relative h-8 w-8 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-all"
                aria-label="Bekleyen randevu bildirimlerini aç"
              >
                🔔
                {attentionCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-400 text-white text-[9px] leading-4 font-black">
                    {attentionCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab(t => t === 'ayarlar' ? 'program' : 'ayarlar')}
                type="button"
                className={`h-8 w-8 inline-flex items-center justify-center border-2 rounded-xl transition-all ${
                  tab === 'ayarlar'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-200 dark:text-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
                }`}
                aria-label="Ayarlar"
                title="Ayarlar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-zinc-300 dark:hover:text-zinc-100 transition-all"
                aria-label="Çıkış yap"
                title="Çıkış"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Kontrol satırı ── */}
          {tab === 'program' && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-1.5">
                {/* Gün/Hafta toggle */}
                <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl overflow-hidden flex-shrink-0">
                  {[['day', 'Gün'], ['week', 'Hafta']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setViewMode(val)}
                      className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                        viewMode === val ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Kapsam toggle — sadece owner */}
                {isOwner && (
                  <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl overflow-hidden flex-shrink-0">
                    {[['shop', 'Dükkan'], ['personal', 'Ben']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setStaffScope(val)}
                        className={`px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                          staffScope === val ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tarih gezintisi */}
                <div className="flex flex-1 min-w-0 items-center gap-1">
                  <button
                    onClick={() => viewMode === 'day' ? shiftDay(-1) : shiftWeek(-1)}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-500 font-black text-sm transition-all"
                  >‹</button>
                  {viewMode === 'day' ? (
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="flex-1 min-w-0 w-0 py-2 px-2 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold focus:border-zinc-900 dark:focus:border-zinc-300 focus:outline-none bg-white dark:bg-zinc-900 text-center uppercase"
                    />
                  ) : (
                    <div className="flex-1 min-w-0 py-2 px-2 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-black text-zinc-600 dark:text-zinc-300 text-center uppercase tracking-widest truncate">
                      {toLocalDate(weekDays[0]).getDate()}–{toLocalDate(weekDays[6]).getDate()}{' '}
                      {toLocalDate(weekDays[6]).toLocaleDateString('tr-TR', { month: 'short' })}
                    </div>
                  )}
                  <button
                    onClick={() => viewMode === 'day' ? shiftDay(1) : shiftWeek(1)}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-500 font-black text-sm transition-all"
                  >›</button>
                </div>

                {/* Boşlukları genişlet (sadece gün görünümünde) */}
                {viewMode === 'day' && (
                  <button
                    onClick={() => setExpandGaps(v => !v)}
                    title={expandGaps ? 'Boşlukları daralt' : 'Boşlukları genişlet'}
                    className={`h-[34px] w-[34px] inline-flex items-center justify-center border-2 rounded-xl transition-all flex-shrink-0 ${
                      expandGaps
                        ? 'border-zinc-900 text-zinc-900 dark:border-zinc-200 dark:text-zinc-100'
                        : 'border-zinc-100 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-500 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </button>
                )}

                {/* Walk-in */}
                <button
                  onClick={() => setShowWalkIn(true)}
                  className="px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white transition-all active:scale-95 flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orta scroll alanı */}
        {tab === 'program' ? (
          <div className="min-h-0 overflow-hidden px-5 pt-3 pb-3" style={{ height: contentHeight }}>
            {viewMode === 'day'
              ? <DayView appointments={scopedAppointments} loading={loading} onSelect={setSelectedAppt} onTimeClick={(t) => { setWalkInStartsAt(t); setShowWalkIn(true); }} date={date} expandGaps={expandGaps} highlightApptId={highlightApptId} highlightTick={highlightTick} />
              : <WeekView weekDays={weekDays} appointments={scopedAppointments} loading={loading} onSelect={setSelectedAppt} onDayClick={handleDayClick} startHour={startHour} endHour={endHour} />
            }
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto px-5 py-4" style={{ height: contentHeight }}>
            <SettingsTab shop={shop} user={user} onShopUpdated={fetchShop} />
          </div>
        )}

        {/* Alt özet */}
        {tab === 'program' && (
          <div ref={bottomFixedRef} className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 backdrop-blur px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {viewMode === 'day' ? 'Gün Özeti' : 'Hafta Özeti'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {summaryTitle}
              </span>
            </div>
            <div className="flex gap-2">
              {programSummary.map(({ label, count, cls }) => (
                <div key={label} className="flex-1 bg-white dark:bg-zinc-900 rounded-xl p-2 border border-zinc-100 dark:border-zinc-700 text-center">
                  <div className={`text-base font-black ${cls}`}>{count}</div>
                  <div className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPendingModal && (
        <PendingAppointmentsModal
          appointments={allPendingAppointments}
          poolAppointments={poolAppointments}
          user={user}
          onClose={() => setShowPendingModal(false)}
          onShowInCalendar={(appt, mode) => {
            const apptDay = appt.starts_at?.split('T')[0];
            if (!apptDay) return;
            setTab('program');
            setDate(apptDay);
            setWeekStart(getMondayOf(apptDay));
            setViewMode(mode);
            setHighlightApptId(appt.id);
            setHighlightTick(v => v + 1);
            setShowPendingModal(false);
          }}
          onSelect={(appt) => {
            setShowPendingModal(false);
            setSelectedAppt(appt);
          }}
          onClaimed={handleClaimed}
        />
      )}

      {selectedAppt && (
        <DetailModal
          appt={selectedAppt}
          user={user}
          businessStaff={businessStaff}
          onClose={() => setSelectedAppt(null)}
          onAction={handleAction}
          onCancel={handleCancel}
          onRedirected={handleRedirected}
        />
      )}

      {showWalkIn && shop && (
        <WalkInModal
          shop={shop}
          currentUser={user}
          onClose={() => { setShowWalkIn(false); setWalkInStartsAt(null); }}
          onSuccess={fetchAppointments}
          initialStartsAt={walkInStartsAt}
        />
      )}
    </div>
  );
};

export default DashboardPage;
