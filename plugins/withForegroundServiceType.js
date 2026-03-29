const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Adds android:foregroundServiceType="dataSync" to RNBackgroundActionsTask.
 * Required on Android 14+ (targetSDK 34+).
 *
 * Uses tools:replace to override the library's own manifest declaration
 * which doesn't include a foregroundServiceType.
 */
module.exports = withAndroidManifest(config => {
  const manifest = config.modResults?.manifest;
  if (!manifest) return config;

  // tools namespace is required for tools:replace to work
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }

  const application = manifest.application?.[0];
  if (!application) return config;

  if (!application.service) {
    application.service = [];
  }

  const existing = application.service.find(
    s => s.$?.['android:name'] === 'com.asterinet.react.bgactions.RNBackgroundActionsTask',
  );

  if (existing) {
    existing.$['android:foregroundServiceType'] = 'dataSync';
    existing.$['tools:replace'] = 'android:foregroundServiceType';
  } else {
    application.service.push({
      $: {
        'android:name': 'com.asterinet.react.bgactions.RNBackgroundActionsTask',
        'android:foregroundServiceType': 'dataSync',
        'tools:replace': 'android:foregroundServiceType',
      },
    });
  }

  return config;
});
