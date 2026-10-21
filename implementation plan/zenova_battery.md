# Stable Battery Percentage Design

## Overview

Smartphones do not calculate battery percentage from instantaneous voltage alone. They combine charge-flow measurement, voltage checks, filtering, and user-interface rules so the percentage does not jump whenever a load starts, stops, or charging begins.

For the **ZENOVA 12 V 30 Ah parallel battery bank**, retain the calibrated voltage sensor as a live-voltage reference and safety backup. Once INA228 monitoring is integrated, use INA228 current, power, and energy measurements as the **primary source** for stable SoC estimation.

Voltage-only SoC remains approximate because terminal voltage changes with load, charging, temperature, age, and internal resistance.

---

## Why Voltage Changes

Terminal voltage follows the relation:

```
V_terminal = V_OCV - (I × R_internal)
```

| Term       | Meaning                                                         |
|------------|-----------------------------------------------------------------|
| V_terminal | Live voltage measured by the ESP32 or multimeter                |
| V_OCV      | Rested/open-circuit voltage, more closely related to stored charge |
| I          | Current entering or leaving the battery                         |
| R_internal | Battery internal resistance                                     |

- When an inverter or electronics item turns on, current rises and voltage temporarily drops — this is **voltage sag**.
- When the load stops, terminal voltage **rebounds**.
- During charging, terminal voltage rises above its rested value.

Therefore, directly mapping every live voltage sample to a percentage creates **unstable SoC readings**. Rested-voltage methods are most useful when the battery has little/no current flow and enough time to relax.

---

## Measurement Hierarchy

| Priority | Source                    | Main purpose                                                        |
|----------|---------------------------|---------------------------------------------------------------------|
| 1        | INA228 output monitor     | Measure current/power/energy leaving the battery                    |
| 2        | INA228 input monitor      | Measure current/power/energy entering the battery                   |
| 3        | Voltage sensor GPIO 34    | Live terminal voltage, low-voltage checks, connection detection, backup/reference |
| 4        | DS18B20 battery sensor    | Temperature safety and SoC confidence context                       |
| 5        | Rested voltage            | Occasional correction of SoC after stable low-current conditions    |

Use voltage for immediate voltage monitoring and safety logic, but **do not** let short voltage sag/recovery immediately change the displayed battery percentage.

---

## Battery Bank Reference

| Item                                | Value                                   |
|-------------------------------------|-----------------------------------------|
| Battery model                       | ZENOVA 12 V 30 Ah lithium battery       |
| Battery quantity                    | 2                                       |
| Configuration                       | Parallel                                |
| Bank voltage                        | 12.6 V nominal                          |
| Bank capacity                       | 60 Ah                                   |
| Nominal stored energy               | 756 Wh                                  |
| Usable energy target                | 604.8 Wh (80%)                          |
| Energy reserve                      | 151.2 Wh (20%)                          |
| Maximum preferred DoD               | 80%                                     |
| Minimum preferred SoC               | 20%                                     |
| Label operating-voltage range       | 8.4 – 12.6 V                            |
| Label charge-voltage limit          | 12.6 V                                  |
| Current limit on label              | Below 10 A                              |
| Battery temperature sensor          | DS18B20 on GPIO 4                       |
| Voltage-sensor input                | GPIO 34 / ADC1                          |

### Energy calculations

```
12.6 V × 60 Ah = 756 Wh (nominal)
756 Wh × 0.80 = 604.8 Wh (usable)
756 Wh × 0.20 = 151.2 Wh (reserve)
```

---

## SoC and DoD Definitions

| Term              | Formula                     | Meaning                                                        |
|-------------------|-----------------------------|----------------------------------------------------------------|
| SoC               | —                           | Percentage of estimated energy remaining                      |
| DoD               | —                           | Percentage of capacity already used                           |
| Remaining energy  | (SoC / 100) × 756 Wh        | Estimated watt-hours still stored                             |
| Used energy       | (DoD / 100) × 756 Wh        | Estimated watt-hours removed                                  |

