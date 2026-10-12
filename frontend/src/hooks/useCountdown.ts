import { useState, useEffect } from 'react';

export interface CountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
  isUrgent: boolean; // < 120 seconds
  isEnded: boolean;
}

export function useCountdown(targetDate: string | Date | undefined): CountdownResult {
  const calculateTimeLeft = (): CountdownResult => {
    if (!targetDate) {
      return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, formatted: '00:00:00', isUrgent: false, isEnded: true };
    }

    const difference = new Date(targetDate).getTime() - Date.now();
    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, formatted: '00:00:00', isUrgent: false, isEnded: true };
    }

    const totalSeconds = Math.floor(difference / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      hours,
      minutes,
      seconds,
      totalSeconds,
      formatted,
      isUrgent: totalSeconds < 120, // Less than 2 minutes
      isEnded: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownResult>(calculateTimeLeft);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
