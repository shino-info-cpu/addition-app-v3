const baseReportViews = {
  monthly_claim: {
    name: "月次請求用",
    columns: ["targetMonth", "clientName", "additionName", "organizationName", "finalStatus", "evaluatedAt"],
    savedFilters: { targetMonth: "2026-03", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
  },
  audit_lookup: {
    name: "監査確認用",
    columns: ["performedAt", "evaluatedAt", "clientName", "organizationName", "staffName", "additionName", "postCheckSummary", "rationale", "savedNote"],
    savedFilters: { targetMonth: "", client: "", addition: "", status: "", postCheckStatus: "", organization: "", staff: "" },
  },
  review_queue: {
    name: "要確認中心",
    columns: ["targetMonth", "clientName", "organizationName", "additionName", "finalStatus", "postCheckSummary", "savedNote"],
    savedFilters: { targetMonth: "2026-03", client: "", addition: "", status: "要確認", postCheckStatus: "review", organization: "", staff: "" },
  },
};

const apiConfig = {
  baseCandidates: ["./api", "../backend/public/api"],
  reportLimit: 500,
};

const storageKeys = {
  reportViews: "kasan-v3-report-views",
  activeView: "kasan-v3-active-report-view",
};

const reportStateBridgeFactory = globalThis.__KASAN_REPORT_STATE_BRIDGE__;
if (!reportStateBridgeFactory || typeof reportStateBridgeFactory.createReportStateBridge !== "function") {
  throw new Error("report-state-bridge.js の読み込みに失敗しました。");
}

const initialReportActiveViewCode = reportStateBridgeFactory.loadStoredActiveViewCode(storageKeys, baseReportViews);
const initialReportViews = reportStateBridgeFactory.loadStoredReportViews(storageKeys, baseReportViews);

const columnCatalog = {
  targetMonth: { label: "対象月", getValue: (record) => record.targetMonth },
  performedAt: { label: "対応日時", getValue: (record) => record.performedAt || "-" },
  clientName: { label: "利用者名", getValue: (record) => record.clientName },
  organizationName: { label: "機関名", getValue: (record) => record.organizationName },
  staffName: { label: "相談員", getValue: (record) => record.staffName },
  additionName: { label: "加算名", getValue: (record) => record.additionName },
  finalStatus: { label: "判定状態", getValue: (record) => record.finalStatus },
  postCheckStatus: { label: "後段状態", getValue: (record) => formatPostCheckStatusLabel(record.postCheckStatus) },
  postCheckSummary: { label: "後段チェック", getValue: (record) => record.postCheckSummary || "-" },
  evaluatedAt: { label: "保存日時", getValue: (record) => record.evaluatedAt },
  rationale: { label: "判定根拠", getValue: (record) => record.rationale },
  savedNote: { label: "保存文", getValue: (record) => record.savedNote },
};

const state = {
  activeSection: "judgement",
  quickSearch: "",
  dataSource: {
    apiBaseUrl: "",
    configReady: false,
    openaiReady: false,
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
    staffId: "501",
    targetMonth: "2026-03",
    performedAt: "",
    organizationId: "",
    serviceId: "",
    enrollments: [],
    contextClientId: "",
    loadingContext: false,
    requestToken: 0,
    historyRecords: [],
    historyLoading: false,
    historyRequestToken: 0,
    historyError: "",
    answers: {
      monthType: "",
      placeType: "",
      actionType: "",
      hospitalAdmissionContext: "",
      requiredInfoReceived: "",
      dischargeFacilityStaffOnlyInfo: "",
      dischargeInpatientPeriodCount: "",
      initialAdditionPlanned: "",
      careManagerStart: "",
      employmentStart: "",
      serviceUseStartMonth: "",
    },
    history: [],
    saveStatus: "未保存",
    saveSummary: "保存待ち",
    saving: false,
    lastSavedRecordId: "",
    noteMode: "default",
    noteText: "",
    notePromptText: "",
    noteAiDraftText: "",
    noteDrafting: false,
    noteDraftError: "",
  },
  report: {
    activeViewCode: initialReportActiveViewCode,
    views: initialReportViews,
    filters: { ...initialReportViews[initialReportActiveViewCode].savedFilters },
    selectedRecordId: "r1",
    selectedColumnKey: "",
    records: [],
    loading: false,
    requestToken: 0,
  },
  relations: {
    selectedClientId: "1001",
    selectedOrganizationId: "10",
    organizationServicesByOrganizationId: {},
    clientEnrollmentsByClientId: {},
    loadingOrganizationServicesForId: "",
    loadingClientEnrollmentsForId: "",
    organizationServicesRequestToken: 0,
    clientEnrollmentsRequestToken: 0,
    organizationServiceDefinitionId: "",
    organizationServiceStatus: "未保存",
    savingOrganizationService: false,
    deactivatingOrganizationServiceId: "",
    clientOrganizationId: "10",
    clientOrganizationServiceId: "",
    clientEnrollmentGroupName: "",
    clientEnrollmentStatus: "未保存",
    savingClientEnrollment: false,
    deactivatingClientEnrollmentId: "",
  },
  additionPrompts: {
    items: [],
    selectedAdditionId: "",
    promptTemplate: "",
    originalPromptTemplate: "",
    status: "読込待ち",
    loading: false,
    saving: false,
    source: "sample",
  },
};

const ruleRuntimeAdapterFactory = globalThis.__KASAN_RULE_RUNTIME_ADAPTER__;
if (!ruleRuntimeAdapterFactory || typeof ruleRuntimeAdapterFactory.createRuleRuntimeAdapter !== "function") {
  throw new Error("rule-runtime-adapter.js の読み込みに失敗しました。");
}

const ruleRuntimeAdapter = ruleRuntimeAdapterFactory.createRuleRuntimeAdapter({
  state,
  normalizeNumericId,
});

const masterDataBridgeFactory = globalThis.__KASAN_MASTER_DATA_BRIDGE__;
if (!masterDataBridgeFactory || typeof masterDataBridgeFactory.createMasterDataBridge !== "function") {
  throw new Error("master-data-bridge.js の読み込みに失敗しました。");
}

const masterDataBridge = masterDataBridgeFactory.createMasterDataBridge({
  state,
  getPrototypeDataSource,
  canUseApiRelations,
  canUseApiJudgementContext,
});

const judgementEngineBridgeFactory = globalThis.__KASAN_JUDGEMENT_ENGINE_BRIDGE__;
if (!judgementEngineBridgeFactory || typeof judgementEngineBridgeFactory.createJudgementEngineBridge !== "function") {
  throw new Error("judgement-engine-bridge.js の読み込みに失敗しました。");
}

const judgementEngineBridge = judgementEngineBridgeFactory.createJudgementEngineBridge({
  state,
  getClientById,
  getOrganizationById,
  getServiceById,
  getOrganizationGroupLabel,
  deriveResolvedOrganizationType,
  getActiveCandidateDefinitions,
  getActiveQuestionDefinitions,
});

const apiRuntimeAdapterFactory = globalThis.__KASAN_API_RUNTIME_ADAPTER__;
if (!apiRuntimeAdapterFactory || typeof apiRuntimeAdapterFactory.createApiRuntimeAdapter !== "function") {
  throw new Error("api-runtime-adapter.js の読み込みに失敗しました。");
}

const judgementReportBridgeFactory = globalThis.__KASAN_JUDGEMENT_REPORT_BRIDGE__;
if (!judgementReportBridgeFactory || typeof judgementReportBridgeFactory.createJudgementReportBridge !== "function") {
  throw new Error("judgement-report-bridge.js の読み込みに失敗しました。");
}

const judgementReportBridge = judgementReportBridgeFactory.createJudgementReportBridge({
  normalizeNumericId,
  deriveResolvedOrganizationType,
  deriveOrganizationGroupFromType,
  findAdditionReferenceByCode,
  countMatchedConditionGroupsForCandidate,
  getJudgementFacts,
  isSameJudgementCandidate,
});

const judgementSessionBridgeFactory = globalThis.__KASAN_JUDGEMENT_SESSION_BRIDGE__;
if (!judgementSessionBridgeFactory || typeof judgementSessionBridgeFactory.createJudgementSessionBridge !== "function") {
  throw new Error("judgement-session-bridge.js の読み込みに失敗しました。");
}

const judgementSessionBridge = judgementSessionBridgeFactory.createJudgementSessionBridge({
  state,
  normalizeNumericId,
  pruneHiddenJudgementAnswers,
  getClientById,
  getOrganizationById,
  getServiceById,
  getStaffById,
  getSelectableOrganizationsForJudgement,
  getSelectableServicesForJudgement,
  getJudgementCandidates,
  getVisibleQuestions,
  findMatchedJudgementEnrollment,
  normalizePerformedAtForStorage,
  getOrganizationGroupLabel,
  buildJudgementCandidateStorageEntries,
  getJudgementCandidateReference,
  buildJudgementCandidatePayload,
  deriveResolvedOrganizationType,
  deriveOrganizationGroupFromType,
});

const apiRuntimeAdapter = apiRuntimeAdapterFactory.createApiRuntimeAdapter({
  state,
  apiConfig,
  normalizeApiClient,
  normalizeApiOrganization,
  normalizeApiService,
  normalizeApiStaff,
  normalizeApiOrganizationService,
  normalizeApiClientEnrollment,
  normalizeApiJudgementEnrollment,
  normalizeApiReportRecord,
  setRuleCatalogSection,
  flattenApiAdditionCatalogBranches,
  buildSampleOrganizationServices,
  buildSampleClientEnrollments,
  buildSampleAdditionPromptSettings,
  buildSampleReportRecords,
  getSampleJudgementHistoryRecords,
  canUseApiRelations,
  canUseApiJudgementContext,
  canUseApiQuestionCatalog,
  canUseApiAdditionCatalog,
  canUseApiReport,
  updateApiDataStatusPill,
  syncJudgementStaffSelection,
  ensureRelationSelections,
  syncRelationFormSelections,
  syncEnrollmentSelection,
  renderMasters,
  renderJudgement,
  renderReport,
  renderQuickSearchStatus,
  buildReportApiParams,
});

state.report.records = buildSampleReportRecords();

const dom = {
  navButtons: document.querySelectorAll(".nav-button"),
  panels: document.querySelectorAll("[data-section-panel]"),
  quickSearchInput: document.querySelector("#quick-search-input"),
  quickSearchStatus: document.querySelector("#quick-search-status"),
  apiDataStatus: document.querySelector("#api-data-status"),
  ruleRuntimeStatus: document.querySelector("#rule-runtime-status"),
  judgement: {
    status: document.querySelector("#judgement-status"),
    client: document.querySelector("#judgement-client"),
    clientTarget: document.querySelector("#judgement-client-target"),
    targetMonth: document.querySelector("#judgement-target-month"),
    performedAt: document.querySelector("#judgement-performed-at"),
    staff: document.querySelector("#judgement-staff"),
    staffHome: document.querySelector("#judgement-staff-home"),
    organization: document.querySelector("#judgement-organization"),
    organizationGroup: document.querySelector("#judgement-organization-group"),
    service: document.querySelector("#judgement-service"),
    serviceCategory: document.querySelector("#judgement-service-category"),
    questionLabel: document.querySelector("#judgement-question-label"),
    questionMeta: document.querySelector("#judgement-question-meta"),
    questionHelper: document.querySelector("#judgement-question-helper"),
    options: document.querySelector("#judgement-options"),
    candidates: document.querySelector("#judgement-candidates"),
    answers: document.querySelector("#judgement-answers"),
    prevButton: document.querySelector("#judgement-prev-button"),
    resetButton: document.querySelector("#judgement-reset-button"),
    resultMain: document.querySelector("#judgement-result-main"),
    resultCheck: document.querySelector("#judgement-result-check"),
    resultNext: document.querySelector("#judgement-result-next"),
    saveSummary: document.querySelector("#judgement-save-summary"),
    noteStatus: document.querySelector("#judgement-note-status"),
    noteText: document.querySelector("#judgement-note-text"),
    noteResetButton: document.querySelector("#judgement-note-reset-button"),
    aiDraftButton: document.querySelector("#judgement-ai-draft-button"),
    saveNote: document.querySelector("#judgement-save-note"),
    saveStatus: document.querySelector("#judgement-save-status"),
    saveButton: document.querySelector("#judgement-save-button"),
  },
  report: {
    activeViewLabel: document.querySelector("#report-active-view-label"),
    viewButtons: document.querySelector("#report-view-buttons"),
    selectedColumn: document.querySelector("#report-selected-column"),
    columnLeft: document.querySelector("#report-column-left"),
    columnRight: document.querySelector("#report-column-right"),
    filterMonth: document.querySelector("#report-filter-month"),
    filterClient: document.querySelector("#report-filter-client"),
    filterAddition: document.querySelector("#report-filter-addition"),
    filterStatus: document.querySelector("#report-filter-status"),
    filterPostCheckStatus: document.querySelector("#report-filter-post-check-status"),
    filterOrganization: document.querySelector("#report-filter-organization"),
    filterStaff: document.querySelector("#report-filter-staff"),
    applyFilters: document.querySelector("#report-apply-filters"),
    saveFilters: document.querySelector("#report-save-filters"),
    resetFilters: document.querySelector("#report-reset-filters"),
    resultCount: document.querySelector("#report-result-count"),
    tableHead: document.querySelector("#report-table-head"),
    tableBody: document.querySelector("#report-table-body"),
    detailClient: document.querySelector("#report-detail-client"),
    detailPerformedAt: document.querySelector("#report-detail-performed-at"),
    detailAddition: document.querySelector("#report-detail-addition"),
    detailIdentity: document.querySelector("#report-detail-identity"),
    detailEvaluatedAt: document.querySelector("#report-detail-evaluated-at"),
    detailPostCheck: document.querySelector("#report-detail-post-check"),
    detailCandidates: document.querySelector("#report-detail-candidates"),
    detailRationale: document.querySelector("#report-detail-rationale"),
    detailNote: document.querySelector("#report-detail-note"),
    viewSummary: document.querySelector("#report-view-summary"),
  },
  masters: {
    clientsCount: document.querySelector("#clients-count"),
    clientsBody: document.querySelector("#clients-table-body"),
    clientSelected: document.querySelector("#client-enrollment-selected-client"),
    clientSelectedTarget: document.querySelector("#client-enrollment-selected-target"),
    clientEnrollmentOrganization: document.querySelector("#client-enrollment-organization"),
    clientEnrollmentOrganizationService: document.querySelector("#client-enrollment-organization-service"),
    clientEnrollmentOrganizationServiceHelp: document.querySelector("#client-enrollment-organization-service-help"),
    clientEnrollmentGroupName: document.querySelector("#client-enrollment-group-name"),
    clientEnrollmentStatus: document.querySelector("#client-enrollment-status"),
    clientEnrollmentSave: document.querySelector("#client-enrollment-save"),
    clientEnrollmentList: document.querySelector("#client-enrollment-list"),
    organizationsCount: document.querySelector("#organizations-count"),
    organizationsBody: document.querySelector("#organizations-table-body"),
    organizationSelected: document.querySelector("#organization-service-selected-organization"),
    organizationSelectedGroup: document.querySelector("#organization-service-selected-group"),
    organizationServiceDefinition: document.querySelector("#organization-service-service-definition"),
    organizationServiceStatus: document.querySelector("#organization-service-status"),
    organizationServiceSave: document.querySelector("#organization-service-save"),
    organizationServiceList: document.querySelector("#organization-service-list"),
    servicesCount: document.querySelector("#services-count"),
    servicesBody: document.querySelector("#services-table-body"),
    additionPromptSelected: document.querySelector("#addition-prompt-selected-addition"),
    additionPromptSelectedCode: document.querySelector("#addition-prompt-selected-code"),
    additionPromptAddition: document.querySelector("#addition-prompt-addition"),
    additionPromptTemplate: document.querySelector("#addition-prompt-template"),
    additionPromptHelp: document.querySelector("#addition-prompt-help"),
    additionPromptStatus: document.querySelector("#addition-prompt-status"),
    additionPromptReset: document.querySelector("#addition-prompt-reset"),
    additionPromptSave: document.querySelector("#addition-prompt-save"),
    additionPromptList: document.querySelector("#addition-prompt-list"),
  },
};

const reportStateBridge = reportStateBridgeFactory.createReportStateBridge({
  state,
  dom,
  storageKeys,
  baseReportViews,
  normalizeText,
  matchesQuickSearch,
  canUseApiReport,
  loadReportRecordsFromApi,
  renderReport,
  renderQuickSearchStatus,
});

initialize();

function initialize() {
  initializeJudgementDefaults();
  initializeReportFilters();
  initializeRelationDefaults();
  bindNavigation();
  bindQuickSearch();
  bindJudgementControls();
  bindReportControls();
  bindMasterControls();
  updateApiDataStatusPill();
  renderApp();
  void initializeApiData();
}

async function initializeApiData() {
  return apiRuntimeAdapter.initializeApiData();
}

async function detectApiBaseUrl() {
  return apiRuntimeAdapter.detectApiBaseUrl();
}

async function loadMastersFromApi() {
  return apiRuntimeAdapter.loadMastersFromApi();
}

async function loadQuestionCatalogFromApi() {
  return apiRuntimeAdapter.loadQuestionCatalogFromApi();
}

async function requestNoteDraft(payload) {
  return apiRuntimeAdapter.requestNoteDraft(payload);
}

async function loadAdditionCatalogFromApi() {
  return apiRuntimeAdapter.loadAdditionCatalogFromApi();
}

async function loadAdditionPromptSettingsFromApi(options) {
  return apiRuntimeAdapter.loadAdditionPromptSettingsFromApi(options);
}

async function saveAdditionPromptTemplate(additionId, promptTemplate) {
  return apiRuntimeAdapter.saveAdditionPromptTemplate(additionId, promptTemplate);
}

async function loadOrganizationServices(organizationId, { force = false } = {}) {
  return apiRuntimeAdapter.loadOrganizationServices(organizationId, { force });
}

async function loadClientEnrollments(clientId, { force = false } = {}) {
  return apiRuntimeAdapter.loadClientEnrollments(clientId, { force });
}

async function loadJudgementContextFromApi(clientId) {
  return apiRuntimeAdapter.loadJudgementContextFromApi(clientId);
}

async function loadReportRecordsFromApi() {
  return apiRuntimeAdapter.loadReportRecordsFromApi();
}

async function loadJudgementHistoryRecords(clientId, targetMonth) {
  return apiRuntimeAdapter.loadJudgementHistoryRecords(clientId, targetMonth);
}

function initializeJudgementDefaults() {
  const prototypeData = getPrototypeDataSource();
  const enrollment = prototypeData.enrollments.find((item) => item.clientId === state.judgement.clientId);
  if (enrollment) {
    state.judgement.organizationId = enrollment.organizationId;
    state.judgement.serviceId = enrollment.serviceId;
  }
  state.judgement.staffId = prototypeData.staff[0]?.staffId ?? "";
}

function initializeReportFilters() {
  state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
}

function initializeRelationDefaults() {
  const prototypeData = getPrototypeDataSource();
  state.relations.selectedClientId = prototypeData.clients[0]?.clientId ?? "";
  state.relations.selectedOrganizationId = prototypeData.organizations[0]?.organizationId ?? "";
  state.relations.clientOrganizationId = state.relations.selectedOrganizationId;
}

function bindNavigation() {
  for (const button of dom.navButtons) {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.section;
      renderNavigation();
      renderQuickSearchStatus();
      renderActiveSection();
    });
  }
}

