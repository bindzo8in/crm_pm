import { parsePhoneNumber, type Country } from "react-phone-number-input";

export function normalizePhoneNumber(
  value: string | null | undefined,
  defaultCountry: Country,
): { value: string; parseFailed: boolean } {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return { value: "", parseFailed: false };
  }

  const parsedPhoneNumber = parsePhoneNumber(trimmedValue, defaultCountry);
  if (!parsedPhoneNumber) {
    return { value: "", parseFailed: true };
  }

  return { value: parsedPhoneNumber.number, parseFailed: false };
}
