(function (global) {
  function createJudgementEngineBridge(options) {
    const state = options && options.state ? options.state : {};
    const getClientById = options && typeof options.getClientById === "function"
      ? options.getClientById
      : function fallbackGetClientById() {
          return null;
        };
    const getOrganizationById = options && typeof options.getOrganizationById === "function"
      ? options.getOrganizationById
      : function fallbackGetOrganizationById() {
          return null;
        };
    const getServiceById = options && typeof options.getServiceById === "function"
      ? options.getServiceById
      : function fallbackGetServiceById() {
          return null;
        };
    const getOrganizationGroupLabel = options && typeof options.getOrganizationGroupLabel === "function"
      ? options.getOrganizationGroupLabel
      : function fallbackGetOrganizationGroupLabel() {
          return "";
        };
    const deriveResolvedOrganizationType = options && typeof options.deriveResolvedOrganizationType === "function"
      ? options.deriveResolvedOrganizationType
      : function fallbackDeriveResolvedOrganizationType() {
          return "";
        };
    const getActiveCandidateDefinitions = options && typeof options.getActiveCandidateDefinitions === "function"
      ? options.getActiveCandidateDefinitions
      : function fallbackGetActiveCandidateDefinitions() {
          return [];
        };
    const getActiveQuestionDefinitions = options && typeof options.getActiveQuestionDefinitions === "function"
      ? options.getActiveQuestionDefinitions
      : function fallbackGetActiveQuestionDefinitions() {
          return [];
        };

    function getServiceDecisionCategories(service, organization) {
      if (!service) {
        return [];
      }

      const categories = new Set();
      const rawCategory = String(service.serviceCategory ?? "").trim();
      const resolvedOrganizationType = deriveResolvedOrganizationType(organization, service);

      if (rawCategory === "相談支援") {
        categories.add("相談支援");
      }

      if (rawCategory === "障害福祉" || rawCategory === "障害福祉サービス") {
        categories.add("障害福祉サービス");
      }

      if (rawCategory === "医療") {
        categories.add("医療関連");
      }

      if (rawCategory === "福祉") {
        categories.add("障害福祉以外の福祉サービス");
      }

      if (rawCategory === "障害福祉以外") {
        if (["病院", "訪問看護", "薬局"].includes(resolvedOrganizationType)) {
          categories.add("医療関連");
        } else {
          categories.add("障害福祉以外の福祉サービス");
        }
      }

      if (categories.size === 0 && ["病院", "訪問看護", "薬局"].includes(resolvedOrganizationType)) {
        categories.add("医療関連");
      }

      return Array.from(categories);
    }

    function getJudgementFacts(includeAnswers, ignoredAnswerKeys = []) {
      const client = getClientById(state.judgement?.clientId);
      const organization = getOrganizationById(state.judgement?.organizationId);
      const service = getServiceById(state.judgement?.serviceId);
      const serviceDecisionCategories = getServiceDecisionCategories(service, organization);
      const answers = includeAnswers
        ? { ...(state.judgement?.answers ?? {}) }
        : {
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

      for (const key of ignoredAnswerKeys) {
        answers[key] = "";
      }

      return {
        targetType: client?.targetType ?? "",
        organizationGroup: getOrganizationGroupLabel(organization, service),
        organizationType: deriveResolvedOrganizationType(organization, service),
        serviceDecisionCategories,
        answers,
        monthType: answers.monthType || "",
        placeType: answers.placeType || "",
        actionType: answers.actionType || "",
      };
    }

    function matchesTargetType(allowed, actual) {
      if (!actual) {
        return true;
      }
      return allowed.includes("共通") || allowed.includes(actual);
    }

    function matchesCondition(allowed, actual) {
      if (!actual) {
        return true;
      }
      return allowed.includes(actual);
    }

    function matchesOptionalCondition(allowed, actual) {
      if (!Array.isArray(allowed) || allowed.length === 0) {
        return true;
      }
      return matchesCondition(allowed, actual);
    }

    function matchesRequiredAnswers(requiredAnswers, actualAnswers = {}) {
      if (!requiredAnswers || typeof requiredAnswers !== "object") {
        return true;
      }

      return Object.entries(requiredAnswers).every(([key, expectedValue]) => {
        const actualValue = String(actualAnswers?.[key] ?? "").trim();
        if (!actualValue) {
          return true;
        }
        return actualValue === String(expectedValue ?? "").trim();
      });
    }

    function conditionalRequiredAnswerRuleApplies(rule, facts) {
      if (!rule || typeof rule !== "object") {
        return false;
      }

      return matchesOptionalCondition(rule.whenOrganizationGroups, facts.organizationGroup)
        && matchesOptionalCondition(rule.whenOrganizationTypes, facts.organizationType)
        && matchesOptionalCondition(rule.whenMonthTypes, facts.monthType)
        && matchesOptionalCondition(rule.whenPlaceTypes, facts.placeType)
        && matchesOptionalCondition(rule.whenActionTypes, facts.actionType);
    }

    function matchesConditionalRequiredAnswers(conditionalRules, facts) {
      if (!Array.isArray(conditionalRules) || conditionalRules.length === 0) {
        return true;
      }

      return conditionalRules.every((rule) => {
        if (!conditionalRequiredAnswerRuleApplies(rule, facts)) {
          return true;
        }
        return matchesRequiredAnswers(rule.requiredAnswers, facts.answers);
      });
    }

    function matchesDecisionCategoryRules(actualValues, includeValues = [], excludeValues = []) {
      const normalizedActualValues = Array.isArray(actualValues) ? actualValues : [];
      const normalizedIncludeValues = Array.isArray(includeValues) ? includeValues : [];
      const normalizedExcludeValues = Array.isArray(excludeValues) ? excludeValues : [];

      if (normalizedActualValues.length === 0) {
        return normalizedIncludeValues.length === 0;
      }

      if (normalizedExcludeValues.length > 0 && normalizedActualValues.some((actual) => normalizedExcludeValues.includes(actual))) {
        return false;
      }

      if (normalizedIncludeValues.length === 0) {
        return true;
      }

      return normalizedActualValues.some((actual) => normalizedIncludeValues.includes(actual));
    }

    function hasCatalogConditionGroups(candidate) {
      return Array.isArray(candidate?.conditionGroups) && candidate.conditionGroups.length > 0;
    }

    function getFactValueForCatalogCondition(fieldKey, facts) {
      const normalizedFieldKey = String(fieldKey ?? "").trim();
      switch (normalizedFieldKey) {
        case "targetType":
          return facts.targetType;
        case "organizationGroup":
          return facts.organizationGroup;
        case "organizationType":
          return facts.organizationType;
        case "serviceDecisionCategories":
          return Array.isArray(facts.serviceDecisionCategories) ? facts.serviceDecisionCategories : [];
        case "monthType":
          return facts.monthType;
        case "placeType":
          return facts.placeType;
        case "actionType":
          return facts.actionType;
        default:
          return facts.answers?.[normalizedFieldKey] ?? "";
      }
    }

    function matchesCatalogCondition(condition, facts, ignoredFieldKey = "") {
      const fieldKey = String(condition?.fieldKey ?? "").trim();
      const operatorCode = String(condition?.operatorCode ?? "").trim();
      const expectedValue = Array.isArray(condition?.expectedValue)
        ? condition.expectedValue.map((item) => String(item ?? "").trim())
        : [];

      if (!fieldKey || !operatorCode) {
        return true;
      }

      if (ignoredFieldKey && fieldKey === ignoredFieldKey) {
        return true;
      }

      const actualValue = getFactValueForCatalogCondition(fieldKey, facts);

      if (operatorCode === "one_of") {
        if (Array.isArray(actualValue)) {
          if (actualValue.length === 0) {
            return true;
          }
          return actualValue.some((item) => expectedValue.includes(String(item ?? "").trim()));
        }

        const normalizedActualValue = String(actualValue ?? "").trim();
        if (!normalizedActualValue) {
          return true;
        }
        return expectedValue.includes(normalizedActualValue);
      }

      if (operatorCode === "includes_any") {
        const normalizedActualValues = Array.isArray(actualValue)
          ? actualValue.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        if (normalizedActualValues.length === 0) {
          return expectedValue.length === 0;
        }
        return normalizedActualValues.some((item) => expectedValue.includes(item));
      }

      if (operatorCode === "excludes_all") {
        const normalizedActualValues = Array.isArray(actualValue)
          ? actualValue.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        if (normalizedActualValues.length === 0) {
          return true;
        }
        return normalizedActualValues.every((item) => !expectedValue.includes(item));
      }

      return true;
    }

    function matchesConditionGroups(conditionGroups, facts, ignoredFieldKey = "") {
      if (!Array.isArray(conditionGroups) || conditionGroups.length === 0) {
        return true;
      }

      return conditionGroups.some((group) => {
        const conditions = Array.isArray(group?.conditions) ? group.conditions : [];
        if (conditions.length === 0) {
          return true;
        }
        return conditions.every((condition) => matchesCatalogCondition(condition, facts, ignoredFieldKey));
      });
    }

    function candidateMatches(candidate, facts) {
      if (hasCatalogConditionGroups(candidate)) {
        return matchesConditionGroups(candidate.conditionGroups, facts);
      }

      return matchesTargetType(candidate.targetTypes, facts.targetType)
        && matchesCondition(candidate.organizationGroups, facts.organizationGroup)
        && matchesOptionalCondition(candidate.organizationTypes, facts.organizationType)
        && matchesRequiredAnswers(candidate.requiredAnswers, facts.answers)
        && matchesConditionalRequiredAnswers(candidate.conditionalRequiredAnswers, facts)
        && matchesDecisionCategoryRules(
          facts.serviceDecisionCategories,
          candidate.serviceDecisionInclude,
          candidate.serviceDecisionExclude,
        )
        && matchesCondition(candidate.monthTypes, facts.monthType)
        && matchesCondition(candidate.placeTypes, facts.placeType)
        && matchesCondition(candidate.actionTypes, facts.actionType);
    }

    function getMatchedConditionGroup(candidate, facts) {
      if (!hasCatalogConditionGroups(candidate)) {
        return null;
      }

      const groups = Array.isArray(candidate.conditionGroups) ? candidate.conditionGroups : [];
      return groups.find((group) => matchesConditionGroups([group], facts)) ?? null;
    }

    function countMatchedConditionGroupsForCandidate(candidate, facts) {
      if (!hasCatalogConditionGroups(candidate)) {
        return 0;
      }

      const groups = Array.isArray(candidate.conditionGroups) ? candidate.conditionGroups : [];
      return groups.filter((group) => matchesConditionGroups([group], facts)).length;
    }

    function buildCandidateReasonFromLegacy(candidate, facts) {
      const reasons = [];
      if (facts.targetType && matchesTargetType(candidate.targetTypes, facts.targetType)) {
        reasons.push(facts.targetType + "対象");
      }
      if (facts.organizationGroup && matchesCondition(candidate.organizationGroups, facts.organizationGroup)) {
        reasons.push(facts.organizationGroup);
      }
      if (facts.organizationType && matchesOptionalCondition(candidate.organizationTypes, facts.organizationType)) {
        reasons.push(facts.organizationType);
      }
      if (
        facts.serviceDecisionCategories.length > 0
        && matchesDecisionCategoryRules(
          facts.serviceDecisionCategories,
          candidate.serviceDecisionInclude,
          candidate.serviceDecisionExclude
        )
      ) {
        reasons.push(facts.serviceDecisionCategories.join(" / "));
      }
      if (facts.monthType && matchesCondition(candidate.monthTypes, facts.monthType)) {
        reasons.push(facts.monthType);
      }
      if (facts.placeType && matchesCondition(candidate.placeTypes, facts.placeType)) {
        reasons.push(facts.placeType);
      }
      if (facts.actionType && matchesCondition(candidate.actionTypes, facts.actionType)) {
        reasons.push(facts.actionType);
      }
      return reasons.length > 0 ? reasons.join(" / ") + " で残っています" : "利用者・機関・サービス条件で残っています";
    }

    function buildCandidateReasonFromCatalog(candidate, facts) {
      const group = getMatchedConditionGroup(candidate, facts);
      if (!group) {
        return "利用者・機関・サービス条件で残っています";
      }

      const reasons = [];
      const conditions = Array.isArray(group.conditions) ? group.conditions : [];
      let hasServiceDecisionReason = false;

      conditions.forEach((condition) => {
        const fieldKey = String(condition?.fieldKey ?? "").trim();
        if (!fieldKey) {
          return;
        }

        if (fieldKey === "targetType" && facts.targetType) {
          reasons.push(facts.targetType + "対象");
          return;
        }

        if (fieldKey === "organizationGroup" && facts.organizationGroup) {
          reasons.push(facts.organizationGroup);
          return;
        }

        if (fieldKey === "organizationType" && facts.organizationType) {
          reasons.push(facts.organizationType);
          return;
        }

        if (fieldKey === "serviceDecisionCategories" && facts.serviceDecisionCategories.length > 0 && !hasServiceDecisionReason) {
          reasons.push(facts.serviceDecisionCategories.join(" / "));
          hasServiceDecisionReason = true;
          return;
        }

        if (fieldKey === "monthType" && facts.monthType) {
          reasons.push(facts.monthType);
          return;
        }

        if (fieldKey === "placeType" && facts.placeType) {
          reasons.push(facts.placeType);
          return;
        }

        if (fieldKey === "actionType" && facts.actionType) {
          reasons.push(facts.actionType);
        }
      });

      return reasons.length > 0 ? reasons.join(" / ") + " で残っています" : "利用者・機関・サービス条件で残っています";
    }

    function buildCandidateReason(candidate, facts) {
      if (hasCatalogConditionGroups(candidate)) {
        return buildCandidateReasonFromCatalog(candidate, facts);
      }

      return buildCandidateReasonFromLegacy(candidate, facts);
    }

    function evaluateCandidates(options) {
      const includeAnswers = Boolean(options?.includeAnswers);
      const ignoredAnswerKeys = Array.isArray(options?.ignoredAnswerKeys) ? options.ignoredAnswerKeys : [];
      const facts = getJudgementFacts(includeAnswers, ignoredAnswerKeys);
      return getActiveCandidateDefinitions()
        .filter((addition) => candidateMatches(addition, facts))
        .sort((left, right) => left.priority - right.priority)
        .map((addition) => ({ ...addition, reason: buildCandidateReason(addition, facts) }));
    }

    function getBaseJudgementCandidates() {
      return evaluateCandidates({ includeAnswers: false });
    }

    function getJudgementCandidates() {
      return evaluateCandidates({ includeAnswers: true });
    }

    function getJudgementCandidatesExcludingAnswers(answerKeys) {
      return evaluateCandidates({ includeAnswers: true, ignoredAnswerKeys: answerKeys });
    }

    function candidateRequiresAnswer(candidate, answerKey) {
      const normalizedAnswerKey = String(answerKey ?? "").trim();
      if (!normalizedAnswerKey) {
        return false;
      }

      const rules = Array.isArray(candidate?.postCheckRules) ? candidate.postCheckRules : [];
      return rules.some((rule) => String(rule?.answerKey ?? "").trim() === normalizedAnswerKey);
    }

    function candidateRequiresFactAnswerFromCatalogConditions(candidate, answerKey, facts) {
      const groups = Array.isArray(candidate?.conditionGroups) ? candidate.conditionGroups : [];
      return groups.some((group) => {
        const conditions = Array.isArray(group?.conditions) ? group.conditions : [];
        const targetConditions = conditions.filter((condition) => String(condition?.fieldKey ?? "").trim() === answerKey);
        if (targetConditions.length === 0) {
          return false;
        }
        return conditions.every((condition) => matchesCatalogCondition(condition, facts, answerKey));
      });
    }

    function candidateRequiresFactAnswer(candidate, answerKey, facts) {
      const normalizedAnswerKey = String(answerKey ?? "").trim();
      if (!normalizedAnswerKey) {
        return false;
      }

      if (hasCatalogConditionGroups(candidate)) {
        return candidateRequiresFactAnswerFromCatalogConditions(candidate, normalizedAnswerKey, facts);
      }

      if (String(candidate?.requiredAnswers?.[normalizedAnswerKey] ?? "").trim() !== "") {
        return true;
      }

      const conditionalRules = Array.isArray(candidate?.conditionalRequiredAnswers)
        ? candidate.conditionalRequiredAnswers
        : [];

      return conditionalRules.some((rule) => (
        conditionalRequiredAnswerRuleApplies(rule, facts)
        && String(rule?.requiredAnswers?.[normalizedAnswerKey] ?? "").trim() !== ""
      ));
    }

    function evaluateQuestionRules(rules, answers) {
      if (!Array.isArray(rules) || rules.length === 0) {
        return true;
      }

      return rules.every((rule) => {
        const dependsOnFieldKey = String(rule?.dependsOnFieldKey ?? "").trim();
        const matchValues = Array.isArray(rule?.matchValues)
          ? rule.matchValues.map((item) => String(item ?? "").trim())
          : [];
        if (!dependsOnFieldKey) {
          return true;
        }

        const actualValue = String(answers?.[dependsOnFieldKey] ?? "").trim();
        if (!actualValue) {
          return false;
        }

        if (matchValues.length === 0) {
          return true;
        }

        return matchValues.includes(actualValue);
      });
    }

    function isCandidateRequirementQuestionVisible(question) {
      const visibilityConfig = question.visibilityConfig ?? {};
      const answerKey = String(visibilityConfig.answerKey ?? question.key ?? "").trim();
      if (!answerKey) {
        return true;
      }

      const candidates = getJudgementCandidatesExcludingAnswers([answerKey]);
      const facts = getJudgementFacts(true, [answerKey]);
      const required = candidates.some((candidate) => (
        candidateRequiresFactAnswer(candidate, answerKey, facts)
        || candidateRequiresAnswer(candidate, answerKey)
      ));

      if (!required) {
        return false;
      }

      if (Boolean(visibilityConfig.singleCandidateOnly)) {
        return candidates.length === 1;
      }

      return true;
    }

    function isQuestionVisible(question) {
      const visibilityMode = String(question.visibilityMode ?? "always").trim();
      if (visibilityMode === "always" || !visibilityMode) {
        return true;
      }

      if (visibilityMode === "answer_rules") {
        return evaluateQuestionRules(question.visibilityRules, state.judgement?.answers ?? {});
      }

      if (visibilityMode === "candidate_requirement") {
        return isCandidateRequirementQuestionVisible(question);
      }

      return true;
    }

    function getQuestionDisplayOptions(question) {
      const options = Array.isArray(question?.options) ? question.options : [];
      return options.filter((option) => {
        if (!Array.isArray(option?.optionRules) || option.optionRules.length === 0) {
          return true;
        }
        return evaluateQuestionRules(option.optionRules, state.judgement?.answers ?? {});
      });
    }

    function getVisibleQuestions() {
      return getActiveQuestionDefinitions()
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => isQuestionVisible(question))
        .sort((left, right) => {
          const leftOrder = Number.isFinite(left.question.order) ? left.question.order : left.index;
          const rightOrder = Number.isFinite(right.question.order) ? right.question.order : right.index;
          return leftOrder - rightOrder;
        })
        .map(({ question }) => question);
    }

    function shouldShowCandidateFactQuestion(answerKey) {
      const facts = getJudgementFacts(true, [answerKey]);
      const candidates = getJudgementCandidatesExcludingAnswers([answerKey]);
      return candidates.some((candidate) => candidateRequiresFactAnswer(candidate, answerKey, facts));
    }

    function pruneHiddenJudgementAnswers() {
      const visibleKeys = new Set(getVisibleQuestions().map((question) => question.key));
      Object.keys(state.judgement?.answers ?? {}).forEach((key) => {
        if (!visibleKeys.has(key)) {
          state.judgement.answers[key] = "";
        }
      });
      state.judgement.history = (state.judgement?.history ?? []).filter((key) => (
        visibleKeys.has(key) && Boolean(state.judgement.answers[key])
      ));
    }

    return {
      getServiceDecisionCategories,
      getJudgementFacts,
      candidateMatches,
      countMatchedConditionGroupsForCandidate,
      buildCandidateReason,
      getBaseJudgementCandidates,
      getJudgementCandidates,
      getJudgementCandidatesExcludingAnswers,
      getVisibleQuestions,
      isQuestionVisible,
      getQuestionDisplayOptions,
      shouldShowCandidateFactQuestion,
      pruneHiddenJudgementAnswers,
    };
  }

  global.__KASAN_JUDGEMENT_ENGINE_BRIDGE__ = {
    createJudgementEngineBridge,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
