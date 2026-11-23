/*
  AdlaWatt ESP32-S3 Integrated Firmware
  ----------------------------------------------------------------
  Merged from:
    1) BLE provisioning + Supabase heartbeat firmware (Bluedroid BLE)
    2) Integrated monitoring firmware + TFT dashboard
    3) DHT22 DC fan relay test

  Active sensors:
    - INA219 battery monitor: SDA 17, SCL 18
    - DHT22 interior temperature + humidity: GPIO 12
    - DS18B20 outside/solar temperature: GPIO 4
    - DS3231 RTC: separate I2C bus, SDA 8, SCL 9

  Cooling:
    - 1-channel 5 V relay on GPIO 13 drives the two fans.
    - The fans turn on when a valid DHT22 reading reaches 33.0 C or higher.
    - The fans stay on while the valid reading remains at or above 33.0 C.
    - The fans turn off when the valid reading falls below 33.0 C.
    - An invalid DHT22 reading turns the fans off.

  Display (ILI9488 480x320, SPI) - see AdlaWattDisplay.h:
    - CS 41, RST 40, DC 42, MOSI 1, SCK 2
    - Button on GPIO 47 toggles Dashboard <-> QR code
    - SD card: CS 35, MOSI 36, MISO 37, SCK 14

  Supabase:
    - Table: public.monitoring
    - Row selected by monitor_id, received from the app via BLE
      provisioning and stored in NVS
    - Sensor data PATCH: every 10 seconds
    - Heartbeat PATCH: independent FreeRTOS task, every 2 seconds
      (retry after 1 second when a heartbeat fails)
    - The device never PATCHes Offline. Supabase's offline-detection
      function/trigger marks the row Offline after heartbeat expiration.

  BLE provisioning (Bluedroid, built into the ESP32 Arduino core):
    BLE name: AdlaWatt-AW-01
    Service : 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
    RX      : 6E400002-... (write / write-no-response)
    TX      : 6E400003-... (notify)
    JSON    : { "device_code":"482913", "device_id":"AW-01",
                "wifi_ssid":"...", "wifi_password":"...", "monitor_id":1234 }
    Notifications: received, busy, wifi_connected, wifi_failed, wifi_lost,
                   configured, error

  Required libraries:
    - ESP32 Arduino core (includes BLEDevice.h, WiFi, Preferences)
    - LovyanGFX
    - Adafruit RTClib
    - ArduinoJson (v6 or v7)
    - DHT sensor library
    - OneWire
    - DallasTemperature
    - Adafruit INA219 is NOT required (registers are read directly)

  Build tip:
    Bluedroid BLE + Wi-Fi + TLS + LovyanGFX is large. In the Arduino IDE
    pick a bigger partition scheme (for example "Huge APP") if the sketch
    is too big.

  IMPORTANT:
    - Wi-Fi is configured from the app (BLE provisioning). Until then the
      device only advertises over BLE. Serial command RESETCONFIG erases it.
    - The solar voltage/current/power values are battery-charge estimates,
      not direct solar-panel measurements.
    - setInsecure() disables TLS certificate validation and the fixed
      device code is fixed for testing: prototype use only.
*/

#include <Arduino.h>
#include <Wire.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <RTClib.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>
#include <esp_system.h>
#include <mbedtls/md.h>
#include <math.h>
#include <string.h>

#if defined(ARDUINO_ARCH_ESP32) && defined(MBEDTLS_CERTIFICATE_BUNDLE) && \
    defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR == 2) && \
    __has_include(<esp_crt_bundle.h>)
  #include <esp_crt_bundle.h>
  #define AW_USE_CA_BUNDLE 1
#endif

#if !defined(AW_ALLOW_SERIAL_RESETCONFIG)
#define AW_ALLOW_SERIAL_RESETCONFIG 0
#endif

// BLE (Bluedroid, same libraries as the provisioning firmware)
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// =====================================================================
// 0. SUPABASE CONFIGURATION
// =====================================================================

// Wi-Fi SSID/password and monitor_id are NOT hard-coded. They are
// received from the app over BLE and stored in NVS.
// The monitoring-table key is `activeMonitorId`.

const char* SUPABASE_URL = "https://nxdabgvbwunyeffzrzta.supabase.co";
const char* SUPABASE_TABLE = "monitoring";
const char* SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_YiGbcekZEnaKnf-FeOFBkQ_mDEBe-wW";

const unsigned long SUPABASE_UPLOAD_INTERVAL_MS = 10000;
const unsigned long COMPONENT_STATUS_INTERVAL_MS = 30000;
const unsigned long HEARTBEAT_INTERVAL_MS = 2000;
const unsigned long HEARTBEAT_RETRY_INTERVAL_MS = 1000;  // after a failed heartbeat
const unsigned long HEARTBEAT_HTTP_TIMEOUT_MS = 4000;    // TLS handshake can take 1-2 s
const unsigned long MONITORING_HTTP_TIMEOUT_MS = 5000;
const unsigned long OFFLINE_TIMEOUT_MS = 15000;
const unsigned long DEVICE_COMMAND_POLL_INTERVAL_MS = 15000;
const unsigned long DEVICE_COMMAND_HTTP_TIMEOUT_MS = 8000;

// Rated power used ONLY for the "% of rated" bars on the TFT. Change these
// to match your real panel and inverter/load limit.
const float SOLAR_RATED_W = 100.0;
const float LOAD_RATED_W  = 300.0;

// Cooling fans (2 fans on one 1-channel 5 V relay module, GPIO 13)
#define FAN_RELAY_PIN 13
const bool FAN_RELAY_ACTIVE_LOW = true;   // most 5 V relay boards: LOW = ON.
                                          // Set false if yours switches on HIGH.
const float FAN_TRIGGER_C = 33.0;

bool fansOn = false;
bool relayModuleConnected = false;

unsigned long lastSupabaseUploadTime = 0;
unsigned long lastComponentStatusReportMs = 0;
unsigned long lastDiagnosticsMs = 0;

// =====================================================================
// 1. PIN DEFINITIONS
// =====================================================================

#define SDA_PIN             17
#define SCL_PIN             18
#define DHT22_PIN           12
#define DS18B20_SOLAR_PIN   4

#define RTC_SDA_PIN         8
#define RTC_SCL_PIN         9

#define DHTTYPE DHT22

DHT dht(DHT22_PIN, DHTTYPE);
OneWire oneWireSolar(DS18B20_SOLAR_PIN);
DallasTemperature sensorSolarTemp(&oneWireSolar);

// DS3231 uses its own I2C controller, separate from INA219.
TwoWire RTCWire(1);
RTC_DS3231 rtc;

bool rtcAvailable = false;
SemaphoreHandle_t rtcMutex = nullptr;

// Prevent the heartbeat and sensor-upload task from using HTTPS/Wi-Fi
// concurrently. The schedules remain independent, but HTTP transactions
// are serialized to avoid simultaneous TLS clients and network contention.
SemaphoreHandle_t httpMutex = nullptr;

TaskHandle_t heartbeatTaskHandle = nullptr;

volatile bool supabaseOnline = false;
volatile bool solarTempPresent = false;
volatile bool solarTempConnected = false;
volatile bool interiorTempConnected = false;
volatile bool humidityValid = false;
volatile bool battReadOkGlobal = false;
volatile bool heartbeatHasSucceeded = false;
volatile unsigned long lastSuccessfulHeartbeatMs = 0;
volatile int lastHeartbeatHttpCode = 0;

bool connectionStateInitialized = false;
bool lastPrintedOnlineState = false;

// TFT dashboard, welcome animation, QR screen and SD card detection.
// Must be included AFTER rtc, rtcMutex, rtcAvailable and supabaseOnline.
#include "AdlaWattDisplay.h"

// ===================================================================
// BLE + Wi-Fi PROVISIONING (Bluedroid, merged into this file)
// ===================================================================

// ---------------------------------------------------------------------
// Device constants
// ---------------------------------------------------------------------
static const char* AW_DEVICE_ID   = "AW-01";
static const char* AW_DEVICE_CODE = "482913";
static const char* AW_BLE_NAME    = "AdlaWatt-AW-01";

#define BLE_SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_RX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define BLE_TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

static const size_t   AW_RX_BUFFER_SIZE          = 1024;
static const uint32_t AW_WIFI_CONNECT_TIMEOUT_MS = 20000;
static const uint32_t AW_WIFI_RETRY_INTERVAL_MS  = 10000;
static const uint32_t AW_WIFI_LOST_NOTIFY_MS     = 30000;

// ---------------------------------------------------------------------
// State (activeMonitorId is read by the heartbeat task and the uploader)
// ---------------------------------------------------------------------
volatile uint32_t activeMonitorId = 0;          // 0 = not provisioned yet
volatile bool provisioningInProgress = false;   // heartbeat pauses while true

static BLEServer*         bleServer = nullptr;
static BLECharacteristic* txCharacteristic = nullptr;
static BLECharacteristic* rxCharacteristic = nullptr;
static bool               bleInitialized = false;
static Preferences        awPrefs;

static volatile bool bleClientConnected = false;
static volatile bool configPayloadReady = false;

static bool     hasEverWifiConnected = false;
static bool     wifiWasConnected = false;
static bool     wifiLostNotificationSent = false;
static String   rxBuffer;
static String   completedPayload;
static String   configuredSSID;
static String   configuredPassword;
static String   configuredKeyId;
static String   configuredSecret;
static bool     deviceBound = false;
static uint32_t configuredMonitorId = 0;
static uint32_t lastWiFiRetry = 0;
static uint32_t lastWiFiLostNotify = 0;
static bool     hasSavedConfig = false;

static bool awIsDeviceLocked() {
  return deviceBound && configuredMonitorId > 0;
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
static void awSendStatus(const char* statusToken) {
  if (!bleClientConnected || txCharacteristic == nullptr) return;
  txCharacteristic->setValue((uint8_t*)statusToken, strlen(statusToken));
  txCharacteristic->notify();
  Serial.print("[BLE] status: ");
  Serial.println(statusToken);
}

// ---------------------------------------------------------------------
// BLE callbacks
// ---------------------------------------------------------------------
class AWServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    bleClientConnected = true;
    Serial.println("[BLE] client connected.");
  }

  void onDisconnect(BLEServer* server) override {
    bleClientConnected = false;
    rxBuffer = "";   // drop any half-received payload
    Serial.println("[BLE] client disconnected.");

    // Re-advertise so the app can scan/connect again.
    BLEDevice::startAdvertising();
  }
};

