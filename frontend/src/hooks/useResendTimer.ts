"use client";

import { useState, useEffect, useCallback } from "react";

export function useResendTimer(cooldownSeconds: number = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const start = useCallback(() => setSecondsLeft(cooldownSeconds), [cooldownSeconds]);

  return { secondsLeft, canResend: secondsLeft === 0, start };
}