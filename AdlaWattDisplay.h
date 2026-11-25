#pragma once

#include <Arduino.h>
#include <math.h>
#include <string.h>
#include <LovyanGFX.hpp>
#include <SPI.h>
#include <SD.h>

#include "AdlaWattLogo.h"
#include "AdlaWattQRCode.h"

// =====================================================================
// PINS
// =====================================================================

#define TFT_CS    41
#define TFT_RST   40
#define TFT_DC    42
#define TFT_MOSI  1
#define TFT_SCK   2

#define BOOT_BUTTON_PIN 0

#define SD_CS    35
#define SD_MOSI  36
#define SD_MISO  37
#define SD_SCK   14

static SPIClass sdSPI(HSPI);

// =====================================================================
// DISPLAY DRIVER (your working ILI9488 configuration)
// =====================================================================

class LGFX : public lgfx::LGFX_Device {

  lgfx::Bus_SPI bus;
  lgfx::Panel_ILI9488 panel;

public:

  LGFX() {

    auto b = bus.config();

    b.spi_host = SPI2_HOST;
    b.spi_mode = 0;
    b.freq_write = 10000000;
    b.freq_read = 10000000;
    b.spi_3wire = true;
    b.use_lock = true;
    b.dma_channel = SPI_DMA_CH_AUTO;

    b.pin_sclk = TFT_SCK;
    b.pin_mosi = TFT_MOSI;
    b.pin_miso = -1;
    b.pin_dc = TFT_DC;

    bus.config(b);

    auto p = panel.config();

    p.pin_cs = TFT_CS;
    p.pin_rst = TFT_RST;
    p.pin_busy = -1;

    p.memory_width = 320;
    p.memory_height = 480;

    p.panel_width = 320;
    p.panel_height = 480;

    p.offset_x = 0;
    p.offset_y = 0;

    p.invert = false;
    p.rgb_order = false;
    p.dlen_16bit = false;

    panel.config(p);

    panel.setBus(&bus);
    setPanel(&panel);
  }
};

static LGFX tft;

// =====================================================================
// COLORS
// =====================================================================

#define RGB565(r, g, b) ((uint16_t)((((r) & 0xF8) << 8) | (((g) & 0xFC) << 3) | ((b) >> 3)))

#define UI_WHITE   0xFFFF
#define UI_BLACK   0x0000
#define UI_BG      RGB565(14, 38, 120)
#define UI_PANEL   RGB565(22, 60, 156)
#define UI_BORDER  RGB565(80, 160, 255)
#define UI_DIM     RGB565(170, 200, 255)
#define UI_CYAN    RGB565(70, 240, 220)
#define UI_GREEN   RGB565(70, 230, 120)
#define UI_YELLOW  RGB565(255, 215, 60)
#define UI_ORANGE  RGB565(255, 140, 40)
#define UI_RED     RGB565(255, 80, 80)

// =====================================================================
// SHARED DATA (written by loop(), read by displayTask)
// =====================================================================

struct DisplayData {
  bool battValid = false;
  float battNetA = 0;
  bool solarValid = false;
  float solarV = 0;
  float solarA = 0;
  bool solarActive = false;
  float solarW = 0;
  int usablePct = 0;
  int usableWh = 0;
  bool inverterValid = false;
  float inverterV = 0;
  float inverterA = 0;
  bool inverterActive = false;
  float loadW = 0;
  float solarWhTotal = 0;
  float loadWhTotal = 0;
  int solarPct = 0;
  int loadPct = 0;
  char battStatus[24] = "--";
  bool outValid = false;
  float outTemp = 0;
  uint8_t outSev = 0;
  bool inValid = false;
  float inTemp = 0;
  uint8_t inSev = 0;
  bool humValid = false;
  float hum = 0;
};

static DisplayData uiShared;
static SemaphoreHandle_t uiDataMutex = nullptr;
static TaskHandle_t displayTaskHandle = nullptr;

enum UiScreen {
  UI_WELCOME = 0,
  UI_DASHBOARD = 1,
  UI_QR = 2
};

static UiScreen uiScreen = UI_WELCOME;
static bool uiInterruptAttached = false;
static uint32_t uiWelcomeStartMs = 0;

#define AdlaWattLogo_WIDTH 320
#define AdlaWattLogo_HEIGHT 144

