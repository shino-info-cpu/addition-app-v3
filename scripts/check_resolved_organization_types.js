const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const frontendSampleDataAssetPath = path.resolve(__dirname, "../app/frontend/prototype-sample-data.js");
const frontendCatalogAssetPath = path.resolve(__dirname, "../app/frontend/prototype-rule-catalog.js");
const frontendRuntimeAdapterAssetPath = path.resolve(__dirname, "../app/frontend/rule-runtime-adapter.js");
const frontendSampleDataAsset = fs.readFileSync(frontendSampleDataAssetPath, "utf8");
const frontendCatalogAsset = fs.readFileSync(frontendCatalogAssetPath, "utf8");
const frontendRuntimeAdapterAsset = fs.readFileSync(frontendRuntimeAdapterAssetPath, "utf8");
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
vm.runInContext(frontendRuntimeAdapterAsset, context);
vm.runInContext(source, context);

const cases = vm.runInContext(`
(() => {
  state.dataSource.clients = "api";
  state.dataSource.organizations = "api";
  state.dataSource.services = "api";
  state.masters.clients = [
    { clientId: "c1", clientName: "利用者A", clientNameKana: "りようしゃえー", targetType: "児" },
  ];
  state.masters.organizations = [
    { organizationId: "o1", organizationName: "仮病院", organizationType: "", serviceNames: "病院" },
  ];
  state.masters.services = [
    { serviceId: "s1", serviceName: "病院", serviceCategory: "障害福祉以外", targetScope: "児者", groupName: "-" },
  ];
  state.judgement.clientId = "c1";
  state.judgement.organizationId = "o1";
  state.judgement.serviceId = "s1";
  state.judgement.answers = { monthType: "", placeType: "", actionType: "" };

  return [
    {
      name: "explicit type stays as-is",
      actual: deriveResolvedOrganizationType({ organizationType: "病院", organizationName: "A", serviceNames: "" }),
      expected: "病院",
    },
    {
      name: "hospital is inferred from service names",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "A", serviceNames: "病院" }),
      expected: "病院",
    },
    {
      name: "clinic is inferred as hospital from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ診療所", serviceNames: "" }),
      expected: "病院",
    },
    {
      name: "medical university is inferred as hospital from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "防衛医大", serviceNames: "" }),
      expected: "病院",
    },
    {
      name: "medical center is inferred as hospital from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ医療センター", serviceNames: "" }),
      expected: "病院",
    },
    {
      name: "clinic wording is inferred as hospital from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "みらいクリニック", serviceNames: "" }),
      expected: "病院",
    },
    {
      name: "visiting nurse is inferred from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "訪問看護ステーションみらい", serviceNames: "" }),
      expected: "訪問看護",
    },
    {
      name: "residential support facility is inferred as discharge-target residential facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ障害者支援施設", serviceNames: "" }),
      expected: "入所施設",
    },
    {
      name: "rehabilitation facility is inferred as discharge-target rehabilitation facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ更生施設", serviceNames: "" }),
      expected: "更生施設",
    },
    {
      name: "rehabilitation protection facility is inferred as discharge-target rehabilitation facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ更生保護施設", serviceNames: "" }),
      expected: "更生施設",
    },
    {
      name: "child welfare facility is inferred as discharge-target child facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ児童養護施設", serviceNames: "" }),
      expected: "児童施設",
    },
    {
      name: "child psychology treatment facility is inferred as discharge-target child facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ児童心理治療施設", serviceNames: "" }),
      expected: "児童施設",
    },
    {
      name: "penal facility is inferred as discharge-target penal facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ少年院", serviceNames: "" }),
      expected: "刑事施設",
    },
    {
      name: "juvenile classification home is inferred as discharge-target penal facility",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ少年鑑別所", serviceNames: "" }),
      expected: "刑事施設",
    },
    {
      name: "school is inferred from service names",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "A", serviceNames: "学校" }),
      expected: "学校",
    },
    {
      name: "nursery is inferred from service names",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "A", serviceNames: "保育" }),
      expected: "保育",
    },
    {
      name: "certified child center is inferred as nursery from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ認定こども園", serviceNames: "" }),
      expected: "保育",
    },
    {
      name: "child center wording is inferred as nursery from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめこども園", serviceNames: "" }),
      expected: "保育",
    },
    {
      name: "care manager office is inferred from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめケアマネ事業所", serviceNames: "" }),
      expected: "ケアマネ事業所",
    },
    {
      name: "employment support center is inferred from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "障害者就業・生活支援センター", serviceNames: "" }),
      expected: "障害者就業・生活支援センター",
    },
    {
      name: "company is inferred from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "しののめ株式会社", serviceNames: "" }),
      expected: "企業",
    },
    {
      name: "judgement facts use resolved nursery type for child center wording",
      actual: (() => {
        state.masters.organizations = [
          { organizationId: "o1", organizationName: "しののめ認定こども園", organizationType: "", serviceNames: "" },
        ];
        state.masters.services = [
          { serviceId: "s1", serviceName: "連携", serviceCategory: "障害福祉以外", targetScope: "児者", groupName: "-" },
        ];
        state.judgement.organizationId = "o1";
        state.judgement.serviceId = "s1";
        return getJudgementFacts(false).organizationType;
      })(),
      expected: "保育",
    },
    {
      name: "judgement facts use resolved organization type",
      actual: (() => {
        state.masters.organizations = [
          { organizationId: "o1", organizationName: "仮病院", organizationType: "", serviceNames: "病院" },
        ];
        state.masters.services = [
          { serviceId: "s1", serviceName: "病院", serviceCategory: "障害福祉以外", targetScope: "児者", groupName: "-" },
        ];
        state.judgement.organizationId = "o1";
        state.judgement.serviceId = "s1";
        return getJudgementFacts(false).organizationType;
      })(),
      expected: "病院",
    },
  ];
})()
`, context);

const failures = cases.filter((testCase) => testCase.actual !== testCase.expected);

cases.forEach((testCase) => {
  const status = testCase.actual === testCase.expected ? "PASS" : "FAIL";
  console.log(`${status}: ${testCase.name}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} resolved organization-type checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} resolved organization-type checks passed.`);
