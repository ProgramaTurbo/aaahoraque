export function afterLoginPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\s]/.test(value) || value.length > 512) return "/panel";

  const parsed = new URL(value, "https://aaahoraque.invalid");
  if (!["/panel", "/subjects", "/degrees", "/erasmus", "/orientacion-rapida"].includes(parsed.pathname)) {
    return "/panel";
  }
  return parsed.pathname + parsed.search;
}

export function accountPath(path: "/login" | "/registro", next: string) {
  return `${path}?${new URLSearchParams({ next: afterLoginPath(next) })}`;
}
