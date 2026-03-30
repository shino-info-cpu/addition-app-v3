(function (global) {
  const FILTER_LABELS = {
    targetMonth: "対象月",
    client: "利用者",
    addition: "加算",
    status: "判定状態",
    postCheckStatus: "後段状態",
    organization: "機関",
    staff: "相談員",
  };

  function cloneReportViews(baseReportViews) {
    return JSON.parse(JSON.stringify(baseReportViews));
  }

  function loadStoredReportViews(storageKeys, baseReportViews) {
    try {
      const raw = global.localStorage?.getItem(storageKeys.reportViews);
      if (!raw) {
        return cloneReportViews(baseReportViews);
      }
      return { ...cloneReportViews(baseReportViews), ...JSON.parse(raw) };
    } catch (error) {
      return cloneReportViews(baseReportViews);
    }
  }

  function loadStoredActiveViewCode(storageKeys, baseReportViews) {
    const viewCode = global.localStorage?.getItem(storageKeys.activeView);
    return viewCode && baseReportViews[viewCode] ? viewCode : "monthly_claim";
  }

  function createReportStateBridge(options) {
    const state = options.state;
    const dom = options.dom;
    const storageKeys = options.storageKeys;
    const baseReportViews = options.baseReportViews;
    const normalizeText = options.normalizeText;
    const matchesQuickSearch = options.matchesQuickSearch;
    const canUseApiReport = options.canUseApiReport;
    const loadReportRecordsFromApi = options.loadReportRecordsFromApi;
    const renderReport = options.renderReport;
    const renderQuickSearchStatus = options.renderQuickSearchStatus;

    function persistReportViews() {
      global.localStorage?.setItem(storageKeys.reportViews, JSON.stringify(state.report.views));
    }

    function persistActiveViewCode() {
      global.localStorage?.setItem(storageKeys.activeView, state.report.activeViewCode);
    }

    function getFilterLabel(key) {
      return FILTER_LABELS[key] ?? key;
    }

    function getFilteredReportRecords() {
      const records = state.report.records;
      const filters = state.report.filters;
      return records.filter((record) => {
        if (filters.targetMonth && record.targetMonth !== filters.targetMonth) {
          return false;
        }
        if (filters.client && !normalizeText(record.clientName).includes(normalizeText(filters.client))) {
          return false;
        }
        if (filters.addition && !normalizeText(record.additionName).includes(normalizeText(filters.addition))) {
          return false;
        }
        if (filters.status && record.finalStatus !== filters.status) {
          return false;
        }
        if (filters.postCheckStatus && (record.postCheckStatus || "") !== filters.postCheckStatus) {
          return false;
        }
        if (filters.organization && !normalizeText(record.organizationName).includes(normalizeText(filters.organization))) {
          return false;
        }
        if (filters.staff && !normalizeText(record.staffName).includes(normalizeText(filters.staff))) {
          return false;
        }
        if (!matchesQuickSearch([
          record.clientName,
          record.organizationName,
          record.additionName,
          record.postCheckSummary,
          record.savedNote,
          record.rationale,
        ], state.activeSection === "report")) {
          return false;
        }
        return true;
      });
    }

    function ensureSelectedReportRecord(records) {
      if (records.some((record) => record.recordId === state.report.selectedRecordId)) {
        return;
      }
      state.report.selectedRecordId = records[0]?.recordId ?? "";
    }

    function syncReportFiltersFromInputs() {
      state.report.filters = {
        targetMonth: dom.report.filterMonth.value,
        client: dom.report.filterClient.value.trim(),
        addition: dom.report.filterAddition.value.trim(),
        status: dom.report.filterStatus.value,
        postCheckStatus: dom.report.filterPostCheckStatus.value,
        organization: dom.report.filterOrganization.value.trim(),
        staff: dom.report.filterStaff.value.trim(),
      };
    }

    function writeReportFiltersToInputs() {
      dom.report.filterMonth.value = state.report.filters.targetMonth;
      dom.report.filterClient.value = state.report.filters.client;
      dom.report.filterAddition.value = state.report.filters.addition;
      dom.report.filterStatus.value = state.report.filters.status;
      dom.report.filterPostCheckStatus.value = state.report.filters.postCheckStatus;
      dom.report.filterOrganization.value = state.report.filters.organization;
      dom.report.filterStaff.value = state.report.filters.staff;
    }

    function moveSelectedColumn(direction) {
      const view = state.report.views[state.report.activeViewCode];
      const currentIndex = view.columns.indexOf(state.report.selectedColumnKey);
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= view.columns.length) {
        return;
      }
      const nextColumns = [...view.columns];
      const [columnKey] = nextColumns.splice(currentIndex, 1);
      nextColumns.splice(nextIndex, 0, columnKey);
      view.columns = nextColumns;
      persistReportViews();
      renderReport();
    }

    async function activateReportView(viewCode) {
      if (!state.report.views[viewCode]) {
        return;
      }

      state.report.activeViewCode = viewCode;
      persistActiveViewCode();
      state.report.selectedColumnKey = "";
      state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
      writeReportFiltersToInputs();
      if (canUseApiReport()) {
        await loadReportRecordsFromApi();
        return;
      }
      renderReport();
      renderQuickSearchStatus();
    }

    async function applyFilters() {
      syncReportFiltersFromInputs();
      if (canUseApiReport()) {
        await loadReportRecordsFromApi();
        return;
      }
      renderReport();
      renderQuickSearchStatus();
    }

    async function saveFilters() {
      syncReportFiltersFromInputs();
      state.report.views[state.report.activeViewCode].savedFilters = { ...state.report.filters };
      persistReportViews();
      if (canUseApiReport()) {
        await loadReportRecordsFromApi();
        return;
      }
      renderReport();
    }

    async function resetFilters() {
      state.report.filters = { ...state.report.views[state.report.activeViewCode].savedFilters };
      writeReportFiltersToInputs();
      if (canUseApiReport()) {
        await loadReportRecordsFromApi();
        return;
      }
      renderReport();
      renderQuickSearchStatus();
    }

    return {
      persistReportViews,
      getFilterLabel,
      getFilteredReportRecords,
      ensureSelectedReportRecord,
      syncReportFiltersFromInputs,
      writeReportFiltersToInputs,
      moveSelectedColumn,
      activateReportView,
      applyFilters,
      saveFilters,
      resetFilters,
    };
  }

  global.__KASAN_REPORT_STATE_BRIDGE__ = {
    cloneReportViews,
    loadStoredReportViews,
    loadStoredActiveViewCode,
    createReportStateBridge,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
