import { useEffect, useRef } from 'react';

/**
 * Custom hook for setting up intervals that can be paused/resumed
 * Pass null as delay to pause the interval
 * @param callback Function to call at each interval
 * @param delay Interval delay in ms, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    
    // Return nothing if paused (delay is null)
    return undefined;
  }, [delay]);
} 