static void uiButtonISR() {
  static TickType_t lastTick = 0;
  TickType_t now = xTaskGetTickCountFromISR();
  if (now - lastTick < pdMS_TO_TICKS(120)) return;
  lastTick = now;

  BaseType_t wake = pdFALSE;
  if (displayTaskHandle != nullptr) {
    xTaskNotifyFromISR(displayTaskHandle, 1, eIncrement, &wake);
  }
  if (wake == pdTRUE) portYIELD_FROM_ISR();
}

static void uiPublish(const DisplayData& d) {
  if (uiDataMutex == nullptr) return;
  if (xSemaphoreTake(uiDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    uiShared = d;
    xSemaphoreGive(uiDataMutex);
  }
}

// Temperature status text -> 0 nominal, 1 elevated, 2 high, 3 critical
static uint8_t uiSeverity(const String& status) {
  if (status.startsWith("Nominal"))  return 0;
  if (status.startsWith("Elevated")) return 1;
  if (status.startsWith("High"))     return 2;
  return 3;
}

static uint8_t uiSeverity(const char* status) {
  return uiSeverity(String(status));
}

static uint16_t uiSevColor(uint8_t sev) {
  switch (sev) {
    case 0:  return UI_CYAN;
    case 1:  return UI_YELLOW;
    case 2:  return UI_ORANGE;
    default: return UI_RED;
  }
}

// =====================================================================
// SD CARD (called from loop())
// =====================================================================

volatile bool sdMounted = false;
static unsigned long lastSDCheck = 0;
static unsigned long lastSDRetry = 0;
static const unsigned long SD_CHECK_INTERVAL = 2000;
static const unsigned long SD_RETRY_INTERVAL = 3000;

static void checkSDCard() {

  unsigned long now = millis();
  if (now - lastSDCheck < SD_CHECK_INTERVAL) return;
  lastSDCheck = now;

  if (sdMounted) {
    if (SD.cardType() == CARD_NONE) {
      Serial.println("[SD] Card removed.");
      SD.end();
      sdMounted = false;
    }
  }

  if (!sdMounted && now - lastSDRetry >= SD_RETRY_INTERVAL) {

    lastSDRetry = now;

    if (SD.begin(SD_CS, sdSPI, 10000000)) {
      if (SD.cardType() != CARD_NONE) {
        sdMounted = true;
        Serial.printf("[SD] Card detected: %llu MB\n",
                      SD.cardSize() / (1024ULL * 1024ULL));
      } else {
        SD.end();
      }
    }
  }
}

// =====================================================================
// RTC HELPER (shares the mutex with the heartbeat task)
// =====================================================================

static bool uiGetRtc(DateTime& out) {
  if (!rtcAvailable) return false;

  if (rtcMutex != nullptr &&
      xSemaphoreTake(rtcMutex, pdMS_TO_TICKS(50)) != pdTRUE) {
    return false;
  }

  out = rtc.now();

  if (rtcMutex != nullptr) xSemaphoreGive(rtcMutex);
  return true;
}

// =====================================================================
// LAYOUT (480 x 320)
// =====================================================================

static const int SCREEN_W = 480;
static const int SCREEN_H = 320;

// Main row (three panels)
static const int MAIN_Y = 64,  MAIN_H = 150;
static const int PL_X = 8,   PL_W = 140;   // solar
static const int PM_X = 156, PM_W = 168;   // battery
static const int PR_X = 332, PR_W = 140;   // load

// Bottom row (three boxes)
static const int BOT_Y = 222, BOT_H = 90;
static const int B1_X = 8,   B2_X = 166,  B3_X = 324,  B_W = 148;

// Centre x of each panel
static const int CX_L = PL_X + PL_W / 2;   // 78
static const int CX_M = PM_X + PM_W / 2;   // 240
static const int CX_R = PR_X + PR_W / 2;   // 402

// =====================================================================
// DRAWING HELPERS
// =====================================================================

enum {
  F_TIME, F_DATE, F_STATUS, F_SD,
  F_SOLV, F_SOLP, F_SOLBAR, F_SOLPCT, F_SOLWH, F_LWH,
  F_PCT, F_BAR, F_BSTAT, F_BNETA, F_AVAIL,
  F_LOAD, F_LBAR, F_LTXT, F_LCUR,
  F_OUT, F_IN, F_HUM,
  F_COUNT
};

static char uiCache[F_COUNT][48];

static void uiInvalidate() { memset(uiCache, 0, sizeof(uiCache)); }

static bool uiChanged(int id, const char* key) {
  if (strcmp(uiCache[id], key) == 0) return false;
  strlcpy(uiCache[id], key, sizeof(uiCache[id]));
  return true;
}

static void uiPanel(int x, int y, int w, int h) {
  tft.fillRoundRect(x, y, w, h, 10, UI_PANEL);
  tft.drawRoundRect(x, y, w, h, 10, UI_BORDER);
}

static void uiLabel(const char* s, int cx, int y, uint16_t col, uint16_t bg) {
  tft.setFont(&fonts::FreeSans9pt7b);
  tft.setTextColor(col, bg);
  tft.setTextDatum(textdatum_t::top_center);
  tft.drawString(s, cx, y);
}

// Big number + small unit, centred on cx. The region is cleared first.
static void uiValue(int rx, int ry, int rw, int rh,
                    int cx, int ty,
                    const char* val, const char* unit, bool degree,
                    const lgfx::IFont* big, const lgfx::IFont* small,
                    uint16_t col, uint16_t bg) {

  tft.fillRect(rx, ry, rw, rh, bg);

  tft.setFont(big);
  int wb = tft.textWidth(val);
  int hb = tft.fontHeight();

  tft.setFont(small);
  int wu = tft.textWidth(unit);
  int hu = tft.fontHeight();

  int gap = unit[0] ? 5 : 0;
  int dg  = degree ? 9 : 0;
  int total = wb + gap + dg + wu;
  int x = cx - total / 2;

  tft.setTextDatum(textdatum_t::top_left);

  tft.setFont(big);
  tft.setTextColor(col, bg);
  tft.drawString(val, x, ty);

  if (unit[0]) {
    int ux = x + wb + gap;
    if (degree) {
      tft.drawCircle(ux + 3, ty + hb / 4, 3, col);
      ux += dg;
    }
    tft.setFont(small);
    tft.setTextColor(col, bg);
    tft.drawString(unit, ux, ty + hb - hu - 6);
  }
}

static void uiBolt(int x, int y, uint16_t col) {
  tft.fillTriangle(x + 9, y, x + 1, y + 13, x + 8, y + 13, col);
  tft.fillTriangle(x + 6, y + 11, x + 14, y + 11, x + 4, y + 25, col);
}

static void uiBattBar(int pct, uint16_t col) {
  const int x = 182, y = 134, w = 114, h = 20;
  tft.fillRect(x - 4, y - 3, w + 16, h + 6, UI_PANEL);
  tft.drawRoundRect(x, y, w, h, 4, UI_WHITE);
  tft.fillRect(x + w, y + 5, 5, h - 10, UI_WHITE);
  int fw = (w - 4) * pct / 100;
  if (fw > 0) tft.fillRoundRect(x + 2, y + 2, fw, h - 4, 2, col);
}

// Generic horizontal percentage bar (cleared first).
static void uiPctBar(int x, int y, int w, int h, int pct, uint16_t col) {
  tft.fillRect(x - 3, y - 3, w + 6, h + 6, UI_PANEL);
  tft.drawRoundRect(x, y, w, h, 5, UI_DIM);
  int fw = (w - 4) * constrain(pct, 0, 100) / 100;
  if (fw > 0) tft.fillRoundRect(x + 2, y + 2, fw, h - 4, 3, col);
}

// Wh below 1000, kWh above.
static void uiFormatEnergy(char* out, size_t n, const char* prefix, float wh) {
  if (wh < 1000.0f) snprintf(out, n, "%s%.1f Wh", prefix, wh);
  else              snprintf(out, n, "%s%.2f kWh", prefix, wh / 1000.0f);
}

static void uiDrawWelcome() {
  tft.fillScreen(UI_BG);
  tft.fillRoundRect(56, 70, 368, 220, 10, UI_WHITE);
  tft.drawRoundRect(56, 70, 368, 220, 10, UI_BORDER);
  tft.pushImage(80, 104, AdlaWattLogo_WIDTH, AdlaWattLogo_HEIGHT, AdlaWattLogo);
}

static void uiDrawDashboardStatic() {

  tft.fillScreen(UI_BG);

  // Header
  tft.setFont(&fonts::FreeSansBold12pt7b);
  tft.setTextColor(UI_WHITE, UI_BG);
  tft.setTextDatum(textdatum_t::top_left);
  tft.drawString("ADLAWATT", 12, 6);
  tft.drawFastHLine(8, 59, 464, UI_BORDER);

  // Main row panels
  uiPanel(PL_X, MAIN_Y, PL_W, MAIN_H);
  uiPanel(PM_X, MAIN_Y, PM_W, MAIN_H);
  uiPanel(PR_X, MAIN_Y, PR_W, MAIN_H);

  uiLabel("SOLAR",      CX_L, MAIN_Y + 4,   UI_DIM, UI_PANEL);

  uiLabel("BATTERY",    CX_M, MAIN_Y + 4,   UI_DIM, UI_PANEL);

  uiLabel("INVERTER",   CX_R, MAIN_Y + 4,   UI_DIM, UI_PANEL);

  // Bottom row boxes
  uiPanel(B1_X, BOT_Y, B_W, BOT_H);
  uiPanel(B2_X, BOT_Y, B_W, BOT_H);
  uiPanel(B3_X, BOT_Y, B_W, BOT_H);

  uiLabel("OUTSIDE TEMP",    B1_X + B_W / 2, BOT_Y + 4, UI_DIM, UI_PANEL);
  uiLabel("INSIDE TEMP",     B2_X + B_W / 2, BOT_Y + 4, UI_DIM, UI_PANEL);
  uiLabel("INSIDE HUMIDITY", B3_X + B_W / 2, BOT_Y + 4, UI_DIM, UI_PANEL);

  uiInvalidate();
}

// =====================================================================
// DASHBOARD (live values, redrawn only when they change)
// =====================================================================

static void uiUpdateDashboard() {

  DisplayData d;
  if (uiDataMutex == nullptr ||
      xSemaphoreTake(uiDataMutex, pdMS_TO_TICKS(20)) != pdTRUE) {
    return;
  }
  d = uiShared;
  xSemaphoreGive(uiDataMutex);

  char buf[40];
  char key[64];

  const lgfx::IFont* f9   = &fonts::FreeSans9pt7b;
  const lgfx::IFont* f12b = &fonts::FreeSansBold12pt7b;
  const lgfx::IFont* f18b = &fonts::FreeSansBold18pt7b;
  const lgfx::IFont* f24b = &fonts::FreeSansBold24pt7b;

  // ---------------- HEADER: time, date ----------------
  DateTime now;
  bool haveTime = uiGetRtc(now);

  if (haveTime) {
    int h12 = now.hour() % 12;
    if (h12 == 0) h12 = 12;
    snprintf(buf, sizeof(buf), "%d:%02d:%02d", h12, now.minute(), now.second());
    const char* ap = (now.hour() >= 12) ? "PM" : "AM";
    snprintf(key, sizeof(key), "%s%s", buf, ap);
    if (uiChanged(F_TIME, key)) {
      uiValue(160, 4, 150, 31, 235, 4, buf, ap, false, f12b, f9, UI_WHITE, UI_BG);
    }

    static const char* DAYS[]   = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};
    static const char* MONTHS[] = {"Jan","Feb","Mar","Apr","May","Jun",
                                   "Jul","Aug","Sep","Oct","Nov","Dec"};
    snprintf(buf, sizeof(buf), "%s, %d %s %d",
             DAYS[now.dayOfTheWeek() % 7], now.day(),
             MONTHS[(now.month() - 1) % 12], now.year());
    if (uiChanged(F_DATE, buf)) {
      tft.fillRect(150, 34, 170, 23, UI_BG);
      uiLabel(buf, 235, 34, UI_DIM, UI_BG);
    }
  } else {
    if (uiChanged(F_TIME, "--")) {
      uiValue(160, 4, 150, 31, 235, 4, "--:--:--", "", false, f12b, f9, UI_DIM, UI_BG);
    }
    if (uiChanged(F_DATE, "--")) {
      tft.fillRect(150, 34, 170, 23, UI_BG);
      uiLabel("RTC not found", 235, 34, UI_DIM, UI_BG);
    }
  }

  // ---------------- HEADER: online status ----------------
  bool online = (WiFi.status() == WL_CONNECTED) && supabaseOnline;
  if (uiChanged(F_STATUS, online ? "on" : "off")) {
    tft.fillRect(330, 4, 144, 52, UI_BG);

    tft.setFont(f12b);
    tft.setTextColor(UI_WHITE, UI_BG);
    tft.setTextDatum(textdatum_t::top_right);
    const char* st = online ? "Online" : "Offline";
    tft.drawString(st, 472, 6);

    int tw = tft.textWidth(st);
    tft.fillCircle(472 - tw - 12, 20, 6, online ? UI_GREEN : UI_RED);

    tft.setFont(f9);
    tft.setTextColor(UI_DIM, UI_BG);
    tft.drawString(online ? "cloud synced" : "using local storage", 472, 34);
  }

  // ---------------- HEADER: SD card ----------------
  bool sd = sdMounted;
  if (uiChanged(F_SD, sd ? "sd1" : "sd0")) {
    tft.fillRect(10, 34, 100, 23, UI_BG);
    tft.setFont(f9);
    tft.setTextColor(sd ? UI_GREEN : UI_YELLOW, UI_BG);
    tft.setTextDatum(textdatum_t::top_left);
    tft.drawString(sd ? "SD OK" : "NO SD", 12, 34);
  }

  // ---------------- SOLAR ----------------
  // power, activity, % of rated power, output voltage/current, energy
  if (d.solarValid) snprintf(buf, sizeof(buf), "%.0f", d.solarW);
  else              strcpy(buf, "--");
  if (uiChanged(F_SOLP, buf)) {
    uiValue(12, MAIN_Y + 24, 132, 42, CX_L, MAIN_Y + 24,
            buf, d.solarValid ? "W" : "", false, f18b, f12b, UI_WHITE, UI_PANEL);
  }

  int solPct = d.solarValid ? constrain(d.solarPct, 0, 100) : 0;
  snprintf(key, sizeof(key), "%d", solPct);
  if (uiChanged(F_SOLBAR, key)) {
    uiPctBar(16, MAIN_Y + 70, 124, 12, solPct, UI_YELLOW);
  }

  if (d.solarValid) snprintf(buf, sizeof(buf), "%s %d%%",
                             d.solarActive ? "ACTIVE" : "IDLE", solPct);
  else              strcpy(buf, "--");
  if (uiChanged(F_SOLPCT, buf)) {
    tft.fillRect(12, MAIN_Y + 86, 132, 20, UI_PANEL);
    uiLabel(buf, CX_L, MAIN_Y + 86,
            d.solarActive ? UI_GREEN : UI_DIM, UI_PANEL);
  }

  if (d.solarValid) snprintf(buf, sizeof(buf), "%.1f V  %.1f A",
                             d.solarV, d.solarA);
  else              strcpy(buf, "-- V  -- A");
  if (uiChanged(F_SOLV, buf)) {
    tft.fillRect(12, MAIN_Y + 106, 132, 20, UI_PANEL);
    uiLabel(buf, CX_L, MAIN_Y + 106, UI_DIM, UI_PANEL);
  }

  uiFormatEnergy(buf, sizeof(buf), "Got ", d.solarWhTotal);
  if (uiChanged(F_SOLWH, buf)) {
    tft.fillRect(12, MAIN_Y + 126, 132, 20, UI_PANEL);
    uiLabel(buf, CX_L, MAIN_Y + 126, UI_YELLOW, UI_PANEL);
  }

  // ---------------- BATTERY ----------------
  int pct = constrain(d.usablePct, 0, 100);
  uint16_t battCol = (pct > 40) ? UI_CYAN : (pct > 20 ? UI_YELLOW : UI_RED);

  if (d.battValid) snprintf(buf, sizeof(buf), "%d", pct);
  else             strcpy(buf, "--");
  if (uiChanged(F_PCT, buf)) {
    uiValue(160, MAIN_Y + 22, 160, 46, CX_M, MAIN_Y + 22,
            buf, d.battValid ? "%" : "", false, f18b, f12b, battCol, UI_PANEL);
  }

  snprintf(key, sizeof(key), "%d|%d", d.battValid ? pct : -1, (int)battCol);
  if (uiChanged(F_BAR, key)) {
    uiBattBar(d.battValid ? pct : 0, battCol);
  }

  // status text (+ bolt when charging)
  snprintf(key, sizeof(key), "%s|%d", d.battStatus, d.battValid);
  if (uiChanged(F_BSTAT, key)) {
    tft.fillRect(160, MAIN_Y + 88, 160, 22, UI_PANEL);

    bool charging = (strcmp(d.battStatus, "Charging") == 0);
    uint16_t sc = UI_DIM;
    if (charging)                                   sc = UI_CYAN;
    else if (strcmp(d.battStatus, "Discharging") == 0) sc = UI_ORANGE;
    else if (strcmp(d.battStatus, "Cycle") == 0)        sc = UI_GREEN;
    else if (strcmp(d.battStatus, "Reading Error") == 0) sc = UI_RED;

    tft.setFont(f12b);
    int tw = tft.textWidth(d.battStatus);
    int total = tw + (charging ? 20 : 0);
    int x = CX_M - total / 2;

    if (charging) {
      uiBolt(x, MAIN_Y + 89, sc);
      x += 20;
    }
    tft.setTextColor(sc, UI_PANEL);
    tft.setTextDatum(textdatum_t::top_left);
    tft.drawString(d.battStatus, x, MAIN_Y + 88);
  }

  if (d.battValid) snprintf(buf, sizeof(buf), "Net %+.1f A", d.battNetA);
  else             strcpy(buf, "Net -- A");
  if (uiChanged(F_BNETA, buf)) {
    tft.fillRect(160, MAIN_Y + 108, 160, 18, UI_PANEL);
    uiLabel(buf, CX_M, MAIN_Y + 108, UI_DIM, UI_PANEL);
  }

  if (d.battValid) snprintf(buf, sizeof(buf), "Available %d Wh", d.usableWh);
  else             strcpy(buf, "Available --");
  if (uiChanged(F_AVAIL, buf)) {
    tft.fillRect(160, MAIN_Y + 128, 160, 18, UI_PANEL);
    uiLabel(buf, CX_M, MAIN_Y + 128, UI_WHITE, UI_PANEL);
  }

  // ---------------- INVERTER ----------------
  // power, activity, % of rated power, DC voltage/current, energy
  if (d.inverterValid) snprintf(buf, sizeof(buf), "%.0f", d.loadW);
  else                 strcpy(buf, "--");
  if (uiChanged(F_LOAD, buf)) {
    uiValue(336, MAIN_Y + 24, 132, 42, CX_R, MAIN_Y + 24,
            buf, d.inverterValid ? "W" : "", false, f18b, f12b, UI_CYAN, UI_PANEL);
  }

  int loadPct = d.inverterValid ? constrain(d.loadPct, 0, 100) : 0;
  uint16_t loadCol = (loadPct < 50) ? UI_CYAN : (loadPct < 80 ? UI_YELLOW : UI_RED);

  snprintf(key, sizeof(key), "%d|%d", loadPct, (int)loadCol);
  if (uiChanged(F_LBAR, key)) {
    uiPctBar(346, MAIN_Y + 70, 112, 12, loadPct, loadCol);
  }

  if (d.inverterValid) snprintf(buf, sizeof(buf), "%s %d%%",
                                d.inverterActive ? "ACTIVE" : "IDLE", loadPct);
  else                 strcpy(buf, "--");
  if (uiChanged(F_LTXT, buf)) {
    tft.fillRect(336, MAIN_Y + 86, 132, 20, UI_PANEL);
    uiLabel(buf, CX_R, MAIN_Y + 86,
            d.inverterActive ? UI_GREEN : UI_DIM, UI_PANEL);
  }

  if (d.inverterValid) snprintf(buf, sizeof(buf), "%.1f V  %.1f A",
                                d.inverterV, d.inverterA);
  else                 strcpy(buf, "-- V  -- A");
  if (uiChanged(F_LCUR, buf)) {
    tft.fillRect(336, MAIN_Y + 106, 132, 20, UI_PANEL);
    uiLabel(buf, CX_R, MAIN_Y + 106, UI_DIM, UI_PANEL);
  }

  uiFormatEnergy(buf, sizeof(buf), "Used ", d.loadWhTotal);
  if (uiChanged(F_LWH, buf)) {
    tft.fillRect(336, MAIN_Y + 126, 132, 20, UI_PANEL);
    uiLabel(buf, CX_R, MAIN_Y + 126, UI_CYAN, UI_PANEL);
  }

  // ---------------- BOTTOM ROW ----------------
  // Outside temperature (DS18B20)
  if (d.outValid) snprintf(buf, sizeof(buf), "%.1f", d.outTemp);
  else            strcpy(buf, "--");
  snprintf(key, sizeof(key), "%s|%d", buf, d.outSev);
  if (uiChanged(F_OUT, key)) {
    uiValue(B1_X + 4, BOT_Y + 26, B_W - 8, 60, B1_X + B_W / 2, BOT_Y + 28,
            buf, d.outValid ? "C" : "", d.outValid, f24b, f12b,
            d.outValid ? uiSevColor(d.outSev) : UI_DIM, UI_PANEL);
  }

  // Inside temperature (DHT22)
  if (d.inValid) snprintf(buf, sizeof(buf), "%.1f", d.inTemp);
  else           strcpy(buf, "--");
  snprintf(key, sizeof(key), "%s|%d", buf, d.inSev);
  if (uiChanged(F_IN, key)) {
    uiValue(B2_X + 4, BOT_Y + 26, B_W - 8, 60, B2_X + B_W / 2, BOT_Y + 28,
            buf, d.inValid ? "C" : "", d.inValid, f24b, f12b,
            d.inValid ? uiSevColor(d.inSev) : UI_DIM, UI_PANEL);
  }

  // Inside humidity (DHT22)
  if (d.humValid) snprintf(buf, sizeof(buf), "%.0f", d.hum);
  else            strcpy(buf, "--");
  if (uiChanged(F_HUM, buf)) {
    uiValue(B3_X + 4, BOT_Y + 26, B_W - 8, 60, B3_X + B_W / 2, BOT_Y + 28,
            buf, d.humValid ? "%" : "", false, f24b, f12b,
            d.humValid ? UI_CYAN : UI_DIM, UI_PANEL);
  }
}

