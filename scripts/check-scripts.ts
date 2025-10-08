#!/usr/bin/env ts-node
/**
 * Lightweight consistency check for npm scripts & environment.
 * - Verifies required scripts exist.
 * - Warns if duplicate or parent lockfiles exist.
 * - Ensures seed:admin script present for local admin bootstrapping.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

interface Result { level: 'OK' | 'WARN' | 'ERROR'; message: string; hint?: string }

const REQUIRED_SCRIPTS = [
  'dev','build','start','lint','typecheck','seed:admin','prisma:generate'
];

function loadPackageJson(path: string) {
  try { return JSON.parse(readFileSync(path,'utf8')); } catch (e) { throw new Error(`Failed to parse package.json: ${(e as Error).message}`); }
}

function findParentLockfiles(start: string): string[] {
  const locks: string[] = [];
  let cur = dirname(start);
  const root = dirname(cur);
  while (true) {
    const lock = join(cur, 'package-lock.json');
    if (existsSync(lock)) locks.push(lock);
    if (cur === root) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return locks.filter(l => l !== join(process.cwd(), 'package-lock.json'));
}

function main() {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = loadPackageJson(pkgPath);
  const scripts = pkg.scripts || {};
  const results: Result[] = [];

  for (const req of REQUIRED_SCRIPTS) {
    if (!scripts[req]) {
      results.push({ level: 'ERROR', message: `Missing script: ${req}`, hint: `Add \"${req}\": \"<command>\" to package.json scripts.` });
    }
  }

  // Basic detection: any script names that differ only by case or trailing spaces
  const names = Object.keys(scripts);
  const normalized = new Map<string,string[]>();
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (!normalized.has(key)) normalized.set(key, []);
    normalized.get(key)!.push(n);
  }
  for (const [k,v] of normalized.entries()) {
    if (v.length > 1) {
      results.push({ level: 'WARN', message: `Potential duplicate scripts: ${v.join(', ')}`, hint: 'Normalize script key naming.' });
    }
  }

  // Parent lockfile checks
  const parentLocks = findParentLockfiles(pkgPath);
  if (parentLocks.length > 0) {
    results.push({ level: 'WARN', message: `Detected lockfile(s) above project: ${parentLocks.join(', ')}`, hint: 'Remove or isolate to avoid npm selecting the wrong one.' });
  }

  // Summarize
  const errors = results.filter(r=>r.level==='ERROR');
  const warns = results.filter(r=>r.level==='WARN');

  const header = `Script Consistency Report\n==========================`;
  console.log(header);
  console.log(`Project: ${pkg.name || '(unknown)'}`);
  console.log(`Required scripts: ${REQUIRED_SCRIPTS.join(', ')}`);
  console.log('');

  if (errors.length === 0 && warns.length === 0) {
    console.log('All checks passed ✅');
  } else {
    for (const r of results) {
      console.log(`${r.level === 'ERROR' ? '❌' : '⚠️ '} ${r.level}: ${r.message}` + (r.hint ? `\n   → ${r.hint}` : ''));
    }
  }

  console.log('\nSummary:');
  console.log(` Errors: ${errors.length}`);
  console.log(` Warnings: ${warns.length}`);

  // Non-zero exit for errors so CI can enforce
  if (errors.length > 0) process.exit(2);
}

main();
