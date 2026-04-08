import { useEffect, useRef } from 'react';
import { PX_PER_MIN, STATUS_DOT, fmtTime, computeColumns, getApptPos } from './utils';
import { useNowLine } from './hooks/useNowLine';

const DayView = ({ appointments, loading, onSelect, onTimeClick, date, startHour, endHour, highlightApptId, highlightTick }) => {
  const totalHeight = (endHour - startHour) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowTop = useNowLine(date, startHour, endHour);
  const highlightRef = useRef(null);

  useEffect(() => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [highlightApptId, highlightTick, appointments.length]);

  const handleGridClick = (e) => {
    if (!onTimeClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = Math.floor(y / PX_PER_MIN / 15) * 15; // 15'er dakika snap
    const h = Math.floor(totalMin / 60) + startHour;
    const m = totalMin % 60;
    const pad = (n) => String(n).padStart(2, '0');
    onTimeClick(`${date}T${pad(h)}:${pad(m)}`);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-4 border-zinc-900 dark:border-zinc-300 border-t-transparent rounded-full" />
    </div>
  );

  const positioned = computeColumns(appointments);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden rounded-xl">
      <div className="flex" style={{ height: `${totalHeight}px`, position: 'relative' }}>

        {/* Saat etiketleri */}
        <div className="flex-shrink-0 relative" style={{ width: '36px' }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute text-[9px] font-bold text-zinc-300 dark:text-zinc-600 leading-none text-right pr-1.5"
              style={{ top: `${(h - startHour) * 60 * PX_PER_MIN - 5}px`, width: '100%' }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Randevu kolonu */}
        <div className="flex-1 relative" onClick={handleGridClick}>
          {/* Saat çizgileri */}
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800"
              style={{ top: `${(h - startHour) * 60 * PX_PER_MIN}px` }}
            />
          ))}
          {/* Yarım saat çizgileri */}
          {hours.map(h => (
            <div
              key={`${h}h`}
              className="absolute left-0 right-0 border-t border-dashed border-zinc-50 dark:border-zinc-900"
              style={{ top: `${(h - startHour) * 60 * PX_PER_MIN + 30 * PX_PER_MIN}px` }}
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
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Henüz randevu yok</p>
            </div>
          )}

          {positioned.map(({ appt, col, totalCols }) => {
            const { top, height } = getApptPos(appt, startHour);
            const color = appt.barbers?.color_hex || '#71717a';
            const isHighlighted = appt.id === highlightApptId;
            const GAP = 2;
            const colW = `calc((100% - ${GAP * (totalCols + 1)}px) / ${totalCols})`;
            const colL = `calc(${GAP}px + (${col} * (100% - ${GAP * (totalCols + 1)}px) / ${totalCols}) + ${col * GAP}px)`;
            return (
              <button
                key={isHighlighted ? `${appt.id}-${highlightTick}` : appt.id}
                ref={isHighlighted ? highlightRef : null}
                onClick={(e) => { e.stopPropagation(); onSelect(appt); }}
                className={`absolute rounded-l overflow-hidden text-left transition-all hover:opacity-80 active:scale-[0.98] flex items-stretch ${isHighlighted ? 'appt-highlight ring-2 ring-orange-300 ring-offset-1 z-20' : ''}`}
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
                  <div className="flex-shrink-0">
                    <div className="text-[10px] font-black text-zinc-700 dark:text-zinc-100 whitespace-nowrap">{fmtTime(appt.starts_at)}</div>
                    {height > 28 && (
                      <div className="text-[9px] font-bold text-zinc-300 dark:text-zinc-500 whitespace-nowrap">{fmtTime(appt.ends_at)}</div>
                    )}
                  </div>

                  {height > 20 && totalCols < 3 && (
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xs uppercase tracking-tight truncate leading-tight text-zinc-800 dark:text-zinc-100">
                        {appt.phone_customers?.full_name || 'Walk-In'}
                      </div>
                      {height > 34 && (
                        <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 truncate">{appt.services?.name}</div>
                      )}
                    </div>
                  )}

                  <div className="flex-shrink-0 flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[appt.status] || 'bg-zinc-300 dark:bg-zinc-500'}`} />
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

export default DayView;
