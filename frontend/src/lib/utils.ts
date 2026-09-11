export function navigate(path: string) {
  if (typeof window !== "undefined") window.location.href = path;
}

export function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return decodeURIComponent(match?.[1] || "demo");
}

export function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
