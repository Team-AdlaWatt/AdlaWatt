import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  DEVICE_NAME,
  UI_STATUSES,
  provisionDevice,
  requestBleAccess,
  startDeviceScan,
  type ProvisioningSession,
  type ScannedDevice,
  type UiStatus,
} from "@/services/provisioningBleService";
import { getMonitorIdForUser } from "@/services/monitoringService";

type AssignmentState = "loading" | "ready" | "missing" | "error";
type ToneKey = "nominal" | "elevated" | "critical";

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

function iconForStatus(status: UiStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "scanning":
      return "scan-outline";
    case "connecting":
    case "disconnected":
      return "bluetooth-outline";
    case "received":
    case "configured":
      return "checkmark-circle-outline";
    case "busy":
      return "time-outline";
    case "wifi_connected":
    case "wifi_failed":
    case "wifi_lost":
      return "wifi-outline";
    case "error":
      return "alert-circle-outline";
    default:
      return "hardware-chip-outline";
  }
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

  const [status, setStatus] = useState<UiStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] =
    useState<ScannedDevice | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStatus, setPreviewStatus] =
    useState<UiStatus | null>(null);

  const scanSessionRef = useRef<{ stop: () => void } | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const provisionSessionRef = useRef<ProvisioningSession | null>(null);

  const styles = useMemo(() => getStyles(colors), [colors]);

  const displayedStatus: UiStatus =
    __DEV__ && previewStatus !== null ? previewStatus : status;

  const busy = IN_FLIGHT_STATUSES.includes(displayedStatus);
  const failed = FAILED_STATUSES.includes(displayedStatus);
  const showStatus =
    displayedStatus !== "idle" || previewStatus !== null;

  const stopScan = useCallback(() => {
    scanSessionRef.current?.stop();
    scanSessionRef.current = null;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScan();
      void provisionSessionRef.current?.dispose();
    };
  }, [stopScan]);

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

  const handleScan = async () => {
    stopScan();
    setDevices([]);
    setScanOpen(true);
    setStatus("scanning");
    setStatusDetail(null);

    try {
      await requestBleAccess();

      const session = startDeviceScan(
        (found) => {
          setDevices((previous) => {
            const byId = new Map(
              previous.map((device) => [device.id, device]),
            );

            for (const device of found) {
              byId.set(device.id, device);
            }

            return Array.from(byId.values()).sort(
              (a, b) => b.rssi - a.rssi,
            );
          });
        },
        (message) => {
          setStatus("error");
          setStatusDetail(message);
        },
      );

      scanSessionRef.current = session;
      scanTimerRef.current = setTimeout(() => {
        stopScan();
        setStatus((current) =>
          current === "scanning" ? "idle" : current,
        );
      }, 10000);
    } catch (error) {
      setStatus("error");
      setStatusDetail(
        error instanceof Error
          ? error.message
          : t("dashboard.addDevice.permissionDenied"),
      );
    }
  };

  const handleSelectDevice = (device: ScannedDevice) => {
    setSelectedDevice(device);
    setScanOpen(false);
    setStatus("idle");
    setStatusDetail(null);
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
      nextErrors.password = t(
        "dashboard.addDevice.wifiPasswordRequired",
      );
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

    setStatusDetail(null);
    void provisionSessionRef.current?.dispose();
    setStatus("connecting");

    try {
      const session = await provisionDevice(
        selectedDevice.id,
        {
          wifiSsid: ssid.trim(),
          wifiPassword: password,
          monitorId: effectiveMonitorId,
        },
        setStatus,
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

  const statusTone = colors.severity[toneForStatus(displayedStatus)];

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

        <View style={styles.card}>
          <View style={styles.deviceHeader}>
            <Ionicons
              name="hardware-chip-outline"
              size={Touch.icon}
              color={colors.accentContent}
            />
            <AppText variant="body" style={styles.deviceName}>
              {t("dashboard.addDevice.deviceName")}
            </AppText>
          </View>

          <AppText variant="caption" style={styles.subtitle}>
            {t("dashboard.addDevice.bluetoothName")}
          </AppText>

          <View style={styles.deviceFooter}>
            <View style={styles.statusCapsule}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusTone.text },
                ]}
              />
              <AppText
                variant="caption"
                style={[
                  styles.statusCapsuleText,
                  { color: statusTone.text },
                ]}
              >
                {t(`dashboard.addDevice.status_${displayedStatus}`)}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <AppText variant="body" style={styles.cardTitle}>
            {t("dashboard.addDevice.deviceLabel")}
          </AppText>

          <Pressable
            onPress={() => setScanOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t(
              "dashboard.addDevice.selectDevice",
            )}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              pressed && styles.pressed,
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

          <AppButton
            title={
              busy
                ? t("dashboard.addDevice.scanning")
                : t("dashboard.addDevice.scan")
            }
            onPress={() => {
              void handleScan();
            }}
            disabled={busy}
          />

          {selectedDevice ? (
            <AppText variant="caption" style={styles.captionTop}>
              {t("dashboard.addDevice.selectedDevice")}: {DEVICE_NAME}
            </AppText>
          ) : (
            <AppText variant="caption" style={styles.captionTop}>
              {t("dashboard.addDevice.readyToScan")}
            </AppText>
          )}
        </View>

        <View style={styles.card}>
          <AppText variant="body" style={styles.cardTitle}>
            {t("dashboard.addDevice.wifiSection")}
          </AppText>

          <AppInput
            label={t("dashboard.addDevice.wifiSsid")}
            placeholder={t(
              "dashboard.addDevice.wifiSsidPlaceholder",
            )}
            value={ssid}
            onChangeText={setSsid}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            error={fieldErrors.ssid}
          />

          <PasswordInput
            label={t("dashboard.addDevice.wifiPassword")}
            placeholder={t(
              "dashboard.addDevice.wifiPasswordPlaceholder",
            )}
            value={password}
            onChangeText={setPassword}
            editable={!busy}
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

        {showStatus ? (
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
                style={[
                  styles.statusBannerTitle,
                  { color: statusTone.text },
                ]}
              >
                {t(
                  `dashboard.addDevice.status_${displayedStatus}`,
                )}
              </AppText>
              {statusDetail && displayedStatus === "error" ? (
                <AppText
                  variant="caption"
                  style={{ color: statusTone.text }}
                >
                  {statusDetail}
                </AppText>
              ) : null}
              {previewStatus !== null ? (
                <AppText
                  variant="caption"
                  style={{ color: statusTone.text }}
                >
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
              disabled={!selectedDevice || effectiveMonitorId == null}
            />
          </View>
        ) : null}

        <AppButton
          title={
            busy
              ? t("dashboard.addDevice.sending")
              : t("dashboard.addDevice.send")
          }
          onPress={() => {
            void handleSend();
          }}
          disabled={
            busy ||
            !selectedDevice ||
            effectiveMonitorId == null ||
            !ssid.trim() ||
            !password
          }
          style={styles.sendButton}
        />

        {__DEV__ ? (
          <Pressable
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t(
              "dashboard.addDevice.previewOpen",
            )}
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
        {devices.length === 0 ? (
          <EmptyState
            icon="bluetooth-outline"
            title={t("dashboard.addDevice.noDevices")}
            description={t(
              "dashboard.addDevice.noDevicesDescription",
            )}
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
      marginBottom: 4,
    },
    dropdownText: {
      flex: 1,
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.72,
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
    copyright: {
      marginTop: Card.gap,
    },
  });
