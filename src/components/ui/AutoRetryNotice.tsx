import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import QuietNotice from "@/components/ui/QuietNotice";
import type { ViewStyle } from "react-native";

interface AutoRetryNoticeProps {
  message?: string;
  onRetry: () => void;
  maxAttempts?: number;
  initialAttempts?: number;
  onAttempt?: (attempts: number) => void;
  style?: ViewStyle;
}

export default function AutoRetryNotice({
  message,
  onRetry,
  maxAttempts = 2,
  initialAttempts = 0,
  onAttempt,
  style,
}: AutoRetryNoticeProps) {
  const [attempts, setAttempts] =
    useState(initialAttempts);

  const onRetryRef = useRef(onRetry);
  const onAttemptRef = useRef(onAttempt);

  useEffect(() => {
    onRetryRef.current = onRetry;
    onAttemptRef.current = onAttempt;
  }, [onAttempt, onRetry]);

  useEffect(() => {
    if (attempts >= maxAttempts) {
      return;
    }

    const timer = setTimeout(() => {
      const next = attempts + 1;

      setAttempts(next);
      onAttemptRef.current?.(next);
      onRetryRef.current();
    }, 300 * (attempts + 1));

    return () => clearTimeout(timer);
  }, [attempts, maxAttempts]);

  return (
    <QuietNotice message={message} style={style} />
  );
}
