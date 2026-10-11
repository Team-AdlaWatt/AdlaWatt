import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import { useScreenPadding } from "@/constants/sizing";
import AppLogo from "@/components/ui/AppLogo";
import AppText from "@/components/ui/AppText";
import ManualCallout from "@/components/ManualCallout";
import ManualSectionCard, {
  ManualSubRow,
} from "@/components/ManualSectionCard";
import { useTranslation } from "react-i18next";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

// ============================================================
// USER MANUAL
//
// In-app guide mirroring USER-MANUAL.md (the source of truth).
// English content first; Filipino/Cebuano follow under
// dashboard.manual.* keys (i18n-follow-up).
//
// Layout follows the AdlaWatt card language: AnalyticsChartCard
// shells via ManualSectionCard, severity-tinted ManualCallout
// boxes, and a quick-jump chip row using the dashboard
// scroll-to-section pattern.
// ============================================================

const CHIPS: {
  label: string;
  target: string;
}[] = [
  { label: "Quick Start", target: "s2" },
  { label: "Account", target: "s3" },
  { label: "Dashboard", target: "s6" },
  { label: "Appliances", target: "s7" },
  { label: "Reports", target: "s8" },
  { label: "Notifications", target: "s9" },
  { label: "Settings", target: "s12" },
  { label: "Help", target: "s13" },
];

