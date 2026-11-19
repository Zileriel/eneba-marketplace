export function getSafeRedirectTo(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return "/";
  }

  return value;
}

export function authPageUrl(page: string, redirectTo: string) {
  return redirectTo === "/"
    ? page
    : `${page}?redirectTo=${encodeURIComponent(redirectTo)}`;
}
