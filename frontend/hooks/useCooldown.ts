import { useCallback, useEffect, useState } from 'react';

/**
 * A countdown for "Resend code in 0:42". Starts running on mount (a code was just sent) unless
 * `startActive` is false. `start()` restarts it after another send.
 */
export function useCooldown(seconds: number, startActive = true) {
  const [until, setUntil] = useState(() =>
    startActive ? Date.now() + seconds * 1000 : 0,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, [seconds]);

  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return { left, label, start };
}
