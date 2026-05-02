import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import WalkInModal from './WalkInModal';
import HistoryTab from './HistoryTab';
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
  const [isInitialAppointmentsLoading, setIsInitialAppointmentsLoading] = useState(true);
  const [isRefreshingAppointments, setIsRefreshingAppointments] = useState(false);
  const [shop, setShop] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [highlightApptId, setHighlightApptId] = useState(null);
  const [highlightTick, setHighlightTick] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInStartsAt, setWalkInStartsAt] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandGaps, setExpandGaps] = useState(false);
  const [staffScope, setStaffScope] = useState('personal'); // 'shop' | 'personal'
  const [contentHeight, setContentHeight] = useState('auto');
  const { user, logout } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const topFixedRef = useRef(null);
  const bottomFixedRef = useRef(null);
  const profileMenuRef = useRef(null);
  const dayPickerRef = useRef(null);
  const hasLoadedAppointmentsRef = useRef(false);
  const latestAppointmentsReqRef = useRef(0);
  const initialLoadCounterRef = useRef(0);
  const refreshLoadCounterRef = useRef(0);

  const weekDays = getWeekDays(weekStart);

  const fetchShop = useCallback(async () => {
    try { const r = await api.get('/shops/me'); setShop(r.data.shop); }
    catch (e) { console.error(e); }
  }, []);

  const fetchAppointments = useCallback(async ({ background } = {}) => {
    const shouldBackground = typeof background === 'boolean'
      ? background
      : hasLoadedAppointmentsRef.current;
    const isBlocking = !hasLoadedAppointmentsRef.current || !shouldBackground;
    const requestId = latestAppointmentsReqRef.current + 1;
    latestAppointmentsReqRef.current = requestId;

    if (isBlocking) {
      initialLoadCounterRef.current += 1;
      setIsInitialAppointmentsLoading(true);
    } else {
      refreshLoadCounterRef.current += 1;
      setIsRefreshingAppointments(true);
    }

    try {
      const params = viewMode === 'week'
        ? { startDate: weekDays[0], endDate: weekDays[6] }
        : { date };
      const r = await api.get('/appointments', { params });
      if (requestId !== latestAppointmentsReqRef.current) return;
      setAppointments(r.data.appointments || []);
      hasLoadedAppointmentsRef.current = true;
    } catch (e) { console.error(e); }
    finally {
      if (isBlocking) {
        initialLoadCounterRef.current = Math.max(0, initialLoadCounterRef.current - 1);
        if (initialLoadCounterRef.current === 0) {
          setIsInitialAppointmentsLoading(false);
        }
      } else {
        refreshLoadCounterRef.current = Math.max(0, refreshLoadCounterRef.current - 1);
        if (refreshLoadCounterRef.current === 0) {
          setIsRefreshingAppointments(false);
        }
      }
    }
  }, [viewMode, date, weekStart]);

  const fetchAllPendingAppointments = useCallback(async () => {
    try {
      const r = await api.get('/appointments', { params: { status: 'pending' } });
      setAllPendingAppointments(r.data.appointments || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPoolAppointments = useCallback(async () => {
    try {
      const r = await api.get('/appointments/pool');
      setPoolAppointments(r.data.appointments || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchHistoryAppointments = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const r = await api.get('/appointments', {
        params: { status: 'rejected,expired,cancelled_by_customer,cancelled_by_shop' },
      });
      setHistoryAppointments(r.data.appointments || []);
    } catch (e) { console.error(e); }
    finally { setIsHistoryLoading(false); }
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
    const iv = setInterval(() => {
      fetchAppointments({ background: true });
    }, 30000);
    return () => clearInterval(iv);
  }, [tab, fetchAppointments]);

  useEffect(() => {
    if (tab !== 'gecmis') return;
    fetchHistoryAppointments();
  }, [tab, fetchHistoryAppointments]);

  const handleAction = async (id, action, reason) => {
    const body = (action === 'reject' && reason) ? { reason } : undefined;
    await api.patch(`/appointments/${id}/${action}`, body);
    await Promise.all([fetchAppointments({ background: true }), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleCancel = async (id, reason) => {
    await api.delete(`/appointments/${id}`, reason ? { data: { reason } } : undefined);
    await Promise.all([fetchAppointments({ background: true }), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleClaimed = async () => {
    await Promise.all([fetchAppointments({ background: true }), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleRedirected = async () => {
    await Promise.all([fetchAppointments({ background: true }), fetchAllPendingAppointments(), fetchPoolAppointments()]);
  };
  const handleReschedule = async (id, startsAt, endsAt) => {
    await api.patch(`/appointments/${id}/reschedule`, { startsAt, endsAt });
    await Promise.all([fetchAppointments({ background: true }), fetchAllPendingAppointments(), fetchPoolAppointments()]);
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

  const handleWalkInSuccess = useCallback((createdAppointment) => {
    if (createdAppointment?.id) {
      setAppointments(prev => {
        const withoutCurrent = prev.filter(a => a.id !== createdAppointment.id);
        return [...withoutCurrent, createdAppointment]
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      });
      hasLoadedAppointmentsRef.current = true;
    }

    fetchAppointments({ background: true });
  }, [fetchAppointments]);


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

  const CALENDAR_STATUSES = ['pending', 'confirmed', 'in_pool', 'no_show', 'completed'];
  const calendarAppointments = scopedAppointments.filter(a => CALENDAR_STATUSES.includes(a.status));

  const pendingCount = allPendingAppointments.length;
  const poolCount = poolAppointments.length;
  const attentionCount = pendingCount + poolCount;
  const businessStaff = (shop?.staff || []).filter(s => s.is_active);
  const programSummary = [
    { label: 'Toplam', count: calendarAppointments.length, cls: 'text-zinc-700 dark:text-zinc-100' },
    { label: 'Bekleyen', count: pendingCount, cls: 'text-orange-500' },
    { label: 'Onaylı', count: calendarAppointments.filter(a => a.status === 'confirmed').length, cls: 'text-green-600' },
    { label: 'Tamam', count: calendarAppointments.filter(a => a.status === 'completed').length, cls: 'text-blue-500' },
  ];
  const summaryTitle = viewMode === 'day'
    ? toLocalDate(date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })
    : `${toLocalDate(weekDays[0]).getDate()}-${toLocalDate(weekDays[6]).getDate()} ${toLocalDate(weekDays[6]).toLocaleDateString('tr-TR', { month: 'short' })}`;
  const dayDate = toLocalDate(date);
  const dayLabel = `${dayDate.getDate()} ${dayDate.toLocaleDateString('tr-TR', { month: 'long' })}, ${dayDate.toLocaleDateString('tr-TR', { weekday: 'long' })}`;

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

  useEffect(() => {
    if (!showProfileMenu) return undefined;

    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') setShowProfileMenu(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showProfileMenu]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 h-dvh w-full overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="w-full max-w-md mx-auto h-full min-h-0 flex flex-col">

        {/* Üst sabit blok */}
        <div ref={topFixedRef} className="relative z-40 flex-shrink-0 bg-zinc-50/95 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-100 dark:border-zinc-800">
          {/* ── Satır 1: Başlık + Aksiyonlar ── */}
          <div className="flex justify-between items-center px-5 pt-5 pb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {(tab === 'ayarlar' || tab === 'gecmis') && (
                <button
                  type="button"
                  onClick={() => setTab('program')}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  aria-label="Programa dön"
                  title="Programa dön"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-black uppercase tracking-tighter">
                {tab === 'program' ? 'Program' : tab === 'ayarlar' ? 'Ayarlar' : 'Geçmiş'}
              </h1>
              {tab === 'program' && attentionCount > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-400 text-white rounded-full text-[9px] font-black">
                  {attentionCount}
                </span>
              )}
            </div>

            <div className="relative flex items-center gap-2 flex-shrink-0" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  ensureNotificationPermission();
                  setShowPendingModal(true);
                }}
                className="relative h-10 w-10 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-500 dark:text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-all"
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
                type="button"
                onClick={() => setShowProfileMenu(v => !v)}
                className="h-10 w-10 inline-flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 transition-all"
                aria-label="Profil menüsü"
                aria-expanded={showProfileMenu}
                title="Profil menüsü"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTab(t => (t === 'program' ? 'ayarlar' : 'program'));
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {tab === 'program' ? 'Ayarlar' : 'Program'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('gecmis'); setShowProfileMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Geçmiş
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Logout
                  </button>
                  <div className="flex items-center justify-between mt-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Theme</span>
                    {onToggleTheme
                      ? <ThemeToggle isDark={!!isDark} onToggle={onToggleTheme} />
                      : <span className="text-xs text-zinc-400">N/A</span>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Satır 2 + 3: Kontrol alanı ── */}
          {tab === 'program' && (
            <div className="px-5 pb-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 min-w-0 items-center gap-1.5">
                  <button
                    onClick={() => viewMode === 'day' ? shiftDay(-1) : shiftWeek(-1)}
                    className="h-[38px] px-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-black text-2xl leading-none transition-colors"
                    aria-label={viewMode === 'day' ? 'Önceki gün' : 'Önceki hafta'}
                  >‹</button>
                  {viewMode === 'day' ? (
                    <>
                      <input
                        ref={dayPickerRef}
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="absolute h-0 w-0 opacity-0 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!dayPickerRef.current) return;
                          if (typeof dayPickerRef.current.showPicker === 'function') {
                            dayPickerRef.current.showPicker();
                            return;
                          }
                          dayPickerRef.current.focus();
                          dayPickerRef.current.click();
                        }}
                        className="flex-1 min-w-0 h-[38px] text-center text-[15px] font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100 truncate"
                        aria-label="Tarih seç"
                        title="Tarih seç"
                      >
                        {dayLabel}
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 min-w-0 h-[38px] py-2 px-2 text-[14px] font-extrabold tracking-tight text-zinc-700 dark:text-zinc-200 text-center truncate">
                      {toLocalDate(weekDays[0]).getDate()}–{toLocalDate(weekDays[6]).getDate()}{' '}
                      {toLocalDate(weekDays[6]).toLocaleDateString('tr-TR', { month: 'short' })}
                    </div>
                  )}
                  <button
                    onClick={() => viewMode === 'day' ? shiftDay(1) : shiftWeek(1)}
                    className="h-[38px] px-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-black text-2xl leading-none transition-colors"
                    aria-label={viewMode === 'day' ? 'Sonraki gün' : 'Sonraki hafta'}
                  >›</button>

                  {/* Boşlukları genişlet (sadece gün görünümünde) */}
                  {viewMode === 'day' && (
                    <button
                      onClick={() => setExpandGaps(v => !v)}
                      title={expandGaps ? 'Boşlukları daralt' : 'Boşlukları genişlet'}
                      className={`h-[38px] w-[38px] inline-flex items-center justify-center border-2 rounded-xl transition-all flex-shrink-0 ${
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
                </div>

                <button
                  onClick={() => setShowWalkIn(true)}
                  className="h-[42px] px-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white transition-all active:scale-95 flex-shrink-0"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {/* Gün/Hafta toggle */}
                <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-md overflow-hidden flex-shrink-0">
                  {[['day', 'Gün'], ['week', 'Hafta']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setViewMode(val)}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewMode === val ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Kapsam toggle — sadece owner */}
                {isOwner && (
                  <div className="flex bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 rounded-md overflow-hidden flex-shrink-0">
                    {[['shop', 'Dükkan'], ['personal', 'Ben']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setStaffScope(val)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          staffScope === val ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Orta scroll alanı */}
        {tab === 'program' ? (
          <div className="relative min-h-0 overflow-hidden px-5 pt-3 pb-3" style={{ height: contentHeight }}>
            {viewMode === 'day'
              ? <DayView currentUser={user} appointments={calendarAppointments} loading={isInitialAppointmentsLoading} onSelect={setSelectedAppt} onTimeClick={(t) => { setWalkInStartsAt(t); setShowWalkIn(true); }} date={date} expandGaps={expandGaps} highlightApptId={highlightApptId} highlightTick={highlightTick} />
              : <WeekView weekDays={weekDays} appointments={calendarAppointments} loading={isInitialAppointmentsLoading} onSelect={setSelectedAppt} onDayClick={handleDayClick} startHour={startHour} endHour={endHour} />
            }
            {isRefreshingAppointments && !isInitialAppointmentsLoading && (
              <div className="pointer-events-none absolute right-6 bottom-4 z-10">
                <span className="inline-flex rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 shadow-sm animate-pulse">
                  Yenileniyor...
                </span>
              </div>
            )}
          </div>
        ) : tab === 'gecmis' ? (
          <div className="min-h-0 overflow-y-auto px-5 py-4" style={{ height: contentHeight }}>
            <HistoryTab appointments={historyAppointments} loading={isHistoryLoading} onSelect={setSelectedAppt} />
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
          onReschedule={handleReschedule}
        />
      )}

      {showWalkIn && shop && (
        <WalkInModal
          shop={shop}
          currentUser={user}
          onClose={() => { setShowWalkIn(false); setWalkInStartsAt(null); }}
          onSuccess={handleWalkInSuccess}
          initialStartsAt={walkInStartsAt}
        />
      )}
    </div>
  );
};

export default DashboardPage;
