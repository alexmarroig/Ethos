// Web shim for expo-crypto — uses Web Crypto API on browser
export const getRandomBytesAsync = async (size) => {
  const buf = new Uint8Array(size);
  crypto.getRandomValues(buf);
  return buf;
};
export const digestStringAsync = async (algorithm, data) => {
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest(algorithm.replace('SHA-', 'SHA-'), enc.encode(data));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
};
export const CryptoDigestAlgorithm = { SHA256: 'SHA-256', SHA512: 'SHA-512' };
export default { getRandomBytesAsync, digestStringAsync, CryptoDigestAlgorithm };
