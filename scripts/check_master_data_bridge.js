const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendReportStateBridgeAssetPath = path.resolve(__dirname, "../app/frontend/report-state-bridge.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const frontendMasterDataBridgeAssetPath = path.resolve(__dirname, "../app/frontend/master-data-bridge.js");
const frontendJudgementEngineBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-engine-bridge.js");
const frontendApiRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/api-runtime-adapter.js");
const frontendJudgementReportBridgeAssetPath = path.resolve(__dirname, "../app/frontend/judgement-report-bridge.js");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendReportStateBridgeAsset = fs.readFileSync(frontendReportStateBridgeAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
const frontendMasterDataBridgeAsset = fs.readFileSync(frontendMasterDataBridgeAssetPath, "utf8");
const frontendJudgementEngineBridgeAsset = fs.readFileSync(frontendJudgementEngineBridgeAssetPath, "utf8");
const frontendApiRuntimeAdapterAsset = fs.readFileSync(frontendApiRuntimeAdapterAssetPath, "utf8");
const frontendJudgementReportBridgeAsset = fs.readFileSync(frontendJudgementReportBridgeAssetPath, "utf8");
const source = fs.readFileSync(appJsPath, "utf8");

function createElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    title: "",
    disabled: false,
    dataset: {},
    className: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    appendChild() {},
    setAttribute() {},
  };
}

const context = {
  console,
  document: {
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
  },
  window: { confirm: () => true },
  localStorage: { getItem() { return null; }, setItem() {} },
  fetch: async () => ({ ok: false, status: 503, json: async () => ({ ok: false }), text: async () => "" }),
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Math,
  Promise,
  URL,
};

vm.createContext(context);
vm.runInContext(frontendSampleDataAsset, context);
vm.runInContext(frontendCatalogAsset, context);
vm.runInContext(frontendReportStateBridgeAsset, context);
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(frontendMasterDataBridgeAsset, context);
vm.runInContext(frontendJudgementEngineBridgeAsset, context);
vm.runInContext(frontendApiRuntimeAdapterAsset, context);
vm.runInContext(frontendJudgementReportBridgeAsset, context);
vm.runInContext(source, context);

const scenarios = [
  {
    name: "sample judgement organizations exclude consultation-only enrollment context",
    run: `
      state.dataSource.clients = "sample";
      state.dataSource.organizations = "sample";
      state.dataSource.services = "sample";
      state.dataSource.staffs = "sample";
      return getSelectableOrganizationsForJudgement("1001").map((item) => item.organizationId);
    `,
    assert(result) {
      return JSON.stringify(result) === JSON.stringify(["21"]);
    },
  },
  {
    name: "sample judgement services exclude consultation support category",
    run: `
      state.dataSource.clients = "sample";
      state.dataSource.organizations = "sample";
      state.dataSource.services = "sample";
      return getSelectableServicesForJudgement("1001", "10").map((item) => item.serviceId);
    `,
    assert(result) {
      return Array.isArray(result) && result.length === 0;
    },
  },
  {
    name: "api organization normalization derives nursery type and group",
    run: `
      return normalizeApiOrganization({
        organization_id: 90,
        organization_code: "org-90",
        organization_name: "しののめこども園",
        organization_type: "",
        group_names: "",
        service_names: "",
      });
    `,
    assert(result) {
      return result.organizationType === "保育"
        && result.organizationGroup === "福祉サービス等提供機関";
    },
  },
  {
    name: "hospital organization group label stays medical group",
    run: `
      return {
        type: getDisplayOrganizationType(getOrganizationById("21")),
        group: getOrganizationGroupLabel(getOrganizationById("21")),
      };
    `,
    assert(result) {
      return result.type === "病院" && result.group === "病院・訪看・薬局グループ";
    },
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const result = vm.runInContext(`(() => { ${scenario.run} })()`, context);
  if (!scenario.assert(result)) {
    failures += 1;
    console.error(`[fail] ${scenario.name}`);
    console.error(JSON.stringify(result, null, 2));
  } else {
    console.log(`[pass] ${scenario.name}`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`master-data-bridge: ok (${scenarios.length}/${scenarios.length})`);
