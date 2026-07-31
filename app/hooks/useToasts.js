"use client";
import { useCallback, useRef, useState } from "react";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, icon) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, icon }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  return { toasts, push };
}
