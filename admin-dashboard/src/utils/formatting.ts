import { API_BASE_URL } from "./api";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatDateOnly = (date: string | Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export const getImageUrl = (
  image: string,
  apiBaseUrl: string = API_BASE_URL,
) => {
  if (!image) return "";

  if (/^(https?:)?\/\//i.test(image)) {
    return image;
  }

  const base = apiBaseUrl.replace(/\/api\/?$/, "");
  const path = image.replace(/^\/+/, "");

  return `${base}/${path}`;
};
