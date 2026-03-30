const path = require("path");

const {
  workspaceRoot,
  loadRuleMasterSourceObject,
  writePrototypeCompatibilitySource,
} = require("./lib/rule_master_source");

function main() {
  const outputPath = writePrototypeCompatibilitySource();
  const prototypeSource = loadRuleMasterSourceObject();
  if (!prototypeSource || !prototypeSource.data || !Array.isArray(prototypeSource.questionDefinitions)) {
    throw new Error("rule master source の raw source が不正です。");
  }

  process.stdout.write(
    [
      `source-asset: ${path.relative(workspaceRoot, outputPath)} (${prototypeSource.questionDefinitions.length} questions / ${(prototypeSource.data?.additions || []).length} additions)`,
      "source: runtime/rule-master/rule-master-source.js",
    ].join("\n") + "\n",
  );
}

main();
