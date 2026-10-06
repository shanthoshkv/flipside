// Declares the react-native-background-actions service with an Android 14+ foreground service type.
const { withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const perms = (manifest['uses-permission'] ??= []);
    for (const name of ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE']) {
      if (!perms.some((p) => p.$['android:name'] === name)) perms.push({ $: { 'android:name': name } });
    }
    const app = manifest.application[0];
    const services = (app.service ??= []);
    let svc = services.find((s) => s.$['android:name'] === SERVICE);
    if (!svc) services.push((svc = { $: { 'android:name': SERVICE } }));
    svc.$['android:foregroundServiceType'] = 'specialUse';
    svc.property = [{ $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'on-device focus timer motion detection' } }];
    return cfg;
  });
