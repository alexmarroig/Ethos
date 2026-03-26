// Web shim for expo-device — returns browser info
export const modelName = 'Web Browser';
export const deviceYearClass = 2024;
export const totalMemory = 8 * 1024 * 1024 * 1024;
export const osName = 'Web';
export const osVersion = navigator?.userAgent ?? 'unknown';
export const isDevice = true;
export const DeviceType = { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3 };
export const getDeviceTypeAsync = async () => DeviceType.DESKTOP;
export default { modelName, deviceYearClass, totalMemory, osName, osVersion, isDevice, DeviceType, getDeviceTypeAsync };