function bindQuickSearch() {
  dom.quickSearchInput.addEventListener("input", (event) => {
    state.quickSearch = event.target.value.trim();
    renderActiveSection();
    renderQuickSearchStatus();
  });
}

function bindJudgementControls() {
  dom.judgement.client.addEventListener("change", (event) => {
    state.judgement.clientId = event.target.value;
    markJudgementDirty();
    resetJudgementAnswers();
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
    renderJudgement();
    renderQuickSearchStatus();
    void loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
    if (canUseApiJudgementContext()) {
      void loadJudgementContextFromApi(state.judgement.clientId);
    }
  });

  dom.judgement.targetMonth.addEventListener("change", (event) => {
    state.judgement.targetMonth = event.target.value;
    markJudgementDirty();
    renderJudgement();
    void loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
  });

  dom.judgement.performedAt.addEventListener("change", (event) => {
    state.judgement.performedAt = event.target.value;
    markJudgementDirty();
    renderJudgement();
  });

  dom.judgement.staff.addEventListener("change", (event) => {
    state.judgement.staffId = event.target.value;
    markJudgementDirty();
    renderJudgement();
  });

  dom.judgement.organization.addEventListener("change", (event) => {
    state.judgement.organizationId = event.target.value;
    markJudgementDirty();
    syncServiceSelection();
    resetJudgementAnswers();
    renderJudgement();
    void loadOrganizationServices(state.judgement.organizationId);
  });

  dom.judgement.service.addEventListener("change", (event) => {
    state.judgement.serviceId = event.target.value;
    markJudgementDirty();
    resetJudgementAnswers();
    renderJudgement();
  });

  dom.judgement.prevButton.addEventListener("click", () => {
    const previousKey = state.judgement.history.pop();
    if (!previousKey) {
      return;
    }

    markJudgementDirty();
    state.judgement.answers[previousKey] = "";
    renderJudgement();
  });

  dom.judgement.resetButton.addEventListener("click", () => {
    markJudgementDirty();
    resetJudgementAnswers();
    renderJudgement();
  });

  dom.judgement.noteText.addEventListener("input", (event) => {
    state.judgement.noteMode = "custom";
    state.judgement.noteText = event.target.value;
    state.judgement.noteDraftError = "";
    markJudgementDirty({ resetNote: false });
    renderJudgementSave(buildJudgementSnapshot());
  });

  dom.judgement.noteResetButton.addEventListener("click", () => {
    judgementSessionBridge.resetJudgementNoteState();
    markJudgementDirty({ resetNote: false });
    renderJudgementSave(buildJudgementSnapshot());
  });

  dom.judgement.aiDraftButton.addEventListener("click", () => {
    void createJudgementNoteDraft();
  });

  dom.judgement.saveButton.addEventListener("click", () => {
    void saveJudgementEvaluation();
  });
}

function bindReportControls() {
  const reportInputs = [
    dom.report.filterMonth,
    dom.report.filterClient,
    dom.report.filterAddition,
    dom.report.filterStatus,
    dom.report.filterPostCheckStatus,
    dom.report.filterOrganization,
    dom.report.filterStaff,
  ];

  for (const input of reportInputs) {
    input.addEventListener("input", syncReportFiltersFromInputs);
    input.addEventListener("change", syncReportFiltersFromInputs);
  }

  dom.report.applyFilters.addEventListener("click", () => {
    void reportStateBridge.applyFilters();
  });

  dom.report.saveFilters.addEventListener("click", () => {
    void reportStateBridge.saveFilters();
  });

  dom.report.resetFilters.addEventListener("click", () => {
    void reportStateBridge.resetFilters();
  });

  dom.report.columnLeft.addEventListener("click", () => moveSelectedColumn(-1));
  dom.report.columnRight.addEventListener("click", () => moveSelectedColumn(1));
}

function bindMasterControls() {
  dom.masters.organizationServiceDefinition.addEventListener("change", (event) => {
    state.relations.organizationServiceDefinitionId = event.target.value;
  });

  dom.masters.organizationServiceSave.addEventListener("click", () => {
    void saveOrganizationService();
  });

  dom.masters.clientEnrollmentOrganization.addEventListener("change", (event) => {
    state.relations.clientOrganizationId = event.target.value;
    state.relations.clientOrganizationServiceId = "";
    state.relations.clientEnrollmentStatus = "未保存";
    renderMasters();
    void loadOrganizationServices(state.relations.clientOrganizationId);
  });

  dom.masters.clientEnrollmentOrganizationService.addEventListener("change", (event) => {
    state.relations.clientOrganizationServiceId = event.target.value;
  });

  dom.masters.clientEnrollmentGroupName.addEventListener("input", (event) => {
    state.relations.clientEnrollmentGroupName = event.target.value;
  });

  dom.masters.clientEnrollmentSave.addEventListener("click", () => {
    void saveClientEnrollment();
  });

  dom.masters.additionPromptAddition.addEventListener("change", (event) => {
    state.additionPrompts.selectedAdditionId = event.target.value;
    syncAdditionPromptSelection({ resetText: true });
    state.additionPrompts.status = "未変更";
    renderMasters();
  });

  dom.masters.additionPromptTemplate.addEventListener("input", (event) => {
    state.additionPrompts.promptTemplate = event.target.value;
    state.additionPrompts.status = isCurrentAdditionPromptDirty() ? "編集中" : "未変更";
    renderAdditionPromptStatusOnly();
  });

  dom.masters.additionPromptReset.addEventListener("click", () => {
    resetAdditionPromptEditor();
    renderMasters();
  });

  dom.masters.additionPromptSave.addEventListener("click", () => {
    void saveSelectedAdditionPromptTemplate();
  });
}

