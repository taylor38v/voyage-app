import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency: string = "€") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currency}${num.toFixed(0)}`;
}
