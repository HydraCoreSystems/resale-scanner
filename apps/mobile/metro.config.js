const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Browser preview only (RS_WEB_PREVIEW=1). Secure storage has no web version, so a localStorage stand in
// lets the screens be rendered in a browser for design review. Phone builds never use this.
if (process.env.RS_WEB_PREVIEW === "1") {
  const original = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === "web" && moduleName === "expo-secure-store") {
      return { type: "sourceFile", filePath: path.join(__dirname, "tools/web-preview/secure-store-shim.js") };
    }
    return (original ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
