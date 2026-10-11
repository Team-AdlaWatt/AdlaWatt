// Jest config: jest-expo preset (RN-safe transform via the
// repo's babel-preset-expo) plus the same @/ alias mapping as
// babel.config.js and tsconfig paths.
module.exports = {
  preset: "jest-expo",

  setupFiles: [
    "<rootDir>/jest.setup.js",
  ],

  moduleNameMapper: {
    // Must come before "@": maps @/assets/* -> assets/*
    // (mirrors babel module-resolver + tsconfig paths).
    "^@/assets/(.+)$":
      "<rootDir>/assets/$1",
    // Web-only CSS stub: prevents Jest from parsing .css
    // side-effect imports (see src/app/_layout.tsx).
    "\\.css$": "<rootDir>/jest/__mocks__/styleMock.js",
    "^@/(.+)$":
      "<rootDir>/src/$1",
  },

  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx,js}",
  ],

  // Inform-only coverage for now: informs without blocking
  // thesis-week velocity. No thresholds until the suite is
  // stable and green in CI.
  collectCoverage: false,
};
