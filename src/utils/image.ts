import { ImageSourcePropType } from "react-native";

export type ProductImageSource = ImageSourcePropType | string;

export const normalizeImageSource = (
  image?: ProductImageSource,
): ImageSourcePropType | undefined => {
  if (!image) {
    return undefined;
  }

  if (typeof image === "string") {
    return { uri: image };
  }

  return image;
};

export const getRemoteImageUri = (
  image?: ProductImageSource,
): string | undefined => {
  if (!image) {
    return undefined;
  }

  if (typeof image === "string") {
    return image;
  }

  if (typeof image === "object" && image !== null && "uri" in image) {
    const uriValue = image.uri;
    return typeof uriValue === "string" ? uriValue : undefined;
  }

  return undefined;
};
