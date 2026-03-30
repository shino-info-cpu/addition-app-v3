const fs = require("fs");
const path = require("path");
const vm = require("vm");

const assetPath = path.resolve(__dirname, "../app/frontend/api-runtime-adapter.js");
const assetSource = fs.readFileSync(assetPath, "utf8");

function createContext(fetchImpl) {
  const context = {
    console,
    URL,
    window: {
      location: {
        href: "https://example.test/kasan2/",
      },
    },
    fetch: fetchImpl,
  };

  vm.createContext(context);
  vm.runInContext(assetSource, context);
  return context;
}

function createBaseOptions(overrides = {}) {
  const state = {
    dataSource: {
      apiBaseUrl: "",
      configReady: false,
      clients: "sample",
      organizations: "sample",
      services: "sample",
      staffs: "sample",
      questions: "sample",
      additions: "sample",
      judgement: "sample",
      report: "sample",
      relations: "sample",
      note: "",
    },
    masters: {
      clients: [],
      organizations: [],
      services: [],
      staffs: [],
    },
    ruleCatalog: {
      questions: [],
      additions: [],
    },
    judgement: {
      clientId: "1001",
      targetMonth: "2026-03",
      organizationId: "",
      enrollments: [],
      historyRecords: [],
      historyError: "",
      historyLoading: false,
      requestToken: 0,
      historyRequestToken: 0,
      contextClientId: "",
      loadingContext: false,
    },
    report: {
      filters: {},
      records: [],
      requestToken: 0,
      loading: false,
    },
    relations: {
      selectedOrganizationId: "10",
      selectedClientId: "1001",
      organizationServicesByOrganizationId: {},
      clientEnrollmentsByClientId: {},
      organizationServicesRequestToken: 0,
      clientEnrollmentsRequestToken: 0,
      loadingOrganizationServicesForId: "",
      loadingClientEnrollmentsForId: "",
    },
  };

  return {
    state,
    apiConfig: {
      baseCandidates: ["./api", "../backend/public/api"],
      reportLimit: 500,
    },
    normalizeApiClient: (item) => item,
    normalizeApiOrganization: (item) => item,
    normalizeApiService: (item) => item,
    normalizeApiStaff: (item) => item,
    normalizeApiOrganizationService: (item) => item,
    normalizeApiClientEnrollment: (item) => item,
    normalizeApiJudgementEnrollment: (item) => item,
    normalizeApiReportRecord: (item) => item,
    setRuleCatalogSection(section, source, items) {
      state.dataSource[section] = source;
      state.ruleCatalog[section] = items;
    },
    flattenApiAdditionCatalogBranches(families) {
      return (Array.isArray(families) ? families : []).flatMap((family) => family.branches ?? []);
    },
    buildSampleOrganizationServices: () => [],
    buildSampleClientEnrollments: () => [],
    buildSampleReportRecords: () => [{ recordId: "sample-1" }],
    getSampleJudgementHistoryRecords: () => [{ recordId: "sample-history-1" }],
    canUseApiRelations: () => Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady),
    canUseApiJudgementContext: () => Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady),
    canUseApiQuestionCatalog: () => Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady),
    canUseApiAdditionCatalog: () => Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady),
    canUseApiReport: () => Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady),
    updateApiDataStatusPill() {},
    syncJudgementStaffSelection() {},
    ensureRelationSelections() {},
    syncRelationFormSelections() {},
    syncEnrollmentSelection() {},
    renderMasters() {},
    renderJudgement() {},
    renderReport() {},
    renderQuickSearchStatus() {},
    buildReportApiParams: () => ({ limit: "500", target_month: "2026-03" }),
    ...overrides,
  };
}

const scenarios = [
  {
    name: "buildApiUrl appends non-empty params only",
    async run() {
      const context = createContext(async () => ({ ok: true, json: async () => ({ ok: true }) }));
      const options = createBaseOptions();
      options.state.dataSource.apiBaseUrl = "./api";
      const adapter = context.__KASAN_API_RUNTIME_ADAPTER__.createApiRuntimeAdapter(options);
      const url = adapter.buildApiUrl("report-records.php", {
        limit: "500",
        target_month: "2026-03",
        staff: "",
        client: null,
      });
      return url;
    },
    assert(result) {
      return result.includes("/api/report-records.php")
        && result.includes("limit=500")
        && result.includes("target_month=2026-03")
        && !result.includes("staff=")
        && !result.includes("client=");
    },
  },
  {
    name: "detectApiBaseUrl chooses first healthy base",
    async run() {
      const calls = [];
      const context = createContext(async (url) => {
        calls.push(url);
        if (url === "./api/health.php") {
          return { ok: false, status: 503, json: async () => ({ ok: false }) };
        }
        return { ok: true, status: 200, json: async () => ({ ok: true, checks: { config: true } }) };
      });
      const adapter = context.__KASAN_API_RUNTIME_ADAPTER__.createApiRuntimeAdapter(createBaseOptions());
      const detection = await adapter.detectApiBaseUrl();
      return { detection, calls };
    },
    assert(result) {
      return result.detection?.baseUrl === "../backend/public/api"
        && result.calls.length === 2;
    },
  },
  {
    name: "loadQuestionCatalogFromApi stores api questions",
    async run() {
      const context = createContext(async (url) => ({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          questions: [{ key: "monthType", visibilityMode: "always", options: [] }],
        }),
      }));
      const options = createBaseOptions();
      options.state.dataSource.apiBaseUrl = "./api";
      options.state.dataSource.configReady = true;
      const adapter = context.__KASAN_API_RUNTIME_ADAPTER__.createApiRuntimeAdapter(options);
      await adapter.loadQuestionCatalogFromApi();
      return {
        source: options.state.dataSource.questions,
        count: options.state.ruleCatalog.questions.length,
      };
    },
    assert(result) {
      return result.source === "api" && result.count === 1;
    },
  },
  {
    name: "loadAdditionCatalogFromApi falls back to sample on empty response",
    async run() {
      const context = createContext(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, additions: [] }),
      }));
      const options = createBaseOptions();
      options.state.dataSource.apiBaseUrl = "./api";
      options.state.dataSource.configReady = true;
      const adapter = context.__KASAN_API_RUNTIME_ADAPTER__.createApiRuntimeAdapter(options);
      await adapter.loadAdditionCatalogFromApi();
      return {
        source: options.state.dataSource.additions,
        note: options.state.dataSource.note,
      };
    },
    assert(result) {
      return result.source === "sample" && result.note === "加算catalog未投入";
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

  console.log(`api-runtime-bridge: ok (${scenarios.length}/${scenarios.length})`);
})();
