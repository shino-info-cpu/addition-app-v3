const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workspaceRoot = path.resolve(__dirname, "..");
const outputPath = path.join(workspaceRoot, "runtime", "prototype", "prototype-rule-source.js");

function main() {
  const source = fs.readFileSync(outputPath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });

  const prototypeSource = context.__KASAN_PROTOTYPE_RULE_SOURCE__;
  if (!prototypeSource || !prototypeSource.data || !Array.isArray(prototypeSource.questionDefinitions)) {
    throw new Error("prototype-rule-source.js の raw source が不正です。");
  }

  process.stdout.write(
    `source-asset: ${path.relative(workspaceRoot, outputPath)} (${prototypeSource.questionDefinitions.length} questions / ${(prototypeSource.data?.additions || []).length} additions)\n`,
  );
}

main();