// =====================================================================
// QR SCREEN
// =====================================================================

static void uiDrawQRScreen() {

  tft.fillScreen(UI_WHITE);

  tft.setFont(&fonts::FreeSansBold12pt7b);
  tft.setTextColor(UI_BLACK, UI_WHITE);
  tft.setTextDatum(textdatum_t::top_center);
  tft.drawString("SCAN QR CODE", SCREEN_W / 2, 6);

  // Draw the RGB565 QR bitmap directly
  const int qrX = (SCREEN_W - AdlaWattQR_WIDTH) / 2;
  const int qrY = 40;

  tft.pushImage(
    qrX,
    qrY,
    AdlaWattQR_WIDTH,
    AdlaWattQR_HEIGHT,
    AdlaWattQR
  );

  tft.setFont(&fonts::FreeSans9pt7b);
  tft.setTextColor(UI_BLACK, UI_WHITE);
  tft.drawString("Press the button to return", SCREEN_W / 2, 290);
}

// =====================================================================
// INIT + TASK
// =====================================================================

static void uiInitHardware() {
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  tft.init();
  tft.setRotation(1);
  tft.fillScreen(UI_BG);

  sdSPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  checkSDCard();

  Serial.println("[Display] ILI9488 initialized.");
}

// =====================================================================
// DISPLAY TASK
// =====================================================================

