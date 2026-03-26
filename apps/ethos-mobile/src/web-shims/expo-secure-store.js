// Web shim for expo-secure-store — uses localStorage on browser
export const getItemAsync = async (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
export const setItemAsync = async (key, value) => {
  try { localStorage.setItem(key, value); } catch {}
};
export const deleteItemAsync = async (key) => {
  try { localStorage.removeItem(key); } catch {}
};
export default { getItemAsync, setItemAsync, deleteItemAsync };
