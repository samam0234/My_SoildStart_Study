import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";

const source = "tsx_version";
const target = "jsx_version";

async function copy(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tsconfig.json") continue;
    const original = join(directory, entry.name);
    if (entry.isDirectory()) {
      await copy(original);
      continue;
    }
    if (entry.name.endsWith(".d.ts")) continue;
    const destination = join(target, relative(source, original).replace(/\.ts(x?)$/, ".js$1"));
    let contents = await readFile(original, "utf8");
    if (/\.tsx?$/.test(original)) {
      const result = ts.transpileModule(contents, {
        fileName: original,
        compilerOptions: {
          jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext, rewriteRelativeImportExtensions: true
        }
      });
      contents = result.outputText;
    }
    await mkdir(join(destination, ".."), { recursive: true });
    await writeFile(destination, contents);
  }
}

await copy(source);
