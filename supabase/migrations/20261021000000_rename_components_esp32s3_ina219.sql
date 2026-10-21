-- Rename hardware components: ESP32 -> ESP32-S3, Voltage Sensor -> INA219.
--
-- Context: the unit board is an ESP32-S3, and the old "Voltage
-- Sensor" row is now an INA219 (solar + load voltage/current
-- monitor). The app maps both the old and the new names to the
-- same pictures (see src/app/dashboard/components.tsx), so the
-- rename is cosmetic for the UI -- but it keeps the rows, the
-- notification texts, and the hardware docs in sync with the
-- real hardware.
--
-- Idempotent: running it twice changes nothing the second
-- time. Runs as the table owner (dashboard SQL editor), so it
-- covers every user's rows in one pass. The app's RLS policy
-- (user_id = auth.uid()) is unaffected by a rename.
--
-- Required before the app shows the new names: the app only
-- knows "INA219" (the old "Voltage Sensor" key was removed),
-- so a row that still carries the old name would fall back to
-- the generic placeholder picture. The board is matched by
-- both "ESP32" and "ESP32-S3" in the app, so only the image
-- label depends on this running.
--
-- Not touched: component_id, status, created_at, and any
-- monitoring rows that reference the hardware by id.

update public.components
set component_name = 'ESP32-S3'
where component_name = 'ESP32';

update public.components
set component_name = 'INA219'
where component_name = 'Voltage Sensor';
