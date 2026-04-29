const DEFAULT_PRODUCTION_API_ORIGIN = "https://examstrike.onrender.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getConfiguredApiBaseUrl() {
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
}

function getFallbackApiBaseUrl() {
  if (import.meta.env.PROD) {
    return `${DEFAULT_PRODUCTION_API_ORIGIN}/api`;
  }

  return "/api";
}

export function getApiBaseUrl() {
  const configuredUrl = getConfiguredApiBaseUrl();
  return configuredUrl
    ? trimTrailingSlash(configuredUrl)
    : getFallbackApiBaseUrl();
}

export function getSocketUrl() {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (configuredSocketUrl) {
    return trimTrailingSlash(configuredSocketUrl);
  }

  const configuredApiBaseUrl = getConfiguredApiBaseUrl() || getFallbackApiBaseUrl();

  try {
    return new URL(configuredApiBaseUrl).origin;
  } catch {
    return undefined;
  }
}
