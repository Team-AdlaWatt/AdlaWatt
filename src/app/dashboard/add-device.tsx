import { Ionicons } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import AppText from "@/components/ui/AppText";
import Copyright from "@/components/ui/Copyright";
import {
  DropdownModal,
  RadioOptionRow,
} from "@/components/ui/DropdownModal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import PasswordInput from "@/components/ui/PasswordInput";
import { Card, Control, Touch, useScreenPadding } from "@/constants/sizing";
import { useAuth } from "@/context/AuthContext";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  DEVICE_NAME_PREFIX,
  UI_STATUSES,
  getBlePermissions,
  getBleReadiness,
  getBleState,
  provisionDevice,
  requestBlePermissions,
  startDeviceScan,
  subscribeBleState,
  type BleReadiness,
  type ProvisioningSession,
  type ScannedDevice,
  type UiStatus,
} from "@/services/provisioningBleService";
import { getMonitorIdForUser } from "@/services/monitoringService";
import type { BlePermissions, BleState } from "expo-ble-kit";

type AssignmentState = "loading" | "ready" | "missing" | "error";
type ToneKey = "nominal" | "elevated" | "critical";
type ScanPhase = "idle" | "scanning" | "completed_empty" | "devices_found";

const IN_FLIGHT_STATUSES: UiStatus[] = [
  "scanning",
  "connecting",
  "received",
  "busy",
  "wifi_connected",
];

const FAILED_STATUSES: UiStatus[] = [
  "wifi_failed",
  "wifi_lost",
  "error",
  "disconnected",
];

const STATUS_ORDER: UiStatus[] = UI_STATUSES;

function toneForReadiness(readiness: BleReadiness): ToneKey {
  if (readiness === "ready") {
    return "nominal";
  }
  if (
    readiness === "checking" ||
    readiness === "unknown" ||
    readiness === "resetting" ||
    readiness === "permission_required"
  ) {
    return "elevated";
  }
  return "critical";
}

function toneForStatus(status: UiStatus): ToneKey {
  if (
    status === "received" ||
    status === "wifi_connected" ||
    status === "configured"
  ) {
    return "nominal";
  }

  if (
    status === "wifi_failed" ||
    status === "wifi_lost" ||
    status === "error" ||
    status === "disconnected"
  ) {
    return "critical";
  }

  return "elevated";
}

function iconForReadiness(
  readiness: BleReadiness,
): keyof typeof Ionicons.glyphMap {
  switch (readiness) {
    case "ready":
      return "checkmark-circle-outline";
    case "poweredOff":
      return "bluetooth-outline";
    case "permission_required":
    case "permission_denied":
    case "permission_blocked":
    case "unauthorized":
      return "shield-outline";
    case "unsupported":
      return "alert-circle-outline";
    case "resetting":
    case "checking":
    case "unknown":
    default:
      return "time-outline";
  }
}

function iconForStatus(status: UiStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "scanning":
      return "scan-outline";
    case "connecting":
    case "disconnected":
      return "bluetooth-outline";
    case "received":
    case "busy":
    case "wifi_connected":
      return "sync-outline";
    case "configured":
      return "checkmark-circle-outline";
    case "wifi_failed":
    case "wifi_lost":
      return "wifi-outline";
    case "error":
      return "alert-circle-outline";
    default:
      return "hardware-chip-outline";
  }
}

function displayStatusKey(status: UiStatus): string {
  if (
    status === "received" ||
    status === "busy" ||
    status === "wifi_connected"
  ) {
    return "provisioning";
  }
  if (FAILED_STATUSES.includes(status)) {
    return "connectionFailed";
  }
  if (status === "configured") {
    return "success";
  }
  return `status_${status}`;
}

