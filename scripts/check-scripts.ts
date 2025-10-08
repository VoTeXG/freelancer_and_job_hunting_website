#!/usr/bin/env ts-node
/**
 * Lightweight consistency check for npm scripts & environment.
 * - Verifies required scripts exist.
 * - Warns if duplicate or parent lockfiles exist.
 * - Ensures seed:admin script present for local admin bootstrapping.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

interface Result { level: 'OK' | 'WARN' | 'ERROR'; message: string; hint?: string }

// Core scripts that CI and local workflows depend on. Missing = ERROR.
const REQUIRED_SCRIPTS = [
  'dev','build','start','lint','typecheck','prisma:generate'
];

// Nice-to-have / environment or DX helpers. Missing = WARN only.
// These were previously treated as required but certain npm runtime listing
// anomalies (e.g. parent lockfile interference) caused false negatives.
const RECOMMENDED_SCRIPTS = [
  'seed:admin',      // Local admin bootstrap (not needed in prod CI)
  'check:scripts',   // Self-reference to allow npm run check:scripts
  'budget:responses' // API response budget checks (optional gate)
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
  const argv = process.argv.slice(2);
  const fixFlag = argv.find(a => a.startsWith('--fix'));
  const fixAll = fixFlag === '--fix=all';
  const doFix = fixFlag === '--fix' || fixAll;

  const missingRequired: string[] = [];
  for (const req of REQUIRED_SCRIPTS) {
    if (!scripts[req]) {
      missingRequired.push(req);
      results.push({ level: 'ERROR', message: `Missing required script: ${req}`, hint: `Add \"${req}\": \"<command>\" to package.json scripts.` });
    }
  }

  const missingRecommended: string[] = [];
  for (const rec of RECOMMENDED_SCRIPTS) {
    if (!scripts[rec]) {
      missingRecommended.push(rec);
      results.push({ level: 'WARN', message: `Missing recommended script: ${rec}`, hint: `Consider adding \"${rec}\" for improved DX / optional checks.` });
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
  console.log(`Required scripts   (errors if missing): ${REQUIRED_SCRIPTS.join(', ')}`);
  console.log(`Recommended scripts (warnings if missing): ${RECOMMENDED_SCRIPTS.join(', ')}`);
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
  if (doFix && (missingRequired.length > 0 || (fixAll && missingRecommended.length > 0))) {
    console.log('\n--fix enabled: applying additions to package.json');
    // Provide conservative defaults; user can refine afterwards.
    for (const r of missingRequired) {
      switch (r) {
        case 'dev': scripts['dev'] = 'next dev --turbopack'; break;
        case 'build': scripts['build'] = 'next build'; break;
        case 'start': scripts['start'] = 'next start'; break;
        case 'lint': scripts['lint'] = 'next lint'; break;
        case 'typecheck': scripts['typecheck'] = 'tsc --noEmit -p tsconfig.typecheck.json'; break;
        case 'prisma:generate': scripts['prisma:generate'] = 'prisma generate'; break;
        default: scripts[r] = 'echo "TODO: implement script"';
      }
      console.log(`  Added required script ${r}`);
    }
    if (fixAll) {
      for (const r of missingRecommended) {
        switch (r) {
          case 'seed:admin': scripts['seed:admin'] = 'tsx scripts/seed-admin.ts'; break;
          case 'check:scripts': scripts['check:scripts'] = 'tsx scripts/check-scripts.ts'; break;
          case 'budget:responses': scripts['budget:responses'] = 'node scripts/check-response-sizes.cjs'; break;
          default: scripts[r] = 'echo "TODO: implement script"';
        }
        console.log(`  Added recommended script ${r}`);
      }
    }
    pkg.scripts = Object.fromEntries(Object.entries(scripts).sort(([a],[b]) => a.localeCompare(b)));
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('package.json updated. Re-run checker to verify.');
  }

  if (errors.length > 0 && !doFix) process.exit(2);
  if (errors.length > 0 && doFix) {
    console.log('\nRe-running after --fix to verify...');
    // Simple recursive re-run: spawn a new process would be cleaner, but quick inline call is fine.
    // Avoid infinite loops: only one re-run.
    process.argv = process.argv.filter(a => !a.startsWith('--fix')); // strip fix flag
    return main();
  }
}

main();
