const fs = require("fs");
const path = require("path");
const vm = require("vm");

const assetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const source = fs.readFileSync(assetPath, "utf8");

const context = {
  window: {},
  console,
};

vm.createContext(context);
vm.runInContext(source, context);

const catalog = context.__KASAN_PROTOTYPE_RULE_CATALOG__ || context.window.__KASAN_PROTOTYPE_RULE_CATALOG__;
const failures = [];

if (!catalog || typeof catalog !== "object") {
  failures.push("catalog global is missing");
} else {
  if (!Array.isArray(catalog.questions) || catalog.questions.length !== 11) {
    failures.push(`questions expected 11 but got ${JSON.stringify(catalog.questions?.length)}`);
  }

  if (!Array.isArray(catalog.additions) || catalog.additions.length !== 26) {
    failures.push(`additions expected 26 but got ${JSON.stringify(catalog.additions?.length)}`);
  }
}

if (failures.length > 0) {
  failures.forEach((message) => console.error(`[fail] ${message}`));
  process.exit(1);
}

console.log("frontend-prototype-catalog-asset: ok");
