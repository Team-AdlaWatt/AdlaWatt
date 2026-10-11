// Jest CSS stub — mirrors CRA / Expo web practice.
//
// Prevents `npx jest --ci` from trying to parse `.css` side-effect
// imports (e.g. the web-guarded `require("@/global.css")`).
module.exports = {};