// Detect a complete top-level JSON object in the received stream.
// Supports braces inside quoted strings and escaped quotes.
// App writes may be chunked.
static bool awJsonObjectComplete(const String& data) {
  bool inString = false, escaped = false, started = false;
  int depth = 0;

  for (size_t i = 0; i < data.length(); i++) {
    char c = data[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c == '\\') escaped = true;
      else if (c == '"') inString = false;
      continue;
    }

    if (c == '"') { inString = true; continue; }

    if (c == '{') {
      depth++;
      started = true;
    } else if (c == '}') {
      if (depth > 0) depth--;
      if (started && depth == 0) return true;
    }
  }
  return false;
}

class AWRXCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    // BLE callbacks only assemble data.
    // Wi-Fi and NVS work is handled in loop().
    String incoming = characteristic->getValue().c_str();
    if (incoming.length() == 0) return;

    // Ignore new writes while a previous payload is being processed.
    if (configPayloadReady || provisioningInProgress) return;

    if (rxBuffer.length() + incoming.length() > AW_RX_BUFFER_SIZE) {
      rxBuffer = "";
      // Do not log received payload contents (may contain credentials).
      Serial.println("[BLE] RX rejected: payload exceeded buffer limit.");
      return;
    }

    rxBuffer += incoming;

    if (awJsonObjectComplete(rxBuffer)) {
      completedPayload = rxBuffer;
      rxBuffer = "";
      configPayloadReady = true;
    }
  }
};

// ---------------------------------------------------------------------
// NVS
// ---------------------------------------------------------------------
static void awLoadSavedConfig() {
  awPrefs.begin("aw-config", true);
  configuredSSID      = awPrefs.getString("ssid", "");
  configuredPassword  = awPrefs.getString("password", "");
  configuredMonitorId = awPrefs.getUInt("monitor_id", 0);
  String savedDeviceId = awPrefs.getString("device_id", AW_DEVICE_ID);
  deviceBound          = awPrefs.getUChar("bound", 0) == 1;
  configuredKeyId      = awPrefs.getString("key_id", "");
  configuredSecret     = awPrefs.getString("secret", "");
  awPrefs.end();

  hasSavedConfig = configuredSSID.length() > 0 && configuredMonitorId > 0;

  if (savedDeviceId != AW_DEVICE_ID) {
    hasSavedConfig = false;
    deviceBound = false;
    Serial.println("[Prov] Saved device identity does not match; config ignored.");
  }

  if (hasSavedConfig) {
    activeMonitorId = configuredMonitorId;
    Serial.println("[Prov] Saved configuration found:");
    Serial.print("  Device ID  : "); Serial.println(AW_DEVICE_ID);
    Serial.print("  Wi-Fi SSID : "); Serial.println(configuredSSID);
    Serial.println("  Wi-Fi pass : [stored - not displayed]");
    Serial.print("  Monitor ID : "); Serial.println(configuredMonitorId);
    Serial.print("  Bound      : "); Serial.println(deviceBound ? "YES" : "NO");
    Serial.print("  Key ID     : "); Serial.println(configuredKeyId);
  } else {
    activeMonitorId = 0;
    Serial.println("[Prov] No valid saved configuration. Waiting for app provisioning.");
  }
}

static bool awSaveConfigToNVS(const String& ssid, const String& password,
                              uint32_t monitorId, const String& keyId,
                              const String& secret) {
  if (!awPrefs.begin("aw-config", false)) {
    Serial.println("[NVS] ERROR: cannot open namespace for writing.");
    return false;
  }
  size_t a = awPrefs.putString("ssid", ssid);
  size_t b = awPrefs.putString("password", password);
  size_t c = awPrefs.putUInt("monitor_id", monitorId);
  size_t d = awPrefs.putString("device_id", AW_DEVICE_ID);
  size_t e = awPrefs.putUChar("bound", 1);
  size_t f = awPrefs.putString("key_id", keyId);
  size_t g = awPrefs.putString("secret", secret);
  awPrefs.end();

  // An empty Wi-Fi password (open network) legitimately writes 0 bytes.
  bool writesOK = a > 0 && c > 0 && d > 0 && (password.length() == 0 || b > 0) &&
                  e > 0 && f > 0 && g > 0;

  if (!awPrefs.begin("aw-config", true)) {
    Serial.println("[NVS] ERROR: cannot reopen namespace for read-back.");
    return false;
  }
  bool ssidOK = awPrefs.getString("ssid", "") == ssid;
  bool passOK = awPrefs.getString("password", "") == password;
  bool midOK  = awPrefs.getUInt("monitor_id", 0) == monitorId;
  bool didOK  = awPrefs.getString("device_id", "") == AW_DEVICE_ID;
  bool boundOK = awPrefs.getUChar("bound", 0) == 1;
  bool keyOK  = awPrefs.getString("key_id", "") == keyId;
  bool secretOK = awPrefs.getString("secret", "") == secret;
  awPrefs.end();

  // Password and secret values are never printed.
  Serial.printf("[NVS] verify: ssid=%s pass=%s monitor_id=%s device_id=%s "
                "bound=%s key_id=%s secret=%s writes=%s\n",
                ssidOK ? "PASS" : "FAIL", passOK ? "PASS" : "FAIL",
                midOK ? "PASS" : "FAIL", didOK ? "PASS" : "FAIL",
                boundOK ? "PASS" : "FAIL", keyOK ? "PASS" : "FAIL",
                secretOK ? "PASS" : "FAIL", writesOK ? "PASS" : "FAIL");
  return writesOK && ssidOK && passOK && midOK && didOK &&
         boundOK && keyOK && secretOK;
}

// Restore previous values (or clear) if the new save failed verification.
static bool awRollbackNVS() {
  Serial.println("[NVS] rollback to previous configuration...");
  if (!awPrefs.begin("aw-config", false)) {
    Serial.println("[NVS] ROLLBACK ERROR: cannot open namespace.");
    return false;
  }

  bool ok = true;
  if (hasSavedConfig) {
    ok &= awPrefs.putString("ssid", configuredSSID) > 0;
    if (configuredPassword.length() > 0)
      ok &= awPrefs.putString("password", configuredPassword) > 0;
    else
      awPrefs.putString("password", "");
    ok &= awPrefs.putUInt("monitor_id", configuredMonitorId) > 0;
    ok &= awPrefs.putString("device_id", AW_DEVICE_ID) > 0;
    awPrefs.putUChar("bound", deviceBound ? 1 : 0);
    awPrefs.putString("key_id", configuredKeyId);
    awPrefs.putString("secret", configuredSecret);
  } else {
    ok = awPrefs.clear();
  }
  awPrefs.end();

  Serial.println(ok ? "[NVS] rollback OK" : "[NVS] rollback FAILED");
  return ok;
}

static void awEraseBondConfigNVS() {
  if (awPrefs.begin("aw-config", false)) {
    awPrefs.removeKey("ssid");
    awPrefs.removeKey("password");
    awPrefs.removeKey("monitor_id");
    awPrefs.removeKey("device_id");
    awPrefs.removeKey("bound");
    awPrefs.removeKey("key_id");
    awPrefs.removeKey("secret");
    awPrefs.end();
  }

  configuredSSID = "";
  configuredPassword = "";
  configuredKeyId = "";
  configuredSecret = "";
  deviceBound = false;
  configuredMonitorId = 0;
  hasSavedConfig = false;
  activeMonitorId = 0;
}

static void awClearSavedConfig() {
  awEraseBondConfigNVS();
  WiFi.disconnect(true, true);
  Serial.println("[Prov] Provisioning settings erased. Device identity remains AW-01 in firmware.");
}

// ---------------------------------------------------------------------
// Wi-Fi (used by setup(), loop() and the provisioning flow)
// ---------------------------------------------------------------------
static bool awConnectWiFiBlocking(const String& ssid, const String& password) {
  Serial.print("[Wi-Fi] Connecting to: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false, false);
  delay(150);
  WiFi.begin(ssid.c_str(), password.c_str());

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < AW_WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[Wi-Fi] Connected. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("[Wi-Fi] Connection attempt timed out or failed.");
  WiFi.disconnect(false, false);
  return false;
}

// Non-blocking start using the saved credentials (boot / revert).
static void awBeginSavedWiFi() {
  if (!hasSavedConfig) return;
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(configuredSSID.c_str(), configuredPassword.c_str());
  lastWiFiRetry = millis();
}

// Background reconnect. Does nothing until the device has been provisioned.
// Routine retries do NOT force a disconnect first: ESP32 auto-reconnect is
// enabled, and WiFi.begin() just re-attempts the association.
static void awMaintainWiFi() {
  if (!hasSavedConfig || provisioningInProgress) return;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWiFiRetry < AW_WIFI_RETRY_INTERVAL_MS) return;

  lastWiFiRetry = millis();
  Serial.println("[Wi-Fi] Attempting reconnection...");
  WiFi.begin(configuredSSID.c_str(), configuredPassword.c_str());
}

