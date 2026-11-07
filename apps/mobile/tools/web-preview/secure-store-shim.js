// Browser preview stand in for expo-secure-store. Not used in phone builds.
const read = (k) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
export async function getItemAsync(key) {
  return read(key);
}
export async function setItemAsync(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}
export async function deleteItemAsync(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}
