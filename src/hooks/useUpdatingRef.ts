import { useRef } from "react";

export const useUpdatingRef = <T>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