// ---------------------------------------------------------------------
// Provisioning payload processing (runs in loop(), never in a BLE callback)
// ---------------------------------------------------------------------
static void awProcessProvisioningPayload() {
  if (!configPayloadReady) return;

  String payload = completedPayload;
  completedPayload = "";
  configPayloadReady = false;
  provisioningInProgress = true;   // pauses the heartbeat task

  awSendStatus("received");
  delay(100);   // spacing so notifications are delivered in sequence
  awSendStatus("busy");

  StaticJsonDocument<1280> doc;
  DeserializationError err = deserializeJson(doc, payload);

  if (err) {
    payload = "";

    Serial.println("[Prov] rejected: invalid/incomplete JSON.");
    awSendStatus("error");
    provisioningInProgress = false;
    return;
  }

  const char* receivedCode     = doc["device_code"]   | "";
  const char* receivedDeviceId = doc["device_id"]     | "";
  const char* ssidValue        = doc["wifi_ssid"]     | "";
  const char* passwordValue    = doc["wifi_password"] | "";
  const char* keyIdValue       = doc["key_id"]        | "";
  const char* secretValue      = doc["secret"]        | "";

  if (!doc["monitor_id"].is<uint32_t>()) {
    Serial.println("[Prov] rejected: monitor_id must be a JSON integer.");
    awSendStatus("error");
    provisioningInProgress = false;
    return;
  }
  uint32_t monitorId = doc["monitor_id"].as<uint32_t>();

  size_t ssidLen = strlen(ssidValue);
  size_t passLen = strlen(passwordValue);
  size_t keyIdLen = strlen(keyIdValue);
  size_t secretLen = strlen(secretValue);
  bool valid = String(receivedCode) == AW_DEVICE_CODE &&
               String(receivedDeviceId) == AW_DEVICE_ID &&
               ssidLen >= 1 && ssidLen <= 32 &&
               passLen <= 64 && monitorId > 0 &&
               keyIdLen > 0 && secretLen > 0 && secretLen <= 128;
  if (!valid) {
    Serial.println("[Prov] rejected: validation failed.");
    payload = "";
    awSendStatus("error");
    provisioningInProgress = false;
    return;
  }

  String newSSID = String(ssidValue);
  String newPassword = String(passwordValue);
  String newKeyId = String(keyIdValue);
  String newSecret = String(secretValue);
  payload = "";
  doc.clear();

  Serial.println("--- Incoming provisioning configuration ---");
  Serial.print("Device ID: "); Serial.println(AW_DEVICE_ID);
  Serial.print("Monitor ID from app: "); Serial.println(monitorId);
  if (!hasSavedConfig) {
    Serial.println("Type: FIRST-TIME SETUP");
  } else {
    Serial.print("SSID changed: ");       Serial.println(newSSID != configuredSSID ? "YES" : "NO");
    Serial.print("Password changed: ");   Serial.println(newPassword != configuredPassword ? "YES (hidden)" : "NO");
    Serial.print("Monitor ID changed: "); Serial.println(monitorId != configuredMonitorId ? "YES" : "NO");
  }

  // Do not commit anything unless Wi-Fi succeeds.
  if (!awConnectWiFiBlocking(newSSID, newPassword)) {
    Serial.println("[Prov] NOT saved. Previous settings preserved.");
    awSendStatus("wifi_failed");
    if (hasSavedConfig) awBeginSavedWiFi();   // go back to the old network
    provisioningInProgress = false;
    return;
  }
  awSendStatus("wifi_connected");
  delay(150);

  if (!awSaveConfigToNVS(newSSID, newPassword, monitorId, newKeyId, newSecret)) {
    Serial.println("[NVS] SAVE/VERIFY FAILED.");
    awRollbackNVS();
    WiFi.disconnect(false, false);
    if (hasSavedConfig) awBeginSavedWiFi();   // revert to previous network
    awSendStatus("error");
    provisioningInProgress = false;
    return;
  }

  configuredSSID = newSSID;
  configuredPassword = newPassword;
  configuredKeyId = newKeyId;
  configuredSecret = newSecret;
  deviceBound = true;
  configuredMonitorId = monitorId;
  hasSavedConfig = true;
  wifiWasConnected = true;
  hasEverWifiConnected = true;
  wifiLostNotificationSent = false;

  // Switch the live firmware (heartbeat + uploader) to the new monitor row.
  activeMonitorId = monitorId;

  // Let the heartbeat task start fresh after provisioning.
  heartbeatHasSucceeded = false;

  Serial.println("=== CONFIGURATION SAVED ===");
  Serial.print("Wi-Fi SSID : "); Serial.println(configuredSSID);
  Serial.println("Wi-Fi pass : [stored - not displayed]");
  Serial.print("Monitor ID : "); Serial.println(configuredMonitorId);
  Serial.print("Key ID     : "); Serial.println(configuredKeyId);
  Serial.println("Secret     : [stored - not displayed]");

  // Terminal success token. Keep BLE connected; do not restart advertising.
  awSendStatus("configured");
  provisioningInProgress = false;
}

// ---------------------------------------------------------------------
// BLE setup
// ---------------------------------------------------------------------
static void awSetupBLE() {
  BLEDevice::init(AW_BLE_NAME);
  bleInitialized = true;

  // Request only; actual negotiated MTU is controlled by the client.
  BLEDevice::setMTU(517);

  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new AWServerCallbacks());

  BLEService* service = bleServer->createService(BLE_SERVICE_UUID);

  txCharacteristic = service->createCharacteristic(
    BLE_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  txCharacteristic->addDescriptor(new BLE2902());

  rxCharacteristic = service->createCharacteristic(
    BLE_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  rxCharacteristic->setCallbacks(new AWRXCallbacks());

  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);

  BLEDevice::startAdvertising();

  Serial.print("[BLE] advertising as: ");
  Serial.println(AW_BLE_NAME);
}

static void awStopBLE() {
  BLEDevice::getAdvertising()->stop();
  if (bleInitialized) {
    BLEDevice::deinit(true);
    bleInitialized = false;
  }
  bleServer = nullptr;
  txCharacteristic = nullptr;
  rxCharacteristic = nullptr;
  bleClientConnected = false;
  Serial.println("[BLE] Advertising stopped and BLE deinitialized (device bound).");
}

// ---------------------------------------------------------------------
// Public entry points used by setup() and loop()
// ---------------------------------------------------------------------
static void awProvisioningSetup() {
  awLoadSavedConfig();

  if (hasSavedConfig) {
    Serial.println("[Wi-Fi] Trying previously saved network...");
    awBeginSavedWiFi();
  }
}

// Call every loop(): processes app payloads and sends Wi-Fi-lost notices.
static void awProvisioningLoop() {
  awProcessProvisioningPayload();

  bool connected = (WiFi.status() == WL_CONNECTED);

  if (wifiWasConnected && !connected) {
    wifiWasConnected = false;
    wifiLostNotificationSent = false;
    Serial.println("[Wi-Fi] connection lost.");
  }

  if (hasSavedConfig && connected) {
    wifiWasConnected = true;
    hasEverWifiConnected = true;
    wifiLostNotificationSent = false;
  }

  // Notify the app of Wi-Fi loss only after a connection was established.
  if (hasSavedConfig && hasEverWifiConnected && !connected &&
      bleClientConnected && !provisioningInProgress) {
    if (!wifiLostNotificationSent ||
        millis() - lastWiFiLostNotify >= AW_WIFI_LOST_NOTIFY_MS) {
      awSendStatus("wifi_lost");
      wifiLostNotificationSent = true;
      lastWiFiLostNotify = millis();
    }
  }

  awMaintainWiFi();
}

// ================= END PROVISIONING =================


// =====================================================================
// FAN RELAY CONTROL (DHT22 fan threshold)
// =====================================================================

