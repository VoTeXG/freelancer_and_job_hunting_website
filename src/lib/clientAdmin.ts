const RAW_ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS || '';

const adminAllowlist = new Set(
  RAW_ADMIN_WALLETS.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminWallet(address?: string | null): boolean {
  if (!address) return false;
  return adminAllowlist.has(address.toLowerCase());
}

export function getAdminAllowlist(): string[] {
  return Array.from(adminAllowlist);
}
