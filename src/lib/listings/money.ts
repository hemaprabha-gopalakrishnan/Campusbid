export const MAX_PRICE_RUPEES = 99_999_999;

const RUPEE_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

export function isValidRupeeAmount(value: string) {
  if (!RUPEE_AMOUNT_PATTERN.test(value)) {
    return false;
  }

  const [whole, fraction = ""] = value.split(".");
  const paise = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return paise > BigInt(0) && paise <= BigInt(MAX_PRICE_RUPEES) * BigInt(100);
}

export function paiseToRupees(value: string | number | bigint): number {
  return Number(BigInt(value)) / 100;
}

export function rupeesToPaise(value: string | number) {
  const str = typeof value === "number" ? value.toFixed(2).replace(/\.00$/, "") : value;
  if (!isValidRupeeAmount(str)) {
    throw new RangeError("Enter a positive amount with up to two decimal places.");
  }

  const [whole, fraction = ""] = str.split(".");
  return (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))).toString();
}

export function formatPaiseAsINR(value: string | number | bigint) {
  const paise = BigInt(value);
  const rupees = Number(paise) / 100;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}