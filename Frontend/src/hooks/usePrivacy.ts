import { useAppStore } from "@/stores/appStore";

const MASK_NAME = "●●●●●";
const MASK_CURRENCY = "R$ ●●●";

/** Returns helpers to mask sensitive data based on global privacy mode. */
export function usePrivacy() {
  const privacyMode = useAppStore((s) => s.privacyMode);
  const togglePrivacyMode = useAppStore((s) => s.togglePrivacyMode);

  /**
   * Returns initials (e.g. "João Silva" → "JS") when privacy mode is on,
   * otherwise returns the original name.
   */
  const maskName = (name: string | null | undefined): string => {
    if (!privacyMode || !name) return name ?? "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + ".";
    return parts
      .filter((p) => p.length > 0)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join(".");
  };

  /**
   * Returns "R$ ●●●" when privacy mode is on,
   * otherwise returns the original formatted value.
   */
  const maskCurrency = (value: string | null | undefined): string => {
    if (!privacyMode) return value ?? "";
    return MASK_CURRENCY;
  };

  /**
   * Returns "●●●" when privacy mode is on, otherwise returns the value.
   */
  const maskValue = (value: string | number | null | undefined): string => {
    if (!privacyMode) return value != null ? String(value) : "";
    return "●●●";
  };

  return { privacyMode, togglePrivacyMode, maskName, maskCurrency, maskValue };
}
