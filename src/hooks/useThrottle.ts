import { useState, useEffect, useRef } from "react";
import { throttle, ThrottleSettings } from 'lodash';

export function useThrottle<T>(value: T, delay: number, options?: ThrottleSettings) {
  const [throttledValue, setThrottledValue] = useState(value);
  const callThrottleSet = useRef(throttle((newValue: T) => setThrottledValue(newValue), delay, options));

  useEffect(() => callThrottleSet.current(value), [value]);
  
  return throttledValue;
}
