import {
  BYTES_PER_KILOBYTE,
  BYTES_PER_MEGABYTE
} from "./config.js";

export function parseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Указан некорректный URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Поддерживаются только адреса HTTP и HTTPS.");
  }

  return url;
}

export function formatBytes(bytes) {
  if (bytes >= BYTES_PER_MEGABYTE) {
    return `${(bytes / BYTES_PER_MEGABYTE).toFixed(2)} МБ`;
  }

  if (bytes >= BYTES_PER_KILOBYTE) {
    return `${(bytes / BYTES_PER_KILOBYTE).toFixed(2)} КБ`;
  }

  return `${bytes} Б`; 
}