async function saveOrganizationService() {
  const organizationId = state.relations.selectedOrganizationId;
  const serviceDefinitionId = state.relations.organizationServiceDefinitionId;

  if (!organizationId || !serviceDefinitionId) {
    state.relations.organizationServiceStatus = "機関とサービスを選んでください";
    renderMasters();
    return;
  }

  if (!canUseApiRelations()) {
    state.relations.organizationServiceStatus = "API接続後に登録できます";
    renderMasters();
    return;
  }

  state.relations.savingOrganizationService = true;
  state.relations.organizationServiceStatus = "登録中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("organization-services.php"), {
      method: "POST",
      body: JSON.stringify({
        organization_id: Number(organizationId),
        service_definition_id: Number(serviceDefinitionId),
      }),
    });

    state.relations.organizationServiceStatus = "登録しました";
    await loadMastersFromApi();
    await loadOrganizationServices(organizationId, { force: true });

    if (state.relations.clientOrganizationId === organizationId) {
      await loadOrganizationServices(organizationId, { force: true });
    }
  } catch (error) {
    state.relations.organizationServiceStatus = error.message;
  } finally {
    state.relations.savingOrganizationService = false;
    renderMasters();
  }
}

async function saveClientEnrollment() {
  const clientId = state.relations.selectedClientId;
  const organizationServiceId = state.relations.clientOrganizationServiceId;

  if (!clientId || !organizationServiceId) {
    state.relations.clientEnrollmentStatus = "利用者と機関サービスを選んでください";
    renderMasters();
    return;
  }

  if (!canUseApiRelations()) {
    state.relations.clientEnrollmentStatus = "API接続後に登録できます";
    renderMasters();
    return;
  }

  state.relations.savingClientEnrollment = true;
  state.relations.clientEnrollmentStatus = "登録中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("client-enrollments.php"), {
      method: "POST",
      body: JSON.stringify({
        client_id: Number(clientId),
        organization_service_id: Number(organizationServiceId),
        group_name: state.relations.clientEnrollmentGroupName.trim(),
      }),
    });

    state.relations.clientEnrollmentStatus = "登録しました";
    state.relations.clientEnrollmentGroupName = "";
    await loadClientEnrollments(clientId, { force: true });

    if (state.judgement.clientId === clientId && canUseApiJudgementContext()) {
      await loadJudgementContextFromApi(clientId);
    } else {
      renderJudgement();
    }
  } catch (error) {
    state.relations.clientEnrollmentStatus = error.message;
  } finally {
    state.relations.savingClientEnrollment = false;
    renderMasters();
  }
}

function getAdditionPromptSettingItems() {
  if (Array.isArray(state.additionPrompts.items) && state.additionPrompts.items.length > 0) {
    return state.additionPrompts.items;
  }

  return buildSampleAdditionPromptSettings();
}

function getSelectedAdditionPromptSetting() {
  return getAdditionPromptSettingItems().find((item) => item.additionId === state.additionPrompts.selectedAdditionId) ?? null;
}

function syncAdditionPromptSelection(options = {}) {
  const items = getAdditionPromptSettingItems();
  const resetText = Boolean(options.resetText);

  if (items.length === 0) {
    state.additionPrompts.selectedAdditionId = "";
    state.additionPrompts.promptTemplate = "";
    state.additionPrompts.originalPromptTemplate = "";
    return;
  }

  if (!items.some((item) => item.additionId === state.additionPrompts.selectedAdditionId)) {
    state.additionPrompts.selectedAdditionId = items[0].additionId;
  }

  const selectedItem = items.find((item) => item.additionId === state.additionPrompts.selectedAdditionId);
  if (!selectedItem) {
    return;
  }

  const normalizedTemplate = String(selectedItem.promptTemplate ?? "");
  state.additionPrompts.originalPromptTemplate = normalizedTemplate;
  if (resetText || state.additionPrompts.promptTemplate === "") {
    state.additionPrompts.promptTemplate = normalizedTemplate;
  }
}

function resetAdditionPromptEditor() {
  state.additionPrompts.promptTemplate = state.additionPrompts.originalPromptTemplate;
  state.additionPrompts.status = "未変更";
}

function isCurrentAdditionPromptDirty() {
  return String(state.additionPrompts.promptTemplate ?? "") !== String(state.additionPrompts.originalPromptTemplate ?? "");
}

async function saveSelectedAdditionPromptTemplate() {
  const selectedItem = getSelectedAdditionPromptSetting();
  if (!selectedItem || !selectedItem.additionId) {
    state.additionPrompts.status = "加算を選んでください";
    renderMasters();
    return;
  }

  if (!canUseApiAdditionPromptSettings()) {
    state.additionPrompts.status = "API接続後に保存できます";
    renderMasters();
    return;
  }

  state.additionPrompts.saving = true;
  state.additionPrompts.status = "保存中";
  renderMasters();

  try {
    await saveAdditionPromptTemplate(Number(selectedItem.additionId), state.additionPrompts.promptTemplate);
    await loadAdditionCatalogFromApi();
    await loadAdditionPromptSettingsFromApi({ force: true, preserveSelection: selectedItem.additionId });
    state.additionPrompts.status = "保存しました";
  } catch (error) {
    state.additionPrompts.status = error.message;
  } finally {
    state.additionPrompts.saving = false;
    renderMasters();
  }
}

function markJudgementDirty(options = {}) {
  state.judgement.saveStatus = "未保存";
  state.judgement.saveSummary = "保存待ち";
  state.judgement.lastSavedRecordId = "";
  if (options.resetNote !== false) {
    judgementSessionBridge.resetJudgementNoteState();
  }
}

async function saveJudgementEvaluation() {
  const snapshot = buildJudgementSnapshot();
  if (!snapshot.canSave) {
    state.judgement.saveStatus = snapshot.blockReason;
    renderJudgement();
    return;
  }

  state.judgement.saving = true;
  state.judgement.saveStatus = "保存中";
  renderJudgement();

  try {
    if (canUseApiJudgementSave()) {
      const response = await fetchApiJson(buildApiUrl("evaluation-cases.php"), {
        method: "POST",
        body: JSON.stringify(buildJudgementSavePayload(snapshot)),
      });

      state.judgement.lastSavedRecordId = String(response.item?.evaluation_case_id ?? "");
      state.judgement.saveStatus = state.judgement.lastSavedRecordId
        ? `保存しました (#${state.judgement.lastSavedRecordId})`
        : "保存しました";
      state.report.selectedRecordId = state.judgement.lastSavedRecordId || state.report.selectedRecordId;
      await loadReportRecordsFromApi();
      await loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
    } else {
      const savedRecord = saveJudgementEvaluationToSample(snapshot);
      state.judgement.lastSavedRecordId = savedRecord.recordId;
      state.judgement.saveStatus = `保存しました (${savedRecord.recordId})`;
      state.report.selectedRecordId = savedRecord.recordId;
      state.judgement.historyRecords = getSampleJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
      renderReport();
      renderQuickSearchStatus();
    }
  } catch (error) {
    state.judgement.saveStatus = error.message;
  } finally {
    state.judgement.saving = false;
    renderJudgement();
  }
}

async function createJudgementNoteDraft() {
  const snapshot = buildJudgementSnapshot();
  if (!snapshot.canSave) {
    state.judgement.noteDraftError = snapshot.blockReason;
    renderJudgementSave(snapshot);
    return;
  }

  if (!canUseApiNoteDraft()) {
    state.judgement.noteDraftError = state.dataSource.openaiReady
      ? "AI下書きAPIの利用条件が揃っていません"
      : "AI下書きはまだ設定されていません";
    renderJudgementSave(snapshot);
    return;
  }

  state.judgement.noteDrafting = true;
  state.judgement.noteDraftError = "";
  renderJudgementSave(snapshot);

  try {
    const response = await requestNoteDraft(buildJudgementNoteDraftPayload(snapshot));
    const item = response.item ?? {};
    state.judgement.noteMode = "ai";
    state.judgement.noteText = String(item.ai_draft_text ?? "").trim();
    state.judgement.notePromptText = String(item.prompt_text ?? "").trim();
    state.judgement.noteAiDraftText = String(item.ai_draft_text ?? "").trim();
    state.judgement.noteDraftError = "";
    markJudgementDirty({ resetNote: false });
  } catch (error) {
    state.judgement.noteDraftError = error.message;
  } finally {
    state.judgement.noteDrafting = false;
    renderJudgementSave(buildJudgementSnapshot());
  }
}

function buildJudgementSavePayload(snapshot) {
  return judgementSessionBridge.buildJudgementSavePayload(snapshot);
}

function buildJudgementNoteDraftPayload(snapshot) {
  return judgementSessionBridge.buildJudgementNoteDraftPayload(snapshot);
}

function buildJudgementSnapshot() {
  return judgementSessionBridge.buildJudgementSnapshot();
}

function buildJudgementRationale({ candidates, currentQuestion, topCandidate, organizationGroup, postCheckResult }) {
  return judgementSessionBridge.buildJudgementRationale({
    candidates,
    currentQuestion,
    topCandidate,
    organizationGroup,
    postCheckResult,
  });
}

function buildJudgementSaveNote({ client, organization, service, staff, candidates, topCandidate, finalStatus, postCheckResult }) {
  return judgementSessionBridge.buildJudgementSaveNote({
    client,
    organization,
    service,
    staff,
    candidates,
    topCandidate,
    finalStatus,
    postCheckResult,
  });
}

function evaluateJudgementPostChecks({ candidates, currentQuestion, topCandidate, organization }) {
  return judgementSessionBridge.evaluateJudgementPostChecks({
    candidates,
    currentQuestion,
    topCandidate,
    organization,
  });
}

function evaluatePostCheckRule(rule, context) {
  return judgementSessionBridge.evaluatePostCheckRule(rule, context);
}

function getJudgementHistoryRecordsForCandidate(candidate) {
  return judgementSessionBridge.getJudgementHistoryRecordsForCandidate(candidate);
}

function filterHistoryRecordsToCurrentService(records, currentServiceId) {
  return judgementSessionBridge.filterHistoryRecordsToCurrentService(records, currentServiceId);
}

function filterHistoryRecordsForRule(records, rule) {
  return judgementSessionBridge.filterHistoryRecordsForRule(records, rule);
}

function getResolvedReportRecordOrganizationGroup(record) {
  return judgementSessionBridge.getResolvedReportRecordOrganizationGroup(record);
}

function renderJudgementSave(snapshot) {
  if (state.judgement.saving) {
    dom.judgement.saveSummary.textContent = "保存中";
  } else if (state.judgement.lastSavedRecordId) {
    dom.judgement.saveSummary.textContent = `保存済み / 最新 #${state.judgement.lastSavedRecordId}`;
  } else {
    dom.judgement.saveSummary.textContent = snapshot.saveSummary;
  }

  const canDraft = canUseApiNoteDraft() && snapshot.canSave && !state.judgement.saving && !state.judgement.noteDrafting;
  const noteStatus = state.judgement.noteDrafting
    ? "AI下書き作成中"
    : state.judgement.noteMode === "ai"
      ? "AI下書き"
      : state.judgement.noteMode === "custom"
        ? "手入力"
        : "定型文";
  const noteHelpText = state.judgement.noteDraftError
    ? state.judgement.noteDraftError
    : state.judgement.noteDrafting
      ? "AI下書きを作成中です。完了すると保存文に反映します。"
      : state.judgement.noteMode === "ai"
        ? "AI下書きを反映しています。必要なら修正して保存できます。"
        : state.judgement.noteMode === "custom"
          ? "保存文を手入力しています。必要なら AI下書きで上書きできます。"
          : canUseApiNoteDraft()
            ? "定型文を初期表示しています。必要なら AI下書きを作成できます。"
            : state.dataSource.apiBaseUrl && state.dataSource.configReady && !state.dataSource.openaiReady
              ? "定型文を初期表示しています。AI下書きは未設定です。"
              : "定型文を初期表示しています。";

  dom.judgement.noteStatus.textContent = noteStatus;
  if (dom.judgement.noteText.value !== snapshot.noteText) {
    dom.judgement.noteText.value = snapshot.noteText;
  }
  dom.judgement.saveNote.textContent = noteHelpText;
  dom.judgement.saveStatus.textContent = state.judgement.saveStatus;
  dom.judgement.noteResetButton.disabled = state.judgement.noteDrafting || state.judgement.noteMode === "default";
  dom.judgement.aiDraftButton.disabled = !canDraft;
  dom.judgement.saveButton.disabled = state.judgement.saving || !snapshot.canSave || Boolean(state.judgement.lastSavedRecordId);
}