void displayTask(void* parameter) {
  displayTaskHandle = xTaskGetCurrentTaskHandle();
  if (!uiInterruptAttached) {
    attachInterrupt(digitalPinToInterrupt(BOOT_BUTTON_PIN), uiButtonISR, FALLING);
    uiInterruptAttached = true;
  }

  uiScreen = UI_WELCOME;
  uiWelcomeStartMs = millis();
  uiDrawWelcome();

  for (;;) {
    uint32_t presses = 0;
    if (xTaskNotifyWait(0, 0xFFFFFFFF, &presses, pdMS_TO_TICKS(20)) == pdTRUE) {
      while (presses > 0) {
        presses--;
        if (uiScreen == UI_WELCOME) {
          uiScreen = UI_DASHBOARD;
          uiDrawDashboardStatic();
        } else if (uiScreen == UI_DASHBOARD) {
          uiScreen = UI_QR;
          uiDrawQRScreen();
        } else {
          uiScreen = UI_DASHBOARD;
          uiDrawDashboardStatic();
        }
      }
    }

    if (uiScreen == UI_WELCOME && millis() - uiWelcomeStartMs >= 1500) {
      uiScreen = UI_DASHBOARD;
      uiDrawDashboardStatic();
    }

    if (uiScreen == UI_DASHBOARD) {
      uiUpdateDashboard();
    }

    vTaskDelay(pdMS_TO_TICKS(100));
  }
}
