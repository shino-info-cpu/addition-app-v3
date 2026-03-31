(function (global) {
  function createJudgementSessionBridge(options) {
    const state = options && options.state ? options.state : {};
    const normalizeNumericId = options && typeof options.normalizeNumericId === "function"
      ? options.normalizeNumericId
      : function fallbackNormalizeNumericId() {
          return null;
        };
    const pruneHiddenJudgementAnswers = options && typeof options.pruneHiddenJudgementAnswers === "function"
      ? options.pruneHiddenJudgementAnswers
      : function fallbackPruneHiddenJudgementAnswers() {};
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
    const getStaffById = options && typeof options.getStaffById === "function"
      ? options.getStaffById
      : function fallbackGetStaffById() {
          return null;
        };
    const getSelectableOrganizationsForJudgement = options && typeof options.getSelectableOrganizationsForJudgement === "function"
      ? options.getSelectableOrganizationsForJudgement
      : function fallbackGetSelectableOrganizationsForJudgement() {
          return [];
        };
    const getSelectableServicesForJudgement = options && typeof options.getSelectableServicesForJudgement === "function"
      ? options.getSelectableServicesForJudgement
      : function fallbackGetSelectableServicesForJudgement() {
          return [];
        };
    const getJudgementCandidates = options && typeof options.getJudgementCandidates === "function"
      ? options.getJudgementCandidates
      : function fallbackGetJudgementCandidates() {
          return [];
        };
    const getVisibleQuestions = options && typeof options.getVisibleQuestions === "function"
      ? options.getVisibleQuestions
      : function fallbackGetVisibleQuestions() {
          return [];
        };
    const findMatchedJudgementEnrollment = options && typeof options.findMatchedJudgementEnrollment === "function"
      ? options.findMatchedJudgementEnrollment
      : function fallbackFindMatchedJudgementEnrollment() {
          return null;
        };
    const normalizePerformedAtForStorage = options && typeof options.normalizePerformedAtForStorage === "function"
      ? options.normalizePerformedAtForStorage
      : function fallbackNormalizePerformedAtForStorage(value) {
          return String(value ?? "").trim();
        };
    const getOrganizationGroupLabel = options && typeof options.getOrganizationGroupLabel === "function"
      ? options.getOrganizationGroupLabel
      : function fallbackGetOrganizationGroupLabel() {
          return "";
        };
    const buildJudgementCandidateStorageEntries = options && typeof options.buildJudgementCandidateStorageEntries === "function"
      ? options.buildJudgementCandidateStorageEntries
      : function fallbackBuildJudgementCandidateStorageEntries() {
          return [];
        };
    const getJudgementCandidateReference = options && typeof options.getJudgementCandidateReference === "function"
      ? options.getJudgementCandidateReference
      : function fallbackGetJudgementCandidateReference() {
          return {
            additionId: null,
            additionBranchId: null,
            additionCode: "",
            additionName: "",
            additionFamilyCode: "",
            additionFamilyName: "",
          };
        };
    const buildJudgementCandidatePayload = options && typeof options.buildJudgementCandidatePayload === "function"
      ? options.buildJudgementCandidatePayload
      : function fallbackBuildJudgementCandidatePayload() {
          return [];
        };
    const deriveResolvedOrganizationType = options && typeof options.deriveResolvedOrganizationType === "function"
      ? options.deriveResolvedOrganizationType
      : function fallbackDeriveResolvedOrganizationType() {
          return "";
        };
    const deriveOrganizationGroupFromType = options && typeof options.deriveOrganizationGroupFromType === "function"
      ? options.deriveOrganizationGroupFromType
      : function fallbackDeriveOrganizationGroupFromType() {
          return "";
        };

    function buildJudgementDisplayAdditionName(candidateStorageEntries, topCandidateReference) {
      if (!topCandidateReference || !topCandidateReference.additionName) {
        return "";
      }

      const entries = Array.isArray(candidateStorageEntries) ? candidateStorageEntries : [];
      if (entries.length <= 1) {
        return topCandidateReference.additionName;
      }

      return topCandidateReference.additionName + " ほか" + String(entries.length - 1) + "件";
    }

    function buildJudgementRationale(params) {
      const candidates = Array.isArray(params?.candidates) ? params.candidates : [];
      const currentQuestion = params?.currentQuestion ?? null;
      const topCandidate = params?.topCandidate ?? null;
      const organizationGroup = String(params?.organizationGroup ?? "").trim();
      const postCheckResult = params?.postCheckResult ?? {};

      if (candidates.length === 0) {
        return "候補が残らなかったため、条件の見直しが必要です。";
      }

      const sharedFacts = [
        organizationGroup,
        state.judgement?.answers?.monthType,
        state.judgement?.answers?.placeType,
        state.judgement?.answers?.actionType,
      ].filter(Boolean);

      if (candidates.length === 1 && topCandidate && currentQuestion) {
        return topCandidate.reason + " 次の設問「" + currentQuestion.label + "」で確定条件を確認します。";
      }

      if (candidates.length === 1 && topCandidate) {
        const detail = sharedFacts.length > 0 ? sharedFacts.join(" / ") + "。" : "";
        return topCandidate.reason + " " + detail + String(postCheckResult.summary ?? "");
      }

      const candidateNames = candidates.slice(0, 3).map((candidate) => candidate.additionName).join(" / ");
      if (currentQuestion) {
        return "候補は " + candidateNames + " が残っています。次の設問「" + currentQuestion.label + "」の回答後に保存できます。";
      }

      return "候補は " + candidateNames + (candidates.length > 3 ? " ほか" + String(candidates.length - 3) + "件" : "") + "。制度確認が必要なため要確認で保存します。";
    }

    function buildJudgementSaveNote(params) {
      const client = params?.client ?? null;
      const organization = params?.organization ?? null;
      const service = params?.service ?? null;
      const staff = params?.staff ?? null;
      const candidates = Array.isArray(params?.candidates) ? params.candidates : [];
      const topCandidate = params?.topCandidate ?? null;
      const finalStatus = String(params?.finalStatus ?? "").trim();
      const postCheckResult = params?.postCheckResult ?? {};

      if (!client || !organization || !service || !staff || !topCandidate) {
        return "保存対象の判定結果がまだ整っていません。";
      }

      const actionParts = [
        state.judgement?.answers?.monthType,
        state.judgement?.answers?.placeType,
        state.judgement?.answers?.actionType,
      ].filter(Boolean);
      const actionText = actionParts.length > 0 ? actionParts.join(" / ") : "対応内容未整理";

      if (finalStatus === "自動確定") {
        return state.judgement.targetMonth + "、" + staff.staffName + "が" + client.clientName + "について、" + organization.organizationName + "の" + service.serviceName + "に関する" + actionText + "を実施。" + topCandidate.additionName + "として記録する。";
      }

      if (candidates.length === 1) {
        return state.judgement.targetMonth + "、" + staff.staffName + "が" + client.clientName + "について、" + organization.organizationName + "の" + service.serviceName + "に関する" + actionText + "を実施。" + topCandidate.additionName + "候補だが、" + String(postCheckResult.summary ?? "") + "のため要確認で記録する。";
      }

      const candidateNames = candidates.slice(0, 3).map((candidate) => candidate.additionName).join(" / ");
      return state.judgement.targetMonth + "、" + staff.staffName + "が" + client.clientName + "について、" + organization.organizationName + "の" + service.serviceName + "に関する" + actionText + "を実施。候補は " + candidateNames + (candidates.length > 3 ? " ほか" + String(candidates.length - 3) + "件" : "") + " のため要確認で記録する。";
    }

    function getJudgementHistoryRecordsForCandidate(candidate) {
      const candidateCode = String(candidate?.additionCode ?? "").trim();
      const historyCodes = Array.isArray(candidate?.historyAdditionCodes)
        ? candidate.historyAdditionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
        : [];
      const candidateName = String(candidate?.additionName ?? "").trim().toLowerCase();
      const familyName = String(candidate?.additionFamilyName ?? "").trim().toLowerCase();

      return (Array.isArray(state.judgement?.historyRecords) ? state.judgement.historyRecords : []).filter((record) => {
        const recordCode = String(record.additionCode ?? "").trim();
        if (recordCode) {
          if (historyCodes.length > 0) {
            return historyCodes.includes(recordCode);
          }
          if (candidateCode) {
            return recordCode === candidateCode;
          }
        }

        const normalizedRecordName = String(record.additionName ?? "").trim().toLowerCase();
        return normalizedRecordName === candidateName || (familyName && normalizedRecordName === familyName);
      });
    }

    function filterHistoryRecordsToCurrentService(records, currentServiceId) {
      const serviceId = String(currentServiceId ?? "").trim();
      if (!serviceId) {
        return Array.isArray(records) ? records.slice() : [];
      }

      return (Array.isArray(records) ? records : []).filter((record) => (
        String(record.serviceId ?? "").trim() === serviceId
      ));
    }

    function filterHistoryRecordsForRule(records, rule) {
      let filtered = Array.isArray(records) ? records.slice() : [];
      const targetAdditionCodes = Array.isArray(rule?.additionCodes)
        ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
        : [];
      const targetActionTypes = Array.isArray(rule?.recordActionTypes)
        ? rule.recordActionTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
        : [];

      if (targetAdditionCodes.length > 0) {
        filtered = filtered.filter((record) => targetAdditionCodes.includes(String(record.additionCode ?? "").trim()));
      }

      if (targetActionTypes.length > 0) {
        filtered = filtered.filter((record) => targetActionTypes.includes(String(record.actionType ?? "").trim()));
      }

      return filtered;
    }

    function getResolvedReportRecordOrganizationGroup(record) {
      const explicitGroup = String(record?.organizationGroup ?? "").trim();
      if (explicitGroup) {
        return explicitGroup;
      }

      const organization = getOrganizationById(record?.organizationId);
      const service = getServiceById(record?.serviceId);
      if (organization) {
        return getOrganizationGroupLabel(organization, service);
      }

      const resolvedType = deriveResolvedOrganizationType({
        organizationType: record?.organizationType ?? "",
        organizationName: record?.organizationName ?? "",
        serviceNames: record?.serviceName ?? "",
      });
      return deriveOrganizationGroupFromType(resolvedType);
    }

    function evaluatePostCheckRule(rule, context) {
      if (!rule || !rule.code) {
        return { level: "info", message: "後段チェック定義なし" };
      }

      const candidateHistory = getJudgementHistoryRecordsForCandidate(context.candidate);
      const serviceScopedHistory = filterHistoryRecordsToCurrentService(candidateHistory, context.currentServiceId);
      const filteredHistory = filterHistoryRecordsForRule(serviceScopedHistory, rule);

      if (rule.code === "monthly_limit_per_client") {
        const existingCount = filteredHistory.length;
        if (existingCount >= Number(rule.limit ?? 0)) {
          return { level: "review", message: rule.label + "。今月すでに" + String(existingCount) + "件あります。" };
        }
        return { level: "ok", message: rule.label + "。今月既存" + String(existingCount) + "件で範囲内です。" };
      }

      if (rule.code === "manual_review") {
        return { level: "review", message: rule.label || "制度要件が未整理のため要確認です。" };
      }

      if (rule.code === "blocked_if_answer_true") {
        const answerKey = String(rule.answerKey ?? "").trim();
        const blockedValue = String(rule.blockedValue ?? "はい").trim();
        const answerValue = String(state.judgement?.answers?.[answerKey] ?? "").trim();

        if (!answerKey) {
          return { level: "skip", message: "" };
        }
        if (!answerValue) {
          return { level: "review", message: rule.label + "。確認項目が未回答のため要確認です。" };
        }
        if (answerValue === blockedValue) {
          return { level: "review", message: rule.label + "。今回は「" + answerValue + "」です。" };
        }
        return { level: "ok", message: rule.label + "。今回は「" + answerValue + "」のため対象外です。" };
      }

      if (rule.code === "monthly_limit_per_client_by_organization_group") {
        const currentGroup = String(context.currentOrganizationGroup ?? "").trim();
        if (!currentGroup) {
          return { level: "review", message: rule.label + "。相手先グループを特定できないため要確認です。" };
        }
        const sameGroupHistory = filteredHistory.filter((record) => getResolvedReportRecordOrganizationGroup(record) === currentGroup);
        const existingCount = sameGroupHistory.length;
        if (existingCount >= Number(rule.limit ?? 0)) {
          return { level: "review", message: rule.label + "（" + currentGroup + "）。今月すでに" + String(existingCount) + "件あります。" };
        }
        return { level: "ok", message: rule.label + "（" + currentGroup + "）。今月既存" + String(existingCount) + "件で範囲内です。" };
      }

      if (rule.code === "monthly_limit_per_client_by_organization") {
        const currentOrganizationId = String(context.currentOrganizationId ?? "").trim();
        if (!currentOrganizationId) {
          return { level: "review", message: rule.label + "。相手先機関を特定できないため要確認です。" };
        }
        const sameOrganizationHistory = filteredHistory.filter((record) => String(record.organizationId ?? "").trim() === currentOrganizationId);
        const existingCount = sameOrganizationHistory.length;
        if (existingCount >= Number(rule.limit ?? 0)) {
          return { level: "review", message: rule.label + "。今月すでに" + String(existingCount) + "件あります。" };
        }
        return { level: "ok", message: rule.label + "。今月既存" + String(existingCount) + "件で範囲内です。" };
      }

      if (rule.code === "monthly_action_count_min") {
        const requiredActions = Array.isArray(rule.actionTypes) ? rule.actionTypes.filter(Boolean) : [];
        const currentActionType = String(state.judgement?.answers?.actionType ?? "").trim();
        if (requiredActions.length > 0 && currentActionType && !requiredActions.includes(currentActionType)) {
          return { level: "skip", message: "" };
        }
        const actionHistory = serviceScopedHistory.filter((record) => (
          requiredActions.length === 0 || requiredActions.includes(String(record.actionType ?? "").trim())
        ));
        const projectedCount = actionHistory.length + 1;
        if (projectedCount < Number(rule.minimum ?? 0)) {
          return { level: "review", message: rule.label + "。今回を含めて" + String(projectedCount) + "回です。" };
        }
        return { level: "ok", message: rule.label + "。今回を含めて" + String(projectedCount) + "回で条件内です。" };
      }

      if (rule.code === "monthly_addition_count_min") {
        const targetCodes = Array.isArray(rule.additionCodes)
          ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        const countedHistory = targetCodes.length > 0
          ? serviceScopedHistory.filter((record) => targetCodes.includes(String(record.additionCode ?? "").trim()))
          : serviceScopedHistory;
        const projectedCount = countedHistory.length + 1;
        if (projectedCount < Number(rule.minimum ?? 0)) {
          return { level: "review", message: rule.label + "。今回を含めて" + String(projectedCount) + "回です。" };
        }
        return { level: "ok", message: rule.label + "。今回を含めて" + String(projectedCount) + "回で条件内です。" };
      }

      if (rule.code === "monthly_distinct_organization_limit_per_client") {
        const organizationIds = new Set(
          serviceScopedHistory
            .map((item) => String(item.organizationId ?? ""))
            .filter(Boolean),
        );
        if (context.currentOrganizationId) {
          organizationIds.add(String(context.currentOrganizationId));
        }
        const projectedCount = organizationIds.size;
        if (projectedCount > Number(rule.limit ?? 0)) {
          return { level: "review", message: rule.label + "。今回を含めると" + String(projectedCount) + "機関になります。" };
        }
        return { level: "ok", message: rule.label + "。今回を含めて" + String(projectedCount) + "機関です。" };
      }

      if (rule.code === "exclusive_with_addition_codes") {
        const exclusiveCodes = Array.isArray(rule.additionCodes)
          ? rule.additionCodes.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        const recordActionTypes = Array.isArray(rule.recordActionTypes)
          ? rule.recordActionTypes.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];

        if (exclusiveCodes.length === 0) {
          return { level: "skip", message: "" };
        }

        const serviceScopedAllHistory = filterHistoryRecordsToCurrentService(
          state.judgement?.historyRecords,
          context.currentServiceId,
        );
        const conflictingRecords = serviceScopedAllHistory.filter((record) => (
          exclusiveCodes.includes(String(record.additionCode ?? "").trim())
          && (
            recordActionTypes.length === 0
            || recordActionTypes.includes(String(record.actionType ?? "").trim())
          )
        ));

        if (conflictingRecords.length > 0) {
          const names = Array.from(new Set(
            conflictingRecords.map((record) => String(record.additionName ?? "").trim()).filter(Boolean),
          ));
          const label = names.length > 0 ? names.join(" / ") : exclusiveCodes.join(" / ");
          return { level: "review", message: rule.label + "。今月すでに " + label + " の記録があります。" };
        }
        return { level: "ok", message: rule.label + "。今月の併算定不可記録は見つかっていません。" };
      }

      return { level: "info", message: rule.label || rule.code };
    }

    function evaluateJudgementPostChecks(params) {
      const candidates = Array.isArray(params?.candidates) ? params.candidates : [];
      const currentQuestion = params?.currentQuestion ?? null;
      const topCandidate = params?.topCandidate ?? null;
      const organization = params?.organization ?? null;

      if (!topCandidate) {
        return {
          status: "none",
          requiresReview: false,
          summary: "前の条件を見直してください。",
          nextAction: "機関・サービス・回答のどこで外れたか確認",
          saveLabel: "候補なし",
        };
      }
      if (currentQuestion) {
        return {
          status: "pending",
          requiresReview: false,
          summary: "まず「" + currentQuestion.label + "」に回答してください。",
          nextAction: "次の設問: " + currentQuestion.label,
          saveLabel: "設問未完了",
        };
      }
      if (candidates.length > 1) {
        return {
          status: "pending",
          requiresReview: false,
          summary: "候補確定後に回数制限や併算定を確認します。",
          nextAction: currentQuestion ? "まず「" + currentQuestion.label + "」に回答" : "候補が複数のため制度確認",
          saveLabel: "候補未確定",
        };
      }
      if (state.judgement?.historyLoading) {
        return {
          status: "review",
          requiresReview: true,
          summary: "保存済み履歴を確認中です。後段チェックは要確認で扱います。",
          nextAction: "履歴読込完了後に再確認",
          saveLabel: "履歴確認中",
        };
      }
      if (state.judgement?.historyError) {
        return {
          status: "review",
          requiresReview: true,
          summary: "保存済み履歴を確認できませんでした。後段チェックは要確認です。",
          nextAction: "集計で同月記録を確認",
          saveLabel: "履歴確認エラー",
        };
      }

      const rules = Array.isArray(topCandidate?.postCheckRules)
        ? topCandidate.postCheckRules.filter((rule) => rule && rule.code)
        : [];
      if (rules.length === 0) {
        return {
          status: "ok",
          requiresReview: false,
          summary: topCandidate.postCheck || "追加の後段チェックはありません。",
          nextAction: "保存文を確認して保存",
          saveLabel: "後段チェックなし",
        };
      }

      const evaluations = rules.map((rule) => evaluatePostCheckRule(rule, {
        candidate: topCandidate,
        currentOrganizationId: organization?.organizationId ?? "",
        currentOrganizationGroup: getOrganizationGroupLabel(organization),
        currentServiceId: state.judgement?.serviceId ?? "",
      }));
      const visibleEvaluations = evaluations.filter((item) => item.message);
      const warnings = evaluations.filter((item) => item.level === "review");

      if (warnings.length > 0) {
        return {
          status: "review",
          requiresReview: true,
          summary: warnings.map((item) => item.message).join(" / "),
          nextAction: "集計で同月記録を確認してから請求判断",
          saveLabel: "後段チェック要確認",
        };
      }

      return {
        status: "ok",
        requiresReview: false,
        summary: visibleEvaluations.length > 0
          ? visibleEvaluations.map((item) => item.message).join(" / ")
          : (topCandidate.postCheck || "追加の後段チェックはありません。"),
        nextAction: "保存文を確認して保存",
        saveLabel: "後段チェック済み",
      };
    }

    function buildJudgementSnapshot() {
      pruneHiddenJudgementAnswers();
      const client = getClientById(state.judgement?.clientId);
      const organization = getOrganizationById(state.judgement?.organizationId);
      const service = getServiceById(state.judgement?.serviceId);
      const staff = getStaffById(state.judgement?.staffId);
      const selectableOrganizations = getSelectableOrganizationsForJudgement(state.judgement?.clientId);
      const selectableServices = getSelectableServicesForJudgement(state.judgement?.clientId, state.judgement?.organizationId);
      const hasJudgementScope = selectableOrganizations.length > 0 && selectableServices.length > 0;
      const candidates = getJudgementCandidates();
      const currentQuestion = getVisibleQuestions().find((question) => !state.judgement?.answers?.[question.key]);
      const topCandidate = candidates[0] ?? null;
      const matchedEnrollment = findMatchedJudgementEnrollment();
      const hasBlockingQuestion = Boolean(currentQuestion);
      const hasAnyCandidate = candidates.length > 0;
      const canSave = Boolean(
        !state.judgement?.loadingContext
        && hasJudgementScope
        && client
        && organization
        && service
        && staff
        && hasAnyCandidate
        && !hasBlockingQuestion
      );

      let saveSummary = "保存待ち";
      let blockReason = "";
      const organizationGroup = getOrganizationGroupLabel(organization, service);
      const performedAt = normalizePerformedAtForStorage(state.judgement?.performedAt);
      const postCheckResult = evaluateJudgementPostChecks({
        candidates: candidates,
        currentQuestion: currentQuestion,
        topCandidate: topCandidate,
        organization: organization,
      });

      if (state.judgement?.loadingContext) {
        saveSummary = "利用状況読込中";
        blockReason = "利用状況の読込完了後に保存できます";
      } else if (!hasJudgementScope) {
        saveSummary = "判定対象なし";
        blockReason = "相談支援は判定対象外です。判定対象の機関・サービスを選んでください";
      } else if (!client || !organization || !service || !staff) {
        saveSummary = "文脈不足";
        blockReason = "利用者・機関・サービス・相談員を選んでください";
      } else if (!hasAnyCandidate) {
        saveSummary = "候補なし";
        blockReason = "候補がないため保存できません";
      } else if (hasBlockingQuestion) {
        saveSummary = "未完了: " + currentQuestion.label;
        blockReason = "未回答の設問が残っています";
      } else if (candidates.length === 1 && postCheckResult.requiresReview) {
        saveSummary = "要確認で保存 (" + postCheckResult.saveLabel + ")";
      } else if (candidates.length === 1) {
        saveSummary = "自動確定で保存";
      } else {
        saveSummary = "要確認で保存 (" + String(candidates.length) + "候補)";
      }

      const finalStatus = candidates.length === 1 && !postCheckResult.requiresReview ? "自動確定" : "要確認";
      const topCandidateReference = getJudgementCandidateReference(topCandidate);
      const candidateStorageEntries = buildJudgementCandidateStorageEntries(candidates, topCandidate);
      const displayAdditionName = buildJudgementDisplayAdditionName(candidateStorageEntries, topCandidateReference);
      const rationale = buildJudgementRationale({
        candidates: candidates,
        currentQuestion: currentQuestion,
        topCandidate: topCandidate,
        organizationGroup: organizationGroup,
        postCheckResult: postCheckResult,
      });
      const defaultNoteText = buildJudgementSaveNote({
        client: client,
        organization: organization,
        service: service,
        staff: staff,
        candidates: candidates,
        topCandidate: topCandidate,
        finalStatus: finalStatus,
        postCheckResult: postCheckResult,
      });
      const noteMode = String(state.judgement?.noteMode ?? "default").trim() || "default";
      const noteText = noteMode === "default"
        ? defaultNoteText
        : String(state.judgement?.noteText ?? "");

      return {
        client: client,
        organization: organization,
        service: service,
        staff: staff,
        candidates: candidates,
        currentQuestion: currentQuestion,
        topCandidate: topCandidate,
        topCandidateReference: topCandidateReference,
        candidateStorageEntries: candidateStorageEntries,
        matchedEnrollment: matchedEnrollment,
        clientEnrollmentId: normalizeNumericId(matchedEnrollment?.clientEnrollmentId ?? matchedEnrollment?.enrollmentId ?? ""),
        serviceGroupId: normalizeNumericId(matchedEnrollment?.serviceGroupId ?? ""),
        organizationGroup: organizationGroup,
        performedAt: performedAt,
        canSave: canSave,
        blockReason: blockReason,
        saveSummary: saveSummary,
        finalStatus: finalStatus,
        displayAdditionName: displayAdditionName,
        rationale: rationale,
        defaultNoteText: defaultNoteText,
        noteMode: noteMode,
        noteText: noteText,
        promptText: String(state.judgement?.notePromptText ?? "").trim(),
        aiDraftText: String(state.judgement?.noteAiDraftText ?? "").trim(),
        additionPromptTemplate: String(topCandidateReference?.promptTemplate ?? "").trim(),
        postCheckSummary: postCheckResult.summary,
        postCheckNextAction: postCheckResult.nextAction,
        postCheckStatus: postCheckResult.status,
      };
    }

    function resetJudgementNoteState() {
      if (!state.judgement) {
        return;
      }

      state.judgement.noteMode = "default";
      state.judgement.noteText = "";
      state.judgement.notePromptText = "";
      state.judgement.noteAiDraftText = "";
      state.judgement.noteDraftError = "";
    }

    function buildJudgementNoteDraftPayload(snapshot) {
      const candidateStorageEntries = Array.isArray(snapshot?.candidateStorageEntries)
        ? snapshot.candidateStorageEntries
        : buildJudgementCandidateStorageEntries(snapshot?.candidates, snapshot?.topCandidate);

      return {
        client_name: snapshot?.client?.clientName,
        organization_name: snapshot?.organization?.organizationName,
        organization_group: snapshot?.organizationGroup,
        service_name: snapshot?.service?.serviceName,
        service_category: snapshot?.service?.serviceCategory,
        staff_name: snapshot?.staff?.staffName,
        target_month: state.judgement?.targetMonth,
        performed_at: snapshot?.performedAt || "",
        addition_name: snapshot?.displayAdditionName,
        addition_prompt_template: snapshot?.additionPromptTemplate || "",
        final_status: snapshot?.finalStatus,
        post_check_summary: snapshot?.postCheckSummary,
        rationale: snapshot?.rationale,
        default_note_text: snapshot?.defaultNoteText,
        candidate_names: candidateStorageEntries.map((candidate) => candidate.additionName),
        answers: { ...(state.judgement?.answers ?? {}) },
      };
    }

    function buildJudgementSavePayload(snapshot) {
      const topCandidateReference = getJudgementCandidateReference(snapshot?.topCandidate);
      const candidateStorageEntries = Array.isArray(snapshot?.candidateStorageEntries)
        ? snapshot.candidateStorageEntries
        : buildJudgementCandidateStorageEntries(snapshot?.candidates, snapshot?.topCandidate);

      return {
        client_enrollment_id: snapshot?.clientEnrollmentId,
        client_id: Number(snapshot?.client?.clientId),
        organization_id: Number(snapshot?.organization?.organizationId),
        service_definition_id: Number(snapshot?.service?.serviceId),
        service_group_id: snapshot?.serviceGroupId,
        staff_id: Number(snapshot?.staff?.staffId),
        target_month: state.judgement?.targetMonth,
        performed_at: snapshot?.performedAt || null,
        final_status: snapshot?.finalStatus,
        addition_name: snapshot?.displayAdditionName,
        message: snapshot?.rationale,
        final_note_text: snapshot?.noteText,
        prompt_text: snapshot?.promptText || null,
        ai_draft_text: snapshot?.aiDraftText || null,
        candidates: buildJudgementCandidatePayload(snapshot),
        answers: { ...(state.judgement?.answers ?? {}) },
        request: {
          client_id: snapshot?.client?.clientId,
          client_name: snapshot?.client?.clientName,
          organization_id: snapshot?.organization?.organizationId,
          organization_name: snapshot?.organization?.organizationName,
          organization_type: deriveResolvedOrganizationType(snapshot?.organization, snapshot?.service),
          organization_group: snapshot?.organizationGroup,
          service_definition_id: snapshot?.service?.serviceId,
          service_name: snapshot?.service?.serviceName,
          service_category: snapshot?.service?.serviceCategory,
          staff_id: snapshot?.staff?.staffId,
          staff_name: snapshot?.staff?.staffName,
          target_month: state.judgement?.targetMonth,
          performed_at: snapshot?.performedAt || "",
          answers: { ...(state.judgement?.answers ?? {}) },
          candidate_names: candidateStorageEntries.map((candidate) => candidate.additionName),
          candidate_count: candidateStorageEntries.length,
        },
        result: {
          addition_id: topCandidateReference.additionId,
          addition_branch_id: topCandidateReference.additionBranchId,
          addition_code: topCandidateReference.additionCode,
          addition_name: snapshot?.displayAdditionName,
          primary_addition_code: topCandidateReference.additionFamilyCode,
          primary_addition_name: topCandidateReference.additionFamilyName,
          candidate_count: candidateStorageEntries.length,
          candidate_names: candidateStorageEntries.map((candidate) => candidate.additionName),
          post_check: snapshot?.postCheckSummary,
          post_check_status: snapshot?.postCheckStatus,
          reason: snapshot?.rationale,
          final_note_text: snapshot?.noteText,
        },
      };
    }

    return {
      buildJudgementDisplayAdditionName: buildJudgementDisplayAdditionName,
      buildJudgementRationale: buildJudgementRationale,
      buildJudgementSaveNote: buildJudgementSaveNote,
      getJudgementHistoryRecordsForCandidate: getJudgementHistoryRecordsForCandidate,
      filterHistoryRecordsToCurrentService: filterHistoryRecordsToCurrentService,
      filterHistoryRecordsForRule: filterHistoryRecordsForRule,
      getResolvedReportRecordOrganizationGroup: getResolvedReportRecordOrganizationGroup,
      evaluatePostCheckRule: evaluatePostCheckRule,
      evaluateJudgementPostChecks: evaluateJudgementPostChecks,
      resetJudgementNoteState: resetJudgementNoteState,
      buildJudgementNoteDraftPayload: buildJudgementNoteDraftPayload,
      buildJudgementSnapshot: buildJudgementSnapshot,
      buildJudgementSavePayload: buildJudgementSavePayload,
    };
  }

  global.__KASAN_JUDGEMENT_SESSION_BRIDGE__ = {
    createJudgementSessionBridge: createJudgementSessionBridge,
  };
})(globalThis);