function canUseApiJudgementSave() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
    && state.dataSource.staffs === "api"
  );
}

function findMatchedJudgementEnrollment() {
  const enrollments = getClientEnrollments(state.judgement.clientId).filter((item) => (
    String(item.organizationId ?? "") === String(state.judgement.organizationId ?? "")
    && String(item.serviceId ?? "") === String(state.judgement.serviceId ?? "")
  ));

  if (enrollments.length === 1) {
    return enrollments[0];
  }

  if (enrollments.length > 1) {
    const groupIds = Array.from(new Set(enrollments.map((item) => String(item.serviceGroupId ?? ""))));
    return groupIds.length === 1 ? enrollments[0] : null;
  }

  return null;
}

function normalizeNumericId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

function saveJudgementEvaluationToSample(snapshot) {
  const recordId = `local-${Date.now()}`;
  const topCandidateReference = getJudgementCandidateReference(snapshot.topCandidate);
  const candidateStorageEntries = Array.isArray(snapshot.candidateStorageEntries)
    ? snapshot.candidateStorageEntries
    : buildJudgementCandidateStorageEntries(snapshot.candidates, snapshot.topCandidate);
  const record = {
    recordId,
    targetMonth: state.judgement.targetMonth,
    performedAt: snapshot.performedAt || "",
    clientId: snapshot.client.clientId,
    clientName: snapshot.client.clientName,
    targetType: snapshot.client.targetType ?? "-",
    organizationId: snapshot.organization.organizationId,
    organizationName: snapshot.organization.organizationName,
    serviceId: snapshot.service.serviceId,
    serviceName: snapshot.service.serviceName,
    staffId: snapshot.staff.staffId,
    staffName: snapshot.staff.staffName,
    actionType: state.judgement.answers.actionType || "",
    additionId: topCandidateReference.additionId,
    additionBranchId: topCandidateReference.additionBranchId,
    additionCode: topCandidateReference.additionCode,
    additionFamilyCode: topCandidateReference.additionFamilyCode,
    additionFamilyName: topCandidateReference.additionFamilyName,
    additionName: snapshot.displayAdditionName,
    resultStorageMode: topCandidateReference.resultStorageMode,
    candidateStorageMode: candidateStorageEntries.length > 0 ? "db" : "none",
    candidateCount: candidateStorageEntries.length,
    candidateNamesSummary: buildJudgementCandidateNamesSummary(candidateStorageEntries),
    candidateDetails: buildJudgementCandidateDetails(candidateStorageEntries),
    finalStatus: snapshot.finalStatus,
    postCheckStatus: snapshot.postCheckStatus,
    postCheckSummary: snapshot.postCheckSummary,
    evaluatedAt: formatCurrentDateTime(),
    rationale: snapshot.rationale,
    savedNote: snapshot.noteText,
  };

  state.report.records = [record, ...state.report.records];
  return record;
}

function formatCurrentDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function normalizePerformedAtForStorage(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace("T", " ")}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  return "";
}

function buildJudgementDisplayAdditionName(candidateStorageEntries, topCandidateReference) {
  return judgementSessionBridge.buildJudgementDisplayAdditionName(candidateStorageEntries, topCandidateReference);
}

function getJudgementCandidateReference(candidate) {
  return judgementReportBridge.getJudgementCandidateReference(candidate);
}

function buildJudgementCandidateNamesSummary(candidates) {
  return judgementReportBridge.buildJudgementCandidateNamesSummary(candidates);
}

function buildJudgementCandidateDetails(candidates) {
  return judgementReportBridge.buildJudgementCandidateDetails(candidates);
}

function buildJudgementCandidateStorageEntries(candidates, topCandidate, factsOverride = null) {
  return judgementReportBridge.buildJudgementCandidateStorageEntries(candidates, topCandidate, factsOverride);
}

async function deactivateOrganizationService(organizationServiceId) {
  const normalizedOrganizationServiceId = String(organizationServiceId ?? "");
  if (!normalizedOrganizationServiceId) {
    return;
  }

  const currentItems = getOrganizationServicesForSelectedOrganization();
  const targetItem = currentItems.find((item) => item.organizationServiceId === normalizedOrganizationServiceId);
  const targetLabel = targetItem ? buildServiceDisplayLabel(targetItem) : "この提供サービス";

  if (!window.confirm(`${targetLabel} を登録済み一覧から外します。よろしいですか。`)) {
    return;
  }

  if (!canUseApiRelations()) {
    deactivateSampleOrganizationService(normalizedOrganizationServiceId);
    state.relations.organizationServiceStatus = "登録解除しました";
    renderMasters();
    return;
  }

  state.relations.deactivatingOrganizationServiceId = normalizedOrganizationServiceId;
  state.relations.organizationServiceStatus = "解除中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("organization-services.php"), {
      method: "POST",
      body: JSON.stringify({
        action: "deactivate",
        organization_service_id: Number(normalizedOrganizationServiceId),
      }),
    });

    state.relations.organizationServiceStatus = "登録解除しました";
    await loadMastersFromApi();
    await loadOrganizationServices(state.relations.selectedOrganizationId, { force: true });
  } catch (error) {
    state.relations.organizationServiceStatus = error.message;
  } finally {
    state.relations.deactivatingOrganizationServiceId = "";
    renderMasters();
  }
}

async function deactivateClientEnrollment(clientEnrollmentId) {
  const normalizedClientEnrollmentId = String(clientEnrollmentId ?? "");
  if (!normalizedClientEnrollmentId) {
    return;
  }

  const clientId = state.relations.selectedClientId;
  const currentItems = getClientEnrollmentRelations(clientId);
  const targetItem = currentItems.find((item) => item.clientEnrollmentId === normalizedClientEnrollmentId);
  const targetLabel = targetItem
    ? `${targetItem.organizationName} / ${targetItem.serviceName}`
    : "この利用状況";

  if (!window.confirm(`${targetLabel} を利用状況一覧から外します。よろしいですか。`)) {
    return;
  }

  if (!canUseApiRelations()) {
    deactivateSampleClientEnrollment(normalizedClientEnrollmentId);
    state.relations.clientEnrollmentStatus = "登録解除しました";
    renderMasters();
    if (state.judgement.clientId === clientId) {
      renderJudgement();
    }
    return;
  }

  state.relations.deactivatingClientEnrollmentId = normalizedClientEnrollmentId;
  state.relations.clientEnrollmentStatus = "解除中";
  renderMasters();

  try {
    await fetchApiJson(buildApiUrl("client-enrollments.php"), {
      method: "POST",
      body: JSON.stringify({
        action: "deactivate",
        client_enrollment_id: Number(normalizedClientEnrollmentId),
      }),
    });

    state.relations.clientEnrollmentStatus = "登録解除しました";
    await loadClientEnrollments(clientId, { force: true });

    if (state.judgement.clientId === clientId && canUseApiJudgementContext()) {
      await loadJudgementContextFromApi(clientId);
    } else if (state.judgement.clientId === clientId) {
      renderJudgement();
    }
  } catch (error) {
    state.relations.clientEnrollmentStatus = error.message;
  } finally {
    state.relations.deactivatingClientEnrollmentId = "";
    renderMasters();
  }
}

function ensureRelationSelections() {
  const masterClients = getMasterClients();
  const masterOrganizations = getMasterOrganizations();

  if (!masterClients.some((client) => client.clientId === state.relations.selectedClientId)) {
    state.relations.selectedClientId = masterClients[0]?.clientId ?? "";
  }

  if (!masterOrganizations.some((organization) => organization.organizationId === state.relations.selectedOrganizationId)) {
    state.relations.selectedOrganizationId = masterOrganizations[0]?.organizationId ?? "";
  }

  if (!masterOrganizations.some((organization) => organization.organizationId === state.relations.clientOrganizationId)) {
    state.relations.clientOrganizationId = state.relations.selectedOrganizationId || masterOrganizations[0]?.organizationId || "";
  }

  syncRelationFormSelections();
}

function syncRelationFormSelections() {
  const servicesForOrganization = getOrganizationServicesForSelectedOrganization();
  if (!servicesForOrganization.some((item) => item.serviceId === state.relations.organizationServiceDefinitionId)) {
    const nextService = getAvailableServiceDefinitionsForOrganization(state.relations.selectedOrganizationId)[0];
    state.relations.organizationServiceDefinitionId = nextService?.serviceId ?? "";
  }

  const servicesForEnrollment = getOrganizationServicesForClientForm();
  if (!servicesForEnrollment.some((item) => item.organizationServiceId === state.relations.clientOrganizationServiceId)) {
    state.relations.clientOrganizationServiceId = servicesForEnrollment[0]?.organizationServiceId ?? "";
  }
}

function renderApp() {
  renderNavigation();
  renderActiveSection();
  renderQuickSearchStatus();
}

function renderNavigation() {
  for (const button of dom.navButtons) {
    button.classList.toggle("is-active", button.dataset.section === state.activeSection);
  }

  for (const panel of dom.panels) {
    panel.classList.toggle("is-visible", panel.dataset.sectionPanel === state.activeSection);
  }
}

function renderActiveSection() {
  renderJudgement();
  renderReport();
  renderMasters();
}

