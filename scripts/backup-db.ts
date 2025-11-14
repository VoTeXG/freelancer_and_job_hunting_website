#!/usr/bin/env ts-node
/**
 * Simple logical backup using pg_dump piping to gzip.
 * Requires pg_dump in PATH and DATABASE_URL env variable.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL env var required');
  process.exit(1);
}

const outDir = process.env.BACKUP_DIR || 'backups';
const keepDaily = parseInt(process.env.BACKUP_KEEP_DAILY || '7');
const keepWeekly = parseInt(process.env.BACKUP_KEEP_WEEKLY || '4');
const keepMonthly = parseInt(process.env.BACKUP_KEEP_MONTHLY || '3');

import { mkdirSync, existsSync } from 'node:fs';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const ts = new Date();
const stamp = ts.toISOString().replace(/[:T]/g, '-').slice(0,19);
const file = join(outDir, `backup_${stamp}.sql.gz`);
console.log(`[backup] Creating ${file}`);

const pgDump = spawn('pg_dump', ['--no-owner', '--format=plain', dbUrl]);
const gzip = spawn(process.platform === 'win32' ? 'powershell' : 'gzip', process.platform === 'win32' ? ['-Command','Compress-Archive -InputObject - -DestinationPath', file] : [], { stdio: ['pipe','pipe','inherit'] });
// Simpler: if gzip available cross-platform; fallback to raw .sql
let outStream = createWriteStream(file);
pgDump.stdout.pipe(require('zlib').createGzip()).pipe(outStream);

pgDump.on('exit', code => {
  if (code !== 0) {
    console.error('pg_dump failed with code', code);
    process.exit(code ?? 1);
  }
  console.log('[backup] Completed');
  prune();
});

function prune() {
  console.log('[backup] Pruning old backups');
  const files = readdirSync(outDir).filter(f=>f.startsWith('backup_') && f.endsWith('.sql.gz')).sort();
  // classify by date
  const byDay: Record<string,string[]> = {};
  for (const f of files) {
    const datePart = f.split('_')[1].slice(0,10); // YYYY-MM-DD
    (byDay[datePart] ||= []).push(f);
  }
  const days = Object.keys(byDay).sort().reverse();
  const keepSet = new Set<string>();
  days.forEach((d, idx) => {
    if (idx < keepDaily) keepSet.add(byDay[d][byDay[d].length-1]); // keep latest for that day
    // week key = YYYY-Wxx
    const week = weekKey(d);
    const month = d.slice(0,7);
    if (countWeeksBefore(week, weeksList(days)) < keepWeekly) keepSet.add(byDay[d][byDay[d].length-1]);
    if (countMonthsBefore(month, monthsList(days)) < keepMonthly) keepSet.add(byDay[d][byDay[d].length-1]);
  });
  for (const f of files) {
    if (!keepSet.has(f)) {
      try { unlinkSync(join(outDir, f)); console.log('[backup] removed', f); } catch {}
    }
  }
  console.log('[backup] Prune complete');
}

function weekKey(dateStr: string) {
  const dt = new Date(dateStr);
  const onejan = new Date(dt.getFullYear(),0,1);
  const week = Math.ceil((((dt as any)- (onejan as any)) / 86400000 + onejan.getDay()+1)/7);
  return `${dt.getFullYear()}-W${week}`;
}
function weeksList(days: string[]) { return Array.from(new Set(days.map(d=>weekKey(d))).values()); }
function monthsList(days: string[]) { return Array.from(new Set(days.map(d=>d.slice(0,7))).values()); }
function countWeeksBefore(wk: string, list: string[]) { return list.indexOf(wk); }
function countMonthsBefore(m: string, list: string[]) { return list.indexOf(m); }
