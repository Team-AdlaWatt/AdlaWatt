import {
  Image,
  StyleSheet,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";

export default function NeutralShell() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/adlawatt-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
  },
  logo: {
    width: 180,
    height: 72,
  },
});
