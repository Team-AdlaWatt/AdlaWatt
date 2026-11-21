const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/* ============================================================
   ASSET CONFIGURATION
   ============================================================ */

config.resolver.assetExts.push("wasm");

/* ============================================================
   JSPDF RESOLUTION
   ============================================================ */

/*
 * Metro may resolve "jspdf" to jsPDF's Node build.
 * The Node build contains Node-specific requires such as
 * html2canvas and is not appropriate for the Expo/React Native
 * bundle.
 *
 * Force Metro to use jsPDF's ES module build instead.
 */
const jsPdfEsModulePath = require.resolve(
  "jspdf/dist/jspdf.es.min.js",
);

const originalResolveRequest =
  config.resolver.resolveRequest;

config.resolver.resolveRequest = (
  context,
  moduleName,
  platform,
) => {
  if (
    moduleName === "jspdf" &&
    platform !== "node"
  ) {
    return {
      type: "sourceFile",
      filePath: jsPdfEsModulePath,
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(
      context,
      moduleName,
      platform,
    );
  }

  return context.resolveRequest(
    context,
    moduleName,
    platform,
  );
};

/* ============================================================
   DEVELOPMENT SERVER HEADERS
   ============================================================ */

config.server.enhanceMiddleware = (
  middleware,
) => {
  return (
    req,
    res,
    next,
  ) => {
    res.setHeader(
      "Cross-Origin-Embedder-Policy",
      "credentialless",
    );

    res.setHeader(
      "Cross-Origin-Opener-Policy",
      "same-origin",
    );

    return middleware(
      req,
      res,
      next,
    );
  };
};

/* ============================================================
   EXPORT
   ============================================================ */

module.exports = config;