export default function UserManualScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const scrollRef =
    useRef<ScrollView | null>(null);

  const sectionTops =
    useRef<Record<string, number>>({});

  const [openRow, setOpenRow] = useState<
    string | null
  >(null);

  const toggleRow = (key: string) => {
    setOpenRow((current) =>
      current === key ? null : key,
    );
  };

  const scrollToSection = (
    key: string,
  ) => {
    const top =
      sectionTops.current[key];

    if (top === undefined) {
      return;
    }

    scrollRef.current?.scrollTo({
      y: Math.max(0, top - 8),
      animated: true,
    });
  };

  // Writes run in onLayout event callbacks (post-layout),
  // never during render — the factory only builds closures.
  const rememberTop =
    (key: string) =>
    (event: {
      nativeEvent: { layout: { y: number } };
    }) => {
      // eslint-disable-next-line react-hooks/refs -- onLayout event write, not a render read
      sectionTops.current[key] =
        event.nativeEvent.layout.y;
    };

  return (
    <ScreenContainer2>
      {/* Fixed Navbar */}
      <NavBar />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <AppText
            variant="heading"
            style={styles.title}
          >
            {t("dashboard.manual.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.subtitle}
          >
            {t("dashboard.manual.subtitle")}
          </AppText>
        </View>

        {/* Quick-jump chips */}
        <View style={styles.chipBlock}>
          <AppText
            variant="caption"
            style={styles.chipHeading}
          >
            CONTENTS
          </AppText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.chipRow
            }
          >
            {CHIPS.map((chip) => (
              <Pressable
                key={chip.target}
                style={({ pressed }) => [
                  styles.chip,
                  pressed &&
                    styles.chipPressed,
                ]}
                onPress={() =>
                  scrollToSection(
                    chip.target,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Go to ${chip.label}`}
              >
                <AppText
                  variant="caption"
                  style={styles.chipText}
                >
                  {chip.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 1 · What Is AdlaWatt? */}
        <View
          onLayout={rememberTop("s1")}
        >
          <ManualSectionCard
            number="1"
            title="What Is AdlaWatt?"
            icon="information-circle"
            subtitle="Purpose, key features, and benefits."
          >
            <AppLogo
              width={180}
              height={100}
            />

            <Para>
              AdlaWatt is a transportable,
              off-grid solar backup power
              system for households. A
              solar panel collects
              sunlight, a battery inside a
              lockable enclosure stores the
              energy, and a built-in AC
              outlet supplies backup
              electricity during power
              interruptions.
            </Para>

            <Bullet>
              Live battery level, voltage,
              stored energy, and time
              remaining
            </Bullet>
            <Bullet>
              Incoming solar power and
              5-day solar outlook
            </Bullet>
            <Bullet>
              Appliance load and
              depth-of-discharge safety
            </Bullet>
            <Bullet>
              Battery, solar, and interior
              temperatures
            </Bullet>
            <Bullet>
              Smart appliance
              recommendations, alerts,
              and energy reports
            </Bullet>

            <ManualCallout kind="warning">
              AdlaWatt is a backup power
              source only. It is not a
              replacement for the
              electrical grid.
            </ManualCallout>

            <FigureSlot
              label="Figure 1 — Dashboard overview"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 2 · Quick Start */}
        <View
          onLayout={rememberTop("s2")}
        >
          <ManualSectionCard
            number="2"
            title="Quick Start: Your First 5 Minutes"
            icon="flash"
            subtitle="Your first win, step by step."
          >
            <Step n="1" text="Create your account: username, email, password, agree to the Terms, then Create Account." />
            <Step n="2" text="Confirm your email via the link in your inbox — sign-in stays locked until then." />
            <Step n="3" text="Sign in with your username or email and password." />
            <Step n="4" text="Read your battery gauge: percentage plus Charging, Discharging, or Idle." />
            <Step n="5" text="Check one appliance badge: OK to use means safe, Not advisable means wait for charge." />

            <ManualCallout kind="tip">
              You can also register or sign
              in with Continue with Google
              instead of a password.
            </ManualCallout>
          </ManualSectionCard>
        </View>

        {/* 3 · Creating an Account */}
        <View
          onLayout={rememberTop("s3")}
        >
          <ManualSectionCard
            number="3"
            title="Creating an Account"
            icon="person-add"
            subtitle="Register and confirm your email."
          >
            <Step n="1" text="On the welcome screen, tap Create Account." />
            <Step n="2" text="Username: 3–30 characters, letters, numbers, underscores only. Email: must be valid. Password: 8–72 characters (eye icon previews for 5 seconds)." />
            <Step n="3" text="Agree to the Terms and Conditions, then tap Create Account." />
            <Step n="4" text="A Check your email message stays on screen — open the confirmation email and tap its link." />
            <Step n="5" text="Return to the app and tap Continue to Sign In." />

            <ManualCallout kind="note">
              No email? Check spam, then
              Resend — resends are
              throttled to about one per
              minute. You can also use a
              different email address.
            </ManualCallout>

            <FigureSlot
              label="Figure 2 — Register screen"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 4 · Signing In */}
        <View
          onLayout={rememberTop("s4")}
        >
          <ManualSectionCard
            number="4"
            title="Signing In"
            icon="log-in"
            subtitle="Daily entry to your system."
          >
            <Step n="1" text="Enter your username or email and password." />
            <Step n="2" text="Tap Sign In. Unconfirmed emails are bounced back to verification first." />

            <ManualCallout kind="note">
              Wrong password, unconfirmed
              email, or no internet are the
              usual causes. Rapid retries
              briefly lock sign-in — wait a
              moment, or use Forgot
              Password? instead of
              guessing.
            </ManualCallout>

            <FigureSlot
              label="Figure 3 — Login screen"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 5 · Resetting Password */}
        <View
          onLayout={rememberTop("s5")}
        >
          <ManualSectionCard
            number="5"
            title="Resetting a Forgotten Password"
            icon="key"
            subtitle="Recover access by email."
          >
            <Step n="1" text="On Sign In, tap Forgot Password?" />
            <Step n="2" text="Enter your account email and tap Send Recovery Link." />
            <Step n="3" text="Tap the link in the email — it opens Reset Password and verifies there." />
            <Step n="4" text="On Email Confirmed, tap Continue to Account or set a new password immediately." />
            <Step n="5" text="Enter the new password twice and tap Update Password." />

            <ManualCallout kind="note">
              Links expire — request a
              fresh one. Recovery emails
              share the one-per-minute
              throttle, and spam folders
              hide them often.
            </ManualCallout>
          </ManualSectionCard>
        </View>

        {/* 6 · Dashboard */}
        <View
          onLayout={rememberTop("s6")}
        >
          <ManualSectionCard
            number="6"
            title="Dashboard: Reading Your System"
            icon="speedometer"
            subtitle="Live monitoring, card by card."
          >
            <Para>
              The Dashboard streams live
              readings whenever the unit
              has internet. If readings
              freeze, jump to
              Troubleshooting.
            </Para>

            <GroupLabel text="Battery" />
            <Bullet>
              Gauge: state of charge in
              percent, animated live.
            </Bullet>
            <Bullet>
              Status: Charging,
              Discharging, or Idle.
            </Bullet>
            <Bullet>
              Voltage, watt-hours, and
              estimated time remaining
              (e.g. 7h 45m).
            </Bullet>
            <Bullet>
              Depth of discharge: Safe or
              Unsafe — Unsafe means
              recharge immediately.
            </Bullet>

            <ManualCallout kind="warning">
              The 20% rule: treat 20%
              battery as empty. A 144 Wh
              reserve (20% of 720 Wh) is
              never counted as usable —
              advice, alerts, and DoD all
              follow it.
            </ManualCallout>

            <GroupLabel text="Solar" />
            <Bullet>
              Input watts now, plus Low /
              Moderate / High status.
            </Bullet>
            <Bullet>
              Voltage, current, timer, and
              total harvested energy.
            </Bullet>
            <Bullet>
              Weather card (needs location
              permission, refreshes every
              ~10 min) and the 5-day solar
              outlook naming the best sun
              day.
            </Bullet>

            <GroupLabel text="Load, temperature, device" />
            <Bullet>
              Current load in watts.
            </Bullet>
            <Bullet>
              Battery, solar, and interior
              temps: Nominal, Elevated,
              High, or Critical.
            </Bullet>
            <Bullet>
              Device Online or Offline.
            </Bullet>

            <ManualCallout kind="warning">
              Critical temperature means
              stop and inspect the unit
              when safe.
            </ManualCallout>

            <Para>
              Quick-navigation buttons
              scroll to each section; new
              users get a welcome greeting
              with an Add Appliances
              button in the recommendation
              card. The bell icon carries
              the unread badge.
            </Para>
          </ManualSectionCard>
        </View>

        {/* 7 · Appliances */}
        <View
          onLayout={rememberTop("s7")}
        >
          <ManualSectionCard
            number="7"
            title="Appliances: What Can I Safely Use?"
            icon="bulb"
            subtitle="Badges, picking, customs, archives."
          >
            <Bullet>
              OK to use — within your safe
              energy budget.
            </Bullet>
            <Bullet>
              Not advisable — blocked:
              unsafe battery, over the
              draw limit, or too costly
              per hour.
            </Bullet>

            <ManualSubRow
              label="7.1 Picking from the catalog"
              expanded={openRow === "s7.1"}
              onToggle={() =>
                toggleRow("s7.1")
              }
            >
              <Step n="1" text="Dashboard: tap Appliance Recommendation, then Add Appliances — or open Appliances and tap Select Appliances." />
              <Step n="2" text="Scroll the catalog, or use the search box." />
              <Step n="3" text="Tap boxes to select (tap again to deselect)." />
              <Step n="4" text="Tap Add — picks come back rated advisable or not." />
              <Para>
                Selection circles mark what
                you plan to run and feed
                the dashboard summary —
                plus a safety alert if the
                combined load exceeds the
                safe limit at 20% or below.
              </Para>
            </ManualSubRow>

            <ManualSubRow
              label="7.2 Adding a custom appliance"
              expanded={openRow === "s7.2"}
              onToggle={() =>
                toggleRow("s7.2")
              }
            >
              <Step n="1" text="In the selection modal, tap Add Custom." />
              <Step n="2" text="Enter name, minimum and maximum wattage." />
              <Step n="3" text="Photo (optional): tap the photo area, Choose from Library, pick an image (5 MB max). Attaches on save; otherwise the default icon is used." />
              <Step n="4" text="Tap Add — it registers, ready for recommendation." />
              <ManualCallout kind="tip">
                Look wattage up online
                (nameplate or maker specs)
                — accurate numbers make
                accurate advice.
              </ManualCallout>
            </ManualSubRow>

            <ManualSubRow
              label="7.3 3-dot menu: edit, archive, delete"
              expanded={openRow === "s7.3"}
              onToggle={() =>
                toggleRow("s7.3")
              }
            >
              <Bullet>
                Pen icon — edit in a modal.
              </Bullet>
              <Bullet>
                Box icon — archive after a
                Yes/No confirm.
              </Bullet>
              <Bullet>
                Trash icon — delete after a
                Yes/No confirm, permanently.
              </Bullet>
              <ManualCallout kind="note">
                The menu sits bottom-right
                of the box and closes by
                itself after ~3 seconds —
                or tap the dots again.
              </ManualCallout>
            </ManualSubRow>

            <ManualSubRow
              label="7.4 Archives"
              expanded={openRow === "s7.4"}
              onToggle={() =>
                toggleRow("s7.4")
              }
            >
              <Step n="1" text="Tap Archived below the search box (count shown)." />
              <Step n="2" text="Edit, unarchive, or delete archived items." />
              <Step n="3" text="Unarchiving returns the item to the custom display; Back in the footer returns to selection." />
            </ManualSubRow>

            <ManualSubRow
              label="7.5 Select all and reset"
              expanded={openRow === "s7.5"}
              onToggle={() =>
                toggleRow("s7.5")
              }
            >
              <Para>
                Footer bulk actions: Select
                All picks everything;
                Reset clears all
                selections.
              </Para>
            </ManualSubRow>

            <ManualSubRow
              label="7.6 Sorting the list"
              expanded={openRow === "s7.6"}
              onToggle={() =>
                toggleRow("s7.6")
              }
            >
              <Para>
                Two dropdowns sort by power
                level and area, alongside
                advisability segments that
                only show segments holding
                appliances.
              </Para>
            </ManualSubRow>

            <FigureSlot
              label="Figure 4 — Appliances list"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 8 · Analytics & Reports */}
        <View
          onLayout={rememberTop("s8")}
        >
          <ManualSectionCard
            number="8"
            title="Analytics & Reports"
            icon="bar-chart"
            subtitle="History, trends, and exports."
          >
            <Para>
              Pick a From/To range (never
              future dates) and a frequency
              — Daily, Weekly, Monthly,
              Yearly. Sections: Battery,
              Solar, Energy, Health, Usage.
            </Para>

            <Step n="1" text="Open Analytics and go to the Generate Report panel at the bottom." />
            <Step n="2" text="Choose frequency from the dropdown." />
            <Step n="3" text="Tap From date and To date — calendar modals appear." />
            <Step n="4" text="Tap Export CSV (spreadsheet data) or Export PDF (formatted report)." />
            <Step n="5" text="On phones the share sheet opens with the real file — save, send, then open in your file viewer. On web it downloads." />
            <Step n="6" text="Exporting… locks the buttons until done — no double taps." />

            <ManualCallout kind="note">
              Long periods make large PDFs:
              the table shows the head of
              the range; the CSV always
              holds the complete dataset.
            </ManualCallout>

            <FigureSlot
              label="Figure 5 — Analytics and exports"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 9 · Notifications */}
        <View
          onLayout={rememberTop("s9")}
        >
          <ManualSectionCard
            number="9"
            title="Notifications"
            icon="notifications"
            subtitle="What the hardware did."
          >
            <Bullet>
              Normal — routine: charging
              started, fully charged,
              solar changed, device
              online.
            </Bullet>
            <Bullet>
              Alert — needs attention:
              low battery (≤20%), unsafe
              DoD, critical heat, stale or
              missing data, unsafe load on
              low battery.
            </Bullet>

            <ManualCallout kind="note">
              Email Notifications (Menu →
              Preferences, default ON)
              emails alert-type events
              only — in-app rows are always
              kept. Reminders (default ON)
              are on-device banners — a
              daily evening review and a
              low-sun morning advisory —
              that work fully offline.
              Vibration (default ON)
              buzzes gently while unread
              alerts exist.
            </ManualCallout>

            <Para>
              Filter by type (All /
              Normal / Alert) and time.
              Tap to mark read, or Mark
              all as read. The bell badge
              counts unread; pages turn
              with Prev / Next.
            </Para>

            <FigureSlot
              label="Figure 6 — Notifications list"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 10 · Activity Logs */}
        <View
          onLayout={rememberTop("s10")}
        >
          <ManualSectionCard
            number="10"
            title="Activity Logs"
            icon="list"
            subtitle="What you did — not the hardware."
          >
            <Para>
              Sign-ins, appliance changes,
              and settings updates live
              here, typed Info, Warning,
              Error, Critical. Hardware
              events stay in Notifications
              by design. Filter by type and
              time, page with Prev / Next;
              the Dashboard preview links
              here via View All.
            </Para>
          </ManualSectionCard>
        </View>

        {/* 11 · Components */}
        <View
          onLayout={rememberTop("s11")}
        >
          <ManualSectionCard
            number="11"
            title="Components: System Health"
            icon="hardware-chip"
            subtitle="Is the unit itself healthy?"
          >
            <Para>
              Every IoT and power part
              (ESP32, sensors, relay,
              display, fan, buck
              converter) shows live Active
              / Inactive with photos. If
              the Dashboard reads Offline
              while your phone is online,
              an Inactive part here points
              to the unit side (power,
              wiring, or its Wi-Fi) — not
              the app.
            </Para>

            <FigureSlot
              label="Figure 7 — Components grid"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 12 · Menu */}
        <View
          onLayout={rememberTop("s12")}
        >
          <ManualSectionCard
            number="12"
            title="Menu: Profile and Preferences"
            icon="settings"
            subtitle="Account and app behavior."
          >
            <GroupLabel text="Account Profile" />
            <Bullet>
              Username and email edits need
              your current password to
              confirm; a new email must be
              confirmed via its link.
            </Bullet>
            <Bullet>
              Password change: current
              plus new twice. Log Out asks
              first — always use it on
              shared phones.
            </Bullet>

            <GroupLabel text="Preferences" />
            <Bullet>
              Theme System / Light / Dark;
              Font Size Small / Medium /
              Big; Font Family incl.
              Inter, Roboto, Monospace.
            </Bullet>
            <Bullet>
              Color Blind Mode (resets
              each session), Language
              (English / Filipino /
              Cebuano), Vibration and
              Email Notifications toggles
              (both saved, both default
              ON).
            </Bullet>

            <ManualCallout kind="note">
              Menu edits are drafts: Save
              applies, Cancel discards.
              Theme, fonts, language,
              vibration, and email survive
              restarts and hold offline.
            </ManualCallout>

            <FigureSlot
              label="Figure 8 — Menu preferences"
              styles={styles}
            />
          </ManualSectionCard>
        </View>

        {/* 13 · Troubleshooting */}
        <View
          onLayout={rememberTop("s13")}
        >
          <ManualSectionCard
            number="13"
            title="Troubleshooting and FAQs"
            icon="help-circle"
            subtitle="Fix it yourself first."
          >
            <Faq
              id="q1"
              q="Dashboard frozen or device Offline?"
              a="Check phone internet first. If the phone is online, the unit lost Wi-Fi or power — confirm it is powered and in range, wait a few minutes. A Monitoring Data Stale alert means the app side works and the unit side is silent."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q2"
              q="Appliance says Not advisable but I need it?"
              a="The battery cannot safely cover it now. Recharge via solar, pick a lighter appliance, or run it briefly while watching the gauge. Do not repeatedly override below 20%."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q3"
              q="No confirmation, recovery, or alert email?"
              a="Check spam, verify the address in Account Profile, respect the one-per-minute resend throttle. Only alert-type events email — routine ones never do — and Email Notifications must be ON."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q4"
              q="Photo upload fails?"
              a="Library-only, 5 MB max. Over-limit: pick a smaller image. Permission error: allow photo access in device Settings and retry."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q5"
              q="Export fails or produces nothing?"
              a="Widen the date range — empty ranges export nothing. Large ranges take seconds (Exporting… shows). On web, check downloads and the popup blocker."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q6"
              q="Login keeps failing?"
              a="Finish email verification, check caps lock, and pause after rapid attempts (brief lockout). Use Forgot Password? instead of guessing."
              openRow={openRow}
              onToggle={toggleRow}
            />
            <Faq
              id="q7"
              q="Who do I contact?"
              a="App issues you cannot fix here, plus any hardware fault: the AdlaWatt team at Northern Bukidnon State College — see About Us in the app."
              openRow={openRow}
              onToggle={toggleRow}
            />
          </ManualSectionCard>
        </View>

        {/* 14 · Glossary */}
        <View
          onLayout={rememberTop("s14")}
        >
          <ManualSectionCard
            number="14"
            title="Glossary"
            icon="book"
            subtitle="Terms the app actually uses."
          >
            <Term
              term="State of charge (SoC)"
              def="Battery level, 0–100%."
            />
            <Term
              term="Depth of discharge (DoD)"
              def="How much is used up; Unsafe means past the healthy limit."
            />
            <Term
              term="Watt-hour (Wh)"
              def="Energy unit. 720 Wh total, 144 Wh locked reserve, 576 Wh usable."
            />
            <Term
              term="Reserve floor"
              def="Protected 20% the app never counts as spendable."
            />
            <Term
              term="Load"
              def="Combined wattage drawn right now."
            />
            <Term
              term="Solar input / status"
              def="Incoming panel watts, rated Low / Moderate / High."
            />
            <Term
              term="Time remaining"
              def="Estimated runtime at current load (e.g. 7h 45m)."
            />
            <Term
              term="ESP32"
              def="Unit microcontroller reading sensors over Wi-Fi."
            />
            <Term
              term="Real-time updates"
              def="Live database streaming; no refresh needed while online."
            />
            <Term
              term="Normal vs Alert"
              def="Informational vs needs-attention (alerts email + vibrate)."
            />
            <Term
              term="Activity log"
              def="Your actions — separate from hardware notifications."
            />
          </ManualSectionCard>
        </View>

        {/* 15 · Safety */}
        <View
          onLayout={rememberTop("s15")}
        >
          <ManualSectionCard
            number="15"
            title="Safety, Limits, and Support"
            icon="shield-checkmark"
            subtitle="Rules that protect the system."
          >
            <Bullet>
              Backup only — never exceed
              the 1000 W inverter ceiling.
            </Bullet>
            <Bullet>
              Sunlight dependent — plan
              heavy use for high-outlook
              days.
            </Bullet>
            <Bullet>
              High heat warns; Critical
              heat means stop and inspect
              when safe.
            </Bullet>
            <Bullet>
              Internet required on both
              phone and unit.
            </Bullet>

            <ManualCallout kind="note">
              Research prototype, not a
              commercial product — report
              problems to the team so they
              become thesis data. The
              About Us screen lists
              mission, developers, and
              contact details.
            </ManualCallout>
          </ManualSectionCard>
        </View>

        <Copyright />
      </ScrollView>
    </ScreenContainer2>
  );
}

// ============================================================
// SMALL PIECES (screen-local, mirror the md conventions:
// tappable labels bold, literal values code-style)
// ============================================================

function Para({
  children,
}: {
  children: React.ReactNode;
}) {
  const colors = useAppColors();

  return (
    <AppText
      variant="body"
      style={{
        color: colors.text,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 8,
      }}
    >
      {children}
    </AppText>
  );
}

function GroupLabel({
  text,
}: {
  text: string;
}) {
  const colors = useAppColors();

  return (
    <AppText
      variant="body"
      style={{
        color: colors.text,
        fontWeight: "700",
        fontSize: 14,
        marginTop: 12,
      }}
    >
      {text}
    </AppText>
  );
}

function Bullet({
  children,
}: {
  children: React.ReactNode;
}) {
  const colors = useAppColors();

  return (
    <View
      style={{
        flexDirection: "row",
        marginTop: 6,
        paddingRight: 4,
      }}
    >
      <AppText
        variant="body"
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          marginRight: 6,
        }}
      >
        •
      </AppText>

      <AppText
        variant="body"
        style={{
          color: colors.text,
          fontSize: 14,
          lineHeight: 21,
          flex: 1,
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

function Step({
  n,
  text,
}: {
  n: string;
  text: string;
}) {
  const colors = useAppColors();

  return (
    <View
      style={{
        flexDirection: "row",
        marginTop: 6,
        paddingRight: 4,
      }}
    >
      <AppText
        variant="body"
        style={{
          color: colors.primaryText,
          fontWeight: "700",
          fontSize: 14,
          marginRight: 6,
        }}
      >
        {n}.
      </AppText>

      <AppText
        variant="body"
        style={{
          color: colors.text,
          fontSize: 14,
          lineHeight: 21,
          flex: 1,
        }}
      >
        {text}
      </AppText>
    </View>
  );
}

function Term({
  term,
  def,
}: {
  term: string;
  def: string;
}) {
  const colors = useAppColors();

  return (
    <View style={{ marginTop: 8 }}>
      <AppText
        variant="body"
        style={{
          color: colors.text,
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {term}
      </AppText>

      <AppText
        variant="body"
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          lineHeight: 21,
          marginTop: 1,
        }}
      >
        {def}
      </AppText>
    </View>
  );
}

function Faq({
  id,
  q,
  a,
  openRow,
  onToggle,
}: {
  id: string;
  q: string;
  a: string;
  openRow: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <ManualSubRow
      label={q}
      expanded={openRow === id}
      onToggle={() => onToggle(id)}
    >
      <AppText
        variant="body"
        style={{ fontSize: 14, lineHeight: 21 }}
      >
        {a}
      </AppText>
    </ManualSubRow>
  );
}

function FigureSlot({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof getStyles>;
}) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.figureSlot,
        { borderColor: colors.border },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}, screenshot pending`}
    >
      <AppText
        variant="caption"
        style={{
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        {label}
        {"\n"}screenshot pending
      </AppText>
    </View>
  );
}

const manualDimensions = {
  borderWidth: 3,
  cardRadius: 16,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 24,
    },

    /* Header (preserved from template) */

    headerCard: {
      backgroundColor: colors.glass.white,

      borderWidth:
        manualDimensions.borderWidth,

      borderColor: colors.cardBorder,

      borderRadius:
        manualDimensions.cardRadius,

      padding: 18,

      marginBottom: 10,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
    },

    subtitle: {
      color: colors.textSecondary,

      marginTop: 6,

      fontWeight: "400",

      lineHeight: 19,
    },

    /* Contents chips */

    chipBlock: {
      width: "100%",
      marginBottom: 10,
    },

    chipHeading: {
      color: colors.textSecondary,
      fontWeight: "700",
      fontSize: 12,
      paddingHorizontal: 4,
      marginBottom: 6,
    },

    chipRow: {
      gap: 8,
      paddingRight: 4,
    },

    chip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    chipPressed: {
      opacity: 0.6,
    },

    chipText: {
      color: colors.primaryText,
      fontWeight: "600",
    },

    /* Figure placeholders */

    figureSlot: {
      width: "100%",
      borderWidth: 2,
      borderStyle: "dashed",
      borderRadius: 12,
      paddingVertical: 18,
      paddingHorizontal: 12,
      marginTop: 10,
      alignItems: "center",
      justifyContent: "center",
    },
  });
