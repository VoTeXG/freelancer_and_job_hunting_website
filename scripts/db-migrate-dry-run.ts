#!/usr/bin/env ts-node
/**
 * Prisma migration dry-run helper.
 * Prints SQL diff between current schema and target DB.
 */
import { spawnSync } from 'node:child_process';

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

console.log('[dry-run] Generating SQL diff (no changes applied)...');
run('npx', ['prisma', 'migrate', 'diff', '--from-schema-datamodel', 'prisma/schema.prisma', '--to-db-env', 'DATABASE_URL', '--script']);
console.log('\n[done] Review the diff above for destructive operations before deploying.');