**Do not** redefine 20% SoC as 0%. Show the actual SoC and separately identify whether the DoD safety limit has been reached.

---

## ESP32 Voltage Monitoring

| Setting                 | Configuration                                              |
|-------------------------|------------------------------------------------------------|
| ESP32 board             | ESP32-WROOM-32                                             |
| Analog input            | GPIO 34 / ADC1                                             |
| Sensor                  | 0–25 V analog voltage-divider module                       |
| ADC sample count        | 50                                                         |
| Sampling interval       | 20 ms                                                      |
| Averaging window        | 1 second                                                   |
| Reading method          | analogReadMilliVolts()                                     |
| ADC attenuation         | ADC_11db                                                   |
| Existing tested multiplier | ~4.96                                                  |

### Circuit note

Place a **0.1 µF capacitor** between the voltage-sensor output and common ground near GPIO 34 to reduce high-frequency noise.

- Do **not** connect battery voltage directly to GPIO 34.
- Use `analogReadMilliVolts()` and appropriate attenuation — ESP32 ADC calibration is attenuation-dependent and raw ADC readings are not perfectly linear.

```
0–25 V voltage-divider sensor → S/OUT → ESP32 GPIO 34
                                 | 
                          0.1 µF capacitor → GND
```

---

## Voltage Calibration

### Current one-point calibration (already tested)

| Source                    | Value            |
|---------------------------|------------------|
| Multimeter                | 12.03 V          |
| ESP32 sensor after calibration | 12.04 V     |
| Difference                | +0.01 V          |
| Selected calibration multiplier | 4.96        |

```cpp
const float CAL_SLOPE = 4.96;
const float CAL_OFFSET = 0.0;
```

### Two-point calibration (recommended for full-range accuracy)

1. Measure a stable lower-voltage point, ideally around **11.6 – 12.0 V**.
   - Record: multimeter battery-terminal voltage and filtered ESP32 sensor reading.
2. Measure a stable higher-voltage point, ideally around **12.4 – 12.6 V**.
3. Compute:

```
CAL_SLOPE  = (V_mm_high - V_mm_low) / (V_sensor_high - V_sensor_low)
CAL_OFFSET = V_mm_low - (CAL_SLOPE × V_sensor_low)
```

4. Apply:

```
V_battery = (V_sensor × CAL_SLOPE) + CAL_OFFSET
```

Keep the actual hardware resistor/module values truthful. Apply calibration through `CAL_SLOPE` and `CAL_OFFSET`, **not** by changing resistor values in software.

---

## Stable SoC Strategy

### 1. Initial SoC (at startup)

- Start ADC, INA228, and temperature sensors.
- If the battery was continuously connected and a reliable saved energy state exists → restore it.
- If it was physically disconnected or replaced → use a stable rested-voltage estimate.
- Label voltage-only SoC as an estimate until INA228 energy tracking becomes valid.
- Do **not** initialize from a generic 3S table when a project-specific ZENOVA lookup table exists.

### 2. Coulomb / Energy Counting

Once INA228 data is available, update SoC from measured charge/discharge flow:

```
ΔAh = I × Δt_hours

SoC_new = SoC_old + ((Ah_charged - Ah_discharged) / 60 Ah) × 100
```

Or use energy directly:

```
E_remaining = 756 Wh + E_charged - E_discharged
SoC = 100 × (E_remaining / 756 Wh)
```

- Clamp the estimate to **0 – 100%**.
- Use measured input/output energy first.
- Add charge or inverter efficiency factors only after validating them with real system measurements.

### 3. Rested-Voltage Correction

Apply only a small correction toward the voltage-table estimate when **all** conditions are true:

- Battery current magnitude is very low.
- No meaningful solar charging is active.
- No meaningful electronics/inverter load is active.
- Voltage has been stable for roughly **10 – 30 minutes**.
- Battery temperature is Normal or Moderate.

