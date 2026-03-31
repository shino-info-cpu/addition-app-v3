(function (global) {
  function createApiRuntimeAdapter(options) {
    const state = options && options.state ? options.state : {};
    const apiConfig = options && options.apiConfig ? options.apiConfig : { baseCandidates: [], reportLimit: 500 };

    const normalizeApiClient = options.normalizeApiClient;
    const normalizeApiOrganization = options.normalizeApiOrganization;
    const normalizeApiService = options.normalizeApiService;
    const normalizeApiStaff = options.normalizeApiStaff;
    const normalizeApiOrganizationService = options.normalizeApiOrganizationService;
    const normalizeApiClientEnrollment = options.normalizeApiClientEnrollment;
    const normalizeApiJudgementEnrollment = options.normalizeApiJudgementEnrollment;
    const normalizeApiReportRecord = options.normalizeApiReportRecord;
    const setRuleCatalogSection = options.setRuleCatalogSection;
    const flattenApiAdditionCatalogBranches = options.flattenApiAdditionCatalogBranches;
    const buildSampleOrganizationServices = options.buildSampleOrganizationServices;
    const buildSampleClientEnrollments = options.buildSampleClientEnrollments;
    const buildSampleReportRecords = options.buildSampleReportRecords;
    const getSampleJudgementHistoryRecords = options.getSampleJudgementHistoryRecords;
    const canUseApiRelations = options.canUseApiRelations;
    const canUseApiJudgementContext = options.canUseApiJudgementContext;
    const canUseApiQuestionCatalog = options.canUseApiQuestionCatalog;
    const canUseApiAdditionCatalog = options.canUseApiAdditionCatalog;
    const canUseApiReport = options.canUseApiReport;
    const updateApiDataStatusPill = options.updateApiDataStatusPill;
    const syncJudgementStaffSelection = options.syncJudgementStaffSelection;
    const ensureRelationSelections = options.ensureRelationSelections;
    const syncRelationFormSelections = options.syncRelationFormSelections;
    const syncEnrollmentSelection = options.syncEnrollmentSelection;
    const renderMasters = options.renderMasters;
    const renderJudgement = options.renderJudgement;
    const renderReport = options.renderReport;
    const renderQuickSearchStatus = options.renderQuickSearchStatus;
    const buildReportApiParams = options.buildReportApiParams;

    function getBaseHref() {
      return global.window?.location?.href || global.location?.href || "http://localhost/";
    }

    function buildApiUrl(path, params) {
      const url = new URL(String(state.dataSource.apiBaseUrl ?? "") + "/" + path, getBaseHref());
      Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          return;
        }
        url.searchParams.set(key, value);
      });
      return url.toString();
    }

    async function fetchApiJson(url, requestOptions) {
      if (typeof global.fetch !== "function") {
        throw new Error("fetch が利用できません");
      }

      const headers = {
        Accept: "application/json",
        ...((requestOptions && requestOptions.body) ? { "Content-Type": "application/json" } : {}),
        ...((requestOptions && requestOptions.headers) || {}),
      };

      const response = await global.fetch(url, {
        method: requestOptions?.method ?? "GET",
        body: requestOptions?.body,
        headers,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? ("HTTP " + response.status));
      }

      if (payload.ok === false) {
        throw new Error(payload.error?.message ?? "APIエラー");
      }

      return payload;
    }

    async function detectApiBaseUrl() {
      for (const baseUrl of apiConfig.baseCandidates ?? []) {
        try {
          const response = await fetchApiJson(baseUrl + "/health.php");
          return { baseUrl, health: response };
        } catch (error) {
          continue;
        }
      }
      return null;
    }

    async function initializeApiData() {
      const detection = await detectApiBaseUrl();
      if (!detection) {
        state.dataSource.note = "API未接続";
        updateApiDataStatusPill();
        return;
      }

      state.dataSource.apiBaseUrl = detection.baseUrl;
      state.dataSource.configReady = Boolean(detection.health?.checks?.config);
      state.dataSource.openaiReady = Boolean(detection.health?.checks?.openai);
      state.dataSource.note = state.dataSource.configReady ? "" : "API設定待ち";
      updateApiDataStatusPill();

      if (!state.dataSource.configReady) {
        return;
      }

      await loadMastersFromApi();
      await loadQuestionCatalogFromApi();
      await loadAdditionCatalogFromApi();
      ensureRelationSelections();
      await Promise.all([
        loadOrganizationServices(state.relations.selectedOrganizationId),
        loadClientEnrollments(state.relations.selectedClientId),
      ]);
      if (canUseApiJudgementContext()) {
        await loadJudgementContextFromApi(state.judgement.clientId);
      }
      await loadReportRecordsFromApi();
      await loadJudgementHistoryRecords(state.judgement.clientId, state.judgement.targetMonth);
    }

    async function loadMastersFromApi() {
      const endpoints = [
        { key: "clients", path: "clients.php", normalize: normalizeApiClient },
        { key: "organizations", path: "organizations.php", normalize: normalizeApiOrganization },
        { key: "services", path: "services.php", normalize: normalizeApiService },
        { key: "staffs", path: "staffs.php", normalize: normalizeApiStaff },
      ];

      const results = await Promise.allSettled(endpoints.map(async ({ key, path, normalize }) => {
        const response = await fetchApiJson(buildApiUrl(path));
        return { key, items: (response.items ?? []).map(normalize) };
      }));

      results.forEach((result, index) => {
        const { key } = endpoints[index];
        if (result.status === "fulfilled") {
          state.masters[key] = result.value.items;
          state.dataSource[key] = "api";
          return;
        }

        state.masters[key] = [];
        state.dataSource[key] = "sample";
        state.dataSource.note = result.reason?.message ?? "一部API未接続";
      });

      if (results.every((result) => result.status === "fulfilled") && state.dataSource.report === "api") {
        state.dataSource.note = "";
      }

      updateApiDataStatusPill();
      syncJudgementStaffSelection();
      ensureRelationSelections();
      renderMasters();
      renderJudgement();
      renderQuickSearchStatus();
    }

    async function loadQuestionCatalogFromApi() {
      if (!canUseApiQuestionCatalog()) {
        setRuleCatalogSection("questions", "sample", []);
        renderJudgement();
        return;
      }

      try {
        const response = await fetchApiJson(buildApiUrl("question-catalog.php"));
        const normalizedQuestions = Array.isArray(response.questions) ? response.questions : [];
        if (normalizedQuestions.length === 0) {
          setRuleCatalogSection("questions", "sample", []);
          state.dataSource.note = "設問catalog未投入";
        } else {
          setRuleCatalogSection("questions", "api", normalizedQuestions);
          state.dataSource.note = "";
        }
      } catch (error) {
        setRuleCatalogSection("questions", "sample", []);
        state.dataSource.note = error.message;
      } finally {
        updateApiDataStatusPill();
        renderJudgement();
      }
    }

    async function loadAdditionCatalogFromApi() {
      if (!canUseApiAdditionCatalog()) {
        setRuleCatalogSection("additions", "sample", []);
        renderJudgement();
        return;
      }

      try {
        const response = await fetchApiJson(buildApiUrl("addition-catalog.php"));
        const normalizedAdditions = flattenApiAdditionCatalogBranches(response.additions ?? []);
        if (normalizedAdditions.length === 0) {
          setRuleCatalogSection("additions", "sample", []);
          state.dataSource.note = "加算catalog未投入";
        } else {
          setRuleCatalogSection("additions", "api", normalizedAdditions);
          state.dataSource.note = "";
        }
      } catch (error) {
        setRuleCatalogSection("additions", "sample", []);
        state.dataSource.note = error.message;
      } finally {
        updateApiDataStatusPill();
        renderJudgement();
      }
    }

    async function requestNoteDraft(payload) {
      return fetchApiJson(buildApiUrl("note-draft.php"), {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      });
    }

    async function loadOrganizationServices(organizationId, options = {}) {
      const normalizedOrganizationId = String(organizationId ?? "");
      const force = Boolean(options.force);
      if (!normalizedOrganizationId) {
        return;
      }

      if (!canUseApiRelations()) {
        state.dataSource.relations = "sample";
        state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = buildSampleOrganizationServices(normalizedOrganizationId);
        syncRelationFormSelections();
        renderMasters();
        renderJudgement();
        return;
      }

      if (!force && state.relations.organizationServicesByOrganizationId[normalizedOrganizationId]) {
        syncRelationFormSelections();
        renderMasters();
        renderJudgement();
        return;
      }

      const requestToken = ++state.relations.organizationServicesRequestToken;
      state.relations.loadingOrganizationServicesForId = normalizedOrganizationId;
      renderMasters();

      try {
        const response = await fetchApiJson(buildApiUrl("organization-services.php", { organization_id: normalizedOrganizationId }));
        if (requestToken !== state.relations.organizationServicesRequestToken) {
          return;
        }

        state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = (response.items ?? []).map(normalizeApiOrganizationService);
        state.dataSource.relations = "api";
        state.dataSource.note = "";
        syncRelationFormSelections();
      } catch (error) {
        if (requestToken !== state.relations.organizationServicesRequestToken) {
          return;
        }

        state.relations.organizationServicesByOrganizationId[normalizedOrganizationId] = [];
        state.dataSource.relations = "sample";
        state.dataSource.note = error.message;
        syncRelationFormSelections();
      } finally {
        if (requestToken !== state.relations.organizationServicesRequestToken) {
          return;
        }

        state.relations.loadingOrganizationServicesForId = "";
        updateApiDataStatusPill();
        renderMasters();
        renderJudgement();
      }
    }

    async function loadClientEnrollments(clientId, options = {}) {
      const normalizedClientId = String(clientId ?? "");
      const force = Boolean(options.force);
      if (!normalizedClientId) {
        return;
      }

      if (!canUseApiRelations()) {
        state.dataSource.relations = "sample";
        state.relations.clientEnrollmentsByClientId[normalizedClientId] = buildSampleClientEnrollments(normalizedClientId);
        renderMasters();
        return;
      }

      if (!force && state.relations.clientEnrollmentsByClientId[normalizedClientId]) {
        renderMasters();
        return;
      }

      const requestToken = ++state.relations.clientEnrollmentsRequestToken;
      state.relations.loadingClientEnrollmentsForId = normalizedClientId;
      renderMasters();

      try {
        const response = await fetchApiJson(buildApiUrl("client-enrollments.php", { client_id: normalizedClientId }));
        if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
          return;
        }

        state.relations.clientEnrollmentsByClientId[normalizedClientId] = (response.items ?? []).map(normalizeApiClientEnrollment);
        state.dataSource.relations = "api";
        state.dataSource.note = "";
      } catch (error) {
        if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
          return;
        }

        state.relations.clientEnrollmentsByClientId[normalizedClientId] = [];
        state.dataSource.relations = "sample";
        state.dataSource.note = error.message;
      } finally {
        if (requestToken !== state.relations.clientEnrollmentsRequestToken) {
          return;
        }

        state.relations.loadingClientEnrollmentsForId = "";
        updateApiDataStatusPill();
        renderMasters();
      }
    }

    async function loadJudgementContextFromApi(clientId) {
      if (!canUseApiJudgementContext() || !clientId) {
        state.dataSource.judgement = "sample";
        state.judgement.contextClientId = "";
        state.judgement.enrollments = [];
        renderJudgement();
        renderQuickSearchStatus();
        updateApiDataStatusPill();
        return;
      }

      const requestToken = ++state.judgement.requestToken;
      state.judgement.loadingContext = true;
      state.judgement.contextClientId = String(clientId);
      state.judgement.enrollments = [];
      state.dataSource.judgement = "sample";
      renderJudgement();
      updateApiDataStatusPill();

      try {
        const response = await fetchApiJson(buildApiUrl("judgement-context.php", { client_id: String(clientId) }));
        if (requestToken !== state.judgement.requestToken) {
          return;
        }
        state.judgement.enrollments = (response.enrollments ?? []).map(normalizeApiJudgementEnrollment);
        state.dataSource.judgement = "api";
        state.dataSource.note = "";
        syncJudgementStaffSelection();
        syncEnrollmentSelection();
      } catch (error) {
        if (requestToken !== state.judgement.requestToken) {
          return;
        }
        state.judgement.enrollments = [];
        state.dataSource.judgement = "sample";
        state.dataSource.note = error.message;
        syncJudgementStaffSelection();
        syncEnrollmentSelection();
      } finally {
        if (requestToken !== state.judgement.requestToken) {
          return;
        }
        state.judgement.loadingContext = false;
        updateApiDataStatusPill();
        renderJudgement();
        if (state.judgement.enrollments.length === 0 && state.judgement.organizationId) {
          void loadOrganizationServices(state.judgement.organizationId);
        }
        renderQuickSearchStatus();
      }
    }

    async function loadReportRecordsFromApi() {
      if (!state.dataSource.apiBaseUrl || !state.dataSource.configReady) {
        state.dataSource.report = "sample";
        state.report.records = buildSampleReportRecords();
        updateApiDataStatusPill();
        renderReport();
        renderQuickSearchStatus();
        return;
      }

      const requestToken = ++state.report.requestToken;
      state.report.loading = true;
      renderReport();

      try {
        const response = await fetchApiJson(buildApiUrl("report-records.php", buildReportApiParams()));
        if (requestToken !== state.report.requestToken) {
          return;
        }

        state.report.records = (response.items ?? []).map(normalizeApiReportRecord);
        state.dataSource.report = "api";
        state.dataSource.note = "";
      } catch (error) {
        if (requestToken !== state.report.requestToken) {
          return;
        }

        state.report.records = buildSampleReportRecords();
        state.dataSource.report = "sample";
        state.dataSource.note = error.message;
      } finally {
        if (requestToken !== state.report.requestToken) {
          return;
        }

        state.report.loading = false;
        updateApiDataStatusPill();
        renderReport();
        renderQuickSearchStatus();
      }
    }

    async function loadJudgementHistoryRecords(clientId, targetMonth) {
      const normalizedClientId = String(clientId ?? "");
      const normalizedTargetMonth = String(targetMonth ?? "");

      if (!normalizedClientId || !normalizedTargetMonth) {
        state.judgement.historyRecords = [];
        state.judgement.historyError = "";
        state.judgement.historyLoading = false;
        renderJudgement();
        return;
      }

      if (!canUseApiReport()) {
        state.judgement.historyRecords = getSampleJudgementHistoryRecords(normalizedClientId, normalizedTargetMonth);
        state.judgement.historyError = "";
        state.judgement.historyLoading = false;
        renderJudgement();
        return;
      }

      const requestToken = ++state.judgement.historyRequestToken;
      state.judgement.historyLoading = true;
      state.judgement.historyError = "";
      renderJudgement();

      try {
        const response = await fetchApiJson(buildApiUrl("report-records.php", {
          client_id: normalizedClientId,
          target_month: normalizedTargetMonth,
          limit: "500",
        }));

        if (requestToken !== state.judgement.historyRequestToken) {
          return;
        }

        state.judgement.historyRecords = (response.items ?? []).map(normalizeApiReportRecord);
        state.judgement.historyError = "";
      } catch (error) {
        if (requestToken !== state.judgement.historyRequestToken) {
          return;
        }

        state.judgement.historyRecords = [];
        state.judgement.historyError = error.message;
      } finally {
        if (requestToken !== state.judgement.historyRequestToken) {
          return;
        }

        state.judgement.historyLoading = false;
        renderJudgement();
      }
    }

    return {
      buildApiUrl,
      fetchApiJson,
      detectApiBaseUrl,
      initializeApiData,
      loadMastersFromApi,
      loadQuestionCatalogFromApi,
      loadAdditionCatalogFromApi,
      requestNoteDraft,
      loadOrganizationServices,
      loadClientEnrollments,
      loadJudgementContextFromApi,
      loadReportRecordsFromApi,
      loadJudgementHistoryRecords,
    };
  }

  global.__KASAN_API_RUNTIME_ADAPTER__ = {
    createApiRuntimeAdapter: createApiRuntimeAdapter,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
