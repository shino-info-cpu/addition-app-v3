(function (global) {
  function getRequiredPrototypeSampleData() {
    const sampleData = global.__KASAN_PROTOTYPE_SAMPLE_DATA__;
    if (!sampleData || !sampleData.data) {
      throw new Error("prototype-sample-data.js の読み込みに失敗しました。");
    }
    return sampleData;
  }

  function getRequiredPrototypeRuleCatalog() {
    const catalog = global.__KASAN_PROTOTYPE_RULE_CATALOG__;
    if (!catalog || !Array.isArray(catalog.questions) || !Array.isArray(catalog.additions)) {
      throw new Error("prototype-rule-catalog.js の読み込みに失敗しました。");
    }
    return catalog;
  }

  function createRuleRuntimeAdapter(options) {
    const state = options && options.state ? options.state : {};
    const normalizeNumericId = options && typeof options.normalizeNumericId === "function"
      ? options.normalizeNumericId
      : function fallbackNormalizeNumericId(value) {
          const normalized = String(value ?? "").trim();
          if (!normalized) {
            return null;
          }
          const numeric = Number.parseInt(normalized, 10);
          return Number.isFinite(numeric) ? numeric : null;
        };

    const prototypeSampleData = getRequiredPrototypeSampleData();
    const prototypeRuleCatalog = getRequiredPrototypeRuleCatalog();

    function getRuleCatalogSectionItems(section) {
      const normalizedSection = String(section ?? "").trim();
      return Array.isArray(state.ruleCatalog?.[normalizedSection]) ? state.ruleCatalog[normalizedSection] : [];
    }

    function setRuleCatalogSection(section, source, items) {
      const normalizedSection = String(section ?? "").trim();
      state.dataSource[normalizedSection] = source === "api" ? "api" : "sample";
      state.ruleCatalog[normalizedSection] = Array.isArray(items) ? items : [];
    }

    function getPrototypeDataSource() {
      return prototypeSampleData.data;
    }

    function getPrototypeCatalog() {
      return prototypeRuleCatalog;
    }

    function getPrototypeCatalogQuestions() {
      return Array.isArray(prototypeRuleCatalog.questions) ? prototypeRuleCatalog.questions : [];
    }

    function getPrototypeCatalogAdditions() {
      return Array.isArray(prototypeRuleCatalog.additions) ? prototypeRuleCatalog.additions : [];
    }

    function getRuleCatalogRuntimeSection(section) {
      const normalizedSection = String(section ?? "").trim();
      const apiItems = getRuleCatalogSectionItems(normalizedSection);

      if (state.dataSource[normalizedSection] === "api" && apiItems.length > 0) {
        return {
          source: "api",
          items: apiItems,
        };
      }

      if (normalizedSection === "questions") {
        return {
          source: "sample",
          items: getPrototypeCatalogQuestions(),
        };
      }

      if (normalizedSection === "additions") {
        return {
          source: "sample",
          items: getPrototypeCatalogAdditions(),
        };
      }

      return {
        source: "sample",
        items: [],
      };
    }

    function getActiveCandidateDefinitions() {
      return getRuleCatalogRuntimeSection("additions").items;
    }

    function getKnownCandidateDefinitionsForLookup() {
      const definitions = [];
      const seen = new Set();

      const sources = [
        ...getRuleCatalogSectionItems("additions"),
        ...getPrototypeCatalogAdditions(),
      ];

      sources.forEach((candidate) => {
        const branchCode = String(candidate?.additionCode ?? "").trim();
        const familyCode = String(candidate?.additionFamilyCode ?? "").trim();
        const key = familyCode + "::" + branchCode;
        if (!branchCode || seen.has(key)) {
          return;
        }
        seen.add(key);
        definitions.push(candidate);
      });

      return definitions;
    }

    function findAdditionReferenceByCode(code) {
      const normalizedCode = String(code ?? "").trim();
      if (!normalizedCode) {
        return null;
      }

      const definitions = getKnownCandidateDefinitionsForLookup();
      const directBranch = definitions.find((candidate) => String(candidate?.additionCode ?? "").trim() === normalizedCode);
      if (directBranch) {
        return {
          branchCode: String(directBranch.additionCode ?? "").trim(),
          branchName: String(directBranch.additionName ?? "").trim(),
          familyCode: String(directBranch.additionFamilyCode ?? "").trim() || String(directBranch.additionCode ?? "").trim(),
          familyName: String(directBranch.additionFamilyName ?? "").trim() || String(directBranch.additionName ?? "").trim(),
          promptTemplate: String(directBranch.promptTemplate ?? "").trim(),
          branchId: normalizeNumericId(directBranch.additionBranchId ?? ""),
          additionId: normalizeNumericId(directBranch.additionId ?? ""),
          matchedBy: "branch",
        };
      }

      const familyMatch = definitions.find((candidate) => String(candidate?.additionFamilyCode ?? "").trim() === normalizedCode);
      if (familyMatch) {
        return {
          branchCode: "",
          branchName: "",
          familyCode: String(familyMatch.additionFamilyCode ?? "").trim() || normalizedCode,
          familyName: String(familyMatch.additionFamilyName ?? "").trim() || String(familyMatch.additionName ?? "").trim(),
          promptTemplate: String(familyMatch.promptTemplate ?? "").trim(),
          branchId: null,
          additionId: normalizeNumericId(familyMatch.additionId ?? ""),
          matchedBy: "family",
        };
      }

      return null;
    }

    function getActiveQuestionDefinitions() {
      return getRuleCatalogRuntimeSection("questions").items;
    }

    return {
      getRuleCatalogSectionItems,
      setRuleCatalogSection,
      getRuleCatalogRuntimeSection,
      getActiveCandidateDefinitions,
      getKnownCandidateDefinitionsForLookup,
      findAdditionReferenceByCode,
      getActiveQuestionDefinitions,
      getPrototypeDataSource,
      getPrototypeCatalog,
      getPrototypeCatalogQuestions,
      getPrototypeCatalogAdditions,
    };
  }

  global.__KASAN_RULE_RUNTIME_ADAPTER__ = {
    createRuleRuntimeAdapter: createRuleRuntimeAdapter,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
