// ============================================================
// AdlaWatt ESP32 heartbeat
// ============================================================
//
// Purpose:
//   Write only `device_status` and `last_seen` to the account's
//   row in public.monitoring. Sensor columns are untouched.
//
// Contract:
//   - PATCH /rest/v1/monitoring?monitor_id=eq.<MONITOR_ID>
//   - heartbeat every 5 seconds
//   - the app considers the device Offline after 10 seconds
//     without a fresh `last_seen` (or when device_status is
//     explicitly "Offline")
//
// Offline after power loss:
//   The ESP32 cannot update the database once it is powered
//   off. The app infers Offline from stale `last_seen`. A
//   server-side heartbeat cron can also flip `device_status`
//   to "Offline" using the same timestamp.
//
// Security:
//   This sketch uses the Supabase anon key and setInsecure()
//   because it is a prototype. Do not commit real credentials.
//   For production, provision a restricted device key and use
//   the Supabase CA certificate instead of setInsecure().
// ============================================================

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

// ------------------------------------------------------------
// CONFIGURATION — fill these in before flashing
// ------------------------------------------------------------
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char *SUPABASE_URL =
    "https://nxdabgvbwunyeffzrzta.supabase.co";
const char *SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// The monitor_id that owns this device's monitoring row.
const long SUPABASE_MONITOR_ID = 1100;

// ------------------------------------------------------------
// TIMING
// ------------------------------------------------------------
const unsigned long HEARTBEAT_INTERVAL_MS = 5000;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
const unsigned long HTTP_TIMEOUT_MS = 10000;

// Anything before this is treated as "NTP has not synced yet".
const time_t MIN_VALID_EPOCH = 1700000000;

unsigned long lastHeartbeatMs = 0;

// ------------------------------------------------------------
// CLOCK
// ------------------------------------------------------------
bool clockIsValid() {
  return time(nullptr) >= MIN_VALID_EPOCH;
}

void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  Serial.print("Syncing clock");
  for (int attempt = 0; attempt < 30; attempt++) {
    if (clockIsValid()) {
      Serial.println(" OK");
      return;
    }

    Serial.print(".");
    delay(500);
  }

  Serial.println(" FAILED");
}

bool formatUtcTimestamp(char *buffer, size_t bufferSize) {
  time_t now = time(nullptr);

  if (now < MIN_VALID_EPOCH) {
    return false;
  }

  struct tm timeInfo;

  if (gmtime_r(&now, &timeInfo) == nullptr) {
    return false;
  }

  return strftime(buffer, bufferSize, "%Y-%m-%dT%H:%M:%SZ",
                  &timeInfo) > 0;
}

// ------------------------------------------------------------
// WIFI
// ------------------------------------------------------------
bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("Wi-Fi disconnected; waiting for reconnect...");
  return false;
}

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
    Serial.print(".");
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Wi-Fi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Wi-Fi connection timed out; will retry.");
  }
}

// ------------------------------------------------------------
// HEARTBEAT
// ------------------------------------------------------------
void sendHeartbeat() {
  if (!ensureWiFi()) {
    return;
  }

  char timestamp[32];

  if (!formatUtcTimestamp(timestamp, sizeof(timestamp))) {
    Serial.println("Clock not synced; skipping heartbeat.");
    return;
  }

  String endpoint = String(SUPABASE_URL) +
                    "/rest/v1/monitoring?monitor_id=eq." +
                    String(SUPABASE_MONITOR_ID);

  String payload = String("{\"device_status\":\"Online\",") +
                   "\"last_seen\":\"" + timestamp + "\"}";

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);

  if (!http.begin(client, endpoint)) {
    Serial.println("HTTP begin failed.");
    return;
  }

  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization",
                 String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=representation");

  int statusCode = http.PATCH(payload);
  String response = http.getString();

  if (statusCode == 200) {
    if (response == "[]" || response == "") {
      Serial.println(
          "Heartbeat sent, but no monitoring row matched the UUID.");
    } else {
      Serial.print("Heartbeat OK at ");
      Serial.println(timestamp);
    }
  } else {
    Serial.print("Heartbeat failed: HTTP ");
    Serial.println(statusCode);
    Serial.print("Response: ");
    Serial.println(response);
  }

  http.end();
}

// ------------------------------------------------------------
// ARDUINO LIFECYCLE
// ------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("AdlaWatt ESP32 heartbeat starting.");

  connectWiFi();
  syncClock();
}

void loop() {
  if (millis() - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = millis();
    sendHeartbeat();
  }

  delay(50);
}
