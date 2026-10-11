import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { Touch } from "@/constants/sizing";

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export default function TermsModal({
  visible,
  onClose,
  onAgree,
}: TermsModalProps) {
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [canAgree, setCanAgree] = useState(false);

  useEffect(() => {
    if (!visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset countdown when modal closes (intentional UI reset)
      setSecondsRemaining(5);
      setCanAgree(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          setCanAgree(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const handleAgree = () => {
    if (!canAgree) {
      return;
    }

    onAgree();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <AppText
              variant="heading"
              style={styles.title}
            >
              Terms & Conditions
            </AppText>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close Terms and Conditions"
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.headerContent}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator
          >
            <AppText
              variant="caption"
              style={styles.updated}
            >
              Last Updated: [August 8, 2026]
            </AppText>

            <Section
              title="1. Acceptance of Terms"
              text={`Welcome to AdlaWatt, an IoT-based off-grid solar energy harvesting system and mobile application developed to assist households in monitoring and managing available backup energy during power interruptions.

By creating an account, accessing, or using the AdlaWatt mobile application, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.

If you do not agree with these Terms and Conditions, you should not create an account or use the application.`}
            />

            <Section
              title="2. Purpose of AdlaWatt"
              text={`AdlaWatt is designed to provide households with an alternative backup power source during electricity interruptions. The system stores energy collected from solar panels in a battery and provides power through a built-in AC outlet for compatible household appliances.

The mobile application provides monitoring information including battery level, incoming solar energy, energy consumption, energy history, temperature information, system status, appliance recommendations, and notifications.

AdlaWatt is an alternative backup power source and is not intended to replace the electrical grid.`}
            />

            <Section
              title="3. Account Registration"
              text={`Users must provide accurate and truthful information when creating an AdlaWatt account.

Users are responsible for maintaining the confidentiality of their account credentials and for activities performed through their account.

Users should immediately report suspected unauthorized access to their account.`}
            />

            <Section
              title="4. Proper Use"
              text={`Users agree to use AdlaWatt only for its intended purpose.

Users must not use the application for unlawful activities, attempt to access another user's account, interfere with the application's operation, bypass security controls, introduce malicious software, reverse-engineer the application where prohibited by law, or attempt unauthorized access to the AdlaWatt backend or database.`}
            />

            <Section
              title="5. Appliance Compatibility"
              text={`Users must only connect appliances that are compatible with the AdlaWatt system.

The system is intended for compatible household appliances within its supported power capacity. Users must not connect appliances that exceed the recommended capacity or use the system in a manner that may cause electrical or equipment-related risks.

Appliance recommendations provided by the application are intended as guidance. Users remain responsible for determining whether an appliance is appropriate and safe to use.`}
            />

            <Section
              title="6. Electrical and Physical Safety"
              text={`Users must operate the physical AdlaWatt system responsibly.

Users should keep electrical connections dry and protected, avoid damaging the enclosure and components, avoid unauthorized modifications, follow instructions provided by authorized personnel, and disconnect appliances when necessary to prevent excessive power consumption.

Monitoring features do not eliminate all electrical, battery, fire, or equipment-related risks.`}
            />

            <Section
              title="7. Monitoring Information"
              text={`AdlaWatt may collect and display information generated by its hardware and sensors.

Displayed information may depend on sensor accuracy, internet connectivity, hardware operation, server availability, and communication between the AdlaWatt hardware and cloud services.

The application should not be considered a replacement for professional electrical inspection or technical assessment.`}
            />

            <Section
              title="8. Internet and Mobile Data"
              text={`AdlaWatt may require an internet connection for features that depend on cloud communication, real-time monitoring, notifications, or account services.

Users are responsible for their internet connection, Wi-Fi availability, mobile data usage, mobile carrier charges, and compatible device.`}
            />

            <Section
              title="9. Device Compatibility"
              text={`Users are responsible for ensuring that their device meets the technical requirements of the application.

Application availability and compatibility may vary depending on the supported operating system, device hardware, and software version.`}
            />

            <Section
              title="10. Application Updates"
              text={`AdlaWatt may be updated to improve functionality, fix software problems, improve security, improve performance, add features, or maintain compatibility with supported devices.

Certain updates may be required before users can continue using particular features.`}
            />

            <Section
              title="11. Intellectual Property"
              text={`The AdlaWatt name, logo, application interface, original graphics, source code, software architecture, documentation, designs, and other proprietary materials are protected by applicable intellectual property laws.

Users are granted permission to use the application only for its intended purpose.`}
            />

            <Section
              title="12. Limited License"
              text={`Subject to these Terms and Conditions, users are granted a limited, non-exclusive, non-transferable, and revocable license to access and use the AdlaWatt application for its intended purpose.

This license does not give users ownership of the application's source code, design, intellectual property, or proprietary technology.`}
            />

            <Section
              title="13. Third-Party Services"
              text={`AdlaWatt may rely on third-party services for certain functions, including cloud storage, data transmission, authentication, notifications, hosting, or other technical services.

The availability of these features may depend on the availability and functionality of those third-party services.`}
            />

            <Section
              title="14. App Store Requirements"
              text={`If AdlaWatt is distributed through an application marketplace, users must also comply with the applicable terms and conditions of that marketplace, including Google Play or Apple's App Store where applicable.`}
            />

            <Section
              title="15. Service Availability"
              text={`We aim to keep AdlaWatt functional and available, but continuous availability cannot be guaranteed.

The application or certain features may become temporarily unavailable because of internet interruptions, server problems, hardware failures, software errors, maintenance, device compatibility issues, power interruptions, sensor or communication failures, or other circumstances beyond the developers' reasonable control.`}
            />

            <Section
              title="16. Limitation of Liability"
              text={`To the extent permitted by applicable law, the developers shall not be responsible for losses or damages arising from improper use of the application, improper use of the AdlaWatt hardware, incompatible appliances, exceeding recommended power limits, unauthorized modifications, loss of internet connectivity, temporary application unavailability, hardware or sensor malfunction, loss of monitoring data, device incompatibility, user negligence, or events beyond the reasonable control of the developers.`}
            />

            <Section
              title="17. Termination of Access"
              text={`Access to the AdlaWatt application may be suspended or terminated if a user violates these Terms and Conditions, attempts unauthorized access, misuses the application, attempts to compromise the system, provides fraudulent registration information, or uses the application for unlawful purposes.`}
            />

            <Section
              title="18. Privacy"
              text={`AdlaWatt may process information necessary to provide account, monitoring, notification, and application functionality.

The handling of personal information should be governed by the AdlaWatt Privacy Policy, which explains what information is collected, why it is collected, how it is stored and used, and applicable user privacy rights.`}
            />

            <Section
              title="19. Changes to These Terms"
              text={`These Terms and Conditions may be updated when necessary to reflect changes to the application, system functionality, security requirements, applicable requirements, or project implementation.

Users should review the Terms periodically. Where appropriate, significant changes may be communicated through the application.`}
            />

            <Section
              title="20. Governing Law"
              text={`These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines, subject to applicable laws and regulations.`}
            />

            <Section
              title="21. Contact and Support"
              text={`For questions, concerns, or reports relating to the AdlaWatt application, users may contact the authorized AdlaWatt development or research team through the contact information provided within the application.`}
            />

            <Section
              title="22. Agreement"
              text={`By selecting "I Agree" and creating an AdlaWatt account, you acknowledge that you have read and understood the AdlaWatt Terms and Conditions and agree to comply with them.`}
            />
          </ScrollView>

          <View style={styles.footer}>
            {!canAgree ? (
              <View style={styles.timerContainer}>
                <ActivityIndicator
                  size="small"
                  color={colors.headerContent}
                />

                <AppText
                  variant="caption"
                  style={styles.timerText}
                >
                  Please review the terms for {secondsRemaining} second
                  {secondsRemaining !== 1 ? "s" : ""}.
                </AppText>
              </View>
            ) : (
              <AppText
                variant="caption"
                style={styles.readyText}
              >
                You may now agree to the Terms and Conditions.
              </AppText>
            )}

            <Pressable
              onPress={handleAgree}
              disabled={!canAgree}
              style={({ pressed }) => [
                styles.agreeButton,
                !canAgree && styles.agreeButtonDisabled,
                pressed &&
                  canAgree &&
                  styles.agreeButtonPressed,
              ]}
            >
              <AppText
                variant="body"
                style={[
                  styles.agreeButtonText,
                  !canAgree && styles.agreeButtonTextDisabled,
                ]}
              >
                I Agree
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface SectionProps {
  title: string;
  text: string;
}

function Section({ title, text }: SectionProps) {
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );
  return (
    <View style={styles.section}>
      <AppText
        variant="body"
        style={styles.sectionTitle}
      >
        {title}
      </AppText>

      <AppText
        variant="caption"
        style={styles.sectionText}
      >
        {text}
      </AppText>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },

    modal: {
      height: "92%",
      backgroundColor: colors.background,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      overflow: "hidden",
    },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBackground,
  },

    title: {
      fontSize: Typography.heading,
      fontWeight: "700",
      color: colors.headerContent,
    },

    closeButton: {
      width: Touch.target,
      height: Touch.target,
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      flex: 1,
      backgroundColor: colors.background,
    },

    contentContainer: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
      backgroundColor: colors.background,
    },

    updated: {
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
    },

    section: {
      marginBottom: Spacing.lg,
    },

    sectionTitle: {
      fontWeight: "700",
      marginBottom: Spacing.sm,
    },

    sectionText: {
      lineHeight: 21,
      color: colors.textSecondary,
    },

    footer: {
      padding: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.headerBackground,
      backgroundColor: colors.headerBackground,
    },

    timerContainer: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },

    timerText: {
      color: colors.headerContent,
      textAlign: "center",
    },

    readyText: {
      color: colors.headerContent,
      textAlign: "center",
      marginBottom: Spacing.sm,
    },

    agreeButton: {
      minHeight: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    agreeButtonDisabled: {
      backgroundColor: colors.glass.disabled,
    },

    agreeButtonText: {
      color: colors.text,
      fontWeight: "700",
    },

    agreeButtonPressed: {
      backgroundColor: colors.glass.whiteStrong,
    },

    agreeButtonTextDisabled: {
      color: colors.glass.disabledText,
    },
  });