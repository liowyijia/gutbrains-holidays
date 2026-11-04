import { build } from "vite";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

await build({ configFile: fileURLToPath(new URL("../vite.github.config.ts", import.meta.url)) });
writeFileSync(new URL("../docs/.nojekyll", import.meta.url), "");
