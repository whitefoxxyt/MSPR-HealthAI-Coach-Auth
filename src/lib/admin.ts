export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isAdmin(email: string | undefined, admins: string[]): boolean {
  if (!email) return false;
  return admins.includes(email.toLowerCase());
}