static void setFans(bool on) {
  fansOn = on;
  digitalWrite(FAN_RELAY_PIN, (on != FAN_RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

static void initFanRelay() {
  // Drive the "off" level first so the fans never pulse at boot.
  digitalWrite(FAN_RELAY_PIN, FAN_RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(FAN_RELAY_PIN, OUTPUT);
  relayModuleConnected = true;
  setFans(false);
  Serial.printf("[Fans] Relay on GPIO %d ready (active %s).\n",
                FAN_RELAY_PIN, FAN_RELAY_ACTIVE_LOW ? "LOW" : "HIGH");
}

// Called every loop with the latest DHT22 reading.
//  - A valid reading at or above FAN_TRIGGER_C turns the fans on.
//  - The fans stay on until a valid reading falls below FAN_TRIGGER_C.
//  - An invalid reading turns the fans off.
static void updateFans(float tempC, bool readingValid) {
  bool shouldRun = readingValid && !isnan(tempC) && tempC >= FAN_TRIGGER_C;

  if (shouldRun != fansOn) {
    setFans(shouldRun);

    if (shouldRun) {
      Serial.printf("[Fans] Interior %.1f C >= %.1f C. Cooling ON.\n",
                    tempC, FAN_TRIGGER_C);
    } else if (readingValid && !isnan(tempC)) {
      Serial.printf("[Fans] Interior %.1f C < %.1f C. Cooling OFF.\n",
                    tempC, FAN_TRIGGER_C);
    } else {
      Serial.println("[Fans] Invalid DHT22 reading. Cooling OFF.");
    }
  }
}

// =====================================================================
// 2. INA219 SENSOR ADDRESSES AND REGISTERS
// =====================================================================

uint8_t batteryINA219Addr = 0x40;
bool battINA219Connected = false;

#define REG219_CONFIG      0x00
#define REG219_SHUNT_VOLT  0x01
#define REG219_BUS_VOLT    0x02

// =====================================================================
// 3. BATTERY SPECIFICATIONS AND CALIBRATION
// =====================================================================

const float BATT_VOLT_CAL   = 1.00169;
const float BATT_CURR_CAL   = 1.0000;
const float BATT_SHUNT_OHMS = 0.0007444;

const float TOTAL_BANK_AH      = 60.0;
const float TOTAL_BANK_WH      = 720.0;
const float DOD_RESERVE_PCT    = 0.20;
const float RESERVE_AH         = TOTAL_BANK_AH * DOD_RESERVE_PCT;
const float USABLE_CAPACITY_AH = TOTAL_BANK_AH - RESERVE_AH;

const float CHARGE_EFFICIENCY = 0.99;
const float FULL_CHARGE_VOLTS = 12.58;
const float LOW_CUTOFF_VOLTS  = 10.65;
const float TAIL_CURRENT_AMPS = 1.00;
const float BATT_DEADBAND_A   = 0.12;

// =====================================================================
// 4. GLOBAL STATE AND TIMERS
// =====================================================================

Preferences prefs;

double total_Ah = 44.4;
double cumulative_energy_input_wh = 0.0;
double cumulative_energy_output_wh = 0.0;

unsigned long solarActiveSeconds = 0;

unsigned long lastSampleTime = 0;
unsigned long lastSaveTime = 0;
unsigned long lastHistSampleTime = 0;

const unsigned long SAVE_INTERVAL_MS = 300000;
const unsigned long HISTORY_SAMPLE_INTERVAL_MS = 60000;

// Eleven slots provide a full ten-minute comparison at one-minute
// intervals: current sample versus the sample ten minutes earlier.
float solarTempHistory[11];
float interiorTempHistory[11];
int histIndex = 0;
bool histFilled = false;

// =====================================================================
// 5. BATTERY SOC LOOKUP
// =====================================================================

float estimateSoCFromRestedVoltage(float v) {
  if (v >= 12.600) return 100.0;
  if (v <= 10.650) return 20.0;

  if (v >= 11.400) {
    return 60.0 + ((v - 11.400) / 0.030);
  }

  if (v >= 10.950) {
    return 30.0 + ((v - 10.950) / 0.015);
  }

  return 20.0 + ((v - 10.650) / 0.030);
}

// =====================================================================
// 6. APPLIANCE ESTIMATOR
// =====================================================================

String estimateAppliance(float loadWatts) {
  if (loadWatts < 4.0)
    return "No Appliance / Inverter Standby";
  if (loadWatts <= 18.0)
    return "LED Light / Wi-Fi Router / Phone Charger";
  if (loadWatts <= 45.0)
    return "Laptop Charger / Mini Desk Fan";
  if (loadWatts <= 90.0)
    return "Stand Fan / TV / Monitor";
  if (loadWatts <= 250.0)
    return "Gaming Laptop / Rice Cooker / Mini Fridge";
  return "Heavy Appliance / High Inductive Load";
}

// =====================================================================
// 7. TEMPERATURE AND SOLAR CLASSIFICATION
// =====================================================================

String getSolarTempStatus(float tempC, float oldTemp10m, bool connected) {
  if (!connected) return "Critical (sensor fault)";
  if (!isnan(oldTemp10m) && (tempC - oldTemp10m) >= 10.0)
    return "Critical (rapid rise)";
  if (tempC < 65.0) return "Nominal";
  if (tempC < 70.0) return "Elevated";
  if (tempC < 75.0) return "High";
  return "Critical";
}

String getInteriorTempStatus(float tempC, float oldTemp10m, bool connected) {
  if (!connected || isnan(tempC) || tempC < 0.0 || tempC > 50.0)
    return "Critical (sensor fault)";
  if (!isnan(oldTemp10m) && (tempC - oldTemp10m) >= 5.0)
    return "Critical (rapid rise)";
  if (tempC >= 45.0) return "Critical";
  if (tempC >= 33.0) return "High";
  if (tempC >= 20.0) return "Elevated";
  return "Nominal";
}

String getSolarStatus(float solarWatts) {
  if (solarWatts < 15.0) return "Low";
  if (solarWatts <= 55.0) return "Moderate";
  return "High";
}

// =====================================================================
// 8. TIME FORMATTING AND RTC
// =====================================================================

String formatInterval(unsigned long totalSec) {
  unsigned long hrs = totalSec / 3600;
  unsigned long mins = (totalSec % 3600) / 60;
  unsigned long secs = totalSec % 60;

  char buf[20];
  snprintf(buf, sizeof(buf), "%02lu:%02lu:%02lu", hrs, mins, secs);
  return String(buf);
}

String formatTimeRemaining(double usableWh, float loadWatts,
                           const String& battStatus) {
  if (battStatus == "Charging") return "Charging...";
  if (battStatus != "Discharging" || loadWatts < 2.0) return "0h 00m";

  float totalHours = usableWh / loadWatts;
  int hrs = (int)totalHours;
  int mins = (int)((totalHours - hrs) * 60.0);

  char buf[24];
  snprintf(buf, sizeof(buf), "%dh %02dm", hrs, mins);
  return String(buf);
}

String getTimestampISO8601() {
  if (!rtcAvailable) return "";

  DateTime now;

  if (rtcMutex != nullptr) {
    if (xSemaphoreTake(rtcMutex, pdMS_TO_TICKS(500)) != pdTRUE) {
      return "";
    }
  }

  now = rtc.now();

  if (rtcMutex != nullptr) {
    xSemaphoreGive(rtcMutex);
  }

  char buffer[32];
  snprintf(
    buffer, sizeof(buffer),
    "%04d-%02d-%02dT%02d:%02d:%02d+08:00",
    now.year(), now.month(), now.day(),
    now.hour(), now.minute(), now.second()
  );

  return String(buffer);
}

void initializeRTC() {
  RTCWire.begin(RTC_SDA_PIN, RTC_SCL_PIN, 100000);

  if (!rtc.begin(&RTCWire)) {
    Serial.println("[RTC] DS3231 not detected. Database timestamps unavailable.");
    rtcAvailable = false;
    return;
  }

  rtcAvailable = true;

  if (rtc.lostPower()) {
    Serial.println("[RTC] Lost power. Setting compile-time clock.");
    if (rtcMutex != nullptr) {
      xSemaphoreTake(rtcMutex, portMAX_DELAY);
    }
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    if (rtcMutex != nullptr) {
      xSemaphoreGive(rtcMutex);
    }
  }

  Serial.print("[RTC] Initialized: ");
  Serial.println(getTimestampISO8601());
}

// =====================================================================
// 9. INA219 I2C REGISTER FUNCTIONS
// =====================================================================

bool writeReg16(uint8_t addr, uint8_t reg, uint16_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write((val >> 8) & 0xFF);
  Wire.write(val & 0xFF);
  return Wire.endTransmission() == 0;
}

bool readUnsigned16(uint8_t addr, uint8_t reg, uint16_t &val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);

  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(addr, (uint8_t)2) != 2) return false;

  val = ((uint16_t)Wire.read() << 8) | Wire.read();
  return true;
}

bool readSigned16(uint8_t addr, uint8_t reg, int16_t &val) {
  uint16_t raw = 0;
  if (!readUnsigned16(addr, reg, raw)) return false;
  val = (int16_t)raw;
  return true;
}

void detectI2CSensors() {
  battINA219Connected = false;

  for (uint8_t addr = 0x40; addr <= 0x45; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      batteryINA219Addr = addr;
      battINA219Connected =
        writeReg16(batteryINA219Addr, REG219_CONFIG, 0x2FFF);
      break;
    }
  }
}

// =====================================================================
// 10. FLASH STORAGE
// =====================================================================

void saveStateToFlash() {
  prefs.putDouble("tot_Ah", total_Ah);
  prefs.putDouble("in_Wh", cumulative_energy_input_wh);
  prefs.putDouble("out_Wh", cumulative_energy_output_wh);
  prefs.putULong("sol_sec", solarActiveSeconds);
}

// =====================================================================
// 11. RTC SYNC FROM NTP
// =====================================================================

// Wi-Fi connect / reconnect lives in the provisioning section above
// (awBeginSavedWiFi, awMaintainWiFi). The Supabase timestamps come from the
// DS3231, which is kept accurate by this NTP sync.

static unsigned long lastNtpAttemptMs = 0;   // 0 = attempt as soon as Wi-Fi is up
static bool ntpEverSynced = false;

bool syncRtcFromNtp() {
  if (WiFi.status() != WL_CONNECTED || !rtcAvailable) return false;

  configTime(8 * 3600, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");  // UTC+8
  struct tm t;
  if (!getLocalTime(&t, 8000)) {
    Serial.println("[RTC] NTP sync failed; will retry in 30 s.");
    return false;
  }
  if (rtcMutex != nullptr &&
      xSemaphoreTake(rtcMutex, pdMS_TO_TICKS(500)) == pdTRUE) {
    DateTime before = rtc.now();
    DateTime ntp(t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
                 t.tm_hour, t.tm_min, t.tm_sec);
    rtc.adjust(ntp);
    xSemaphoreGive(rtcMutex);
    Serial.printf("[RTC] Synced from NTP. RTC was off by %ld s.\n",
                  (long)ntp.unixtime() - (long)before.unixtime());
    return true;
  }
  return false;
}

// =====================================================================
// 12. SHARED SUPABASE PATCH HELPER
// =====================================================================

bool supabasePatch(const String& jsonPayload, unsigned long timeoutMs,
                   int* responseCode = nullptr) {
  if (WiFi.status() != WL_CONNECTED || activeMonitorId == 0) {
    if (responseCode) *responseCode = -1;
    return false;
  }

  if (httpMutex != nullptr) {
    if (xSemaphoreTake(httpMutex, pdMS_TO_TICKS(timeoutMs + 500)) != pdTRUE) {
      if (responseCode) *responseCode = -2;
      Serial.println("[Supabase] HTTP lock timeout.");
      return false;
    }
  }

  // Recheck after acquiring the lock.
  if (WiFi.status() != WL_CONNECTED) {
    if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
    if (responseCode) *responseCode = -1;
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Prototype only: TLS certificate validation disabled.

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/rest/v1/" +
                    SUPABASE_TABLE + "?monitor_id=eq." +
                    String((uint32_t)activeMonitorId);

  bool success = false;
  int httpCode = -1;

  if (http.begin(client, endpoint)) {
    http.setTimeout(timeoutMs);
    http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    http.addHeader("Authorization",
                   String("Bearer ") + SUPABASE_PUBLISHABLE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    httpCode = http.sendRequest("PATCH", (uint8_t*)jsonPayload.c_str(),
                                jsonPayload.length());

    if (httpCode >= 200 && httpCode < 300) {
      success = true;
    } else {
      Serial.printf("[Supabase] PATCH failed. HTTP %d\n", httpCode);
      if (httpCode > 0) {
        String response = http.getString();
        if (response.length()) Serial.println(response);
      }
    }

    http.end();
  } else {
    Serial.println("[Supabase] HTTP begin failed.");
  }

  if (responseCode) *responseCode = httpCode;
  if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
  return success;
}

bool supabaseRpcPost(const char* functionName, const String& jsonPayload,
                     unsigned long timeoutMs, int* responseCode = nullptr) {
  if (functionName == nullptr || functionName[0] == '\0' ||
      WiFi.status() != WL_CONNECTED || activeMonitorId == 0) {
    if (responseCode) *responseCode = -1;
    return false;
  }

  if (httpMutex != nullptr) {
    if (xSemaphoreTake(httpMutex, pdMS_TO_TICKS(timeoutMs + 500)) != pdTRUE) {
      if (responseCode) *responseCode = -2;
      Serial.println("[Supabase] HTTP lock timeout.");
      return false;
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
    if (responseCode) *responseCode = -1;
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/rest/v1/rpc/" + functionName;

  bool success = false;
  int httpCode = -1;

  if (http.begin(client, endpoint)) {
    http.setTimeout(timeoutMs);
    http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    http.addHeader("Authorization",
                   String("Bearer ") + SUPABASE_PUBLISHABLE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    httpCode = http.POST((uint8_t*)jsonPayload.c_str(), jsonPayload.length());

    if (httpCode >= 200 && httpCode < 300) {
      success = true;
    } else {
      Serial.printf("[Supabase] RPC %s failed. HTTP %d\n", functionName, httpCode);
      if (httpCode > 0) {
        String response = http.getString();
        if (response.length()) Serial.println(response);
      }
    }

    http.end();
  } else {
    Serial.printf("[Supabase] RPC %s HTTP begin failed.\n", functionName);
  }

  if (responseCode) *responseCode = httpCode;
  if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
  return success;
}

#if !defined(AW_USE_CA_BUNDLE)
static const char AW_SUPABASE_ROOT_CA[] =
  "-----BEGIN CERTIFICATE-----\n"
  "MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n"
  "TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
  "cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
  "WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
  "ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
  "MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n"
  "h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n"
  "0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n"
  "A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n"
  "T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n"
  "B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n"
  "B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n"
  "KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n"
  "OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n"
  "jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n"
  "qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n"
  "rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"
  "HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\n"
  "hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\n"
  "ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n"
  "3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\n"
  "NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\n"
  "ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\n"
  "TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\n"
  "jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\n"
  "oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n"
  "4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\n"
  "mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\n"
  "emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n"
  "-----END CERTIFICATE-----\n";
#endif

static unsigned long lastDeviceCommandPollMs = 0;

static String awBase64UrlEncode(const uint8_t* data, size_t len) {
  static const char alphabet[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  String out;
  out.reserve(((len + 2) / 3) * 4);

  for (size_t i = 0; i < len; i += 3) {
    uint32_t triple = (uint32_t)data[i] << 16;
    if (i + 1 < len) triple |= (uint32_t)data[i + 1] << 8;
    if (i + 2 < len) triple |= (uint32_t)data[i + 2];

    out += alphabet[(triple >> 18) & 0x3F];
    out += alphabet[(triple >> 12) & 0x3F];
    if (i + 1 < len) out += alphabet[(triple >> 6) & 0x3F];
    if (i + 2 < len) out += alphabet[triple & 0x3F];
  }
  return out;
}

static String awHmacSha256Base64Url(const String& key, const String& message) {
  uint8_t digest[32];
  int rc = mbedtls_md_hmac(MBEDTLS_MD_SHA256,
                           (const unsigned char*)key.c_str(), key.length(),
                           (const unsigned char*)message.c_str(), message.length(),
                           digest);
  if (rc != 0) return "";
  return awBase64UrlEncode(digest, sizeof(digest));
}

static String awCanonicalNext(const String& keyId, const String& nonce,
                              const String& issuedAt) {
  String s = "1|next|";
  s += AW_DEVICE_ID;
  s += '|';
  s += keyId;
  s += '|';
  s += nonce;
  s += '|';
  s += issuedAt;
  return s;
}

static String awCanonicalCommand(const char* action, const String& commandId,
                                 uint32_t monitorId, const String& nonce,
                                 const String& issuedAt, const String& expiresAt,
                                 bool includeReleased) {
  String s = "1|";
  s += action;
  s += '|';
  s += AW_DEVICE_ID;
  s += '|';
  s += commandId;
  s += '|';
  s += String((unsigned long)monitorId);
  s += '|';
  s += nonce;
  s += '|';
  s += issuedAt;
  s += '|';
  s += expiresAt;
  if (includeReleased) s += "|released";
  return s;
}

static bool awSecureEquals(const String& a, const String& b) {
  if (a.length() != b.length()) return false;
  uint8_t diff = 0;
  for (size_t i = 0; i < a.length(); i++) {
    diff |= (uint8_t)(a[i] ^ b[i]);
  }
  return diff == 0;
}

static bool awDeviceCommandPost(const String& jsonPayload, const String& signature,
                                String* responseBody, int* responseCode) {
  if (responseBody) *responseBody = "";
  if (responseCode) *responseCode = -1;
  if (WiFi.status() != WL_CONNECTED) return false;

  if (httpMutex != nullptr) {
    if (xSemaphoreTake(httpMutex,
                       pdMS_TO_TICKS(DEVICE_COMMAND_HTTP_TIMEOUT_MS + 500)) != pdTRUE) {
      if (responseCode) *responseCode = -2;
      Serial.println("[Command] HTTP lock timeout.");
      return false;
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
    if (responseCode) *responseCode = -1;
    return false;
  }

  WiFiClientSecure client;
#if defined(AW_USE_CA_BUNDLE)
  client.setCACertBundle(esp_crt_bundle);
#else
  client.setCACert(AW_SUPABASE_ROOT_CA);
#endif

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/functions/v1/device-command";
  bool success = false;
  int httpCode = -1;

  if (http.begin(client, endpoint)) {
    http.setTimeout(DEVICE_COMMAND_HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    http.addHeader("x-device-signature", signature);
    httpCode = http.POST((uint8_t*)jsonPayload.c_str(), jsonPayload.length());

    if (httpCode >= 200 && httpCode < 300) {
      success = true;
      if (responseBody) *responseBody = http.getString();
    } else {
      Serial.printf("[Command] Request failed. HTTP %d\n", httpCode);
    }
    http.end();
  } else {
    Serial.println("[Command] HTTP begin failed.");
  }

  if (responseCode) *responseCode = httpCode;
  if (httpMutex != nullptr) xSemaphoreGive(httpMutex);
  return success;
}

static bool awSendReleaseAck(const String& keyId, const String& secret,
                             const String& commandId, uint32_t monitorId,
                             const String& nonce, const String& issuedAt,
                             const String& expiresAt) {
  String canonical = awCanonicalCommand("ack", commandId, monitorId, nonce,
                                        issuedAt, expiresAt, true);
  String signature = awHmacSha256Base64Url(secret, canonical);

  StaticJsonDocument<512> doc;
  doc["version"] = 1;
  doc["action"] = "ack";
  doc["device_id"] = AW_DEVICE_ID;
  doc["key_id"] = keyId;
  doc["command_id"] = commandId;
  doc["monitor_id"] = (unsigned long)monitorId;
  doc["nonce"] = nonce;
  doc["issued_at"] = issuedAt;
  doc["expires_at"] = expiresAt;
  doc["result"] = "released";

  String body;
  serializeJson(doc, body);

  int httpCode = -1;
  bool ok = awDeviceCommandPost(body, signature, nullptr, &httpCode);
  Serial.printf("[Command] Release ack HTTP %d.\n", httpCode);
  return ok;
}

static void awPollDeviceCommand() {
  if (!awIsDeviceLocked()) return;

  String secret = configuredSecret;
  String keyId = configuredKeyId;
  if (keyId.length() == 0 || secret.length() == 0) return;

  String issuedAt = getTimestampISO8601();
  if (issuedAt.length() == 0) {
    Serial.println("[Command] Waiting for RTC time before polling.");
    return;
  }
  String nonce = String((unsigned long)esp_random(), HEX) + "-" +
                 String(millis(), HEX);

  String canonical = awCanonicalNext(keyId, nonce, issuedAt);
  String signature = awHmacSha256Base64Url(secret, canonical);
  if (signature.length() == 0) return;

  StaticJsonDocument<768> doc;
  doc["version"] = 1;
  doc["action"] = "next";
  doc["device_id"] = AW_DEVICE_ID;
  doc["monitor_id"] = (unsigned long)((uint32_t)activeMonitorId);
  doc["key_id"] = keyId;
  doc["nonce"] = nonce;
  doc["issued_at"] = issuedAt;

  String body;
  serializeJson(doc, body);

  String response;
  int httpCode = -1;
  if (!awDeviceCommandPost(body, signature, &response, &httpCode)) return;
  if (response.length() == 0) return;

  StaticJsonDocument<1024> resp;
  DeserializationError err = deserializeJson(resp, response);
  if (err) {
    Serial.println("[Command] Ignoring invalid response JSON.");
    return;
  }

  bool success = resp["success"] | false;
  if (!success) return;

  JsonObject release = resp["command"].as<JsonObject>();
  if (release.isNull()) return;

  const char* action = release["action"] | "";
  if (strcmp(action, "release") != 0) return;

  const char* commandId = release["command_id"] | "";
  const char* respNonce = release["nonce"] | "";
  const char* respIssuedAt = release["issued_at"] | "";
  const char* expiresAt = release["expires_at"] | "";
  const char* receivedSignature = release["signature"] | "";

  if (!release["monitor_id"].is<uint32_t>()) {
    Serial.println("[Command] Ignoring release: monitor_id is not an integer.");
    return;
  }
  uint32_t cmdMonitorId = release["monitor_id"].as<uint32_t>();
  if (cmdMonitorId == 0 || cmdMonitorId != (uint32_t)activeMonitorId) {
    Serial.println("[Command] Ignoring release: monitor_id mismatch.");
    return;
  }
  if (strlen(commandId) == 0 || strlen(respNonce) == 0 ||
      strlen(respIssuedAt) == 0 || strlen(expiresAt) == 0 ||
      strlen(receivedSignature) == 0) {
    Serial.println("[Command] Ignoring release: missing required fields.");
    return;
  }

  String releaseCanonical = awCanonicalCommand(
    "release", String(commandId), cmdMonitorId, String(respNonce),
    String(respIssuedAt), String(expiresAt), false);
  String expectedSignature = awHmacSha256Base64Url(secret, releaseCanonical);
  String suppliedSignature = String(receivedSignature);
  while (suppliedSignature.endsWith("=")) {
    suppliedSignature.remove(suppliedSignature.length() - 1);
  }

  if (!awSecureEquals(expectedSignature, suppliedSignature)) {
    Serial.println("[Command] Ignoring release: signature verification failed.");
    return;
  }

  Serial.printf("[Command] Verified release command for monitor %lu.\n",
                (unsigned long)cmdMonitorId);

  awEraseBondConfigNVS();
  activeMonitorId = 0;

  awSendReleaseAck(keyId, secret, String(commandId), cmdMonitorId,
                   String(respNonce), String(respIssuedAt), String(expiresAt));

  WiFi.disconnect(true, true);
  delay(100);
  esp_restart();
}

// =====================================================================
// 13. INDEPENDENT SUPABASE HEARTBEAT
// =====================================================================

// This PATCH owns only the heartbeat columns (Online + Last seen).
// The device NEVER PATCHes Offline. Supabase's offline-detection
// trigger/function stays unchanged.
bool sendHeartbeatToSupabase() {
  if (WiFi.status() != WL_CONNECTED) return false;

  String timestamp = getTimestampISO8601();
  if (timestamp.length() == 0) {
    Serial.println("[Heartbeat] RTC timestamp unavailable.");
    return false;
  }

  StaticJsonDocument<192> doc;
  doc["ESP32S3 Status"] = "Online";
  doc["ESP32S3 Last seen"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  int httpCode = -1;
  bool ok = supabasePatch(payload, HEARTBEAT_HTTP_TIMEOUT_MS, &httpCode);
  lastHeartbeatHttpCode = httpCode;

  if (ok) {
    lastSuccessfulHeartbeatMs = millis();
    heartbeatHasSucceeded = true;
    supabaseOnline = true;
    Serial.println("[Heartbeat] Supabase heartbeat successful.");
  } else {
    Serial.printf("[Heartbeat] Failed. HTTP status: %d. Retrying in 1 second.\n", httpCode);
  }

  return ok;
}

// Successful heartbeats repeat every 2 seconds.
// A failed heartbeat is retried after 1 second.
void heartbeatTask(void* parameter) {
  for (;;) {
    bool ok = true;

    if (WiFi.status() == WL_CONNECTED && activeMonitorId != 0 &&
        !provisioningInProgress) {
      ok = sendHeartbeatToSupabase();
    }

    vTaskDelay(pdMS_TO_TICKS(ok ? HEARTBEAT_INTERVAL_MS
                                : HEARTBEAT_RETRY_INTERVAL_MS));
  }
}

void updateConnectionState() {
  bool online = false;

  if (WiFi.status() == WL_CONNECTED && heartbeatHasSucceeded) {
    online = (millis() - lastSuccessfulHeartbeatMs <= OFFLINE_TIMEOUT_MS);
  }

  supabaseOnline = online;

  if (!connectionStateInitialized || online != lastPrintedOnlineState) {
    connectionStateInitialized = true;
    lastPrintedOnlineState = online;
    Serial.println(online
      ? "[DEVICE STATUS] ONLINE - Supabase reachable."
      : "[DEVICE STATUS] Waiting / OFFLINE - heartbeat unavailable.");
  }
}

bool isESP32S3Connected() {
  return WiFi.status() == WL_CONNECTED;
}

bool isESP32S3Active() {
  return supabaseOnline;
}

bool isINA219Connected() {
  return battINA219Connected;
}

bool isINA219Active() {
  return battReadOkGlobal;
}

bool isDS18B20Connected() {
  return solarTempPresent;
}

bool isDS18B20Active() {
  return solarTempConnected;
}

bool isDHT22Connected() {
  return interiorTempConnected && humidityValid;
}

bool isDHT22Active() {
  return interiorTempConnected && humidityValid;
}

bool isRelayModuleConnected() {
  return relayModuleConnected;
}

bool isRelayModuleActive() {
  return fansOn;
}

bool isFiveVoltDCFanConnected() {
  return relayModuleConnected;
}

bool isFiveVoltDCFanActive() {
  return fansOn;
}

bool isSPITFTDisplayConnected() {
  return displayTaskHandle != nullptr;
}

bool isSPITFTDisplayActive() {
  return displayTaskHandle != nullptr;
}

typedef bool (*ComponentStateFn)();

struct ComponentStatusEntry {
  const char* name;
  ComponentStateFn connected;
  ComponentStateFn active;
};

ComponentStatusEntry componentStatuses[] = {
  { "ESP32-S3", isESP32S3Connected, isESP32S3Active },
  { "INA219", isINA219Connected, isINA219Active },
  { "DS18B20", isDS18B20Connected, isDS18B20Active },
  { "DHT22", isDHT22Connected, isDHT22Active },
  { "Relay Module 5V 1 Channel", isRelayModuleConnected, isRelayModuleActive },
  { "5V DC Fan", isFiveVoltDCFanConnected, isFiveVoltDCFanActive },
  { "SPI TFT Display", isSPITFTDisplayConnected, isSPITFTDisplayActive }
};

bool isComponentConnected(const char* componentName) {
  if (componentName == nullptr) return false;

  const int count = (int)(sizeof(componentStatuses) / sizeof(componentStatuses[0]));
  for (int i = 0; i < count; i++) {
    if (strcmp(componentStatuses[i].name, componentName) == 0) {
      return componentStatuses[i].connected();
    }
  }
  return false;
}

bool isComponentActive(const char* componentName) {
  if (componentName == nullptr) return false;

  const int count = (int)(sizeof(componentStatuses) / sizeof(componentStatuses[0]));
  for (int i = 0; i < count; i++) {
    if (strcmp(componentStatuses[i].name, componentName) == 0) {
      return componentStatuses[i].active();
    }
  }
  return false;
}

void printComponentStatuses() {
  Serial.println("========== COMPONENT STATUS ==========");
  const int count = (int)(sizeof(componentStatuses) / sizeof(componentStatuses[0]));

  for (int i = 0; i < count; i++) {
    Serial.printf("%-25s connected=%s active=%s\n",
      componentStatuses[i].name,
      componentStatuses[i].connected() ? "YES" : "NO",
      componentStatuses[i].active() ? "YES" : "NO");
  }
  Serial.println("======================================");
}

bool reportComponentStatus(const char* componentName, bool active) {
  if (componentName == nullptr || activeMonitorId == 0 ||
      WiFi.status() != WL_CONNECTED) {
    return false;
  }

  StaticJsonDocument<192> doc;
  doc["p_monitor_id"] = (uint32_t)activeMonitorId;
  doc["p_component_name"] = componentName;
  doc["p_active"] = active;

  String payload;
  serializeJson(doc, payload);

  int httpCode = -1;
  bool ok = supabaseRpcPost("report_component_status", payload,
                            MONITORING_HTTP_TIMEOUT_MS, &httpCode);
  if (!ok) {
    Serial.printf("[Components] %s report failed. HTTP %d\n",
                  componentName, httpCode);
  }
  return ok;
}

void reportAllComponentStatuses() {
  const int count = (int)(sizeof(componentStatuses) / sizeof(componentStatuses[0]));
  int accepted = 0;

  for (int i = 0; i < count; i++) {
    if (reportComponentStatus(componentStatuses[i].name,
                              componentStatuses[i].active())) {
      accepted++;
    }
  }

  Serial.printf("[Components] Status report complete: %d/%d accepted.\n",
                accepted, count);
}

void printConnectionDiagnostics() {
  Serial.println();
  Serial.println("========== CONNECTION DIAGNOSTICS ==========");
  Serial.printf("Provisioned: %s  Monitor ID: %lu\n",
    hasSavedConfig ? "YES" : "NO", (unsigned long)activeMonitorId);
  Serial.printf("BLE: advertising as %s, phone %s\n", AW_BLE_NAME,
    bleClientConnected ? "CONNECTED" : "not connected");
  Serial.printf("Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.printf("Wi-Fi: %s\n",
    WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
  Serial.printf("Supabase heartbeat: %s\n",
    supabaseOnline ? "ONLINE" : "OFFLINE");
  Serial.printf("Last heartbeat HTTP code: %d\n", lastHeartbeatHttpCode);
  Serial.printf("RTC: %s\n", rtcAvailable ? "AVAILABLE" : "NOT AVAILABLE");
  Serial.printf("SD card: %s\n", sdMounted ? "DETECTED" : "NOT FOUND");
  Serial.printf("Cooling fans: %s\n", fansOn ? "ON" : "OFF");

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }

  if (heartbeatHasSucceeded) {
    Serial.printf("Milliseconds since successful heartbeat: %lu\n",
      millis() - lastSuccessfulHeartbeatMs);
  } else {
    Serial.println("No successful heartbeat recorded yet.");
  }
  Serial.println("============================================");
}

// =====================================================================
// 14. MONITORING DATA UPLOAD
// =====================================================================

void sendMonitoringData(
  float batt_V,
  int usable_pct_int,
  const String& battery_status,
  const String& time_remaining,
  float solar_W,
  const String& solar_timer,
  float solar_V,
  float solar_A,
  double energy_output_wh,
  const String& solar_status,
  float load_now_W,
  const String& dod_status,
  float solar_temp,
  const String& solar_temp_status,
  float interior_temp,
  const String& interior_temp_status,
  int total_wh_int,
  double energy_input_wh,
  const String& sampledAt
) {
  if (sampledAt.length() == 0) {
    Serial.println("[Supabase] Monitoring upload skipped: RTC unavailable.");
    return;
  }

  // Sanitise values so one bad reading cannot make Supabase reject the whole
  // PATCH. These match the CHECK constraints on public.monitoring:
  //   Solar input/voltage/current, battery load, voltage, energy >= 0
  //   DHT22 Interior Temp >= 0   (NaN -> JSON null, which the table allows)
  auto nonNeg = [](float v) -> float { return (isnan(v) || v < 0.0f) ? 0.0f : v; };
  int pctSafe = constrain(usable_pct_int, 0, 100);
  int whSafe  = total_wh_int < 0 ? 0 : total_wh_int;
  double eIn  = energy_input_wh  < 0 ? 0 : energy_input_wh;
  double eOut = energy_output_wh < 0 ? 0 : energy_output_wh;
  String timeRem = time_remaining.length() ? time_remaining : String("0h 00m");

  StaticJsonDocument<1792> doc;

  // Every successful sensor PATCH also marks the row Online with a fresh
  // Last seen (same online-detection fields as the heartbeat).
  doc["ESP32S3 Status"] = "Online";
  doc["ESP32S3 Last seen"] = sampledAt;

  doc["INA219 Voltage"] = nonNeg(batt_V);
  doc["INA219 Voltage Percentage"] = pctSafe;
  doc["INA219 Load Battery status"] = battery_status;
  doc["INA219 Load battery time remaining"] = timeRem;
  doc["INA219 Solar Side input"] = nonNeg(solar_W);
  doc["INA219 Solar Side timer"] = solar_timer;
  doc["INA219 Solar Side voltage"] = nonNeg(solar_V);
  doc["INA219 Solar Side current"] = nonNeg(solar_A);
  doc["INA219 Load Side total energy"] = eOut;
  doc["INA219 Solar Side solar status"] = solar_status;
  doc["INA219 Load Side battery load"] = nonNeg(load_now_W);
  doc["INA219 Load Side dod_status"] = dod_status;
  if (!isnan(solar_temp)) doc["DS18B20 2 Solar Temp"] = solar_temp;
  else doc["DS18B20 2 Solar Temp"] = nullptr;
  doc["DS18B20 2 Solar Temp Status"] = solar_temp_status;
  if (!isnan(interior_temp) && interior_temp >= 0.0f && interior_temp <= 50.0f)
    doc["DHT22 Interior Temp"] = interior_temp;
  else doc["DHT22 Interior Temp"] = nullptr;
  doc["DHT22 Interior Temp Status"] = interior_temp_status;
  doc["INA219 Load Side battery watt_hour"] = whSafe;
  doc["cumulative_energy_input_wh"] = eIn;
  doc["cumulative_energy_output_wh"] = eOut;
  doc["ESP32S3 Sampled at"] = sampledAt;
  // heartbeat_expires_at is set by the table trigger; never sent from here.

  String payload;
  serializeJson(doc, payload);

  Serial.println("[Supabase] Sending monitoring data...");
  int httpCode = -1;
  if (supabasePatch(payload, MONITORING_HTTP_TIMEOUT_MS, &httpCode)) {
    Serial.printf("[Supabase] Monitoring data updated. HTTP %d\n", httpCode);
    // The PATCH carried Status=Online + Last seen, so it counts as a heartbeat.
    lastSuccessfulHeartbeatMs = millis();
    heartbeatHasSucceeded = true;
    supabaseOnline = true;
  } else {
    Serial.printf("[Supabase] Monitoring upload failed. HTTP %d\n", httpCode);
  }
}

// =====================================================================
// 15. SERIAL COMMANDS
// =====================================================================

void handleSerialCommands() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd.equalsIgnoreCase("FULL")) {
    total_Ah = TOTAL_BANK_AH;
    saveStateToFlash();
    Serial.println("BATTERY SOC SET TO 100%");
  }
  else if (cmd.equalsIgnoreCase("SYNCV")) {
    uint16_t rawBus = 0;
    if (battINA219Connected &&
        readUnsigned16(batteryINA219Addr, REG219_BUS_VOLT, rawBus)) {
      float voltage = ((rawBus >> 3) * 0.004) * BATT_VOLT_CAL;
      total_Ah = (estimateSoCFromRestedVoltage(voltage) / 100.0) *
                 TOTAL_BANK_AH;
      saveStateToFlash();
      Serial.println("BATTERY SOC SYNCHRONIZED");
    } else {
      Serial.println("INA219 NOT AVAILABLE");
    }
  }
  else if (cmd.equalsIgnoreCase("STATUS")) {
    printConnectionDiagnostics();
  }
  else if (cmd.equalsIgnoreCase("COMPSTAT")) {
    printComponentStatuses();
  }
  else if (cmd.equalsIgnoreCase("RECONNECT")) {
    if (hasSavedConfig) {
      WiFi.disconnect(false, false);
      WiFi.begin(configuredSSID.c_str(), configuredPassword.c_str());
      lastWiFiRetry = millis();
      Serial.println("Wi-Fi reconnect requested.");
    } else {
      Serial.println("No saved config. Provision through the app first.");
    }
  }
#if defined(AW_ALLOW_SERIAL_RESETCONFIG) && AW_ALLOW_SERIAL_RESETCONFIG
  else if (cmd.equalsIgnoreCase("RESETCONFIG")) {
    Serial.println("WARNING: erasing saved Wi-Fi and monitor assignment.");
    awClearSavedConfig();
    heartbeatHasSucceeded = false;
    supabaseOnline = false;
  }
#endif
  else if (cmd.equalsIgnoreCase("SYNCTIME")) {
    Serial.println("Forcing NTP time sync...");
    lastNtpAttemptMs = 0;
  }
  else if (cmd.equalsIgnoreCase("RESETWH")) {
    cumulative_energy_input_wh = 0.0;
    cumulative_energy_output_wh = 0.0;
    solarActiveSeconds = 0;
    saveStateToFlash();
    Serial.println("ENERGY COUNTERS RESET");
  }
  else if (cmd.length() > 0) {
    Serial.print("Commands: FULL, SYNCV, STATUS, COMPSTAT, RECONNECT");
#if defined(AW_ALLOW_SERIAL_RESETCONFIG) && AW_ALLOW_SERIAL_RESETCONFIG
    Serial.print(", RESETCONFIG");
#endif
    Serial.println(", SYNCTIME, RESETWH");
  }
}

// =====================================================================
// 16. SETUP
// =====================================================================

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("ADLAWATT INTEGRATED MONITORING FIRMWARE");
  Serial.println("ESP32-S3 INITIALIZATION");
  Serial.println("Provisioning: BLE (AdlaWatt-AW-01)");
  Serial.println("========================================");

  for (int i = 0; i < 11; i++) {
    solarTempHistory[i] = NAN;
    interiorTempHistory[i] = NAN;
  }

  rtcMutex = xSemaphoreCreateMutex();
  httpMutex = xSemaphoreCreateMutex();
  uiDataMutex = xSemaphoreCreateMutex();

  if (rtcMutex == nullptr || httpMutex == nullptr || uiDataMutex == nullptr) {
    Serial.println("[FATAL] Failed to create required mutex.");
  }

  initFanRelay();

  // Load NVS configuration and reconnect while the most heap is free.
  Serial.printf("[Heap] free before BLE: %u bytes\n", ESP.getFreeHeap());
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  awProvisioningSetup();

  if (awIsDeviceLocked()) {
    awStopBLE();
    Serial.println("[Prov] Device is bound; BLE provisioning disabled.");
  } else {
    awSetupBLE();
  }
  lastDeviceCommandPollMs = millis();
  Serial.printf("[Heap] free after BLE : %u bytes\n", ESP.getFreeHeap());

  // TFT + SD SPI bus + button
  uiInitHardware();

  // RTC on independent I2C bus.
  initializeRTC();

  // INA219 on primary I2C bus.
  pinMode(SDA_PIN, INPUT_PULLUP);
  pinMode(SCL_PIN, INPUT_PULLUP);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(50000);
  Serial.println("[I2C] INA219 bus initialized.");

  dht.begin();
  sensorSolarTemp.begin();
  Serial.println("[Sensors] DHT22 and DS18B20 initialized.");

  detectI2CSensors();
  Serial.print("[Battery] INA219: ");
  Serial.println(battINA219Connected ? "CONNECTED" : "NOT FOUND");

  prefs.begin("zenova_v2", false);
  total_Ah = prefs.getDouble("tot_Ah", -1.0);
  cumulative_energy_input_wh = prefs.getDouble("in_Wh", 0.0);
  cumulative_energy_output_wh = prefs.getDouble("out_Wh", 0.0);
  solarActiveSeconds = prefs.getULong("sol_sec", 0);

  if (total_Ah < 0.0 || total_Ah > TOTAL_BANK_AH) {
    uint16_t rawBus = 0;
    if (battINA219Connected &&
        readUnsigned16(batteryINA219Addr, REG219_BUS_VOLT, rawBus)) {
      float initV = ((rawBus >> 3) * 0.004) * BATT_VOLT_CAL;
      float initSoC = estimateSoCFromRestedVoltage(initV);
      total_Ah = (initSoC / 100.0) * TOTAL_BANK_AH;
      saveStateToFlash();
    } else {
      total_Ah = 44.4;
    }
  }

  lastSampleTime = millis();
  lastSaveTime = millis();
  lastHistSampleTime = millis();

  BaseType_t taskCreated = xTaskCreate(
    heartbeatTask,
    "SupabaseHeartbeat",
    8192,
    nullptr,
    1,
    &heartbeatTaskHandle
  );

  if (taskCreated == pdPASS) {
    Serial.println("[Heartbeat] Independent 2-second task started (1-second retry on failure).");
  } else {
    Serial.println("[FATAL] Heartbeat task creation failed.");
  }

  // Display task: plays the welcome animation, then shows the dashboard.
  // It runs independently so the screen never waits on sensors or Wi-Fi.
  BaseType_t displayCreated = xTaskCreate(
    displayTask,
    "TFTDisplay",
    12288,
    nullptr,
    1,
    &displayTaskHandle
  );

  if (displayCreated == pdPASS) {
    Serial.println("[Display] Display task started.");
  } else {
    Serial.println("[FATAL] Display task creation failed.");
  }

  Serial.println("========================================");
  Serial.println("SYSTEM READY");
  Serial.println("========================================");
}

// =====================================================================
// 17. MAIN LOOP
// =====================================================================

void loop() {
  handleSerialCommands();

  awProvisioningLoop();      // BLE payloads, Wi-Fi retry, wifi_lost notices

  if (awIsDeviceLocked() && WiFi.status() == WL_CONNECTED &&
      !provisioningInProgress &&
      (lastDeviceCommandPollMs == 0 ||
       millis() - lastDeviceCommandPollMs >= DEVICE_COMMAND_POLL_INTERVAL_MS)) {
    lastDeviceCommandPollMs = millis();
    awPollDeviceCommand();
  }

  updateConnectionState();
  checkSDCard();

  // Keep the RTC accurate: retry every 30 s until the first NTP success,
  // then re-sync every 6 hours.
  {
    unsigned long ntpInterval = ntpEverSynced ? 21600000UL : 30000UL;
    if (WiFi.status() == WL_CONNECTED && !provisioningInProgress &&
        (lastNtpAttemptMs == 0 || millis() - lastNtpAttemptMs >= ntpInterval)) {
      lastNtpAttemptMs = millis();
      if (syncRtcFromNtp()) ntpEverSynced = true;
    }
  }

  unsigned long now = millis();
  double elapsedSec = (now - lastSampleTime) / 1000.0;
  double elapsedHours = elapsedSec / 3600.0;
  lastSampleTime = now;

  // -------------------------------------------------------------------
  // 1. TEMPERATURE SENSORS
  // -------------------------------------------------------------------

  solarTempPresent = (sensorSolarTemp.getDeviceCount() > 0);
  solarTempConnected = solarTempPresent;
  float solar_temp = 0.0;

  if (solarTempConnected) {
    sensorSolarTemp.requestTemperatures();
    float t = sensorSolarTemp.getTempCByIndex(0);

    if (t == DEVICE_DISCONNECTED_C || t <= -55.0 || t >= 125.0) {
      solarTempConnected = false;
    } else {
      solar_temp = t;
    }
  }

  float rawInterior = dht.readTemperature();
  interiorTempConnected =
    (!isnan(rawInterior) && rawInterior >= 0.0 && rawInterior <= 50.0);
  float interior_temp = interiorTempConnected ? rawInterior : 0.0;

  // Humidity comes from the same DHT22 (library caches the 2 s reading).
  float rawHumidity = dht.readHumidity();
  humidityValid =
    (!isnan(rawHumidity) && rawHumidity >= 0.0 && rawHumidity <= 100.0);

  // Fan control: needs a valid DHT22 reading (temperature AND humidity).
  updateFans(interior_temp, interiorTempConnected && humidityValid);

  if (now - lastHistSampleTime >= HISTORY_SAMPLE_INTERVAL_MS) {
    solarTempHistory[histIndex] = solarTempConnected ? solar_temp : NAN;
    interiorTempHistory[histIndex] =
      interiorTempConnected ? interior_temp : NAN;

    histIndex = (histIndex + 1) % 11;
    if (histIndex == 0) histFilled = true;
    lastHistSampleTime = now;
  }

  float oldSolar10m = histFilled ? solarTempHistory[histIndex] : NAN;
  float oldInterior10m = histFilled ? interiorTempHistory[histIndex] : NAN;

  String solar_temp_status =
    getSolarTempStatus(solar_temp, oldSolar10m, solarTempConnected);
  String interior_temp_status =
    getInteriorTempStatus(interior_temp, oldInterior10m,
                          interiorTempConnected);

  // -------------------------------------------------------------------
  // 2. INA219 BATTERY MONITORING
  // -------------------------------------------------------------------

  uint16_t bRawBus = 0;
  int16_t bRawShunt = 0;
  bool battReadOk = false;

  if (battINA219Connected) {
    battReadOk =
      readUnsigned16(batteryINA219Addr, REG219_BUS_VOLT, bRawBus) &&
      readSigned16(batteryINA219Addr, REG219_SHUNT_VOLT, bRawShunt);
  }

  if (!battReadOk) {
    detectI2CSensors();
    if (battINA219Connected) {
      battReadOk =
        readUnsigned16(batteryINA219Addr, REG219_BUS_VOLT, bRawBus) &&
        readSigned16(batteryINA219Addr, REG219_SHUNT_VOLT, bRawShunt);
    }
  }
  battReadOkGlobal = battReadOk;

  float batt_V = 0.0;
  float batt_A = 0.0;
  float load_now_W = 0.0;
  String battery_status = "Reading Error";

  if (battReadOk) {
    batt_V = ((bRawBus >> 3) * 0.004) * BATT_VOLT_CAL;
    float battShunt_mV = bRawShunt * 0.01;
    batt_A = ((battShunt_mV / 1000.0) / BATT_SHUNT_OHMS) *
             BATT_CURR_CAL;

    if (fabs(batt_A) < BATT_DEADBAND_A) batt_A = 0.0;

    if (batt_A > 0.0) {
      battery_status = "Charging";
      total_Ah += (batt_A * CHARGE_EFFICIENCY) * elapsedHours;
    } else if (batt_A < 0.0) {
      battery_status = "Discharging";
      load_now_W = fabs(batt_V * batt_A);
      total_Ah += batt_A * elapsedHours;
      cumulative_energy_output_wh += load_now_W * elapsedHours;
    } else {
      battery_status = "Idle";
    }

    total_Ah = constrain(total_Ah, 0.0, (double)TOTAL_BANK_AH);

    if (batt_V >= FULL_CHARGE_VOLTS &&
        batt_A > 0.0 && batt_A <= TAIL_CURRENT_AMPS) {
      total_Ah = TOTAL_BANK_AH;
    }

    if (batt_V <= LOW_CUTOFF_VOLTS &&
        batt_V > 5.0 && batt_A < 0.0 &&
        total_Ah > RESERVE_AH) {
      total_Ah = RESERVE_AH;
    }
  }

  // -------------------------------------------------------------------
  // 3. SOLAR MONITORING (BATTERY-BASED ESTIMATE)
  // -------------------------------------------------------------------

  float solar_V = 0.0;
  float solar_A = 0.0;
  float solar_W = 0.0;
  bool solarActive = false;

  // Positive INA219 current means battery charging. This is an estimate,
  // not a direct measurement of solar-panel electrical output.
  if (battReadOk && batt_A > 0.0) {
    solarActive = true;
    solar_V = batt_V;
    solar_A = batt_A;
    solar_W = batt_V * batt_A;
  }

  if (solarActive && solar_W > 1.0) {
    cumulative_energy_input_wh += solar_W * elapsedHours;
    solarActiveSeconds += (unsigned long)round(elapsedSec);
  }

  // -------------------------------------------------------------------
  // 4. BATTERY CALCULATIONS
  // -------------------------------------------------------------------

  float raw_bank_soc = battReadOk
    ? ((total_Ah / TOTAL_BANK_AH) * 100.0)
    : 0.0;

  double usable_Ah = battReadOk
    ? fmax(0.0, total_Ah - RESERVE_AH)
    : 0.0;

  int usable_pct_int = battReadOk
    ? constrain((int)round((usable_Ah / USABLE_CAPACITY_AH) * 100.0),
                0, 100)
    : 0;

  int total_wh_int = battReadOk
    ? max(0, (int)round((total_Ah / TOTAL_BANK_AH) * TOTAL_BANK_WH))
    : 0;

  int usable_wh_int = battReadOk
    ? max(0, (int)round(
        (usable_Ah / USABLE_CAPACITY_AH) * (TOTAL_BANK_WH * 0.80)))
    : 0;

  String dod_status = (raw_bank_soc > 20.0) ? "Safe" : "Unsafe";

  String time_remaining = battReadOk
    ? formatTimeRemaining(usable_wh_int, load_now_W, battery_status)
    : "0h 00m";

  String solar_status = getSolarStatus(solar_W);
  String solar_timer = formatInterval(solarActiveSeconds);

  String detected_appliance = battReadOk
    ? estimateAppliance(load_now_W)
    : "INA219 Not Connected";

  // -------------------------------------------------------------------
  // 4b. PUBLISH LIVE READINGS TO THE TFT DASHBOARD
  // -------------------------------------------------------------------

  {
    DisplayData dd;

    dd.battValid = battReadOk;
    dd.solarV = solar_V;
    dd.solarW = solar_W;
    dd.usablePct = usable_pct_int;
    dd.usableWh = usable_wh_int;
    dd.loadW = load_now_W;
    dd.solarWhTotal = (float)cumulative_energy_input_wh;
    dd.loadWhTotal  = (float)cumulative_energy_output_wh;
    dd.solarPct = constrain((int)round(solar_W / SOLAR_RATED_W * 100.0f), 0, 100);
    dd.loadPct  = constrain((int)round(load_now_W / LOAD_RATED_W * 100.0f), 0, 100);
    strlcpy(dd.battStatus, battery_status.c_str(), sizeof(dd.battStatus));

    dd.outValid = solarTempConnected;
    dd.outTemp = solar_temp;
    dd.outSev = uiSeverity(solar_temp_status);

    dd.inValid = interiorTempConnected;
    dd.inTemp = interior_temp;
    dd.inSev = uiSeverity(interior_temp_status);

    dd.humValid = humidityValid;
    dd.hum = rawHumidity;

    uiPublish(dd);
  }

  // -------------------------------------------------------------------
  // 5. SERIAL MONITOR OUTPUT
  // -------------------------------------------------------------------

  Serial.println("====================================================");
  Serial.println("                 BATTERY SIDE");
  Serial.println("====================================================");

  if (battReadOk) {
    Serial.printf("Usable Battery %%   : %d %% (Bank SoC: %.1f%%)\n",
                  usable_pct_int, raw_bank_soc);
    Serial.printf("Time Remaining     : %s\n", time_remaining.c_str());
    Serial.printf("Battery Status     : %s\n", battery_status.c_str());
    Serial.printf("DoD Status         : %s\n", dod_status.c_str());
    Serial.printf("Voltage            : %.2f V\n", batt_V);
    Serial.printf("Remaining Energy   : %d / 720 Wh (Usable: %d Wh)\n",
                  total_wh_int, usable_wh_int);
    Serial.printf("Load Now           : %.2f W\n", load_now_W);
    Serial.printf("Total Energy Used  : %.3f Wh\n",
                  cumulative_energy_output_wh);
    Serial.printf("Appliance Estimate : %s\n", detected_appliance.c_str());
  } else {
    Serial.println("INA219 Sensor      : NOT CONNECTED");
  }

  if (interiorTempConnected) {
    Serial.printf("Interior Temp      : %.2f C (%s)\n",
                  interior_temp, interior_temp_status.c_str());
  } else {
    Serial.println("Interior Temp      : NOT CONNECTED");
  }

  Serial.printf("Cooling Fans       : %s\n", fansOn ? "ON" : "OFF");

  if (humidityValid) {
    Serial.printf("Interior Humidity  : %.1f %%\n", rawHumidity);
  } else {
    Serial.println("Interior Humidity  : NOT CONNECTED");
  }

  Serial.println("====================================================");
  Serial.println("                   SOLAR SIDE");
  Serial.println("====================================================");

  if (battReadOk) {
    Serial.printf("Solar Input Estimate: %.2f W\n", solar_W);
    Serial.printf("Solar Timer        : %s\n", solar_timer.c_str());
    Serial.printf("Solar Status       : %s\n", solar_status.c_str());
    Serial.printf("Battery Voltage    : %.2f V\n", solar_V);
    Serial.printf("Charging Current   : %.2f A\n", solar_A);
    Serial.printf("Estimated Solar Energy: %.3f Wh\n",
                  cumulative_energy_input_wh);
  } else {
    Serial.println("Solar Estimate     : NOT AVAILABLE");
  }

  if (solarTempConnected) {
    Serial.printf("Solar Temp         : %.2f C (%s)\n",
                  solar_temp, solar_temp_status.c_str());
  } else {
    Serial.println("Solar Temp         : NOT CONNECTED");
  }

  Serial.println("====================================================");

  // -------------------------------------------------------------------
  // 6. SAVE DATA TO FLASH EVERY FIVE MINUTES
  // -------------------------------------------------------------------

  if (now - lastSaveTime >= SAVE_INTERVAL_MS) {
    saveStateToFlash();
    lastSaveTime = now;
    Serial.println("[Flash] Data saved to ESP32 flash memory.");
  }

  // -------------------------------------------------------------------
  // 7. SUPABASE SENSOR DATA PATCH EVERY TEN SECONDS
  // -------------------------------------------------------------------

  if (now - lastSupabaseUploadTime >= SUPABASE_UPLOAD_INTERVAL_MS) {
    lastSupabaseUploadTime = now;

    if (activeMonitorId == 0) {
      Serial.println("[Supabase] Upload skipped: not provisioned (no monitor_id).");
    } else if (provisioningInProgress) {
      Serial.println("[Supabase] Sensor upload skipped: provisioning in progress.");
    } else if (WiFi.status() == WL_CONNECTED) {
      String sampledAt = getTimestampISO8601();

      sendMonitoringData(
        batt_V,
        usable_pct_int,
        battery_status,
        time_remaining,
        solar_W,
        solar_timer,
        solar_V,
        solar_A,
        cumulative_energy_output_wh,
        solar_status,
        load_now_W,
        dod_status,
        solarTempConnected ? solar_temp : NAN,          // NULL -> app shows "Sensor fault"
        solar_temp_status,
        interiorTempConnected ? interior_temp : NAN,    // NULL -> app shows "Sensor fault"
        interior_temp_status,
        total_wh_int,
        cumulative_energy_input_wh,
        sampledAt
      );
    } else {
      Serial.println("[Supabase] Sensor upload skipped: Wi-Fi disconnected.");
    }
  }

  if (now - lastComponentStatusReportMs >= COMPONENT_STATUS_INTERVAL_MS) {
    lastComponentStatusReportMs = now;

    if (activeMonitorId == 0) {
      Serial.println("[Components] Status report skipped: not provisioned.");
    } else if (provisioningInProgress) {
      Serial.println("[Components] Status report skipped: provisioning in progress.");
    } else if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[Components] Status report skipped: Wi-Fi disconnected.");
    } else {
      reportAllComponentStatuses();
    }
  }

  if (millis() - lastDiagnosticsMs >= 5000) {
    lastDiagnosticsMs = millis();
    printConnectionDiagnostics();
  }

  delay(1000);
}
