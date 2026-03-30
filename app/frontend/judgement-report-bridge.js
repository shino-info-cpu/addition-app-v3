(function (global) {
  function createJudgementReportBridge(options) {
    const normalizeNumericId = options.normalizeNumericId;
    const deriveResolvedOrganizationType = options.deriveResolvedOrganizationType;
    const deriveOrganizationGroupFromType = options.deriveOrganizationGroupFromType;
    const findAdditionReferenceByCode = options.findAdditionReferenceByCode;
    const countMatchedConditionGroupsForCandidate = options.countMatchedConditionGroupsForCandidate;
    const getJudgementFacts = options.getJudgementFacts;
    const isSameJudgementCandidate = options.isSameJudgementCandidate;

    function getJudgementCandidateReference(candidate) {
      if (!candidate) {
        return {
          additionId: null,
          additionBranchId: null,
          additionCode: "",
          additionFamilyCode: "",
          additionName: "",
          additionFamilyName: "",
          resultStorageMode: "json",
        };
      }

      const additionId = normalizeNumericId(candidate.additionId ?? "");
      const additionBranchId = normalizeNumericId(candidate.additionBranchId ?? "");
      const additionCode = String(candidate.additionCode ?? "").trim();
      const additionFamilyCode = String(candidate.additionFamilyCode ?? additionCode).trim() || additionCode;
      const additionName = String(candidate.additionName ?? additionCode).trim() || additionCode;
      const additionFamilyName = String(candidate.additionFamilyName ?? additionName).trim() || additionName;

      return {
        additionId: additionId,
        additionBranchId: additionBranchId,
        additionCode: additionCode,
        additionFamilyCode: additionFamilyCode,
        additionName: additionName,
        additionFamilyName: additionFamilyName,
        resultStorageMode: additionBranchId !== null ? "branch" : (additionId !== null ? "family" : "json"),
      };
    }

    function buildJudgementCandidateStorageEntries(candidates, topCandidate, factsOverride) {
      const facts = factsOverride ?? getJudgementFacts(true);
      return (Array.isArray(candidates) ? candidates : []).map((candidate, index) => {
        const reference = getJudgementCandidateReference(candidate);
        return {
          additionId: reference.additionId,
          additionBranchId: reference.additionBranchId,
          additionCode: reference.additionCode,
          additionName: reference.additionName,
          additionFamilyCode: reference.additionFamilyCode,
          additionFamilyName: reference.additionFamilyName,
          candidateStatus: isSameJudgementCandidate(candidate, topCandidate)
            ? ((Array.isArray(candidates) ? candidates.length : 0) === 1 ? "selected" : "leading_candidate")
            : "candidate",
          matchedGroupCount: countMatchedConditionGroupsForCandidate(candidate, facts),
          displayOrder: (index + 1) * 10,
          detailJson: {
            addition_code: reference.additionCode,
            addition_family_code: reference.additionFamilyCode,
            addition_name: reference.additionName,
            addition_family_name: reference.additionFamilyName,
            reason: candidate.reason ?? "",
            rule_status: candidate.ruleStatus ?? "",
            confirmed_rules: Array.isArray(candidate.confirmedRules) ? candidate.confirmedRules : [],
            provisional_rules: Array.isArray(candidate.provisionalRules) ? candidate.provisionalRules : [],
            post_check: candidate.postCheck ?? "",
          },
        };
      });
    }

    function buildJudgementCandidatePayload(snapshot) {
      const candidateStorageEntries = Array.isArray(snapshot.candidateStorageEntries)
        ? snapshot.candidateStorageEntries
        : buildJudgementCandidateStorageEntries(snapshot.candidates, snapshot.topCandidate);

      return candidateStorageEntries.map((candidate) => ({
        addition_id: candidate.additionId,
        addition_branch_id: candidate.additionBranchId,
        addition_code: candidate.additionCode,
        addition_name: candidate.additionName,
        addition_family_name: candidate.additionFamilyName,
        candidate_status: candidate.candidateStatus,
        matched_group_count: candidate.matchedGroupCount,
        display_order: candidate.displayOrder,
        detail_json: candidate.detailJson,
      }));
    }

    function buildJudgementCandidateNamesSummary(candidates) {
      return (Array.isArray(candidates) ? candidates : [])
        .map((candidate) => String(candidate?.additionName ?? "").trim())
        .filter(Boolean)
        .join(" / ");
    }

    function buildJudgementCandidateDetails(candidates) {
      return (Array.isArray(candidates) ? candidates : []).map((candidate, index) => ({
        additionCode: String(candidate?.additionCode ?? "").trim(),
        additionName: String(candidate?.additionName ?? "").trim(),
        candidateStatus: candidate.candidateStatus || "matched",
        matchedGroupCount: Number(candidate.matchedGroupCount ?? candidate.matched_group_count ?? 0) || 0,
        displayOrder: Number(candidate.displayOrder ?? candidate.priority ?? index + 1) || (index + 1),
      })).filter((candidate) => candidate.additionName);
    }

    function normalizeReportCandidateDetails(value) {
      let rawValue = value;
      if (typeof rawValue === "string") {
        const trimmedValue = rawValue.trim();
        if (!trimmedValue) {
          return [];
        }

        try {
          rawValue = JSON.parse(trimmedValue);
        } catch (error) {
          return [];
        }
      }

      if (!Array.isArray(rawValue)) {
        return [];
      }

      return rawValue
        .map((item, index) => ({
          additionCode: String(item?.additionCode ?? item?.addition_code ?? "").trim(),
          additionName: String(item?.additionName ?? item?.addition_name ?? "").trim(),
          candidateStatus: String(item?.candidateStatus ?? item?.candidate_status ?? "").trim(),
          matchedGroupCount: Number(item?.matchedGroupCount ?? item?.matched_group_count ?? 0) || 0,
          displayOrder: Number(item?.displayOrder ?? item?.display_order ?? index + 1) || (index + 1),
        }))
        .filter((item) => item.additionName);
    }

    function normalizeApiReportRecord(item) {
      const resolvedOrganizationType = deriveResolvedOrganizationType({
        organizationType: item.organization_type ?? "",
        organizationName: item.organization_name ?? "",
        serviceNames: item.service_name ?? "",
      });
      const additionReference = findAdditionReferenceByCode(item.addition_code ?? "");
      const additionId = normalizeNumericId(item.addition_id ?? "");
      const additionBranchId = normalizeNumericId(item.addition_branch_id ?? "");
      const rawCandidateCount = Number(item.candidate_count ?? 0) || 0;
      const candidateCount = rawCandidateCount > 0
        ? rawCandidateCount
        : ((additionBranchId !== null || additionId !== null) ? 1 : 0);
      const additionName = String(item.addition_name ?? "").trim()
        || additionReference?.branchName
        || additionReference?.familyName
        || "-";
      const candidateNamesSummary = String(item.candidate_names_summary ?? "").trim()
        || (candidateCount === 1 ? additionName : "");
      const candidateDetails = normalizeReportCandidateDetails(item.candidate_details_json ?? item.candidateDetails ?? []);
      const resultStorageMode = String(item.result_storage_mode ?? "").trim()
        || (additionBranchId !== null ? "branch" : (additionId !== null ? "family" : "json"));
      const candidateStorageMode = String(item.candidate_storage_mode ?? "").trim()
        || (candidateDetails.length > 0 ? "db" : (candidateCount > 0 ? "fallback" : "none"));

      return {
        recordId: String(item.evaluation_case_id ?? ""),
        targetMonth: item.target_month ?? "",
        performedAt: item.performed_at ?? "",
        clientId: String(item.client_id ?? ""),
        clientName: item.client_name ?? "-",
        targetType: item.target_type ?? "-",
        organizationId: String(item.organization_id ?? ""),
        organizationName: item.organization_name ?? "-",
        organizationType: resolvedOrganizationType,
        organizationGroup: item.organization_group || deriveOrganizationGroupFromType(resolvedOrganizationType),
        serviceId: String(item.service_definition_id ?? ""),
        serviceName: item.service_name ?? "-",
        staffId: String(item.staff_id ?? ""),
        staffName: item.staff_name ?? "-",
        actionType: item.action_type ?? "",
        additionId: additionId,
        additionBranchId: additionBranchId,
        additionCode: String(item.addition_code ?? "").trim() || additionReference?.branchCode || "",
        additionFamilyCode: String(item.addition_family_code ?? "").trim() || additionReference?.familyCode || "",
        additionFamilyName: String(item.addition_family_name ?? "").trim() || additionReference?.familyName || "",
        additionName: additionName,
        resultStorageMode: resultStorageMode,
        candidateStorageMode: candidateStorageMode,
        candidateCount: candidateCount,
        candidateNamesSummary: candidateNamesSummary,
        candidateDetails: candidateDetails,
        finalStatus: item.final_status ?? "-",
        postCheckStatus: item.post_check_status ?? "",
        postCheckSummary: item.post_check ?? "-",
        evaluatedAt: item.evaluated_at ?? "",
        rationale: item.message ?? "-",
        savedNote: item.final_note_text ?? "-",
      };
    }

    function formatReportCandidateDetails(record) {
      const candidateDetails = Array.isArray(record?.candidateDetails) ? record.candidateDetails : [];
      if (candidateDetails.length > 0) {
        return candidateDetails
          .sort((left, right) => left.displayOrder - right.displayOrder)
          .map((candidate, index) => {
            const detailSuffix = candidate.matchedGroupCount > 0
              ? " / 条件一致 " + candidate.matchedGroupCount + "組"
              : "";
            return String(index + 1) + ". " + candidate.additionName + detailSuffix;
          })
          .join("\n");
      }

      const candidateNamesSummary = String(record?.candidateNamesSummary ?? "").trim();
      if (candidateNamesSummary) {
        return candidateNamesSummary;
      }

      return "-";
    }

    function formatReportIdentity(record) {
      const parts = [];
      const recordId = String(record?.recordId ?? "").trim();
      const familyName = String(record?.additionFamilyName ?? "").trim();
      const familyCode = String(record?.additionFamilyCode ?? "").trim();
      const branchCode = String(record?.additionCode ?? "").trim();
      const branchId = record?.additionBranchId;
      const resultStorageMode = String(record?.resultStorageMode ?? "").trim();
      const candidateStorageMode = String(record?.candidateStorageMode ?? "").trim();

      if (recordId) {
        parts.push("記録ID: " + recordId);
      }

      if (familyName || familyCode) {
        parts.push("family: " + (familyName || "-") + (familyCode ? " (" + familyCode + ")" : ""));
      }

      if (branchCode || branchId !== null) {
        parts.push("branch: " + (branchCode || "-") + (branchId !== null ? " (#" + branchId + ")" : ""));
      }

      if (resultStorageMode) {
        const resultStorageLabel = {
          branch: "branch保存",
          family: "family保存",
          json: "json保存",
        }[resultStorageMode] ?? resultStorageMode;
        parts.push("結果: " + resultStorageLabel);
      }

      if (candidateStorageMode) {
        const candidateStorageLabel = {
          db: "候補DB保存",
          json: "候補json保存",
          fallback: "候補fallback",
          none: "候補なし",
        }[candidateStorageMode] ?? candidateStorageMode;
        parts.push("候補: " + candidateStorageLabel);
      }

      return parts.join(" / ") || "-";
    }

    return {
      getJudgementCandidateReference: getJudgementCandidateReference,
      buildJudgementCandidateStorageEntries: buildJudgementCandidateStorageEntries,
      buildJudgementCandidatePayload: buildJudgementCandidatePayload,
      buildJudgementCandidateNamesSummary: buildJudgementCandidateNamesSummary,
      buildJudgementCandidateDetails: buildJudgementCandidateDetails,
      normalizeApiReportRecord: normalizeApiReportRecord,
      normalizeReportCandidateDetails: normalizeReportCandidateDetails,
      formatReportCandidateDetails: formatReportCandidateDetails,
      formatReportIdentity: formatReportIdentity,
    };
  }

  global.__KASAN_JUDGEMENT_REPORT_BRIDGE__ = {
    createJudgementReportBridge: createJudgementReportBridge,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
