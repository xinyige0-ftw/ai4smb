export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "server";
  const key = "ai4smb_anon_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
