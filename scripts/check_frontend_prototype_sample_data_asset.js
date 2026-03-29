const fs = require("fs");
const path = require("path");
const vm = require("vm");

const assetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const source = fs.readFileSync(assetPath, "utf8");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const sampleData = context.__KASAN_PROTOTYPE_SAMPLE_DATA__ || context.window.__KASAN_PROTOTYPE_SAMPLE_DATA__;
if (!sampleData || !sampleData.data) {
  console.error("Could not extract prototype sample data asset");
  process.exit(1);
}

const data = sampleData.data;
const checks = {
  clients: Array.isArray(data.clients) ? data.clients.length : -1,
  organizations: Array.isArray(data.organizations) ? data.organizations.length : -1,
  services: Array.isArray(data.services) ? data.services.length : -1,
  reportRecords: Array.isArray(data.reportRecords) ? data.reportRecords.length : -1,
};

if (
  checks.clients <= 0
  || checks.organizations <= 0
  || checks.services <= 0
  || checks.reportRecords <= 0
) {
  console.error(`prototype-sample-data asset invalid: ${JSON.stringify(checks)}`);
  process.exit(1);
}

console.log(`frontend-prototype-sample-data-asset: ok (${checks.clients} clients / ${checks.organizations} organizations / ${checks.services} services / ${checks.reportRecords} reports)`);
