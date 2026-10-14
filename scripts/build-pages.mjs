import { spawn } from "node:child_process";
import { cp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const stage = path.join(os.tmpdir(), "dashboard-cj-pages");
const skip = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  ".open-next",
  ".wrangler",
  path.join("src", "app", "api"),
  path.join("src", "app", "product"),
]);

if (!process.env.NEXT_PUBLIC_CJ_API_KEY?.trim()) {
  console.error("Falta NEXT_PUBLIC_CJ_API_KEY. En GitHub es el secreto CJ_API_KEY.");
  process.exit(1);
}

function skipped(source) {
  const rel = path.relative(root, source);
  if (!rel) return false;
  for (const part of skip) {
    if (rel === part || rel.startsWith(part + path.sep)) return true;
  }
  return rel === ".env.local" || rel === ".env";
}

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp(root, stage, {
  recursive: true,
  filter: (source) => !skipped(source),
});
await symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), process.platform === "win32" ? "junction" : "dir");

const code = await new Promise((resolve) => {
  const child = spawn("npx", ["next", "build"], {
    cwd: stage,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, GITHUB_PAGES: "true" },
  });
  child.on("exit", (status) => resolve(status ?? 1));
});

if (code !== 0) process.exit(code);

await rm(path.join(root, "out"), { recursive: true, force: true });
await cp(path.join(stage, "out"), path.join(root, "out"), { recursive: true });
console.log("Sitio estático listo en out/");
