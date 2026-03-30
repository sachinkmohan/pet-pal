import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>📊 Stats</ThemedText>

        <View style={styles.todayCard}>
          <ThemedText style={styles.cardTitle}>Today</ThemedText>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <ThemedText style={styles.todayValue}>0m</ThemedText>
              <ThemedText style={styles.todayLabel}>
                Screen Away Time
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.todayStat}>
              <ThemedText style={styles.todayValue}>🏆 0m</ThemedText>
              <ThemedText style={styles.todayLabel}>Personal best</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <ThemedText style={styles.cardTitle}>This week</ThemedText>
          <View style={styles.chart}>
            {DAYS.map((day) => (
              <View key={day} style={styles.bar}>
                <View style={styles.barFill} />
                <ThemedText style={styles.barLabel}>{day}</ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.weekSummary}>
            <ThemedText style={styles.weekStat}>Total: 0m</ThemedText>
            <ThemedText style={styles.weekStat}>Daily avg: 0m</ThemedText>
          </View>
        </View>

        <View style={styles.screenTimePrompt}>
          <ThemedText style={styles.promptText}>
            📱 Enable screen time tracking
          </ThemedText>
          <ThemedText style={styles.promptSub}>
            Let Pochi react to how much you use your phone
          </ThemedText>
          <View style={styles.enableButton}>
            <ThemedText style={styles.enableText}>Enable</ThemedText>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  todayCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  todayValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  todayLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  chartCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    gap: 16,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 8,
  },
  bar: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    height: 4,
    borderRadius: 4,
    backgroundColor: "#0a7ea4",
    opacity: 0.3,
  },
  barLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  weekSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekStat: {
    fontSize: 14,
    opacity: 0.7,
  },
  screenTimePrompt: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    gap: 6,
    alignItems: "center",
  },
  promptText: {
    fontSize: 16,
    fontWeight: "600",
  },
  promptSub: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: "center",
  },
  enableButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0a7ea4",
  },
  enableText: {
    color: "#fff",
    fontWeight: "600",
  },
});