function renderJudgement() {
  pruneHiddenJudgementAnswers();
  const visibleClients = getFilteredClientsForJudgement();
  renderSelectOptions(dom.judgement.client, visibleClients, state.judgement.clientId, (item) => ({
    value: item.clientId,
    label: item.clientName,
  }));

  if (!visibleClients.some((item) => item.clientId === state.judgement.clientId)) {
    state.judgement.clientId = visibleClients[0]?.clientId ?? getJudgementClients()[0]?.clientId ?? "";
    syncJudgementStaffSelection();
    syncEnrollmentSelection();
  }

  dom.judgement.targetMonth.value = state.judgement.targetMonth;
  dom.judgement.performedAt.value = state.judgement.performedAt;

  const client = getClientById(state.judgement.clientId);
  const staffs = getJudgementStaffs();
  if (!staffs.some((item) => item.staffId === state.judgement.staffId)) {
    state.judgement.staffId = resolveDefaultJudgementStaffId();
  }

  renderSelectOptions(dom.judgement.staff, staffs, state.judgement.staffId, (item) => ({
    value: item.staffId,
    label: item.staffName,
  }));

  const selectedStaff = getStaffById(state.judgement.staffId);
  const hasEnrollmentContext = hasClientEnrollmentContext(state.judgement.clientId);
  const organizations = getSelectableOrganizationsForJudgement(state.judgement.clientId);

  if (!organizations.some((item) => item.organizationId === state.judgement.organizationId)) {
    state.judgement.organizationId = organizations[0]?.organizationId ?? "";
  }

  renderSelectOptions(dom.judgement.organization, organizations, state.judgement.organizationId, (item) => ({
    value: item.organizationId,
    label: item.organizationName,
  }), "判定対象機関なし");

  const services = getSelectableServicesForJudgement(state.judgement.clientId, state.judgement.organizationId);

  if (!services.some((item) => item.serviceId === state.judgement.serviceId)) {
    state.judgement.serviceId = services[0]?.serviceId ?? "";
  }

  renderSelectOptions(dom.judgement.service, services, state.judgement.serviceId, (item) => ({
    value: item.serviceId,
    label: item.serviceName,
  }), "判定対象サービスなし");

  const organization = getOrganizationById(state.judgement.organizationId);
  const service = getServiceById(state.judgement.serviceId);
  const serviceDecisionCategories = getServiceDecisionCategories(service, organization);
  dom.judgement.clientTarget.textContent = client ? `${client.targetType}対象` : "";
  dom.judgement.staffHome.textContent = selectedStaff
    ? `所属: ${selectedStaff.homeOrganizationName ?? "-"}`
    : "ログイン連携の初期値から選択";
  dom.judgement.organizationGroup.textContent = organization
    ? getOrganizationGroupLabel(organization, service)
    : (hasEnrollmentContext ? "" : "利用状況未登録");
  dom.judgement.serviceCategory.textContent = service
    ? buildServiceMetaLabel(service, serviceDecisionCategories)
    : (hasEnrollmentContext ? "" : "対象に合うサービスから選択");

  if (state.judgement.loadingContext) {
    dom.judgement.status.textContent = "利用状況 読込中";
    dom.judgement.questionLabel.textContent = "利用者の利用状況を読み込み中です";
    dom.judgement.questionMeta.textContent = "APIから利用機関とサービスを確認しています";
    dom.judgement.questionHelper.textContent = "少し待つと、その利用者に紐づく機関・サービスが反映されます。相談員は別に選べます。";
    dom.judgement.options.innerHTML = `<div class="empty-state">利用状況を読み込み中です。</div>`;
    dom.judgement.prevButton.disabled = true;
    renderCandidateList([]);
    renderJudgementAnswerTags(client, organization, service, selectedStaff);
    dom.judgement.resultMain.textContent = "読込中";
    dom.judgement.resultCheck.textContent = "-";
    dom.judgement.resultNext.textContent = "利用状況の反映待ち";
    renderJudgementSave(buildJudgementSnapshot());
    return;
  }

  if (organizations.length === 0 || services.length === 0) {
    dom.judgement.status.textContent = "判定対象なし";
    dom.judgement.questionLabel.textContent = "加算判定の対象サービスがありません";
    dom.judgement.questionMeta.textContent = "相談支援は判定対象外";
    dom.judgement.questionHelper.textContent = hasEnrollmentContext
      ? "この利用者の利用状況には、加算判定の対象になる機関・サービスがありません。利用状況か機関サービス登録を見直してください。"
      : "この利用者について選べる加算判定対象サービスがありません。相談支援は判定画面から除外しています。";
    dom.judgement.options.innerHTML = '<div class="empty-state">判定対象サービスなし</div>';
    dom.judgement.prevButton.disabled = state.judgement.history.length === 0;
    renderCandidateList([]);
    renderJudgementAnswerTags(client, organization, service, selectedStaff);
    dom.judgement.resultMain.textContent = "対象なし";
    dom.judgement.resultCheck.textContent = "-";
    dom.judgement.resultNext.textContent = "判定対象の機関・サービスを見直してください";
    renderJudgementSave(buildJudgementSnapshot());
    return;
  }

  const candidates = getJudgementCandidates();
  const questions = getVisibleQuestions();
  const currentQuestion = questions.find((question) => !state.judgement.answers[question.key]);
  const initialCandidateCount = getBaseJudgementCandidates().length;
  dom.judgement.status.textContent = hasEnrollmentContext
    ? `候補 ${initialCandidateCount}件 -> ${candidates.length}件`
    : `候補 ${initialCandidateCount}件 -> ${candidates.length}件 / 利用状況未登録`;

  if (candidates.length === 0 || !currentQuestion) {
    dom.judgement.questionLabel.textContent = candidates.length === 0 ? "条件に合う候補がありません" : "必要な設問はここまでです";
    dom.judgement.questionMeta.textContent = "説明表示: 管理者設定";
    dom.judgement.questionHelper.textContent = candidates.length === 0
      ? buildJudgementContextHelp(hasEnrollmentContext, "利用者・機関・サービスの選択か、ひとつ前の回答を見直すと候補が戻る可能性があります。")
      : buildJudgementContextHelp(hasEnrollmentContext, "残った候補に対して、回数制限や併算定不可などの後段チェックへ進みます。");
    dom.judgement.options.innerHTML = `<div class="empty-state">${candidates.length === 0 ? "候補が0件になりました。" : "次は後段チェックです。"}</div>`;
  } else {
    dom.judgement.questionLabel.textContent = currentQuestion.label;
    dom.judgement.questionMeta.textContent = "説明表示: 管理者設定で折りたたみ/非表示";
    dom.judgement.questionHelper.textContent = buildJudgementContextHelp(hasEnrollmentContext, currentQuestion.helper);
    renderJudgementOptions(currentQuestion);
  }

  dom.judgement.prevButton.disabled = state.judgement.history.length === 0;
  renderCandidateList(candidates);
  renderJudgementAnswerTags(client, organization, service, selectedStaff);
  const snapshot = buildJudgementSnapshot();
  renderJudgementResult(snapshot);
  renderJudgementSave(snapshot);
}

function renderJudgementOptions(question) {
  const options = getQuestionDisplayOptions(question);
  dom.judgement.options.innerHTML = options.map((option) => `
    <button type="button" class="option-card" data-question-key="${question.key}" data-option-value="${option.value}">
      <span class="option-title">${escapeHtml(option.label ?? option.value)}</span>
      <span class="option-note">${escapeHtml(option.note ?? "")}</span>
    </button>
  `).join("");

  for (const button of dom.judgement.options.querySelectorAll(".option-card")) {
    button.addEventListener("click", () => {
      const questionKey = button.dataset.questionKey;
      const optionValue = button.dataset.optionValue;
      markJudgementDirty();
      state.judgement.answers[questionKey] = optionValue;

      if (state.judgement.history[state.judgement.history.length - 1] !== questionKey) {
        state.judgement.history.push(questionKey);
      }

      if (questionKey === "placeType") {
        state.judgement.answers.actionType = "";
        state.judgement.history = state.judgement.history.filter((item) => item !== "actionType");
      }

      renderJudgement();
    });
  }
}

function renderCandidateList(candidates) {
  if (candidates.length === 0) {
    dom.judgement.candidates.innerHTML = `<li><strong>候補なし</strong><span>現在の条件では該当加算が残っていません。</span></li>`;
    return;
  }

  dom.judgement.candidates.innerHTML = candidates.map((candidate) => `
    <li>
      <div class="candidate-title-row">
        <strong>${escapeHtml(candidate.additionName)}</strong>
        ${buildCandidateStatusBadge(candidate)}
      </div>
      <span>${escapeHtml(candidate.reason)}</span>
      ${buildCandidateRuleBlock("確定条件", candidate.confirmedRules)}
      ${buildCandidateRuleBlock("仮置き", candidate.provisionalRules)}
    </li>
  `).join("");
}

function buildCandidateStatusBadge(candidate) {
  if (!candidate.ruleStatus) {
    return "";
  }

  const tone = candidate.ruleStatus.includes("仮置き")
    ? "warning"
    : candidate.ruleStatus.includes("一部")
      ? "caution"
      : "confirmed";

  return `<span class="candidate-badge candidate-badge-${tone}">${escapeHtml(candidate.ruleStatus)}</span>`;
}

function buildCandidateRuleBlock(label, rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return "";
  }

  const items = rules.slice(0, 2).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  return `
    <div class="candidate-rule-block">
      <span class="candidate-rule-label">${escapeHtml(label)}</span>
      <ul class="candidate-rule-list">${items}</ul>
    </div>
  `;
}

