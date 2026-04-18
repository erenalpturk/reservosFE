import { useRef, useEffect, useState } from 'react';
import { STATUS_DOT, fmtTime } from './utils';

function fmtDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}s ${m}dk`;
  if (h > 0) return `${h}s`;
  return `${m}dk`;
}

function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getServiceLabel(appt) {
  const multiServiceNames = (appt.appointment_services || [])
    .map(item => item.services?.name)
    .filter(Boolean);

  if (multiServiceNames.length > 0) return multiServiceNames.join(', ');
  return appt.services?.name || '';
}

const GapBlock = ({ gapMs, gapStart, gapEnd, onCollapse, onTimeClick }) => {
  const gapMin = gapMs / 60000;
  const height = Math.min(160, Math.max(36, gapMin * 1.2));

  return (
    <button
      onClick={onCollapse}
      style={{ height: `${height}px` }}
      className="w-full flex items-stretch rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden text-left hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors group"
    >
      {/* Sol: saatler */}
      <div className="flex flex-col items-end justify-center px-3 py-2.5 gap-0.5 flex-shrink-0 w-14">
        <span className="text-[12px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">{fmtTime(gapStart.toISOString())}</span>
        <span className="text-[11px] font-semibold text-zinc-300 dark:text-zinc-600 leading-none">{fmtTime(gapEnd.toISOString())}</span>
      </div>

      {/* Dikey ayraç */}
      <div className="w-px bg-zinc-200 dark:bg-zinc-700 my-2 flex-shrink-0" />

      {/* Orta: boşluk bilgisi */}
      <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center">
        <span className="text-[12px] font-bold text-zinc-300 dark:text-zinc-600">{fmtDuration(gapMs)} boş</span>
      </div>

      {/* Sağ: randevusuz ekle butonu */}
      {onTimeClick && (
        <div className="flex items-center px-3 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onTimeClick(toDateTimeLocalValue(gapStart)); }}
            className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center transition-colors"
            title="Randevusuz ekle"
          >
            <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}
    </button>
  );
};

const DayView = ({ appointments, loading, onSelect, onTimeClick, date, expandGaps, highlightApptId, highlightTick }) => {
  const highlightRef = useRef(null);
  const [expandedGaps, setExpandedGaps] = useState(new Set());

  // expandGaps kapandığında bireysel açılımları da temizle
  useEffect(() => {
    if (!expandGaps) setExpandedGaps(new Set());
  }, [expandGaps]);

  const toggleGap = (i) => setExpandedGaps(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  useEffect(() => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightApptId, highlightTick, appointments.length]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 dark:border-zinc-300 border-t-transparent rounded-full" />
    </div>
  );

  const sorted = [...appointments].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  if (sorted.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <div className="text-3xl">☕️</div>
      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Henüz randevu yok</p>
    </div>
  );

  const now = Date.now();
  const items = [];
  for (let i = 0; i < sorted.length; i++) {
    const appt = sorted[i];
    const isHighlighted = appt.id === highlightApptId;
    const isPast = new Date(appt.ends_at).getTime() < now;
    const color = appt.staff?.color_hex || '#71717a';
    const durMs = new Date(appt.ends_at) - new Date(appt.starts_at);
    const durMin = durMs / 60000;
    const apptHeight = Math.min(200, Math.max(56, durMin * 1.2));
    const serviceLabel = getServiceLabel(appt);

    items.push(
      <button
        key={isHighlighted ? `${appt.id}-${highlightTick}` : appt.id}
        ref={isHighlighted ? highlightRef : null}
        onClick={() => console.log('Selected appointment:', appt) || onSelect(appt)}
        className={`w-full flex items-stretch gap-0 rounded-lg overflow-hidden text-left transition-all hover:opacity-80 active:scale-[0.99] bg-white dark:bg-zinc-800/60 ${isHighlighted ? 'appt-highlight ring-2 ring-orange-300 ring-offset-1' : ''} ${isPast ? 'opacity-40' : ''} ${appt.status == 'completed' || appt.status == 'expired' ? 'opacity-40' : ''} `}
        style={{ borderLeft: `3px solid ${color}`, height: `${apptHeight}px` }}
      >
        {/* Sol: saatler */}
        <div className="flex flex-col items-end justify-center px-3 py-3 gap-0.5 flex-shrink-0 w-14">
          <span className="text-[13px] font-black text-zinc-800 dark:text-zinc-100 leading-none">{fmtTime(appt.starts_at)}</span>
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 leading-none">{fmtTime(appt.ends_at)}</span>
        </div>

        {/* Dikey ayraç */}
        <div className="w-px bg-zinc-100 dark:bg-zinc-700 my-2 flex-shrink-0" />

        {/* Sağ: isim + hizmet */}
        <div className="flex-1 min-w-0 px-3 py-3 flex flex-col justify-center gap-0.5">
          <span className="text-[14px] text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            {appt.phone_customers?.full_name || appt.customer_name || 'Randevusuz'}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
            {serviceLabel}{serviceLabel ? ' · ' : ''}{fmtDuration(durMs)}
          </span>
        </div>

        {/* Status dot */}
        <div className="flex items-center px-3 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${STATUS_DOT[appt.status] || 'bg-zinc-300 dark:bg-zinc-500'}`} />
        </div>
      </button>
    );

    // Sonraki randevu ile boşluk var mı?
    if (i < sorted.length - 1) {
      const gapStart = new Date(appt.ends_at);
      const gapEnd = new Date(sorted[i + 1].starts_at);
      const gapMs = gapEnd - gapStart;

      if (gapMs > 0) {
        const isExpanded = expandGaps || expandedGaps.has(i);
        if (isExpanded) {
          items.push(
            <GapBlock
              key={`gap-${i}`}
              gapMs={gapMs}
              gapStart={gapStart}
              gapEnd={gapEnd}
              onCollapse={() => {
                if (expandGaps) return; // toplu modda bireysel kapatma yok
                toggleGap(i);
              }}
              onTimeClick={onTimeClick}
            />
          );
        } else {
          items.push(
            <button
              key={`gap-${i}`}
              onClick={() => toggleGap(i)}
              className="w-full flex items-center gap-2 px-2 py-1 group"
            >
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600 transition-colors" />
              <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 whitespace-nowrap transition-colors">{fmtDuration(gapMs)} boş</span>
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600 transition-colors" />
            </button>
          );
        }
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col gap-1 px-1 pb-1">
        {items}
      </div>
    </div>
  );
};

export default DayView;
