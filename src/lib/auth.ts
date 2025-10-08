import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;

export type Scope =
  | 'read:jobs'
  | 'write:jobs'
  | 'read:applications'
  | 'write:applications'
  | 'read:profile'
  | 'write:profile'
  | 'escrow:manage'
  | 'admin:all';

export interface AccessTokenPayload {
  sub: string;            // userId
  usr: string;            // username
  scope: Scope[];         // allowed scopes
  typ: 'access';
}

const ACCESS_TOKEN_TTL: SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_TTL as any) || '15m';
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function generateAccessToken(payload: AccessTokenPayload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
  const opts: SignOptions = { expiresIn: ACCESS_TOKEN_TTL };
  return jwt.sign(payload as any, JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.typ !== 'access') return null;
    return decoded as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Back-compat exports: keep existing API name
export interface TokenPayload { userId: string; username: string; }
export function generateToken(payload: TokenPayload) {
  return generateAccessToken({ sub: payload.userId, usr: payload.username, scope: defaultScopes(), typ: 'access' });
}
export function verifyToken(token: string) {
  const res = verifyAccessToken(token);
  if (!res) return null;
  return { userId: res.sub, username: res.usr } satisfies TokenPayload;
}

export function defaultScopes(userType?: string): Scope[] {
  const base: Scope[] = ['read:jobs', 'read:applications', 'read:profile'];
  // Grant write scopes by user type
  if (userType === 'CLIENT') {
    base.push('write:jobs', 'write:applications', 'escrow:manage');
  } else if (userType === 'FREELANCER') {
    base.push('write:applications', 'write:profile');
  } else if (userType === 'BOTH') {
    base.push('write:applications', 'write:profile', 'write:jobs', 'escrow:manage');
  }
  return base;
}

// Admin allowlist by wallet address (CSV in ADMIN_WALLETS)
export function isAdminAddress(address?: string | null): boolean {
  if (!address) return false;
  const list = (process.env.ADMIN_WALLETS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(address.toLowerCase());
}

export function withAdminScope(scopes: Scope[], address?: string | null): Scope[] {
  const out = [...scopes];
  if (isAdminAddress(address) && !out.includes('admin:all')) out.push('admin:all');
  return out;
}

// Refresh token helpers (opaque tokens stored hashed in DB for rotation)
function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function issueRefreshToken(userId: string, meta?: { userAgent?: string; ip?: string }) {
  const raw = crypto.randomUUID();
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const clientAny: any = prisma;
  if (clientAny?.refreshToken?.create) {
    try {
      await clientAny.refreshToken.create({
        data: { userId, tokenHash, expiresAt, userAgent: meta?.userAgent || null, ip: meta?.ip || null }
      });
    } catch (err: any) {
      // P2021: table does not exist (migration not applied). Allow fallback.
      const code = err?.code || err?.name;
      if (code === 'P2021' || /does not exist/i.test(String(err?.message))) {
        console.warn('RefreshToken table missing; continuing without persistence');
      } else {
        throw err;
      }
    }
  } else {
    // Fallback when RefreshToken model isn't available (e.g., dev env without migration/gen yet)
    console.warn('RefreshToken model not available; issuing stateless refresh token (not persisted)');
  }
  return { raw, expiresAt };
}

export async function rotateRefreshToken(rawToken: string, meta?: { userAgent?: string; ip?: string }) {
  const clientAny: any = prisma;
  const tokenHash = sha256(rawToken);
  if (!clientAny?.refreshToken?.findUnique) {
    console.warn('RefreshToken model not available; cannot rotate');
    return null;
  }
  const existing = await clientAny.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }
  // Revoke existing and create a new one
  const newRaw = crypto.randomUUID();
  const newHash = sha256(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const updated = await clientAny.$transaction([
    clientAny.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date(), replacedById: newHash } }),
    clientAny.refreshToken.create({ data: { userId: existing.userId, tokenHash: newHash, expiresAt, userAgent: meta?.userAgent || null, ip: meta?.ip || null } })
  ]);
  return { userId: existing.userId as string, raw: newRaw, expiresAt };
}

export async function revokeRefreshToken(rawToken: string) {
  const clientAny: any = prisma;
  const tokenHash = sha256(rawToken);
  if (!clientAny?.refreshToken?.update) {
    console.warn('RefreshToken model not available; cannot revoke');
    return;
  }
  await clientAny.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } }).catch(() => {});
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateNonce() {
  return Math.floor(Math.random() * 1_000_000).toString();
}

// Verify wallet signature using Ethers (EIP-191 personal_sign style)
export function verifyWalletSignature(message: string, signature: string, address: string) {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
