import { API_BASE_URL } from "./constants";

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
