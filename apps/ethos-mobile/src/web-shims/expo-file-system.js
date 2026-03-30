// Web shim for expo-file-system — no-ops on browser
export const documentDirectory = 'mock://docs/';
export const cacheDirectory = 'mock://cache/';
export const getInfoAsync = async () => ({ exists: true, isDirectory: false, size: 0 });
export const makeDirectoryAsync = async () => {};
export const writeAsStringAsync = async () => {};
export const readAsStringAsync = async () => '{}';
export const deleteAsync = async () => {};
export const readDirectoryAsync = async () => [];
export const copyAsync = async () => {};
export const moveAsync = async () => {};
export const downloadAsync = async () => ({ uri: 'mock://file' });
export const EncodingType = { Base64: 'base64', UTF8: 'utf8' };
export default {
  documentDirectory, cacheDirectory, getInfoAsync, makeDirectoryAsync,
  writeAsStringAsync, readAsStringAsync, deleteAsync, readDirectoryAsync,
  copyAsync, moveAsync, downloadAsync, EncodingType,
};
