const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workspaceRoot = path.resolve(__dirname, "..");
const sourceAssetPath = path.join(workspaceRoot, "runtime", "prototype", "prototype-rule-source.js");
const outputPath = path.join(workspaceRoot, "app", "frontend", "prototype-sample-data.js");

function loadPrototypeSource() {
  const source = fs.readFileSync(sourceAssetPath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 1000 });

  const prototypeSource = context.__KASAN_PROTOTYPE_RULE_SOURCE__ ?? context.window?.__KASAN_PROTOTYPE_RULE_SOURCE__ ?? null;
  if (!prototypeSource || !prototypeSource.data) {
    throw new Error("prototype-rule-source.js から raw source を取得できませんでした。");
  }

  return prototypeSource;
}

function pickSampleData(rawData) {
  return {
    staff: Array.isArray(rawData.staff) ? rawData.staff : [],
    clients: Array.isArray(rawData.clients) ? rawData.clients : [],
    organizations: Array.isArray(rawData.organizations) ? rawData.organizations : [],
    services: Array.isArray(rawData.services) ? rawData.services : [],
    enrollments: Array.isArray(rawData.enrollments) ? rawData.enrollments : [],
    reportRecords: Array.isArray(rawData.reportRecords) ? rawData.reportRecords : [],
  };
}

function buildAsset(sampleData) {
  return `(function (global) {
  var sampleData = ${JSON.stringify({
    generatedAt: new Date().toISOString(),
    data: sampleData,
  }, null, 2)};
  global.__KASAN_PROTOTYPE_SAMPLE_DATA__ = sampleData;
  if (global.window && typeof global.window === "object") {
    global.window.__KASAN_PROTOTYPE_SAMPLE_DATA__ = sampleData;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
`;
}

function main() {
  const prototypeSource = loadPrototypeSource();
  const sampleData = pickSampleData(prototypeSource.data);
  fs.writeFileSync(outputPath, buildAsset(sampleData), "utf8");
  process.stdout.write(
    `prototype-sample-data: ${path.relative(workspaceRoot, outputPath)} (${sampleData.clients.length} clients / ${sampleData.organizations.length} organizations / ${sampleData.services.length} services / ${sampleData.reportRecords.length} reports)\n`,
  );
}

main();
