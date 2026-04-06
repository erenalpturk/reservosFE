import { DAY_NAMES, PX_PER_MIN, todayStr, toLocalDate, fmtTime, computeColumns, getApptPos } from './utils';
import { useNowLine } from './hooks/useNowLine';

const WeekView = ({ weekDays, appointments, loading, onSelect, onDayClick, startHour, endHour }) => {
  const today = todayStr();
  const totalHeight = (endHour - startHour) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowTop = useNowLine(today, startHour, endHour);

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
    <div className="h-full overflow-y-auto">
      {/* Gün başlıkları */}
      <div className="sticky top-0 z-20 bg-zinc-50 pb-1.5 flex" style={{ paddingLeft: '30px' }}>
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
      <div className="overflow-x-hidden overflow-y-hidden rounded-xl">
        <div className="flex" style={{ height: `${totalHeight}px`, position: 'relative' }}>

          {/* Saat etiketleri */}
          <div className="flex-shrink-0 relative" style={{ width: '30px' }}>
            {hours.map(h => (
              <div
                key={h}
                className="absolute text-[8px] font-bold text-zinc-300 leading-none text-right pr-1"
                style={{ top: `${(h - startHour) * 60 * PX_PER_MIN - 5}px`, width: '100%' }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Gün kolonları */}
          <div className="flex flex-1 relative">
            {/* Saat çizgileri */}
            {hours.map(h => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-zinc-100"
                style={{ top: `${(h - startHour) * 60 * PX_PER_MIN}px` }}
              />
            ))}
            {/* Yarım saat çizgileri */}
            {hours.map(h => (
              <div
                key={`${h}h`}
                className="absolute left-0 right-0 border-t border-dashed border-zinc-50"
                style={{ top: `${(h - startHour) * 60 * PX_PER_MIN + 30 * PX_PER_MIN}px` }}
              />
            ))}

            {weekDays.map((day) => {
              const dayAppts = byDay[day] || [];
              const positioned = computeColumns(dayAppts);
              const isToday = day === today;
              return (
                <div key={day} className="flex-1 relative mx-px">
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
                    const { top, height } = getApptPos(appt, startHour);
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
    </div>
  );
};

export default WeekView;
