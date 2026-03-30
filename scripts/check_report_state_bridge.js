const fs = require("fs");
const path = require("path");
const vm = require("vm");

const assetPath = path.resolve(__dirname, "../app/frontend/report-state-bridge.js");
const assetSource = fs.readFileSync(assetPath, "utf8");

function createElement(initialValue = "") {
  return {
    value: initialValue,
    textContent: "",
  };
}

function createContext() {
  const storage = new Map();
  const context = {
    console,
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(assetSource, context);
  return { context, storage };
}

const scenarios = [
  {
    name: "stored active view falls back to known view",
    run() {
      const { context, storage } = createContext();
      storage.set("active", "audit_lookup");
      return context.__KASAN_REPORT_STATE_BRIDGE__.loadStoredActiveViewCode(
        { activeView: "active" },
        {
          monthly_claim: { name: "月次請求用" },
          audit_lookup: { name: "監査確認用" },
        },
      );
    },
    assert(result) {
      return result === "audit_lookup";
    },
  },
  {
    name: "stored views merge with base views",
    run() {
      const { context, storage } = createContext();
      storage.set("views", JSON.stringify({
        review_queue: {
          name: "要確認中心",
          columns: ["clientName"],
          savedFilters: { status: "要確認" },
        },
      }));
      return context.__KASAN_REPORT_STATE_BRIDGE__.loadStoredReportViews(
        { reportViews: "views" },
        {
          monthly_claim: { name: "月次請求用", columns: ["targetMonth"], savedFilters: { targetMonth: "2026-03" } },
          review_queue: { name: "要確認中心", columns: ["additionName"], savedFilters: { status: "" } },
        },
      );
    },
    assert(result) {
      return result.monthly_claim.columns[0] === "targetMonth"
        && result.review_queue.columns[0] === "clientName"
        && result.review_queue.savedFilters.status === "要確認";
    },
  },
  {
    name: "syncReportFiltersFromInputs copies DOM values into state",
    run() {
      const { context } = createContext();
      const state = {
        activeSection: "report",
        report: {
          filters: {},
          views: {
            monthly_claim: {
              name: "月次請求用",
              columns: ["targetMonth"],
              savedFilters: {},
            },
          },
          activeViewCode: "monthly_claim",
          selectedColumnKey: "",
          records: [],
        },
      };
      const dom = {
        report: {
          filterMonth: createElement("2026-03"),
          filterClient: createElement("てすと太郎"),
          filterAddition: createElement("入院"),
          filterStatus: createElement("要確認"),
          filterPostCheckStatus: createElement("review"),
          filterOrganization: createElement("病院"),
          filterStaff: createElement("堀野"),
        },
      };
      const bridge = context.__KASAN_REPORT_STATE_BRIDGE__.createReportStateBridge({
        state,
        dom,
        storageKeys: { reportViews: "views", activeView: "active" },
        baseReportViews: state.report.views,
        normalizeText: (value) => String(value ?? "").trim(),
        matchesQuickSearch: () => true,
        canUseApiReport: () => false,
        loadReportRecordsFromApi: async () => {},
        renderReport: () => {},
        renderQuickSearchStatus: () => {},
      });
      bridge.syncReportFiltersFromInputs();
      return state.report.filters;
    },
    assert(result) {
      return result.targetMonth === "2026-03"
        && result.client === "てすと太郎"
        && result.addition === "入院"
        && result.status === "要確認"
        && result.postCheckStatus === "review"
        && result.organization === "病院"
        && result.staff === "堀野";
    },
  },
  {
    name: "activateReportView persists active code and resets filters",
    async run() {
      const { context, storage } = createContext();
      const state = {
        activeSection: "report",
        report: {
          filters: { targetMonth: "", client: "x", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
          views: {
            monthly_claim: {
              name: "月次請求用",
              columns: ["targetMonth"],
              savedFilters: { targetMonth: "2026-03", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
            },
            audit_lookup: {
              name: "監査確認用",
              columns: ["performedAt"],
              savedFilters: { targetMonth: "", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
            },
          },
          activeViewCode: "monthly_claim",
          selectedColumnKey: "targetMonth",
          records: [],
        },
      };
      const dom = {
        report: {
          filterMonth: createElement(""),
          filterClient: createElement(""),
          filterAddition: createElement(""),
          filterStatus: createElement(""),
          filterPostCheckStatus: createElement(""),
          filterOrganization: createElement(""),
          filterStaff: createElement(""),
        },
      };
      let rendered = 0;
      const bridge = context.__KASAN_REPORT_STATE_BRIDGE__.createReportStateBridge({
        state,
        dom,
        storageKeys: { reportViews: "views", activeView: "active" },
        baseReportViews: state.report.views,
        normalizeText: (value) => String(value ?? "").trim(),
        matchesQuickSearch: () => true,
        canUseApiReport: () => false,
        loadReportRecordsFromApi: async () => {},
        renderReport: () => { rendered += 1; },
        renderQuickSearchStatus: () => {},
      });
      await bridge.activateReportView("audit_lookup");
      return {
        activeViewCode: state.report.activeViewCode,
        selectedColumnKey: state.report.selectedColumnKey,
        filters: state.report.filters,
        storedActive: storage.get("active"),
        rendered,
      };
    },
    assert(result) {
      return result.activeViewCode === "audit_lookup"
        && result.selectedColumnKey === ""
        && result.filters.targetMonth === ""
        && result.storedActive === "audit_lookup"
        && result.rendered === 1;
    },
  },
];

(async () => {
  let failures = 0;

  for (const scenario of scenarios) {
    const result = await scenario.run();
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

  console.log(`report-state-bridge: ok (${scenarios.length}/${scenarios.length})`);
})();