export default function AddDeviceScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();
  const screenPadding = useScreenPadding();
  const { user, profileUsername, isLoaded } = useAuth();

  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    ssid?: string;
    password?: string;
  }>({});

  const [assignmentState, setAssignmentState] =
    useState<AssignmentState>("loading");
  const [monitorId, setMonitorId] = useState<number | null>(null);
  const [assignmentRetryKey, setAssignmentRetryKey] = useState(0);

  const effectiveAssignmentState: AssignmentState = !isLoaded
    ? "loading"
    : !user?.id
      ? "error"
      : assignmentState;

  const effectiveMonitorId =
    effectiveAssignmentState === "ready" ? monitorId : null;

  const [bleState, setBleState] = useState<BleState | "checking">("checking");
  const [blePermissions, setBlePermissions] =
    useState<BlePermissions | null>(null);
  const [bleChecking, setBleChecking] = useState(true);
  const [enableDeclined, setEnableDeclined] = useState(false);
  const [enableBusy, setEnableBusy] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);

  const [status, setStatus] = useState<UiStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] =
    useState<ScannedDevice | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<UiStatus | null>(null);

  const scanSessionRef = useRef<{ stop: () => void } | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const provisionSessionRef = useRef<ProvisioningSession | null>(null);
  const previousReadinessRef = useRef<BleReadiness>("checking");

  const styles = useMemo(() => getStyles(colors), [colors]);

  const refreshBle = useCallback(async () => {
    try {
      const [state, permissions] = await Promise.all([
        Promise.resolve(getBleState()),
        getBlePermissions(),
      ]);
      setBleState(state);
      setBlePermissions(permissions);
      if (state === "poweredOn") {
        setEnableDeclined(false);
      }
    } catch {
      setBleState("unknown");
    } finally {
      setBleChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [state, permissions] = await Promise.all([
          Promise.resolve(getBleState()),
          getBlePermissions(),
        ]);
        if (!active) {
          return;
        }
        setBleState(state);
        setBlePermissions(permissions);
        if (state === "poweredOn") {
          setEnableDeclined(false);
        }
      } catch {
        if (active) {
          setBleState("unknown");
        }
      } finally {
        if (active) {
          setBleChecking(false);
        }
      }
    })();

    const sub = subscribeBleState((next) => {
      setBleState(next);
      if (next === "poweredOn") {
        setEnableDeclined(false);
      }
    });
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshBle();
      }
    });
    return () => {
      active = false;
      sub.remove();
      appStateSub.remove();
    };
  }, [refreshBle]);

  const readiness = bleChecking
    ? "checking"
    : getBleReadiness(bleState, blePermissions);

  const displayedStatus: UiStatus =
    __DEV__ && previewStatus !== null ? previewStatus : status;

  const operationBusy = IN_FLIGHT_STATUSES.includes(displayedStatus);
  const failed = FAILED_STATUSES.includes(displayedStatus);
  const isReady = readiness === "ready";

  const stopScan = useCallback(() => {
    scanSessionRef.current?.stop();
    scanSessionRef.current = null;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  const stopProvisioning = useCallback(() => {
    const session = provisionSessionRef.current;
    provisionSessionRef.current = null;
    if (session) {
      void session.dispose();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScan();
      stopProvisioning();
    };
  }, [stopScan, stopProvisioning]);

  useEffect(() => {
    const previous = previousReadinessRef.current;
    previousReadinessRef.current = readiness;

    if (readiness === "ready") {
      return;
    }

    if (scanPhase === "scanning" || scanSessionRef.current) {
      stopScan();
      setScanPhase("idle");
      setScanOpen(false);
      setStatus("idle");
    }

    if (provisionSessionRef.current || operationBusy) {
      stopProvisioning();
      setStatus((current) => {
        if (current === "idle" || FAILED_STATUSES.includes(current)) {
          return current;
        }
        if (
          readiness === "poweredOff" ||
          readiness === "unauthorized" ||
          readiness === "unsupported"
        ) {
          return "disconnected";
        }
        return "error";
      });
      setStatusDetail(null);
    }

    if (previous === "ready") {
      // Keep selected device and inputs, but block actions.
    }
  }, [operationBusy, readiness, scanPhase, stopProvisioning, stopScan]);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const id = await getMonitorIdForUser(user.id);

        if (cancelled) {
          return;
        }

        setMonitorId(id);
        setAssignmentState(id == null ? "missing" : "ready");
      } catch {
        if (cancelled) {
          return;
        }

        setMonitorId(null);
        setAssignmentState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, assignmentRetryKey]);

  const handleRetryAssignment = () => {
    setAssignmentState("loading");
    setAssignmentRetryKey((current) => current + 1);
  };

  const openBluetoothSettings = async () => {
    try {
      if (Platform.OS === "android") {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS,
        );
        return;
      }
      await Linking.openSettings();
    } catch {
      try {
        await Linking.openSettings();
      } catch {
        // User can navigate manually.
      }
    }
  };

  const handleTurnOnBluetooth = async () => {
    setEnableDeclined(false);

    if (Platform.OS !== "android") {
      await openBluetoothSettings();
      return;
    }

    setEnableBusy(true);
    try {
      const result = await IntentLauncher.startActivityAsync(
        "android.bluetooth.adapter.action.REQUEST_ENABLE",
      );
      const resultCode = (result as { resultCode?: number } | null)?.resultCode;
      if (resultCode === 0) {
        setEnableDeclined(true);
      }
    } catch {
      setEnableDeclined(true);
    } finally {
      await refreshBle();
      setEnableBusy(false);
    }
  };

  const ensurePermissions = async (): Promise<boolean> => {
    let current = blePermissions ?? (await getBlePermissions());
    setBlePermissions(current);

    if (current.scan === "granted" && current.connect === "granted") {
      await refreshBle();
      return getBleState() === "poweredOn";
    }

    if (
      !current.canAskAgain &&
      (current.scan === "denied" || current.connect === "denied")
    ) {
      await refreshBle();
      return false;
    }

    setPermissionBusy(true);
    try {
      current = await requestBlePermissions();
      setBlePermissions(current);
    } finally {
      setPermissionBusy(false);
      await refreshBle();
    }

    return (
      current.scan === "granted" &&
      current.connect === "granted" &&
      getBleState() === "poweredOn"
    );
  };

  const handleScan = async () => {
    if (operationBusy) {
      return;
    }

    stopScan();
    setStatusDetail(null);
    setDevices([]);
    setScanPhase("scanning");
    setStatus("scanning");

    const granted = await ensurePermissions();
    const latestState = getBleState();
    setBleState(latestState);

    if (!granted || latestState !== "poweredOn") {
      setScanPhase("idle");
      setStatus("idle");
      await refreshBle();
      return;
    }

    setScanOpen(true);

    const session = startDeviceScan(
      (found) => {
        setDevices((previous) => {
          const byId = new Map(previous.map((device) => [device.id, device]));
          for (const device of found) {
            byId.set(device.id, device);
          }
          const next = Array.from(byId.values()).sort((a, b) => b.rssi - a.rssi);
          if (next.length > 0) {
            setScanPhase("devices_found");
          }
          return next;
        });
      },
      (message) => {
        stopScan();
        setScanPhase("idle");
        setScanOpen(false);
        setStatus("error");
        setStatusDetail(message);
      },
    );

    scanSessionRef.current = session;
    scanTimerRef.current = setTimeout(() => {
      stopScan();
      setStatus("idle");
      setDevices((existing) => {
        setScanPhase(existing.length > 0 ? "devices_found" : "completed_empty");
        return existing;
      });
    }, 10000);
  };

  const handleSelectDevice = (device: ScannedDevice) => {
    setSelectedDevice(device);
    setScanOpen(false);
    setStatus("idle");
    setStatusDetail(null);
    setScanPhase("devices_found");
  };

  const handleSend = async () => {
    const nextErrors: {
      ssid?: string;
      password?: string;
    } = {};

    if (!ssid.trim()) {
      nextErrors.ssid = t("dashboard.addDevice.wifiSsidRequired");
    }

    if (!password) {
      nextErrors.password = t("dashboard.addDevice.wifiPasswordRequired");
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!user?.id) {
      setStatus("error");
      setStatusDetail(t("dashboard.addDevice.loginRequired"));
      return;
    }

    if (effectiveAssignmentState !== "ready" || effectiveMonitorId == null) {
      setStatus("error");
      setStatusDetail(
        t(
          effectiveAssignmentState === "missing"
            ? "dashboard.addDevice.assignmentMissing"
            : "dashboard.addDevice.assignmentError",
        ),
      );
      return;
    }

    if (!selectedDevice) {
      setScanOpen(true);
      return;
    }

    if (!isReady) {
      setStatus("error");
      setStatusDetail(t("dashboard.addDevice.bluetoothNotReady"));
      return;
    }

    setStatusDetail(null);
    stopProvisioning();
    setStatus("connecting");

    try {
      const session = await provisionDevice(
        selectedDevice.id,
        {
          wifiSsid: ssid.trim(),
          wifiPassword: password,
          monitorId: effectiveMonitorId,
        },
        (nextStatus) => {
          setStatus(nextStatus);
          if (nextStatus !== "error") {
            setStatusDetail(null);
          }
        },
      );

      provisionSessionRef.current = session;
    } catch (error) {
      setStatus("error");
      setStatusDetail(
        error instanceof Error
          ? error.message
          : t("dashboard.addDevice.errorBody"),
      );
    }
  };

  const readinessTone = colors.severity[toneForReadiness(readiness)];
  const statusTone = colors.severity[toneForStatus(displayedStatus)];
  const showOperationStatus =
    displayedStatus !== "idle" || previewStatus !== null;

  const readinessTitle = t(`dashboard.addDevice.readiness_${readiness}`);
  const readinessBody = t(
    `dashboard.addDevice.readiness_${readiness}_body`,
    { defaultValue: "" },
  );

  const canScan = isReady && !operationBusy && !permissionBusy && !enableBusy;
  const canSend =
    !operationBusy &&
    !!selectedDevice &&
    effectiveMonitorId != null &&
    !!ssid.trim() &&
    !!password &&
    isReady;

  const accountContent: React.ReactNode =
    effectiveAssignmentState === "loading" ? (
      <View style={styles.inlineRow}>
        <ActivityIndicator size="small" color={colors.accentContent} />
        <AppText variant="caption" style={styles.inlineText}>
          {t("dashboard.addDevice.assignmentChecking")}
        </AppText>
      </View>
    ) : effectiveAssignmentState === "ready" && effectiveMonitorId != null ? (
      <View style={styles.inlineRow}>
        <Ionicons
          name="checkmark-circle-outline"
          size={Touch.iconInline}
          color={colors.primary}
        />
        <AppText variant="caption" style={styles.inlineText}>
          {t("dashboard.addDevice.assignmentVerified")}
        </AppText>
      </View>
    ) : (
      <ErrorState
        message={t(
          effectiveAssignmentState === "missing"
            ? "dashboard.addDevice.assignmentMissing"
            : user?.id
              ? "dashboard.addDevice.assignmentError"
              : "dashboard.addDevice.loginRequired",
        )}
        onRetry={handleRetryAssignment}
      />
    );

  const showTurnOn = readiness === "poweredOff" && Platform.OS === "android";

  return (
    <ScreenContainer2>
      <NavBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <AppText variant="heading" style={styles.cardTitle}>
            {t("dashboard.addDevice.title")}
          </AppText>
          <AppText variant="caption" style={styles.subtitle}>
            {t("dashboard.addDevice.subtitle")}
          </AppText>
        </View>

        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: readinessTone.bg,
              borderColor: readinessTone.border,
            },
          ]}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {bleChecking ||
          readiness === "checking" ||
          readiness === "unknown" ||
          readiness === "resetting" ? (
            <ActivityIndicator size="small" color={readinessTone.text} />
          ) : (
            <Ionicons
              name={iconForReadiness(readiness)}
              size={20}
              color={readinessTone.text}
            />
          )}
          <View style={styles.statusBannerBody}>
            <AppText
              variant="body"
              style={[styles.statusBannerTitle, { color: readinessTone.text }]}
            >
              {readinessTitle}
            </AppText>
            {readinessBody ? (
              <AppText variant="caption" style={{ color: readinessTone.text }}>
                {readinessBody}
              </AppText>
            ) : null}
            {Platform.OS === "ios" && readiness === "poweredOff" ? (
              <AppText variant="caption" style={{ color: readinessTone.text }}>
                {t("dashboard.addDevice.bluetoothIosInstructions")}
              </AppText>
            ) : null}
            {enableDeclined && readiness === "poweredOff" ? (
              <AppText variant="caption" style={{ color: readinessTone.text }}>
                {t("dashboard.addDevice.bluetoothEnableDeclined")}
              </AppText>
            ) : null}

            {readiness === "poweredOff" ? (
              <View style={styles.actionRow}>
                {showTurnOn ? (
                  <AppButton
                    title={
                      enableBusy
                        ? t("dashboard.addDevice.turningOnBluetooth")
                        : t("dashboard.addDevice.turnOnBluetooth")
                    }
                    onPress={() => {
                      void handleTurnOnBluetooth();
                    }}
                    disabled={enableBusy}
                    style={styles.inlineButton}
                  />
                ) : null}
                <Pressable
                  onPress={() => {
                    void openBluetoothSettings();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    styles.inlineButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="caption" style={styles.secondaryActionText}>
                    {t("dashboard.addDevice.openBluetoothSettings")}
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {readiness === "permission_required" ? (
              <View style={styles.actionRow}>
                <AppButton
                  title={
                    permissionBusy
                      ? t("dashboard.addDevice.checkingPermissions")
                      : t("dashboard.addDevice.grantPermission")
                  }
                  onPress={() => {
                    void ensurePermissions();
                  }}
                  disabled={permissionBusy}
                  style={styles.inlineButton}
                />
              </View>
            ) : null}

            {readiness === "permission_denied" ? (
              <View style={styles.actionRow}>
                <AppButton
                  title={t("dashboard.addDevice.grantPermission")}
                  onPress={() => {
                    void ensurePermissions();
                  }}
                  disabled={permissionBusy}
                  style={styles.inlineButton}
                />
                <Pressable
                  onPress={() => {
                    void Linking.openSettings();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    styles.inlineButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="caption" style={styles.secondaryActionText}>
                    {t("dashboard.addDevice.openSettings")}
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {readiness === "permission_blocked" ||
            readiness === "unauthorized" ? (
              <View style={styles.actionRow}>
                <AppButton
                  title={t("dashboard.addDevice.openSettings")}
                  onPress={() => {
                    void Linking.openSettings();
                  }}
                  style={styles.inlineButton}
                />
              </View>
            ) : null}

            {readiness === "unsupported" ? (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => {
                    void Linking.openSettings();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    styles.inlineButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="caption" style={styles.secondaryActionText}>
                    {t("dashboard.addDevice.openSettings")}
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.deviceHeader}>
            <Ionicons
              name="hardware-chip-outline"
              size={Touch.icon}
              color={colors.accentContent}
            />
            <AppText variant="body" style={styles.deviceName}>
              {t("dashboard.addDevice.deviceLabel")}
            </AppText>
          </View>

          <AppText variant="caption" style={styles.subtitle}>
            {t("dashboard.addDevice.bluetoothHint", {
              prefix: DEVICE_NAME_PREFIX,
            })}
          </AppText>

          <View style={styles.deviceFooter}>
            <View style={styles.statusCapsule}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: readinessTone.text },
                ]}
              />
              <AppText
                variant="caption"
                style={[styles.statusCapsuleText, { color: readinessTone.text }]}
              >
                {readiness === "ready"
                  ? t("dashboard.addDevice.bluetoothReadyShort")
                  : t("dashboard.addDevice.bluetoothNotReadyShort")}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <AppText variant="body" style={styles.cardTitle}>
            {t("dashboard.addDevice.scanSection")}
          </AppText>

          <AppText variant="caption" style={styles.subtitle}>
            {t("dashboard.addDevice.scanSectionHint")}
          </AppText>

          <Pressable
            onPress={() => {
              if (devices.length > 0 || scanPhase === "completed_empty") {
                setScanOpen(true);
              } else if (isReady && !operationBusy) {
                void handleScan();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.addDevice.selectDevice")}
            disabled={!isReady && devices.length === 0}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              !isReady && devices.length === 0 && styles.disabled,
              pressed && (isReady || devices.length > 0) && styles.pressed,
            ]}
          >
            <Ionicons
              name="bluetooth-outline"
              size={Touch.iconCompact}
              color={colors.accentContent}
            />
            <AppText
              variant="caption"
              style={styles.dropdownText}
              numberOfLines={1}
            >
              {selectedDevice
                ? `${selectedDevice.name} (${selectedDevice.rssi} dBm)`
                : t("dashboard.addDevice.selectDevice")}
            </AppText>
            <Ionicons
              name="chevron-down-outline"
              size={Touch.iconCompact}
              color={colors.accentContent}
            />
          </Pressable>

          <View style={styles.actionRow}>
            <AppButton
              title={
                scanPhase === "scanning"
                  ? t("dashboard.addDevice.scanning")
                  : scanPhase === "completed_empty" || devices.length > 0
                    ? t("dashboard.addDevice.scanAgain")
                    : t("dashboard.addDevice.scan")
              }
              onPress={() => {
                void handleScan();
              }}
              disabled={!canScan}
              style={styles.inlineButton}
            />
            {devices.length > 0 ? (
              <Pressable
                onPress={() => setScanOpen(true)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  styles.inlineButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="caption" style={styles.secondaryActionText}>
                  {t("dashboard.addDevice.showDevices")}
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {scanPhase === "scanning" ? (
            <View style={styles.inlineRow}>
              <ActivityIndicator size="small" color={colors.accentContent} />
              <AppText variant="caption" style={styles.inlineText}>
                {t("dashboard.addDevice.scanningHint")}
              </AppText>
            </View>
          ) : null}

          {scanPhase === "completed_empty" && devices.length === 0 ? (
            <AppText variant="caption" style={styles.captionTop}>
              {t("dashboard.addDevice.noDevicesHint")}
            </AppText>
          ) : null}

          {selectedDevice ? (
            <AppText variant="caption" style={styles.captionTop}>
              {t("dashboard.addDevice.selectedDevice")}: {selectedDevice.name} (
              {selectedDevice.rssi} dBm)
            </AppText>
          ) : (
            <AppText variant="caption" style={styles.captionTop}>
              {isReady
                ? t("dashboard.addDevice.readyToScan")
                : t("dashboard.addDevice.scanBlocked")}
            </AppText>
          )}
        </View>

        <View style={styles.card}>
          <AppText variant="body" style={styles.cardTitle}>
            {t("dashboard.addDevice.wifiSection")}
          </AppText>

          <AppInput
            label={t("dashboard.addDevice.wifiSsid")}
            placeholder={t("dashboard.addDevice.wifiSsidPlaceholder")}
            value={ssid}
            onChangeText={setSsid}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!operationBusy}
            error={fieldErrors.ssid}
          />

          <PasswordInput
            label={t("dashboard.addDevice.wifiPassword")}
            placeholder={t("dashboard.addDevice.wifiPasswordPlaceholder")}
            value={password}
            onChangeText={setPassword}
            editable={!operationBusy}
            error={fieldErrors.password}
            importantForAutofill="no"
          />
        </View>

        <View style={styles.card}>
          <AppText variant="body" style={styles.cardTitle}>
            {t("dashboard.addDevice.accountSection")}
          </AppText>
          <AppText variant="caption" style={styles.subtitle}>
            {t("dashboard.addDevice.loggedInAs")}
          </AppText>
          <AppText variant="body" style={styles.accountName}>
            {profileUsername ?? user?.email ?? "-"}
          </AppText>
          {accountContent}
        </View>

        {showOperationStatus ? (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: statusTone.bg,
                borderColor: statusTone.border,
              },
            ]}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <Ionicons
              name={iconForStatus(displayedStatus)}
              size={20}
              color={statusTone.text}
            />
            <View style={styles.statusBannerBody}>
              <AppText
                variant="body"
                style={[styles.statusBannerTitle, { color: statusTone.text }]}
              >
                {t(`dashboard.addDevice.${displayStatusKey(displayedStatus)}`)}
              </AppText>
              {statusDetail &&
              (displayedStatus === "error" ||
                FAILED_STATUSES.includes(displayedStatus)) ? (
                <AppText variant="caption" style={{ color: statusTone.text }}>
                  {statusDetail}
                </AppText>
              ) : null}
              {displayedStatus === "received" ||
              displayedStatus === "busy" ||
              displayedStatus === "wifi_connected" ? (
                <AppText variant="caption" style={{ color: statusTone.text }}>
                  {t(`dashboard.addDevice.status_${displayedStatus}`)}
                </AppText>
              ) : null}
              {previewStatus !== null ? (
                <AppText variant="caption" style={{ color: statusTone.text }}>
                  {t("dashboard.addDevice.previewNote")}
                </AppText>
              ) : null}
            </View>
          </View>
        ) : null}

        {failed && previewStatus === null ? (
          <View style={styles.retryArea}>
            <AppButton
              title={t("dashboard.addDevice.retry")}
              onPress={() => {
                void handleSend();
              }}
              disabled={!selectedDevice || effectiveMonitorId == null || !isReady}
            />
          </View>
        ) : null}

        <AppButton
          title={
            operationBusy
              ? t("dashboard.addDevice.sending")
              : t("dashboard.addDevice.send")
          }
          onPress={() => {
            void handleSend();
          }}
          disabled={!canSend}
          style={styles.sendButton}
        />

        {__DEV__ ? (
          <Pressable
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.addDevice.previewOpen")}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="bug-outline"
              size={Touch.iconCompact}
              color={colors.accentContent}
            />
            <AppText variant="caption" style={styles.inlineText}>
              {t("dashboard.addDevice.previewTitle")}: {displayedStatus}
            </AppText>
          </Pressable>
        ) : null}

        <Copyright style={styles.copyright} />
      </ScrollView>

      <DropdownModal
        visible={scanOpen}
        title={t("dashboard.addDevice.scanTitle")}
        onClose={() => setScanOpen(false)}
      >
        {scanPhase === "scanning" && devices.length === 0 ? (
          <View style={styles.modalState}>
            <ActivityIndicator size="small" color={colors.accentContent} />
            <AppText variant="caption" style={styles.inlineText}>
              {t("dashboard.addDevice.scanningHint")}
            </AppText>
          </View>
        ) : null}

        {devices.length === 0 && scanPhase !== "scanning" ? (
          <EmptyState
            icon="bluetooth-outline"
            title={t("dashboard.addDevice.noDevices")}
            description={t("dashboard.addDevice.noDevicesDescription")}
            style={styles.emptyState}
          />
        ) : (
          devices.map((device) => (
            <RadioOptionRow
              key={device.id}
              label={device.name}
              selected={selectedDevice?.id === device.id}
              note={`${device.rssi} dBm`}
              onPress={() => handleSelectDevice(device)}
            />
          ))
        )}

        {scanPhase !== "scanning" ? (
          <View style={styles.modalActions}>
            <AppButton
              title={t("dashboard.addDevice.scanAgain")}
              onPress={() => {
                void handleScan();
              }}
              disabled={!canScan}
            />
            {!isReady ? (
              <Pressable
                onPress={() => {
                  void openBluetoothSettings();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  styles.modalSecondary,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="caption" style={styles.secondaryActionText}>
                  {t("dashboard.addDevice.openBluetoothSettings")}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </DropdownModal>

      {__DEV__ ? (
        <DropdownModal
          visible={previewOpen}
          title={t("dashboard.addDevice.previewTitle")}
          onClose={() => setPreviewOpen(false)}
        >
          {STATUS_ORDER.map((option) => (
            <RadioOptionRow
              key={option}
              label={t(`dashboard.addDevice.status_${option}`)}
              selected={previewStatus === option}
              onPress={() => setPreviewStatus(option)}
            />
          ))}
        </DropdownModal>
      ) : null}
    </ScreenContainer2>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: 18,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
      marginBottom: Card.gap,
    },
    cardTitle: {
      color: colors.text,
      fontWeight: "700",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.textSecondary,
      lineHeight: 18,
    },
    deviceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    deviceName: {
      color: colors.text,
      fontWeight: "700",
      flexShrink: 1,
    },
    deviceFooter: {
      flexDirection: "row",
      marginTop: 12,
    },
    statusCapsule: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 29,
      paddingHorizontal: 10,
      borderRadius: 20,
      backgroundColor: colors.bar.capsule,
    },
    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    statusCapsuleText: {
      fontWeight: "600",
    },
    dropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: Control.button,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginTop: 12,
      marginBottom: 8,
    },
    dropdownText: {
      flex: 1,
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.72,
    },
    disabled: {
      opacity: 0.5,
    },
    captionTop: {
      color: colors.textSecondary,
      marginTop: 8,
    },
    accountName: {
      color: colors.text,
      fontWeight: "600",
      marginTop: 4,
      marginBottom: 10,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    inlineText: {
      color: colors.textSecondary,
      flexShrink: 1,
    },
    statusBanner: {
      flexDirection: "row",
      gap: 10,
      borderWidth: 2,
      borderRadius: 16,
      padding: 12,
      marginBottom: Card.gap,
    },
    statusBannerBody: {
      flex: 1,
      gap: 4,
    },
    statusBannerTitle: {
      fontWeight: "700",
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    inlineButton: {
      flexGrow: 1,
      minWidth: 140,
    },
    secondaryActionButton: {
      minHeight: Control.button,
      marginTop: Control.buttonGapAbove,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: Control.buttonPadding,
      justifyContent: "center",
      alignItems: "center",
    },
    secondaryActionText: {
      color: colors.text,
      fontWeight: "600",
    },
    retryArea: {
      marginBottom: Card.gap,
    },
    sendButton: {
      marginTop: 0,
    },
    previewButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: Touch.target,
      marginTop: Card.gap,
    },
    emptyState: {
      height: 180,
      paddingVertical: 24,
    },
    modalState: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
    },
    modalActions: {
      marginTop: 12,
      gap: 8,
    },
    modalSecondary: {
      marginTop: 0,
    },
    copyright: {
      marginTop: Card.gap,
    },
  });