**Do not** hard-reset SoC from voltage while charging, under load, or immediately after load/charger removal. Voltage relaxation can create a temporary rise/fall without a matching large energy change.

---

## Display Rules

Maintain **three distinct values**:

| Variable      | Meaning                                   | Update rule                                     |
|---------------|-------------------------------------------|-------------------------------------------------|
| liveVoltage   | Actual calibrated battery terminal voltage | Updates continuously from ADC average           |
| estimatedSoC  | Internal energy-based SoC estimate        | Updated by INA228 current/energy flow           |
| displayedSoC  | User-facing percentage                    | Changes slowly and predictably                  |

Rules:

- During discharge, displayed SoC may remain unchanged or decrease gradually.
- During charging, displayed SoC may increase **only** when INA228 confirms charging current.
- Voltage rebound after a load stops must **not** make displayed SoC jump upward.
- Voltage sag during a heavy load must **not** create a large immediate SoC drop.
- Limit displayed percentage movement to about **1% every 30 – 60 seconds**.
- Allow voltage-table correction only after confirmed rest/stability.
- BMS cutoff, low-voltage protection, sensor failure, high temperature, or dangerous states override normal display behavior.
- The dashboard battery voltage display is clamped to the table range **9.000 – 12.600 V**. When the raw live voltage reads **≤ 10.65 V** (20% SoC / 80% DoD cutoff), the voltage text turns **red** to flag that the preferred DoD limit has been reached.

---

## Disconnect and Reconnect

### On disconnection

- Stop energy integration.
- Set active monitoring state to **Disconnected**.
- Mark active voltage/SoC unavailable according to dashboard/database design.
- Keep the previous SoC only as historical information.
- Do **not** continue reporting old SoC as a live state.

### On reconnection

1. Clear old ADC/filter samples.
2. Fill the averaging buffer with fresh ADC readings.
3. Wait about **2 – 5 seconds** for voltage stabilization.
4. Reinitialize voltage filters using the fresh voltage.
5. Confirm INA228/device communication.
6. Restore saved SoC **only** when the same battery stayed continuously connected.
7. Otherwise initialize a provisional voltage-based estimate after rest.
8. Resume energy tracking once valid INA228 readings are available.

Do **not** apply a universal 30-second SoC lock. Keep live voltage visible, label SoC as estimated while resolving state, and resume current/energy tracking as soon as valid measurements are available.

---

## Provisional 1% SoC Table

Provides 1% display steps from 100% to 0% for the 756 Wh bank.

> **Remaining Wh = 756 × (SoC / 100)**
>
> The voltage column is a **provisional rested-voltage estimate**. It is not a factory-verified ZENOVA curve and must be replaced by values from a controlled discharge test of the actual battery bank.

### 100% – 70%

