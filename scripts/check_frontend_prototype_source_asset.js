const fs = require("fs");
const path = require("path");
const vm = require("vm");

const assetPath = path.resolve(__dirname, "../runtime/prototype/prototype-rule-source.js");
const source = fs.readFileSync(assetPath, "utf8");
const context = {
  window: {},
  console,
};

vm.createContext(context);
vm.runInContext(source, context);

const catalog = context.__KASAN_PROTOTYPE_RULE_SOURCE__ || context.window.__KASAN_PROTOTYPE_RULE_SOURCE__;
const failures = [];

if (!catalog || typeof catalog !== "object") {
  failures.push("source global is missing");
} else {
  if (!catalog.data || typeof catalog.data !== "object") {
    failures.push("data object is missing");
  }

  if (!Array.isArray(catalog.questionDefinitions) || catalog.questionDefinitions.length !== 11) {
    failures.push(`questionDefinitions expected 11 but got ${JSON.stringify(catalog.questionDefinitions?.length)}`);
  }

  if (!Array.isArray(catalog.data?.additions) || catalog.data.additions.length !== 26) {
    failures.push(`data.additions expected 26 but got ${JSON.stringify(catalog.data?.additions?.length)}`);
  }
}

if (failures.length > 0) {
  failures.forEach((message) => console.error(`[fail] ${message}`));
  process.exit(1);
}

console.log("frontend-prototype-source-asset: ok");
