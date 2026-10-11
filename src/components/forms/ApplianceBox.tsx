import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import {
  useApplianceCardStyles,
} from "@/components/forms/applianceCard";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius } from "@/constants/theme";
import { Touch } from "@/constants/sizing";
import { useTranslation } from "react-i18next";

type ApplianceBoxProps = {
  name: string;
  wattage: string;
  color: string;
  imageSource?: ImageSourcePropType;
  selected?: boolean;

  // Main appliance selection
  onPress?: () => void;

  // Layer 2 (archived viewer) is display-only: no selection
  // circle and tapping the box does nothing. The 3-dot menu
  // still works for edit / unarchive / delete.
  selectable?: boolean;

  // Custom appliance controls
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  archiveVariant?: "archive" | "unarchive";

  // 3-dot menu is parent-controlled so only one box menu is
  // open at a time across every list. Optional so catalog
  // boxes (which render no dots) stay prop-free; custom
  // boxes always receive both from ApplianceModal.
  menuOpen?: boolean;
  onMenuToggle?: () => void;
};

const defaultImage = require("@/assets/images/adlawatt-icon.png");

export default function ApplianceBox({
  name,
  wattage,
  color,
  imageSource = defaultImage,
  selected = false,
  onPress,
  selectable = true,
  isCustom = false,
  onEdit,
  onDelete,
  onArchive,
  archiveVariant = "archive",
  menuOpen = false,
  onMenuToggle,
}: ApplianceBoxProps) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [archiveMode, setArchiveMode] = useState(false);
  const { t } = useTranslation();

  // Silent 3s auto-close: any tap inside the menu or its
  // confirmations re-arms the clock; full inactivity closes
  // everything with no UI. toggleRef avoids stale closures
  // across parent re-renders.
  const closeTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const toggleRef = useRef(onMenuToggle);

  // Sync latest toggle without render-phase ref write
  // (react-hooks/refs). Runs every render, identical behavior.
  useEffect(() => {
    toggleRef.current = onMenuToggle;
  });

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const pokeCloseTimer = useCallback(() => {
    clearCloseTimer();

    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setDeleteMode(false);
      setArchiveMode(false);
      toggleRef.current?.();
    }, 3000);
  }, [clearCloseTimer]);

  // Confirmations are local but unreachable without the menu:
  // whenever the parent closes this menu externally (another
  // box opened), drop any pending confirmation with it.
  useEffect(() => {
    if (!menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drop pending confirmations when parent closes menu (intentional UI reset)
      setDeleteMode(false);
      setArchiveMode(false);
      clearCloseTimer();
      return;
    }

    pokeCloseTimer();

    return clearCloseTimer;
  }, [menuOpen, pokeCloseTimer, clearCloseTimer]);

  // A tap on the nested 3-dot toggle also bubbles to the outer
  // box Pressable. The flag makes the outer handler ignore that
  // one tap so opening/closing the menu never toggles selection.
  const suppressNextSelect = useRef(false);

  const applianceCardStyles =
    useApplianceCardStyles();

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const handleDeleteConfirm = () => {
    pokeCloseTimer();
    setDeleteMode(false);
    onMenuToggle?.();
    onDelete?.();
  };

  const handleDeleteCancel = () => {
    pokeCloseTimer();
    setDeleteMode(false);
  };

  const handleArchiveConfirm = () => {
    pokeCloseTimer();
    setArchiveMode(false);
    onMenuToggle?.();
    onArchive?.();
  };

  const handleArchiveCancel = () => {
    pokeCloseTimer();
    setArchiveMode(false);
  };

  // The same 3-dot icon opens and closes the options menu.
  // There is no back arrow: tapping the dots again returns
  // the box to its default view. The parent closes other
  // boxes' menus, so only one is ever open. Every tap
  // re-arms the silent auto-close clock.
  const handleDotsPress = () => {
    suppressNextSelect.current = true;
    pokeCloseTimer();
    onMenuToggle?.();
  };

  // Menu icon taps reset the auto-close clock without
  // changing what the tap does.
  const pressAndPoke =
    (fn?: () => void) => () => {
      pokeCloseTimer();
      fn?.();
    };

  const isUnarchive = archiveVariant === "unarchive";

  const handleBoxPress = () => {
    if (!selectable) {
      return;
    }

    if (suppressNextSelect.current) {
      suppressNextSelect.current = false;
      return;
    }

    onPress?.();
  };

  const renderDotsToggle = (
    accessibilityLabel: string,
  ) => (
    <Pressable
      onPress={handleDotsPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.menuDots,
        pressed && styles.actionPressed,
      ]}
    >
      <MaterialCommunityIcons
        name="dots-vertical"
        size={Touch.icon}
        color={colors.textSecondary}
      />
    </Pressable>
  );

  const renderMenuLayer = () => (
    <>
      {/* ================================================= */}
      {/* ACTION ROW (centered both axes): Edit, Archive, */}
      {/* Delete. Photo changes live in the edit form, so */}
      {/* no camera cell here. */}
      {/* ================================================= */}

      <View style={styles.menuArea}>
        <View style={styles.menuGrid}>
          {/* EDIT */}

        <Pressable
          onPress={pressAndPoke(onEdit)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("applianceBox.editAppliance")}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.actionPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={22}
            color={colors.accentContent}
          />
        </Pressable>

        {/* ARCHIVE / UNARCHIVE */}

        <Pressable
          onPress={pressAndPoke(() =>
            setArchiveMode(true),
          )}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            isUnarchive
              ? t("applianceBox.unarchiveAppliance")
              : t("applianceBox.archiveAppliance")
          }
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.actionPressed,
          ]}
        >
          <MaterialCommunityIcons
            name={
              isUnarchive
                ? "archive-arrow-up-outline"
                : "archive"
            }
            size={22}
            color={colors.accentContent}
          />
        </Pressable>

        {/* DELETE */}

        <Pressable
          onPress={pressAndPoke(() =>
            setDeleteMode(true),
          )}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("applianceBox.deleteAppliance")}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.actionPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="delete"
            size={22}
            color={colors.error}
          />
        </Pressable>
        </View>
      </View>

      {/* ================================================= */}
      {/* CLOSE: same 3-dot icon (no back arrow) */}
      {/* ================================================= */}

      <View style={styles.dotsRow}>
        {renderDotsToggle(t("applianceBox.hideOptions"))}
      </View>
    </>
  );

  const renderDeleteConfirmation = () => (
    <View style={styles.deleteConfirmation}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={30}
        color={colors.error}
      />

      <AppText
        variant="caption"
        style={styles.deleteQuestion}
      >
        {t("applianceBox.deleteQuestion")}
      </AppText>

      <View style={styles.confirmActions}>
        {/* NO */}

        <Pressable
          onPress={handleDeleteCancel}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("applianceBox.doNotDelete")}
          style={({ pressed }) => [
            styles.confirmButton,
            styles.noButton,
            pressed && styles.actionPressed,
          ]}
        >
          <AppText
            variant="caption"
            style={styles.noButtonText}
          >
            {t("shared.no")}
          </AppText>
        </Pressable>

        {/* YES */}

        <Pressable
          onPress={handleDeleteConfirm}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("applianceBox.confirmDelete")}
          style={({ pressed }) => [
            styles.confirmButton,
            styles.yesButton,
            pressed && styles.actionPressed,
          ]}
        >
          <AppText
            variant="caption"
            style={styles.yesButtonText}
          >
            {t("shared.yes")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  const renderArchiveConfirmation = () => (
    <View style={styles.deleteConfirmation}>
      <MaterialCommunityIcons
        name={
          isUnarchive
            ? "archive-arrow-up-outline"
            : "archive-outline"
        }
        size={30}
        color={colors.accentContent}
      />

      <AppText
        variant="caption"
        style={styles.deleteQuestion}
      >
        {isUnarchive
          ? t("applianceBox.unarchiveQuestion")
          : t("applianceBox.archiveQuestion")}
      </AppText>

      <View style={styles.confirmActions}>
        {/* NO */}

        <Pressable
          onPress={handleArchiveCancel}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            isUnarchive
              ? t("applianceBox.doNotUnarchive")
              : t("applianceBox.doNotArchive")
          }
          style={({ pressed }) => [
            styles.confirmButton,
            styles.noButton,
            pressed && styles.actionPressed,
          ]}
        >
          <AppText
            variant="caption"
            style={styles.noButtonText}
          >
            {t("shared.no")}
          </AppText>
        </Pressable>

        {/* YES */}

        <Pressable
          onPress={handleArchiveConfirm}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            isUnarchive
              ? t("applianceBox.confirmUnarchive")
              : t("applianceBox.confirmArchive")
          }
          style={({ pressed }) => [
            styles.confirmButton,
            styles.archiveButton,
            pressed && styles.actionPressed,
          ]}
        >
          <AppText
            variant="caption"
            style={styles.archiveButtonText}
          >
            {t("shared.yes")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  const renderNormalLayer = () => (
    <>
      {/* ================================================= */}
      {/* SELECTION CIRCLE (hidden in archived viewer) */}
      {/* ================================================= */}

      {selectable ? (
        <View
          style={[
            styles.selectionCircle,
            {
              borderColor: color,
              backgroundColor: selected
                ? color
                : colors.surface,
            },
          ]}
        >
          {selected && (
            <MaterialCommunityIcons
              name="check"
              size={18}
              color={colors.onPrimary}
            />
          )}
        </View>
      ) : null}

      {/* ================================================= */}
      {/* APPLIANCE IMAGE */}
      {/* ================================================= */}

      <View
        style={[
          applianceCardStyles.imageContainer,
          {
            borderColor: color,
          },
        ]}
      >
        <Image
          source={imageSource}
          style={applianceCardStyles.image}
          resizeMode="contain"
        />
      </View>

      {/* ================================================= */}
      {/* APPLIANCE NAME */}
      {/* ================================================= */}

      <AppText
        variant="caption"
        style={applianceCardStyles.name}
        numberOfLines={2}
      >
        {name}
      </AppText>

      {/* ================================================= */}
      {/* WATTAGE */}
      {/* ================================================= */}

      <AppText
        variant="caption"
        style={applianceCardStyles.watts}
      >
        {wattage}
      </AppText>

      {/* ================================================= */}
      {/* 3-DOT OPTIONS TOGGLE (custom boxes only) */}
      {/* ================================================= */}

      {isCustom ? (
        <View style={styles.dotsRow}>
          {renderDotsToggle(t("applianceBox.showOptions"))}
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      onPress={
        menuOpen || deleteMode || archiveMode
          ? undefined
          : handleBoxPress
      }
      // Selection inertness lives in handleBoxPress (early
      // return on !selectable): keeping the container enabled
      // lets nested controls (3-dot menu, confirms) receive
      // taps on web, where a disabled ancestor swallows them.
      // Archived viewer boxes stay display-only this way.
      disabled={
        deleteMode ||
        archiveMode
      }
      style={({ pressed }) => [
        applianceCardStyles.boxCompact,
        {
          borderColor: color,
          position: "relative",
        },
        pressed &&
          selectable &&
          !deleteMode &&
          !archiveMode &&
          styles.pressed,
      ]}
    >
      {deleteMode && isCustom ? (
        renderDeleteConfirmation()
      ) : archiveMode && isCustom ? (
        renderArchiveConfirmation()
      ) : menuOpen && isCustom ? (
        renderMenuLayer()
      ) : (
        renderNormalLayer()
      )}
    </Pressable>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  selectionCircle: {
    position: "absolute",
    bottom: 12,
    left: 10,
    zIndex: 10,

    width: 28,
    height: 28,

    borderWidth: 2,
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",
  },

  /* ======================================================= */
  /* SECOND LAYER (OPTIONS MENU) */
  /* ======================================================= */

  // In-flow row pinning the 3-dot toggle to the right side
  // below the content, in both the default and menu layers.
  // Name/wattage keep their exact catalog spots because the
  // dots own dedicated layout space inside boxCustom.
  // hitSlop={10} on the toggle keeps the effective target 48px.
  dotsRow: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 4,
  },

  menuDots: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  // Flexible area absorbing the height difference between the
  // default content and the 2x2 grid, so the dots row below it
  // lands at the exact same Y in both layers (fixed toggle).
  // The grid stays horizontally centered by menuGrid and is
  // vertically centered here.
  menuArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },

  menuGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: Touch.target,
    height: Touch.target,

    borderRadius: 24,

    alignItems: "center",
    justifyContent: "center",
  },

  /* ======================================================= */
  /* THIRD LAYER (DELETE CONFIRMATION) */
  /* ======================================================= */

  deleteConfirmation: {
    flex: 1,
    width: "100%",

    alignItems: "center",
    justifyContent: "center",
  },

  deleteQuestion: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  confirmActions: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },

  // Compact text-sized buttons: minWidth keeps No/Yes an
  // identical pair. hitSlop on each button restores the 48px
  // pressable floor (visible height is ~36px).
  confirmButton: {
    minWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderRadius: Radius.md,

    alignItems: "center",
    justifyContent: "center",
  },

  noButton: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },

  yesButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },

  archiveButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  noButtonText: {
    color: colors.text,
    fontWeight: "600",
  },

  yesButtonText: {
    color: colors.onPrimary,
    fontWeight: "600",
  },

  archiveButtonText: {
    color: colors.onPrimary,
    fontWeight: "600",
  },

  /* ======================================================= */
  /* PRESS STATES */
  /* ======================================================= */

  pressed: {
    opacity: 0.7,
  },

  actionPressed: {
    opacity: 0.65,
  },
});