| SoC | DoD | Remaining energy | Rested voltage | Status |
|-----|-----|------------------|----------------|--------|
| 100% | 0%  | 756.0 Wh         | 12.600 V       | Fully charged; charge-complete reference |
| 99%  | 1%  | 748.4 Wh         | 12.570 V       | Near full; upper charge region |
| 98%  | 2%  | 740.9 Wh         | 12.540 V       | Near full; upper charge region |
| 97%  | 3%  | 733.3 Wh         | 12.510 V       | Near full; upper charge region |
| 96%  | 4%  | 725.8 Wh         | 12.480 V       | Near full; upper charge region |
| 95%  | 5%  | 718.2 Wh         | 12.450 V       | Very high charge; normal use |
| 94%  | 6%  | 710.6 Wh         | 12.420 V       | Very high charge; normal use |
| 93%  | 7%  | 703.1 Wh         | 12.390 V       | Very high charge; normal use |
| 92%  | 8%  | 695.5 Wh         | 12.360 V       | Very high charge; normal use |
| 91%  | 9%  | 688.0 Wh         | 12.330 V       | Very high charge; normal use |
| 90%  | 10% | 680.4 Wh         | 12.300 V       | High charge; normal use |
| 89%  | 11% | 672.8 Wh         | 12.270 V       | High charge; normal use |
| 88%  | 12% | 665.3 Wh         | 12.240 V       | High charge; normal use |
| 87%  | 13% | 657.7 Wh         | 12.210 V       | High charge; normal use |
| 86%  | 14% | 650.2 Wh         | 12.180 V       | High charge; normal use |
| 85%  | 15% | 642.6 Wh         | 12.150 V       | High charge; normal use |
| 84%  | 16% | 635.0 Wh         | 12.120 V       | High charge; normal use |
| 83%  | 17% | 627.5 Wh         | 12.090 V       | High charge; normal use |
| 82%  | 18% | 619.9 Wh         | 12.060 V       | High charge; normal use |
| 81%  | 19% | 612.4 Wh         | 12.030 V       | High charge; normal use |
| 80%  | 20% | 604.8 Wh         | 12.000 V       | Normal operating range |
| 79%  | 21% | 597.2 Wh         | 11.970 V       | Normal operating range |
| 78%  | 22% | 589.7 Wh         | 11.940 V       | Normal operating range |
| 77%  | 23% | 582.1 Wh         | 11.910 V       | Normal operating range |
| 76%  | 24% | 574.6 Wh         | 11.880 V       | Normal operating range |
| 75%  | 25% | 567.0 Wh         | 11.850 V       | Normal operating range |
| 74%  | 26% | 559.4 Wh         | 11.820 V       | Normal operating range |
| 73%  | 27% | 551.9 Wh         | 11.790 V       | Normal operating range |
| 72%  | 28% | 544.3 Wh         | 11.760 V       | Normal operating range |
| 71%  | 29% | 536.8 Wh         | 11.730 V       | Normal operating range |
| 70%  | 30% | 529.2 Wh         | 11.700 V       | Normal operating range |

### 69% – 40%

| SoC | DoD | Remaining energy | Rested voltage | Status |
|-----|-----|------------------|----------------|--------|
| 69% | 31% | 521.6 Wh         | 11.670 V       | Normal operating range |
| 68% | 32% | 514.1 Wh         | 11.640 V       | Normal operating range |
| 67% | 33% | 506.5 Wh         | 11.610 V       | Normal operating range |
| 66% | 34% | 499.0 Wh         | 11.580 V       | Normal operating range |
| 65% | 35% | 491.4 Wh         | 11.550 V       | Normal operating range |
| 64% | 36% | 483.8 Wh         | 11.520 V       | Normal operating range |
| 63% | 37% | 476.3 Wh         | 11.490 V       | Normal operating range |
| 62% | 38% | 468.7 Wh         | 11.460 V       | Normal operating range |
| 61% | 39% | 461.2 Wh         | 11.430 V       | Normal operating range |
| 60% | 40% | 453.6 Wh         | 11.400 V       | Normal operating range |
| 59% | 41% | 446.0 Wh         | 11.386 V       | Normal operating range |
| 58% | 42% | 438.5 Wh         | 11.372 V       | Normal operating range |
| 57% | 43% | 430.9 Wh         | 11.358 V       | Normal operating range |
| 56% | 44% | 423.4 Wh         | 11.344 V       | Normal operating range |
| 55% | 45% | 415.8 Wh         | 11.330 V       | Normal operating range |
| 54% | 46% | 408.2 Wh         | 11.314 V       | Normal operating range |
| 53% | 47% | 400.7 Wh         | 11.298 V       | Normal operating range |
| 52% | 48% | 393.1 Wh         | 11.282 V       | Normal operating range |
| 51% | 49% | 385.6 Wh         | 11.266 V       | Normal operating range |
| 50% | 50% | 378.0 Wh         | 11.250 V       | Half capacity remaining; plan charging |
| 49% | 51% | 370.4 Wh         | 11.236 V       | Below half; plan charging |
| 48% | 52% | 362.9 Wh         | 11.222 V       | Below half; plan charging |
| 47% | 53% | 355.3 Wh         | 11.208 V       | Below half; plan charging |
| 46% | 54% | 347.8 Wh         | 11.194 V       | Below half; plan charging |
| 45% | 55% | 340.2 Wh         | 11.180 V       | Below half; plan charging |
| 44% | 56% | 332.6 Wh         | 11.164 V       | Below half; plan charging |
| 43% | 57% | 325.1 Wh         | 11.148 V       | Below half; plan charging |
| 42% | 58% | 317.5 Wh         | 11.132 V       | Below half; plan charging |
| 41% | 59% | 310.0 Wh         | 11.116 V       | Below half; plan charging |
| 40% | 60% | 302.4 Wh         | 11.100 V       | Moderate energy remaining; plan charging |
| 39% | 61% | 294.8 Wh         | 11.086 V       | Moderate energy remaining; plan charging |

