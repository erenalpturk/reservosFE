import { useState, useEffect } from 'react';
import { todayStr, PX_PER_MIN } from '../utils';

export function useNowLine(dateStr, startHour, endHour) {
  const [nowTop, setNowTop] = useState(null);

  useEffect(() => {
    const calc = () => {
      const today = todayStr();
      if (dateStr !== today) { setNowTop(null); return; }
      const now = new Date();
      const min = now.getHours() * 60 + now.getMinutes() - startHour * 60;
      if (min < 0 || min > (endHour - startHour) * 60) { setNowTop(null); return; }
      setNowTop(min * PX_PER_MIN);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [dateStr, startHour, endHour]);

  return nowTop;
}
