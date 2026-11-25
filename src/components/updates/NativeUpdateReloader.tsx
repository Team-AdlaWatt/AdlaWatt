import { useEffect, useRef } from "react";
import { useUpdates } from "expo-updates";

type NativeUpdateReloaderProps = {
  onPending: () => void;
};

export default function NativeUpdateReloader({
  onPending,
}: NativeUpdateReloaderProps) {
  const appliedRef = useRef(false);
  const {
    isUpdatePending,
    isRestarting,
  } = useUpdates();

  useEffect(() => {
    if (
      appliedRef.current ||
      !isUpdatePending ||
      isRestarting
    ) {
      return;
    }

    appliedRef.current = true;
    onPending();
  }, [
    isRestarting,
    isUpdatePending,
    onPending,
  ]);

  return null;
}