### 38% – 10%

| SoC | DoD | Remaining energy | Rested voltage | Status |
|-----|-----|------------------|----------------|--------|
| 38% | 62% | 287.3 Wh         | 11.072 V       | Moderate energy remaining; plan charging |
| 37% | 63% | 279.7 Wh         | 11.058 V       | Moderate energy remaining; plan charging |
| 36% | 64% | 272.2 Wh         | 11.044 V       | Moderate energy remaining; plan charging |
| 35% | 65% | 264.6 Wh         | 11.030 V       | Moderate energy remaining; plan charging |
| 34% | 66% | 257.0 Wh         | 11.014 V       | Moderate energy remaining; plan charging |
| 33% | 67% | 249.5 Wh         | 10.998 V       | Moderate energy remaining; plan charging |
| 32% | 68% | 241.9 Wh         | 10.982 V       | Moderate energy remaining; plan charging |
| 31% | 69% | 234.4 Wh         | 10.966 V       | Moderate energy remaining; plan charging |
| 30% | 70% | 226.8 Wh         | 10.950 V       | Low battery; reduce nonessential load |
| 29% | 71% | 219.2 Wh         | 10.920 V       | Low battery; prepare charging |
| 28% | 72% | 211.7 Wh         | 10.890 V       | Low battery; prepare charging |
| 27% | 73% | 204.1 Wh         | 10.860 V       | Low battery; prepare charging |
| 26% | 74% | 196.6 Wh         | 10.830 V       | Low battery; prepare charging |
| 25% | 75% | 189.0 Wh         | 10.800 V       | Low battery; charge soon |
| 24% | 76% | 181.4 Wh         | 10.770 V       | Low battery; charge soon |
| 23% | 77% | 173.9 Wh         | 10.740 V       | Low battery; charge soon |
| 22% | 78% | 166.3 Wh         | 10.710 V       | Low battery; charge soon |
| 21% | 79% | 158.8 Wh         | 10.680 V       | Low battery; approaching safe cutoff |
| 20% | 80% | 151.2 Wh         | 10.650 V       | 80% DoD reached; recommended normal-use cutoff |
| 19% | 81% | 143.6 Wh         | 10.606 V       | Emergency reserve; recharge immediately |
| 18% | 82% | 136.1 Wh         | 10.562 V       | Emergency reserve; recharge immediately |
| 17% | 83% | 128.5 Wh         | 10.518 V       | Emergency reserve; recharge immediately |
| 16% | 84% | 121.0 Wh         | 10.474 V       | Critical reserve; stop nonessential loads |
| 15% | 85% | 113.4 Wh         | 10.430 V       | Critical reserve; recharge now |
| 14% | 86% | 105.8 Wh         | 10.384 V       | Critical reserve; recharge now |
| 13% | 87% | 98.3 Wh          | 10.338 V       | Critical reserve; recharge now |
| 12% | 88% | 90.7 Wh          | 10.292 V       | Critical reserve; recharge now |
| 11% | 89% | 83.2 Wh          | 10.246 V       | Very low; avoid continued operation |
| 10% | 90% | 75.6 Wh          | 10.200 V       | Very low; stop load and recharge |

