import { useRef, useEffect } from "react";

export function useFlash() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function flash(setter: (v: string | null) => void, text: string) {
    setter(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setter(null), 4000);
  }

  return flash;
}
