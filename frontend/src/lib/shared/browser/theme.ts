const storageKey = "theme-preference";

export function getColorPreference() {
  if (localStorage.getItem(storageKey)) {
    return localStorage.getItem(storageKey);
  } else {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
}

export function darkLightColor(dark: string, light: string) {
  return getColorPreference() == "dark" ? dark : light;
}

export function setColorPreference(theme: string) {
  localStorage.setItem(storageKey, theme);
}