function renderJudgementAnswerTags(client, organization, service, staff) {
  const tags = [];
  if (client) {
    tags.push(`${client.clientName} / ${client.targetType}`);
  }
  if (staff) {
    tags.push(`相談員: ${staff.staffName}`);
  }
  if (organization) {
    tags.push(getOrganizationGroupLabel(organization, service));
  }
  if (service) {
    tags.push(`${service.serviceName} / ${service.serviceCategory}`);
  }
  for (const key of state.judgement.history) {
    if (state.judgement.answers[key]) {
      tags.push(state.judgement.answers[key]);
    }
  }
  dom.judgement.answers.innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function renderJudgementResult(snapshot) {
  const { candidates, currentQuestion } = snapshot;
  if (candidates.length === 0) {
    dom.judgement.resultMain.textContent = "候補なし";
    dom.judgement.resultCheck.textContent = "前の条件を見直す";
    dom.judgement.resultNext.textContent = "機関・サービス・回答のどこで外れたか確認";
    return;
  }

  const topCandidate = snapshot.topCandidate;
  if (candidates.length === 1 && currentQuestion) {
    dom.judgement.resultMain.textContent = `${topCandidate.additionName} (確認中)`;
    dom.judgement.resultCheck.textContent = `まず「${currentQuestion.label}」に回答してください。`;
    dom.judgement.resultNext.textContent = `次の設問: ${currentQuestion.label}`;
    return;
  }

  if (candidates.length === 1) {
    dom.judgement.resultMain.textContent = topCandidate.additionName;
    dom.judgement.resultCheck.textContent = snapshot.postCheckSummary;
    dom.judgement.resultNext.textContent = snapshot.postCheckNextAction;
    return;
  }

  dom.judgement.resultMain.textContent = `${candidates.length}件の候補が残っています`;
  dom.judgement.resultCheck.textContent = snapshot.postCheckSummary;
  dom.judgement.resultNext.textContent = currentQuestion ? `次の設問: ${currentQuestion.label}` : snapshot.postCheckNextAction;
}

function renderReport() {
  writeReportFiltersToInputs();
  const activeView = state.report.views[state.report.activeViewCode];
  dom.report.activeViewLabel.textContent = `表示設定: ${activeView.name}`;
  dom.report.selectedColumn.textContent = `選択列: ${state.report.selectedColumnKey ? columnCatalog[state.report.selectedColumnKey].label : "なし"}`;
  renderReportViewButtons();
  renderReportViewSummary(activeView);

  const records = getFilteredReportRecords();
  ensureSelectedReportRecord(records);
  renderReportTable(activeView, records);
  renderReportDetails(records);
  dom.report.resultCount.textContent = state.report.loading ? "読込中" : `${records.length}件`;
}

function renderReportViewButtons() {
  dom.report.viewButtons.innerHTML = Object.entries(state.report.views).map(([viewCode, view]) => `
    <button type="button" class="view-button${viewCode === state.report.activeViewCode ? " is-active" : ""}" data-view-code="${viewCode}">
      ${escapeHtml(view.name)}
    </button>
  `).join("");

  for (const button of dom.report.viewButtons.querySelectorAll(".view-button")) {
    button.addEventListener("click", () => {
      void reportStateBridge.activateReportView(button.dataset.viewCode);
    });
  }
}

function renderReportViewSummary(activeView) {
  const filterSummary = Object.entries(activeView.savedFilters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${getFilterLabel(key)}: ${value}`);
  const tags = [activeView.name, `列数 ${activeView.columns.length}`, ...(filterSummary.length > 0 ? filterSummary : ["保存条件なし"])];
  dom.report.viewSummary.innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function renderReportTable(activeView, records) {
  dom.report.tableHead.innerHTML = activeView.columns.map((columnKey) => `
    <th class="${columnKey === state.report.selectedColumnKey ? "is-selected-column" : ""}">
      <button type="button" class="table-head-button" data-column-key="${columnKey}">
        ${escapeHtml(columnCatalog[columnKey].label)}
      </button>
    </th>
  `).join("");

  for (const button of dom.report.tableHead.querySelectorAll(".table-head-button")) {
    button.addEventListener("click", () => {
      state.report.selectedColumnKey = button.dataset.columnKey;
      renderReport();
    });
  }

  if (records.length === 0) {
    dom.report.tableBody.innerHTML = `<tr><td colspan="${activeView.columns.length}"><div class="empty-state">条件に合う記録がありません。</div></td></tr>`;
    return;
  }

  dom.report.tableBody.innerHTML = records.map((record) => `
    <tr class="${record.recordId === state.report.selectedRecordId ? "is-current-row" : ""}" data-record-id="${record.recordId}">
      ${activeView.columns.map((columnKey) => `<td>${escapeHtml(columnCatalog[columnKey].getValue(record))}</td>`).join("")}
    </tr>
  `).join("");

  for (const row of dom.report.tableBody.querySelectorAll("tr[data-record-id]")) {
    row.addEventListener("click", () => {
      state.report.selectedRecordId = row.dataset.recordId;
      renderReport();
    });
  }
}

function renderReportDetails(records) {
  const selectedRecord = records.find((record) => record.recordId === state.report.selectedRecordId);
  if (!selectedRecord) {
    dom.report.detailClient.textContent = "-";
    dom.report.detailPerformedAt.textContent = "-";
    dom.report.detailAddition.textContent = "-";
    dom.report.detailIdentity.textContent = "-";
    dom.report.detailEvaluatedAt.textContent = "-";
    dom.report.detailPostCheck.textContent = "-";
    dom.report.detailCandidates.textContent = "-";
    dom.report.detailCandidates.classList.remove("detail-text-block");
    dom.report.detailRationale.textContent = "-";
    dom.report.detailNote.textContent = "-";
    return;
  }

  dom.report.detailClient.textContent = `${selectedRecord.clientName} / ${selectedRecord.targetType}`;
  dom.report.detailPerformedAt.textContent = selectedRecord.performedAt || "-";
  dom.report.detailAddition.textContent = `${selectedRecord.additionName} (${selectedRecord.finalStatus}${selectedRecord.candidateCount > 1 ? ` / ${selectedRecord.candidateCount}候補` : ""})`;
  dom.report.detailIdentity.textContent = formatReportIdentity(selectedRecord);
  dom.report.detailEvaluatedAt.textContent = selectedRecord.evaluatedAt || "-";
  dom.report.detailPostCheck.textContent = selectedRecord.postCheckSummary || "-";
  const candidateDetailText = formatReportCandidateDetails(selectedRecord);
  dom.report.detailCandidates.textContent = candidateDetailText;
  dom.report.detailCandidates.classList.toggle("detail-text-block", candidateDetailText !== "-");
  dom.report.detailRationale.textContent = selectedRecord.rationale;
  dom.report.detailNote.textContent = selectedRecord.savedNote;
}

function renderMasters() {
  ensureRelationSelections();
  renderClientTable();
  renderOrganizationTable();
  renderClientEnrollmentPanel();
  renderOrganizationServicePanel();
  renderServiceTable();
  renderAdditionPromptPanel();
}

function renderClientTable() {
  const rows = getMasterClients().filter((client) => matchesQuickSearch([
    client.clientName,
    client.clientNameKana,
    client.targetType,
  ]));

  if (rows.length === 0) {
    state.relations.selectedClientId = "";
  } else if (!rows.some((client) => client.clientId === state.relations.selectedClientId)) {
    state.relations.selectedClientId = rows[0].clientId;
    state.relations.clientEnrollmentStatus = "未保存";
    void loadClientEnrollments(state.relations.selectedClientId);
  }

  dom.masters.clientsCount.textContent = `${rows.length}件`;
  dom.masters.clientsBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="3"><div class="empty-state">該当する利用者がありません。</div></td></tr>`
    : rows.map((client) => `
      <tr class="${client.clientId === state.relations.selectedClientId ? "is-current-row" : ""}" data-client-id="${escapeHtml(client.clientId)}">
        <td>${escapeHtml(client.clientName)}</td>
        <td>${escapeHtml(client.clientNameKana)}</td>
        <td>${escapeHtml(client.targetType)}</td>
      </tr>
    `).join("");

  for (const row of dom.masters.clientsBody.querySelectorAll("tr[data-client-id]")) {
    row.addEventListener("click", () => {
      state.relations.selectedClientId = row.dataset.clientId;
      state.relations.clientEnrollmentStatus = "未保存";
      renderMasters();
      void loadClientEnrollments(state.relations.selectedClientId);
    });
  }
}

function renderOrganizationTable() {
  const rows = getMasterOrganizations().filter((organization) => matchesQuickSearch([
    organization.organizationName,
    getDisplayOrganizationType(organization),
    getOrganizationGroupLabel(organization),
    getOrganizationServiceSummary(organization),
  ]));

  if (rows.length === 0) {
    state.relations.selectedOrganizationId = "";
  } else if (!rows.some((organization) => organization.organizationId === state.relations.selectedOrganizationId)) {
    state.relations.selectedOrganizationId = rows[0].organizationId;
    state.relations.organizationServiceStatus = "未保存";
    if (!state.relations.clientOrganizationId) {
      state.relations.clientOrganizationId = rows[0].organizationId;
    }
    void loadOrganizationServices(state.relations.selectedOrganizationId);
  }

  dom.masters.organizationsCount.textContent = `${rows.length}件`;
  dom.masters.organizationsBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="4"><div class="empty-state">該当する機関がありません。</div></td></tr>`
    : rows.map((organization) => `
      <tr class="${organization.organizationId === state.relations.selectedOrganizationId ? "is-current-row" : ""}" data-organization-id="${escapeHtml(organization.organizationId)}">
        <td>${escapeHtml(organization.organizationName)}</td>
        <td>${escapeHtml(getDisplayOrganizationType(organization))}</td>
        <td>${escapeHtml(getOrganizationGroupLabel(organization))}</td>
        <td>${escapeHtml(getOrganizationServiceSummary(organization))}</td>
      </tr>
    `).join("");

  for (const row of dom.masters.organizationsBody.querySelectorAll("tr[data-organization-id]")) {
    row.addEventListener("click", () => {
      state.relations.selectedOrganizationId = row.dataset.organizationId;
      state.relations.organizationServiceStatus = "未保存";
      renderMasters();
      void loadOrganizationServices(state.relations.selectedOrganizationId);
    });
  }
}

function renderClientEnrollmentPanel() {
  const client = getClientById(state.relations.selectedClientId);
  const organizations = getMasterOrganizations();
  const clientEnrollments = getClientEnrollmentRelations(state.relations.selectedClientId);
  const organizationServices = getOrganizationServicesForClientForm();

  dom.masters.clientSelected.textContent = client ? `${client.clientName}` : "利用者を選択してください";
  dom.masters.clientSelectedTarget.textContent = client ? `${client.targetType}対象` : "-";

  renderSelectOptions(
    dom.masters.clientEnrollmentOrganization,
    organizations,
    state.relations.clientOrganizationId,
    (organization) => ({
      value: organization.organizationId,
      label: organization.organizationName,
    }),
  );

  renderSelectOptions(
    dom.masters.clientEnrollmentOrganizationService,
    organizationServices,
    state.relations.clientOrganizationServiceId,
    (item) => ({
      value: item.organizationServiceId,
      label: buildServiceDisplayLabel(item),
    }),
  );

  dom.masters.clientEnrollmentGroupName.value = state.relations.clientEnrollmentGroupName;
  dom.masters.clientEnrollmentStatus.textContent = state.relations.clientEnrollmentStatus;
  dom.masters.clientEnrollmentSave.disabled = !state.relations.selectedClientId || !state.relations.clientOrganizationServiceId || state.relations.savingClientEnrollment || Boolean(state.relations.deactivatingClientEnrollmentId);

  if (state.relations.loadingOrganizationServicesForId === state.relations.clientOrganizationId) {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "機関サービスを読み込み中です。";
  } else if (organizationServices.length === 0) {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "先に機関画面で、その機関の提供サービスを登録してください。";
  } else {
    dom.masters.clientEnrollmentOrganizationServiceHelp.textContent = "この機関に登録済みのサービスから選びます。";
  }

  dom.masters.clientEnrollmentList.innerHTML = renderRelationItems(
    clientEnrollments,
    (item) => `${item.organizationName} / ${item.serviceName}`,
    (item) => {
      const details = [
        item.groupName && item.groupName !== "-" ? `グループ: ${item.groupName}` : "",
      ].filter(Boolean);
      return details.length > 0 ? details.join(" / ") : "グループ未設定";
    },
    state.relations.loadingClientEnrollmentsForId === state.relations.selectedClientId
      ? "利用状況を読み込み中です。"
      : "この利用者の利用状況はまだありません。",
    {
      actionType: "deactivate-client-enrollment",
      idKey: "clientEnrollmentId",
      getLabel: (item) => state.relations.deactivatingClientEnrollmentId === item.clientEnrollmentId ? "解除中" : "登録解除",
      isDisabled: (item) => state.relations.deactivatingClientEnrollmentId === item.clientEnrollmentId || state.relations.savingClientEnrollment,
    }
  );
  bindRelationActionButtons(dom.masters.clientEnrollmentList);
}

function renderOrganizationServicePanel() {
  const organization = getOrganizationById(state.relations.selectedOrganizationId);
  const organizationServices = getOrganizationServicesForSelectedOrganization();
  const availableServices = getAvailableServiceDefinitionsForOrganization(state.relations.selectedOrganizationId);

  dom.masters.organizationSelected.textContent = organization
    ? organization.organizationName
    : "機関を選択してください";
  dom.masters.organizationSelectedGroup.textContent = organization
    ? `${getDisplayOrganizationType(organization)} / ${getOrganizationGroupLabel(organization)}`
    : "-";

  renderSelectOptions(
    dom.masters.organizationServiceDefinition,
    availableServices,
    state.relations.organizationServiceDefinitionId,
    (service) => ({
      value: service.serviceId,
      label: buildServiceDisplayLabel(service),
    }),
  );

  dom.masters.organizationServiceStatus.textContent = state.relations.organizationServiceStatus;
  dom.masters.organizationServiceSave.disabled = !state.relations.selectedOrganizationId || !state.relations.organizationServiceDefinitionId || state.relations.savingOrganizationService || Boolean(state.relations.deactivatingOrganizationServiceId);

  dom.masters.organizationServiceList.innerHTML = renderRelationItems(
    organizationServices,
    (item) => item.serviceName,
    (item) => {
      const details = [
        item.serviceCategory || "",
        item.targetScope ? `対象範囲: ${item.targetScope}` : "",
        item.groupNames && item.groupNames !== "-" ? `グループ: ${item.groupNames}` : "",
      ].filter(Boolean);
      return details.length > 0 ? details.join(" / ") : "グループ未設定";
    },
    state.relations.loadingOrganizationServicesForId === state.relations.selectedOrganizationId
      ? "提供サービスを読み込み中です。"
      : "この機関の提供サービスはまだありません。",
    {
      actionType: "deactivate-organization-service",
      idKey: "organizationServiceId",
      getLabel: (item) => state.relations.deactivatingOrganizationServiceId === item.organizationServiceId ? "解除中" : "登録解除",
      isDisabled: (item) => state.relations.deactivatingOrganizationServiceId === item.organizationServiceId || state.relations.savingOrganizationService,
    }
  );
  bindRelationActionButtons(dom.masters.organizationServiceList);
}

function renderServiceTable() {
  const rows = getMasterServices().filter((service) => matchesQuickSearch([
    service.serviceName,
    service.serviceCategory,
    service.targetScope,
    service.groupName,
  ]));
  dom.masters.servicesCount.textContent = `${rows.length}件`;
  dom.masters.servicesBody.innerHTML = rows.length === 0
    ? `<tr><td colspan="4"><div class="empty-state">該当するサービスがありません。</div></td></tr>`
    : rows.map((service) => `
      <tr>
        <td>${escapeHtml(service.serviceName)}</td>
        <td>${escapeHtml(service.serviceCategory)}</td>
        <td>${escapeHtml(service.targetScope)}</td>
        <td>${escapeHtml(service.groupName)}</td>
      </tr>
    `).join("");
}

function renderAdditionPromptStatusOnly() {
  if (!dom.masters.additionPromptStatus) {
    return;
  }
  dom.masters.additionPromptStatus.textContent = state.additionPrompts.status;
}

function renderAdditionPromptPanel() {
  const items = getAdditionPromptSettingItems();
  syncAdditionPromptSelection();

  const selectedItem = getSelectedAdditionPromptSetting();
  const canEdit = canUseApiAdditionPromptSettings() && !state.additionPrompts.loading && !state.additionPrompts.saving && Boolean(selectedItem);

  renderSelectOptions(
    dom.masters.additionPromptAddition,
    items,
    state.additionPrompts.selectedAdditionId,
    (item) => ({
      value: item.additionId,
      label: item.additionName,
    }),
    "加算がありません"
  );

  dom.masters.additionPromptSelected.textContent = selectedItem ? selectedItem.additionName : "加算を選択してください";
  dom.masters.additionPromptSelectedCode.textContent = selectedItem
    ? `${selectedItem.additionCode}${selectedItem.hasPromptTemplate ? " / 設定あり" : " / 共通文"}`
    : "-";
  dom.masters.additionPromptTemplate.value = state.additionPrompts.promptTemplate;
  dom.masters.additionPromptTemplate.disabled = !canEdit;
  dom.masters.additionPromptReset.disabled = !selectedItem || state.additionPrompts.saving;
  dom.masters.additionPromptSave.disabled = !canEdit || !isCurrentAdditionPromptDirty();

  if (state.additionPrompts.loading) {
    dom.masters.additionPromptHelp.textContent = "AI指示文設定を読み込み中です。";
  } else if (!selectedItem) {
    dom.masters.additionPromptHelp.textContent = "加算がまだありません。";
  } else if (!canUseApiAdditionPromptSettings()) {
    dom.masters.additionPromptHelp.textContent = "API接続後に保存できます。空欄なら共通の指示文を使います。";
  } else {
    dom.masters.additionPromptHelp.textContent = "この加算だけ、AI下書きの書きぶりを変えたいときに使います。空欄なら共通文です。";
  }

  const listItems = items.filter((item) => matchesQuickSearch([
    item.additionName,
    item.additionCode,
    item.hasPromptTemplate ? "設定あり" : "共通文",
  ], state.activeSection === "services"));

  dom.masters.additionPromptList.innerHTML = listItems.length === 0
    ? `<div class="empty-state">該当する加算がありません。</div>`
    : listItems.map((item) => `
      <button
        type="button"
        class="relation-item relation-item-button${item.additionId === state.additionPrompts.selectedAdditionId ? " is-current" : ""}"
        data-addition-prompt-id="${escapeHtml(item.additionId)}"
      >
        <div class="relation-item-head">
          <strong>${escapeHtml(item.additionName)}</strong>
        </div>
        <span>${escapeHtml(item.hasPromptTemplate ? "設定あり" : "共通文を使用")} / ${escapeHtml(item.additionCode)}</span>
      </button>
    `).join("");

  for (const button of dom.masters.additionPromptList.querySelectorAll("[data-addition-prompt-id]")) {
    button.addEventListener("click", () => {
      state.additionPrompts.selectedAdditionId = button.dataset.additionPromptId || "";
      syncAdditionPromptSelection({ resetText: true });
      state.additionPrompts.status = "未変更";
      renderMasters();
    });
  }

  renderAdditionPromptStatusOnly();
}

function renderQuickSearchStatus() {
  if (!state.quickSearch) {
    dom.quickSearchStatus.textContent = "現在の画面だけに反映";
    return;
  }
  if (state.activeSection === "judgement") {
    dom.quickSearchStatus.textContent = `判定画面の利用者候補 ${getFilteredClientsForJudgement().length}件`;
    return;
  }
  if (state.activeSection === "report") {
    dom.quickSearchStatus.textContent = state.report.loading
      ? "集計結果 読込中"
      : `集計結果 ${getFilteredReportRecords().length}件`;
    return;
  }
  if (state.activeSection === "clients") {
    dom.quickSearchStatus.textContent = `利用者 ${dom.masters.clientsCount.textContent}`;
    return;
  }
  if (state.activeSection === "organizations") {
    dom.quickSearchStatus.textContent = `機関 ${dom.masters.organizationsCount.textContent}`;
    return;
  }
  dom.quickSearchStatus.textContent = `サービス ${dom.masters.servicesCount.textContent}`;
}

function renderRelationItems(items, titleGetter, detailGetter, emptyMessage, actionConfig = null) {
  if (items.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
  }

  return items.map((item) => `
    <div class="relation-item">
      <div class="relation-item-head">
        <strong>${escapeHtml(titleGetter(item))}</strong>
        ${actionConfig ? `
          <button
            type="button"
            class="secondary-button compact-button danger-button relation-action-button"
            data-action-type="${escapeHtml(actionConfig.actionType)}"
            data-relation-id="${escapeHtml(String(item[actionConfig.idKey] ?? ""))}"
            ${actionConfig.isDisabled && actionConfig.isDisabled(item) ? "disabled" : ""}
          >${escapeHtml(actionConfig.getLabel ? actionConfig.getLabel(item) : "登録解除")}</button>
        ` : ""}
      </div>
      <span>${escapeHtml(detailGetter(item))}</span>
    </div>
  `).join("");
}

function bindRelationActionButtons(container) {
  if (!container) {
    return;
  }

  for (const button of container.querySelectorAll(".relation-action-button")) {
    button.addEventListener("click", () => {
      const relationId = button.dataset.relationId;
      const actionType = button.dataset.actionType;

      if (actionType === "deactivate-organization-service") {
        void deactivateOrganizationService(relationId);
        return;
      }

      if (actionType === "deactivate-client-enrollment") {
        void deactivateClientEnrollment(relationId);
      }
    });
  }
}

function getOrganizationServicesForSelectedOrganization() {
  return getOrganizationServicesForOrganization(state.relations.selectedOrganizationId);
}

function getOrganizationServicesForOrganization(organizationId) {
  return masterDataBridge.getOrganizationServicesForOrganization(organizationId);
}

function getOrganizationServicesForClientForm() {
  return getOrganizationServicesForOrganization(state.relations.clientOrganizationId);
}

function getClientEnrollmentRelations(clientId) {
  return masterDataBridge.getClientEnrollmentRelations(clientId);
}

function getAvailableServiceDefinitionsForOrganization(organizationId) {
  return masterDataBridge.getAvailableServiceDefinitionsForOrganization(organizationId);
}

function buildServiceDisplayLabel(service) {
  const parts = [
    service.serviceName || "-",
    service.serviceCategory || "-",
  ];

  if (service.targetScope) {
    parts.push(service.targetScope);
  }

  return parts.join(" / ");
}

function buildServiceMetaLabel(service, serviceDecisionCategories = []) {
  const parts = [
    service.serviceCategory || "-",
    service.groupName || service.constraintGroupCode || "-",
  ];

  if (serviceDecisionCategories.length > 0) {
    parts.push(`判定区分: ${serviceDecisionCategories.join("・")}`);
  }

  return parts.join(" / ");
}

function buildSampleOrganizationServices(organizationId) {
  return masterDataBridge.buildSampleOrganizationServices(organizationId);
}

function deactivateSampleOrganizationService(organizationServiceId) {
  Object.keys(state.relations.organizationServicesByOrganizationId).forEach((organizationId) => {
    const items = state.relations.organizationServicesByOrganizationId[organizationId];
    if (!Array.isArray(items)) {
      return;
    }

    state.relations.organizationServicesByOrganizationId[organizationId] = items.filter(
      (item) => item.organizationServiceId !== organizationServiceId,
    );
  });
}

function buildSampleClientEnrollments(clientId) {
  return masterDataBridge.buildSampleClientEnrollments(clientId);
}

function deactivateSampleClientEnrollment(clientEnrollmentId) {
  Object.keys(state.relations.clientEnrollmentsByClientId).forEach((clientId) => {
    const items = state.relations.clientEnrollmentsByClientId[clientId];
    if (!Array.isArray(items)) {
      return;
    }

    state.relations.clientEnrollmentsByClientId[clientId] = items.filter(
      (item) => item.clientEnrollmentId !== clientEnrollmentId,
    );
  });
}

function matchesServiceTargetScope(serviceTargetScope, clientTargetType) {
  return masterDataBridge.matchesServiceTargetScope(serviceTargetScope, clientTargetType);
}

function isJudgementEligibleService(service) {
  return masterDataBridge.isJudgementEligibleService(service);
}

function filterJudgementEligibleServicesForClient(client, services) {
  return masterDataBridge.filterJudgementEligibleServicesForClient(client, services);
}

function getFilteredClientsForJudgement() {
  const quickSearch = normalizeText(state.quickSearch);
  const clients = getJudgementClients();
  if (!quickSearch || state.activeSection !== "judgement") {
    return clients;
  }
  return clients.filter((client) => normalizeText(`${client.clientName} ${client.clientNameKana}`).includes(quickSearch));
}

function getClientEnrollments(clientId) {
  return masterDataBridge.getClientEnrollments(clientId);
}

function hasClientEnrollmentContext(clientId) {
  return masterDataBridge.hasClientEnrollmentContext(clientId);
}

function getSelectableOrganizationsForJudgement(clientId) {
  return masterDataBridge.getSelectableOrganizationsForJudgement(clientId);
}

function getSelectableServicesForJudgement(clientId, organizationId) {
  return masterDataBridge.getSelectableServicesForJudgement(clientId, organizationId);
}

function getServiceDecisionCategories(service, organization = null) {
  return judgementEngineBridge.getServiceDecisionCategories(service, organization);
}

function buildJudgementContextHelp(hasEnrollmentContext, baseText) {
  if (hasEnrollmentContext) {
    return baseText;
  }
  return `${baseText} この利用者の利用状況がまだ未登録のため、機関とサービスは全マスタから選択しています。`;
}

function getBaseJudgementCandidates() {
  return judgementEngineBridge.getBaseJudgementCandidates();
}

function getJudgementCandidates() {
  return judgementEngineBridge.getJudgementCandidates();
}

function getJudgementCandidatesExcludingAnswers(answerKeys) {
  return judgementEngineBridge.getJudgementCandidatesExcludingAnswers(answerKeys);
}

function getJudgementFacts(includeAnswers, ignoredAnswerKeys = []) {
  return judgementEngineBridge.getJudgementFacts(includeAnswers, ignoredAnswerKeys);
}

function candidateMatches(candidate, facts) {
  return judgementEngineBridge.candidateMatches(candidate, facts);
}

function countMatchedConditionGroupsForCandidate(candidate, facts) {
  return judgementEngineBridge.countMatchedConditionGroupsForCandidate(candidate, facts);
}

function buildCandidateReason(candidate, facts) {
  return judgementEngineBridge.buildCandidateReason(candidate, facts);
}

function getVisibleQuestions() {
  return judgementEngineBridge.getVisibleQuestions();
}

function getRuleCatalogSectionItems(section) {
  return ruleRuntimeAdapter.getRuleCatalogSectionItems(section);
}

function setRuleCatalogSection(section, source, items) {
  return ruleRuntimeAdapter.setRuleCatalogSection(section, source, items);
}

function getRuleCatalogRuntimeSection(section) {
  return ruleRuntimeAdapter.getRuleCatalogRuntimeSection(section);
}

function getActiveCandidateDefinitions() {
  return ruleRuntimeAdapter.getActiveCandidateDefinitions();
}

function getKnownCandidateDefinitionsForLookup() {
  return ruleRuntimeAdapter.getKnownCandidateDefinitionsForLookup();
}

function findAdditionReferenceByCode(code) {
  return ruleRuntimeAdapter.findAdditionReferenceByCode(code);
}

function getActiveQuestionDefinitions() {
  return ruleRuntimeAdapter.getActiveQuestionDefinitions();
}

function getPrototypeDataSource() {
  return ruleRuntimeAdapter.getPrototypeDataSource();
}

function isQuestionVisible(question, candidates) {
  return judgementEngineBridge.isQuestionVisible(question, candidates);
}

function getQuestionDisplayOptions(question) {
  return judgementEngineBridge.getQuestionDisplayOptions(question);
}

function shouldShowCandidateFactQuestion(answerKey) {
  return judgementEngineBridge.shouldShowCandidateFactQuestion(answerKey);
}

function pruneHiddenJudgementAnswers() {
  return judgementEngineBridge.pruneHiddenJudgementAnswers();
}

function syncEnrollmentSelection() {
  const organizations = getSelectableOrganizationsForJudgement(state.judgement.clientId);
  state.judgement.organizationId = organizations[0]?.organizationId ?? "";

  const services = getSelectableServicesForJudgement(
    state.judgement.clientId,
    state.judgement.organizationId,
  );
  state.judgement.serviceId = services[0]?.serviceId ?? "";
}

function syncServiceSelection() {
  const services = getSelectableServicesForJudgement(
    state.judgement.clientId,
    state.judgement.organizationId,
  );
  state.judgement.serviceId = services[0]?.serviceId ?? "";
}

function resetJudgementAnswers() {
  state.judgement.answers = {
    monthType: "",
    placeType: "",
    actionType: "",
    hospitalAdmissionContext: "",
    requiredInfoReceived: "",
    dischargeFacilityStaffOnlyInfo: "",
    dischargeInpatientPeriodCount: "",
    initialAdditionPlanned: "",
    careManagerStart: "",
    employmentStart: "",
    serviceUseStartMonth: "",
  };
  state.judgement.history = [];
}

function getFilteredReportRecords() {
  return reportStateBridge.getFilteredReportRecords();
}

function buildSampleReportRecords() {
  return getPrototypeDataSource().reportRecords.map(enrichSampleReportRecord);
}

function getSampleJudgementHistoryRecords(clientId, targetMonth) {
  const normalizedClientId = String(clientId ?? "");
  const normalizedTargetMonth = String(targetMonth ?? "");

  return state.report.records.filter((record) => (
    String(record.clientId ?? "") === normalizedClientId
    && String(record.targetMonth ?? "") === normalizedTargetMonth
  ));
}

function enrichSampleReportRecord(record) {
  const client = getClientById(record.clientId);
  const organization = getOrganizationById(record.organizationId);
  const service = getServiceById(record.serviceId);
  const staff = getStaffById(record.staffId);
  const additionReference = findAdditionReferenceByCode(record.additionCode);
  return {
    ...record,
    clientName: client?.clientName ?? "-",
    targetType: client?.targetType ?? "-",
    organizationName: organization?.organizationName ?? "-",
    serviceName: service?.serviceName ?? "-",
    staffName: staff?.staffName ?? "-",
    additionFamilyCode: record.additionFamilyCode || additionReference?.familyCode || "",
    additionFamilyName: record.additionFamilyName || additionReference?.familyName || "",
    additionName: record.additionName || additionReference?.branchName || additionReference?.familyName || "-",
  };
}

function ensureSelectedReportRecord(records) {
  return reportStateBridge.ensureSelectedReportRecord(records);
}

function syncReportFiltersFromInputs() {
  return reportStateBridge.syncReportFiltersFromInputs();
}

function writeReportFiltersToInputs() {
  return reportStateBridge.writeReportFiltersToInputs();
}

function moveSelectedColumn(direction) {
  return reportStateBridge.moveSelectedColumn(direction);
}

function loadReportViews() {
  return reportStateBridgeFactory.loadStoredReportViews(storageKeys, baseReportViews);
}

function persistReportViews() {
  return reportStateBridge.persistReportViews();
}

function loadActiveViewCode() {
  return reportStateBridgeFactory.loadStoredActiveViewCode(storageKeys, baseReportViews);
}

function getFilterLabel(key) {
  return reportStateBridge.getFilterLabel(key);
}

function cloneReportViews() {
  return reportStateBridgeFactory.cloneReportViews(baseReportViews);
}

function canUseApiReport() {
  return Boolean(state.dataSource.apiBaseUrl && state.dataSource.configReady);
}

function canUseApiRelations() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
  );
}

function canUseApiJudgementContext() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
    && state.dataSource.clients === "api"
    && state.dataSource.organizations === "api"
    && state.dataSource.services === "api"
    && state.dataSource.staffs === "api"
  );
}

function canUseApiNoteDraft() {
  return Boolean(
    canUseApiJudgementSave()
    && state.dataSource.openaiReady
  );
}

function canUseApiQuestionCatalog() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
  );
}

function canUseApiAdditionCatalog() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
  );
}

function canUseApiAdditionPromptSettings() {
  return Boolean(
    state.dataSource.apiBaseUrl
    && state.dataSource.configReady
  );
}

function getMasterClients() {
  return masterDataBridge.getMasterClients();
}

function getMasterOrganizations() {
  return masterDataBridge.getMasterOrganizations();
}

function getMasterServices() {
  return masterDataBridge.getMasterServices();
}

function buildSampleAdditionPromptSettings() {
  const itemsByKey = new Map();

  for (const candidate of getActiveCandidateDefinitions()) {
    const additionId = normalizeNumericId(candidate.additionId ?? "");
    const familyCode = String(candidate.additionFamilyCode ?? candidate.additionCode ?? "").trim();
    const familyName = String(candidate.additionFamilyName ?? candidate.additionName ?? "").trim();
    if (!familyCode || !familyName) {
      continue;
    }

    const itemKey = additionId !== null ? `id:${additionId}` : `code:${familyCode}`;
    if (itemsByKey.has(itemKey)) {
      continue;
    }

    const promptTemplate = String(candidate.promptTemplate ?? "").trim();
    itemsByKey.set(itemKey, {
      additionId: additionId !== null ? String(additionId) : "",
      additionCode: familyCode,
      additionName: familyName,
      promptTemplate,
      hasPromptTemplate: promptTemplate !== "",
    });
  }

  return Array.from(itemsByKey.values()).sort((left, right) => {
    const leftId = normalizeNumericId(left.additionId ?? "") ?? Number.MAX_SAFE_INTEGER;
    const rightId = normalizeNumericId(right.additionId ?? "") ?? Number.MAX_SAFE_INTEGER;
    if (leftId !== rightId) {
      return leftId - rightId;
    }
    return String(left.additionName).localeCompare(String(right.additionName), "ja");
  });
}

function getJudgementClients() {
  return masterDataBridge.getJudgementClients();
}

function getJudgementStaffs() {
  return masterDataBridge.getJudgementStaffs();
}

function syncJudgementStaffSelection() {
  const nextStaffId = resolveDefaultJudgementStaffId();
  if (nextStaffId) {
    state.judgement.staffId = nextStaffId;
  }
}

function resolveDefaultJudgementStaffId() {
  const currentStaffs = getJudgementStaffs();
  if (currentStaffs.some((item) => item.staffId === state.judgement.staffId)) {
    return state.judgement.staffId;
  }

  return currentStaffs[0]?.staffId ?? "";
}

function getOrganizationGroupLabel(organization, service = null) {
  return masterDataBridge.getOrganizationGroupLabel(organization, service);
}

function getOrganizationServiceSummary(organization) {
  const relationItems = state.relations.organizationServicesByOrganizationId[String(organization?.organizationId ?? "")];
  if (Array.isArray(relationItems)) {
    if (relationItems.length === 0) {
      return "-";
    }

    return relationItems
      .map((item) => item.serviceName)
      .filter(Boolean)
      .join(" / ");
  }

  if (organization.serviceNames) {
    return organization.serviceNames;
  }
  if (!Array.isArray(organization.serviceIds)) {
    return "-";
  }
  return organization.serviceIds
    .map((serviceId) => getServiceById(serviceId)?.serviceName)
    .filter(Boolean)
    .join(" / ");
}

function buildReportApiParams() {
  const params = { limit: String(apiConfig.reportLimit) };
  if (state.report.filters.targetMonth) {
    params.target_month = state.report.filters.targetMonth;
  }
  if (state.report.filters.client) {
    params.client = state.report.filters.client;
  }
  if (state.report.filters.addition) {
    params.addition = state.report.filters.addition;
  }
  if (state.report.filters.status) {
    params.status = state.report.filters.status;
  }
  if (state.report.filters.postCheckStatus) {
    params.post_check_status = state.report.filters.postCheckStatus;
  }
  if (state.report.filters.organization) {
    params.organization = state.report.filters.organization;
  }
  if (state.report.filters.staff) {
    params.staff = state.report.filters.staff;
  }
  return params;
}

function buildApiUrl(path, params = {}) {
  return apiRuntimeAdapter.buildApiUrl(path, params);
}

async function fetchApiJson(url, options = {}) {
  return apiRuntimeAdapter.fetchApiJson(url, options);
}

function normalizeApiClient(item) {
  return masterDataBridge.normalizeApiClient(item);
}

function normalizeApiOrganization(item) {
  return masterDataBridge.normalizeApiOrganization(item);
}

function getPrototypeCatalog() {
  return ruleRuntimeAdapter.getPrototypeCatalog();
}

function getPrototypeCatalogQuestions() {
  return ruleRuntimeAdapter.getPrototypeCatalogQuestions();
}

function buildJudgementCandidatePayload(snapshot) {
  return judgementReportBridge.buildJudgementCandidatePayload(snapshot);
}

function isSameJudgementCandidate(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftBranchId = normalizeNumericId(left.additionBranchId ?? "");
  const rightBranchId = normalizeNumericId(right.additionBranchId ?? "");
  if (leftBranchId !== null && rightBranchId !== null) {
    return leftBranchId === rightBranchId;
  }

  const leftCode = String(left.additionCode ?? "").trim();
  const rightCode = String(right.additionCode ?? "").trim();
  return leftCode !== "" && leftCode === rightCode;
}

function getPrototypeCatalogAdditions() {
  return ruleRuntimeAdapter.getPrototypeCatalogAdditions();
}

function flattenApiAdditionCatalogBranches(families) {
  return (Array.isArray(families) ? families : []).flatMap((family) => (
    Array.isArray(family?.branches) ? family.branches : []
  ));
}

function normalizeApiService(item) {
  return masterDataBridge.normalizeApiService(item);
}

function normalizeApiStaff(item) {
  return masterDataBridge.normalizeApiStaff(item);
}

function normalizeApiOrganizationService(item) {
  return masterDataBridge.normalizeApiOrganizationService(item);
}

function normalizeApiClientEnrollment(item) {
  return masterDataBridge.normalizeApiClientEnrollment(item);
}

function normalizeApiJudgementEnrollment(item) {
  return masterDataBridge.normalizeApiJudgementEnrollment(item);
}

function normalizeApiReportRecord(item) {
  return judgementReportBridge.normalizeApiReportRecord(item);
}

function normalizeReportCandidateDetails(value) {
  return judgementReportBridge.normalizeReportCandidateDetails(value);
}

function formatReportCandidateDetails(record) {
  return judgementReportBridge.formatReportCandidateDetails(record);
}

function formatReportIdentity(record) {
  return judgementReportBridge.formatReportIdentity(record);
}

function formatPostCheckStatusLabel(value) {
  const normalized = String(value ?? "").trim();
  const labels = {
    ok: "問題なし",
    review: "要確認",
    pending: "確認待ち",
    none: "対象なし",
  };
  return labels[normalized] ?? (normalized || "-");
}

function updateApiDataStatusPill() {
  if (!dom.apiDataStatus) {
    return;
  }

  const apiCount = ["clients", "organizations", "services", "staffs", "questions", "additions", "judgement", "report", "relations"]
    .filter((key) => state.dataSource[key] === "api")
    .length;

  let label = "データ: 試作用";
  if (state.dataSource.apiBaseUrl && !state.dataSource.configReady) {
    label = "データ: 試作用 / API設定待ち";
  } else if (state.dataSource.apiBaseUrl && state.dataSource.configReady && apiCount === 0) {
    label = state.dataSource.note ? "データ: 試作用 / APIエラー" : "データ: API接続準備中";
  } else if (apiCount === 9) {
    label = "データ: API接続";
  } else if (apiCount > 0) {
    label = "データ: 一部API / 一部試作用";
  }

  dom.apiDataStatus.textContent = label;
  dom.apiDataStatus.title = state.dataSource.note || label;
  updateRuleRuntimeStatusPill();
}

function updateRuleRuntimeStatusPill() {
  if (!dom.ruleRuntimeStatus) {
    return;
  }

  const questionRuntime = getRuleCatalogRuntimeSection("questions");
  const additionRuntime = getRuleCatalogRuntimeSection("additions");
  const questionSource = questionRuntime.source;
  const additionSource = additionRuntime.source;
  let label = "判定catalog: prototype";

  if (questionSource === "api" && additionSource === "api") {
    label = "判定catalog: DB正本";
  } else if (questionSource === "api" || additionSource === "api") {
    label = "判定catalog: 一部DB / 一部prototype";
  } else if (state.dataSource.apiBaseUrl && !state.dataSource.configReady) {
    label = "判定catalog: API設定待ち";
  } else if (state.dataSource.apiBaseUrl && state.dataSource.configReady) {
    label = "判定catalog: prototype fallback";
  }

  const titleParts = [
    `設問=${questionSource === "api" ? "DB正本" : "prototype"}`,
    `加算=${additionSource === "api" ? "DB正本" : "prototype"}`,
  ];
  if (state.dataSource.note) {
    titleParts.push(state.dataSource.note);
  }

  dom.ruleRuntimeStatus.textContent = label;
  dom.ruleRuntimeStatus.title = titleParts.join(" / ");
}

function deriveResolvedOrganizationType(organization, service = null) {
  return masterDataBridge.deriveResolvedOrganizationType(organization, service);
}

function getDisplayOrganizationType(organization, service = null) {
  return masterDataBridge.getDisplayOrganizationType(organization, service);
}

function deriveOrganizationGroupFromType(organizationType) {
  return masterDataBridge.deriveOrganizationGroupFromType(organizationType);
}

function renderSelectOptions(element, items, selectedValue, mapper, emptyLabel = "選択肢なし") {
  if (items.length === 0) {
    element.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;
    return;
  }

  element.innerHTML = items.map((item) => {
    const option = mapper(item);
    return `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`;
  }).join("");
}

function matchesQuickSearch(values, onlyWhenActive = state.activeSection === "clients" || state.activeSection === "organizations" || state.activeSection === "services") {
  if (!state.quickSearch || !onlyWhenActive) {
    return true;
  }
  return normalizeText(values.join(" ")).includes(normalizeText(state.quickSearch));
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getClientById(clientId) {
  return masterDataBridge.getClientById(clientId);
}

function getOrganizationById(organizationId) {
  return masterDataBridge.getOrganizationById(organizationId);
}

function getServiceById(serviceId) {
  return masterDataBridge.getServiceById(serviceId);
}

function getStaffById(staffId) {
  return masterDataBridge.getStaffById(staffId);
}
