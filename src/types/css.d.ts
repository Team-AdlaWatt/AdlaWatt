// CSS module shim — standard React + TypeScript practice.
//
// Allows web-only side-effect imports (`import "@/global.css"`)
// to typecheck under `npx tsc --noEmit` (CI `verify` job).
// Native OTA bundles never execute CSS; the canonical web entry
// is guarded by `Platform.OS === "web"` in `src/app/_layout.tsx`.
declare module "*.css";