### 9% – 0%

| SoC | DoD | Remaining energy | Rested voltage | Status |
|-----|-----|------------------|----------------|--------|
| 9%  | 91% | 68.0 Wh          | 10.080 V       | — |
| 8%  | 92% | 60.5 Wh          | 9.960 V        | Very low; stop load and recharge |
| 7%  | 93% | 52.9 Wh          | 9.840 V        | Deep-discharge region; recharge immediately |
| 6%  | 94% | 45.4 Wh          | 9.720 V        | Deep-discharge region; recharge immediately |
| 5%  | 95% | 37.8 Wh          | 9.600 V        | Near empty; avoid use |
| 4%  | 96% | 30.2 Wh          | 9.480 V        | Near empty; BMS cutoff may occur |
| 3%  | 97% | 22.7 Wh          | 9.360 V        | Near empty; stop all loads |
| 2%  | 98% | 15.1 Wh          | 9.240 V        | Near empty; stop all loads |
| 1%  | 99% | 7.6 Wh           | 9.120 V        | Essentially empty; recharge immediately |
| 0%  | 100% | 0.0 Wh          | 9.000 V        | Empty estimate; BMS may disconnect |

---

## Table Usage Rules

- Use this table only after the battery is resting with little/no load or charging.
- Call the result **"Voltage-Based SoC Estimate"** — do not call the voltage values factory verified or exact.
- Use the **INA228 energy count** as the primary long-term SoC source.
- Use live voltage mainly for monitoring, voltage safety, and connection detection.
- Use **20% SoC / 151.2 Wh / 80% DoD** as the preferred normal-use cutoff.
- Treat the **8.4 V** label boundary as an absolute low limit, not a daily operating target.

---

## Errors to Avoid

- Do not rely on raw voltage-only SoC during active charging or inverter use.
- Do not use a generic 3S voltage table as a confirmed ZENOVA curve.
- Do not use only a Kalman voltage filter and claim exact SoC.
- Do not freeze SoC permanently at the boot-time value.
- Do not allow SoC to rise merely because voltage rebounds; INA228 must confirm charging.
- Do not calculate ADC voltage from raw counts and a fixed 3.3 V assumption when calibration is available.
- Do not use 14.6 V LiFePO4 thresholds for a battery labeled with a 12.6 V charge limit.
- Do not rely on cloud/software alarms as the only safety layer.

---

## Hardware Safety Requirements

Battery BMS, correct **12.6 V Li-ion charger**, suitable fuses, properly rated wiring, and a DC-rated disconnect/protection device remain essential.

---

## References

1. https://ui.adsabs.harvard.edu/abs/2025TINAE..10..235D/abstract
2. https://ijecbe.ui.ac.id/go/article/download/99/58
3. https://pmc.ncbi.nlm.nih.gov/articles/PMC12639891/
4. https://www.powertechsystems.eu/tech-corner/lithium-ion-state-of-charge-soc-measurement/
5. https://www.sciencedirect.com/science/article/pii/S0378775326010888
6. https://docs.espressif.com/projects/esp-idf/en/v4.2-beta1/esp32/api-reference/peripherals/adc.html
7. https://docs.espressif.com/projects/esp-idf/en/v5.0/esp32/api-reference/peripherals/adc_calibration.html
8. https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/adc/adc_calibration.html
9. https://developer.espressif.com/blog/2025/08/adc-performance/
10. https://docs.espressif.com/projects/esp-idf/en/v4.4.2/esp32c3/api-reference/peripherals/adc.html