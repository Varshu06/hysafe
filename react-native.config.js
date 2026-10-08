module.exports = {
  dependencies: {
    // The deprecated package and @react-native-masked-view/masked-view both
    // compile org.reactnative.maskedview.BuildConfig. Link only the current one.
    '@react-native-community/masked-view': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
