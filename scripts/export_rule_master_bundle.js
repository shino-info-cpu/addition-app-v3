const path = require("path");
const { execFileSync } = require("child_process");
const { workspaceRoot } = require("./lib/rule_master_source");

const exportScripts = [
  "export_prototype_frontend_source.js",
  "export_prototype_sample_data.js",
  "export_prototype_rule_catalog.js",
  "export_prototype_question_catalog.js",
  "export_prototype_branch_rule_catalog.js",
  "export_prototype_frontend_catalog.js",
];

function runExport(scriptName) {
  const output = execFileSync("node", [path.join(__dirname, scriptName)], {
    cwd: workspaceRoot,
    stdio: "pipe",
    encoding: "utf8",
  }).trim();

  if (output) {
    process.stdout.write(`${scriptName}\n${output}\n`);
  } else {
    process.stdout.write(`${scriptName}\n`);
  }
}

function main() {
  exportScripts.forEach(runExport);
  process.stdout.write(`bundle: ${exportScripts.length}/${exportScripts.length}\n`);
}

main();
