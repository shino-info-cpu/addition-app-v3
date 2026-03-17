const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
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
      name: "visiting nurse is inferred from organization name",
      actual: deriveResolvedOrganizationType({ organizationType: "", organizationName: "訪問看護ステーションみらい", serviceNames: "" }),
      expected: "訪問看護",
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
      name: "judgement facts use resolved organization type",
      actual: getJudgementFacts(false).organizationType,
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
