module.exports = {
  expo: {
    name: "HySafe",
    slug: "hysafe-mobile",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      enabled: false,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "NEVER",
      url: ""
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    scheme: "hysafe",
    extra: {
      eas: {
        projectId: null
      }
    }
  }
};

