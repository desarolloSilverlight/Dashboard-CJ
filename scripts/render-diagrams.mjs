/**
 * Renderiza diagramas en docs/diagrams/ a PNG y SVG.
 * Requiere: npx @mermaid-js/mermaid-cli, y opcionalmente PlantUML (Java + jar o plantuml.com local).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { encodePlantUML } from "./plantuml-encode.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const diagramsDir = path.join(root, "docs", "diagrams");

function run(cmd, cwd = root) {
  console.log(">", cmd);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

if (!fs.existsSync(diagramsDir)) {
  console.error("Missing docs/diagrams");
  process.exit(1);
}

const mmdFiles = fs
  .readdirSync(diagramsDir)
  .filter((f) => f.endsWith(".mmd"))
  .sort();
for (const file of mmdFiles) {
  const base = path.join(diagramsDir, file.replace(/\.mmd$/, ""));
  run(
    `npx --yes @mermaid-js/mermaid-cli@11.4.0 -i "${base}.mmd" -o "${base}.png" -b white -w 2400`,
  );
  run(
    `npx --yes @mermaid-js/mermaid-cli@11.4.0 -i "${base}.mmd" -o "${base}.svg" -b transparent`,
  );
}

const pumlPath = path.join(diagramsDir, "diagrama-alto-nivel.puml");
if (fs.existsSync(pumlPath)) {
  const pumlText = fs.readFileSync(pumlPath, "utf8");
  const encoded = encodePlantUML(pumlText);
  for (const [fmt, ext] of [
    ["png", "png"],
    ["svg", "svg"],
  ]) {
    const url = `https://www.plantuml.com/plantuml/${fmt}/${encoded}`;
    const out = path.join(diagramsDir, `diagrama-alto-nivel.${ext}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`PlantUML ${fmt} failed:`, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(out, buf);
    console.log("Written:", out);
  }
}

console.log("Done. Outputs in docs/diagrams/");
