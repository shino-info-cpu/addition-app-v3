const fs = require("fs");
const path = require("path");
const vm = require("vm");

const appJsPath = path.resolve(__dirname, "../app/frontend/app.js");
const source = fs.readFileSync(appJsPath, "utf8");
const additionsMatch = source.match(/additions:\s*(\[[\s\S]*?\])\s*,\s*reportRecords:/);

if (!additionsMatch) {
  console.error("Could not extract prototype additions from app.js");
  process.exit(1);
}

const additions = vm.runInNewContext(`(${additionsMatch[1]})`);

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

function matchesConditionList(allowed, actualValues) {
  if (!Array.isArray(actualValues) || actualValues.length === 0) {
    return true;
  }
  return actualValues.some((value) => allowed.includes(value));
}

function matchesDecisionCategoryRules(actualValues, includeValues = [], excludeValues = []) {
  const includeMatch = !includeValues?.length || matchesConditionList(includeValues, actualValues);
  const excludeMatch = !excludeValues?.length || !matchesConditionList(excludeValues, actualValues);
  return includeMatch && excludeMatch;
}

function candidateMatches(candidate, facts) {
  return matchesTargetType(candidate.targetTypes, facts.targetType)
    && matchesCondition(candidate.organizationGroups, facts.organizationGroup)
    && matchesOptionalCondition(candidate.organizationTypes, facts.organizationType)
    && matchesRequiredAnswers(candidate.requiredAnswers, facts.answers)
    && matchesDecisionCategoryRules(
      facts.serviceDecisionCategories,
      candidate.serviceDecisionInclude,
      candidate.serviceDecisionExclude,
    )
    && matchesCondition(candidate.monthTypes, facts.monthType)
    && matchesCondition(candidate.placeTypes, facts.placeType)
    && matchesCondition(candidate.actionTypes, facts.actionType);
}

function getAddition(code) {
  const addition = additions.find((item) => item.additionCode === code);
  if (!addition) {
    throw new Error(`Missing addition definition: ${code}`);
  }
  return addition;
}

const mededuTsuuin = getAddition("mededu_tsuuin");
const mededuInfo = getAddition("mededu_info");
const mededuInterview = getAddition("mededu_interview");
const mededuMeeting = getAddition("mededu_meeting");
const intensiveVisit = getAddition("intensive_visit");
const intensiveSceneCheck = getAddition("intensive_scene_check");
const intensiveMeetingHost = getAddition("intensive_meeting_host");
const intensiveMeetingJoin = getAddition("intensive_meeting_join");
const intensiveTsuuin = getAddition("intensive_tsuuin");
const intensiveInfo = getAddition("intensive_info");
const intensiveInfoMedical = getAddition("intensive_info_medical");
const intensiveInfoPharmacy = getAddition("intensive_info_pharmacy");
const monitoring = getAddition("monitoring");
const hospitalInfoI = getAddition("hospital_info_i");
const hospitalInfoII = getAddition("hospital_info_ii");
const eduInfo = getAddition("edu_info");
const eduVisit = getAddition("edu_visit");
const eduMeeting = getAddition("edu_meeting");
const homeInfo = getAddition("home_info");
const homeVisit = getAddition("home_visit");
const homeMeeting = getAddition("home_meeting");
const homeWorkInfo = getAddition("home_work_info");
const homeWorkVisit = getAddition("home_work_visit");
const homeWorkMeeting = getAddition("home_work_meeting");
const conference = getAddition("conference");
const discharge = getAddition("discharge");

const cases = [
  {
    name: "mededu tsuuin remains for hospital-group companion visit",
    actual: candidateMatches(mededuTsuuin, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: true,
  },
  {
    name: "mededu tsuuin does not remain in それ以外 month",
    actual: candidateMatches(mededuTsuuin, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "mededu tsuuin does not remain for welfare-service group",
    actual: candidateMatches(mededuTsuuin, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["相談支援"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "mededu tsuuin does not remain for visiting nurse",
    actual: candidateMatches(mededuTsuuin, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "訪問看護",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "mededu tsuuin does not remain for pharmacy",
    actual: candidateMatches(mededuTsuuin, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "薬局",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "mededu info excludes 障害福祉サービス",
    actual: candidateMatches(mededuInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "mededu info remains for 障害福祉以外の福祉サービス",
    actual: candidateMatches(mededuInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "mededu interview remains for welfare-service interview",
    actual: candidateMatches(mededuInterview, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: true,
  },
  {
    name: "mededu interview does not remain for hospital group",
    actual: candidateMatches(mededuInterview, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: false,
  },
  {
    name: "mededu meeting remains for welfare-service meeting",
    actual: candidateMatches(mededuMeeting, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["相談支援"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: true,
  },
  {
    name: "mededu meeting does not remain for hospital group",
    actual: candidateMatches(mededuMeeting, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "訪問看護",
      serviceDecisionCategories: ["医療関連"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "intensive visit only remains in それ以外",
    actual: candidateMatches(intensiveVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "訪問",
    }),
    expected: false,
  },
  {
    name: "intensive visit remains in それ以外 with visit",
    actual: candidateMatches(intensiveVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "訪問",
    }),
    expected: true,
  },
  {
    name: "intensive scene check remains in それ以外 with service scene check",
    actual: candidateMatches(intensiveSceneCheck, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "サービス提供場面確認",
    }),
    expected: true,
  },
  {
    name: "intensive scene check does not remain for visit",
    actual: candidateMatches(intensiveSceneCheck, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "訪問",
    }),
    expected: false,
  },
  {
    name: "intensive meeting host remains in それ以外 with 担当者会議開催",
    actual: candidateMatches(intensiveMeetingHost, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "担当者会議開催",
    }),
    expected: true,
  },
  {
    name: "intensive meeting host does not remain in モニタリング月",
    actual: candidateMatches(intensiveMeetingHost, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "担当者会議開催",
    }),
    expected: false,
  },
  {
    name: "intensive meeting join remains in それ以外 with 会議",
    actual: candidateMatches(intensiveMeetingJoin, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: true,
  },
  {
    name: "intensive meeting join does not remain in 計画作成月",
    actual: candidateMatches(intensiveMeetingJoin, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "intensive tsuuin remains in それ以外 with hospital companion visit",
    actual: candidateMatches(intensiveTsuuin, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: true,
  },
  {
    name: "intensive tsuuin does not remain for welfare-service group",
    actual: candidateMatches(intensiveTsuuin, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "intensive tsuuin does not remain in 計画作成月 even for hospital companion visit",
    actual: candidateMatches(intensiveTsuuin, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "通院同行",
    }),
    expected: false,
  },
  {
    name: "intensive info remains in それ以外 with 情報共有",
    actual: candidateMatches(intensiveInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["相談支援"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "intensive medical info remains for hospital info-sharing when not admission-related",
    actual: candidateMatches(intensiveInfoMedical, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { hospitalAdmissionContext: "入院に当たっていない" },
    }),
    expected: true,
  },
  {
    name: "intensive medical info does not remain for admission-related hospital info-sharing",
    actual: candidateMatches(intensiveInfoMedical, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { hospitalAdmissionContext: "入院に当たっている" },
    }),
    expected: false,
  },
  {
    name: "intensive medical info does not remain for pharmacy",
    actual: candidateMatches(intensiveInfoMedical, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "薬局",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { hospitalAdmissionContext: "入院に当たっていない" },
    }),
    expected: false,
  },
  {
    name: "intensive pharmacy info remains for pharmacy info-sharing without admission context",
    actual: candidateMatches(intensiveInfoPharmacy, {
      targetType: "者",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "薬局",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "intensive info does not remain in モニタリング月",
    actual: candidateMatches(intensiveInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["相談支援"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "monitoring remains for welfare service scene check outside office",
    actual: candidateMatches(monitoring, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "サービス提供場面確認",
    }),
    expected: true,
  },
  {
    name: "monitoring does not remain for inside-office work",
    actual: candidateMatches(monitoring, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "サービス提供場面確認",
    }),
    expected: false,
  },
  {
    name: "monitoring does not remain for consultation service",
    actual: candidateMatches(monitoring, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "相談支援事業所",
      serviceDecisionCategories: ["相談支援"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "サービス提供場面確認",
    }),
    expected: false,
  },
  {
    name: "hospital info I remains for hospital visit and info sharing when tied to admission",
    actual: candidateMatches(hospitalInfoI, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      answers: { hospitalAdmissionContext: "入院に当たっている" },
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "hospital info II remains for non-visit info sharing when tied to admission",
    actual: candidateMatches(hospitalInfoII, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      answers: { hospitalAdmissionContext: "入院に当たっている" },
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "hospital info I does not remain when information sharing is unrelated to admission",
    actual: candidateMatches(hospitalInfoI, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      answers: { hospitalAdmissionContext: "入院に当たっていない" },
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "hospital info II does not remain when information sharing is unrelated to admission",
    actual: candidateMatches(hospitalInfoII, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      answers: { hospitalAdmissionContext: "入院に当たっていない" },
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "hospital info does not remain for visiting nurse",
    actual: candidateMatches(hospitalInfoI, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "訪問看護",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "edu info remains for child school info sharing",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "edu info remains for child nursery info sharing outside office",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "保育",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "edu info remains for child school info sharing with 障害福祉サービス context",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "edu info remains for child school info sharing with 相談支援 context",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["相談支援"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "edu info does not remain for adult target",
    actual: candidateMatches(eduInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "edu info remains for child welfare facility info sharing",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "児童施設",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: true,
  },
  {
    name: "edu info does not remain for hospital group",
    actual: candidateMatches(eduInfo, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "edu visit remains for child school interview in それ以外",
    actual: candidateMatches(eduVisit, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: true,
  },
  {
    name: "edu visit remains for child school interview with 障害福祉サービス context",
    actual: candidateMatches(eduVisit, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: true,
  },
  {
    name: "edu visit does not remain outside それ以外 month",
    actual: candidateMatches(eduVisit, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: false,
  },
  {
    name: "edu visit remains for child welfare facility interview in それ以外",
    actual: candidateMatches(eduVisit, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "児童施設",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: true,
  },
  {
    name: "edu meeting remains for child school meeting in それ以外",
    actual: candidateMatches(eduMeeting, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: true,
  },
  {
    name: "edu meeting remains for child school meeting with 相談支援 context",
    actual: candidateMatches(eduMeeting, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["相談支援"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: true,
  },
  {
    name: "edu meeting does not remain for adult target",
    actual: candidateMatches(eduMeeting, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "edu meeting remains for child welfare facility meeting in それ以外",
    actual: candidateMatches(eduMeeting, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "児童施設",
      serviceDecisionCategories: ["相談支援"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: true,
  },
  {
    name: "home info remains for adult care-manager info sharing",
    actual: candidateMatches(homeInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { careManagerStart: "利用開始あり" },
    }),
    expected: true,
  },
  {
    name: "home info does not remain when care-manager start is not present",
    actual: candidateMatches(homeInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { careManagerStart: "利用開始なし" },
    }),
    expected: false,
  },
  {
    name: "home info does not remain for child target",
    actual: candidateMatches(homeInfo, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "home visit remains for adult care-manager interview in それ以外",
    actual: candidateMatches(homeVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "面談",
      answers: { careManagerStart: "利用開始あり" },
    }),
    expected: true,
  },
  {
    name: "home visit does not remain outside それ以外 month",
    actual: candidateMatches(homeVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: false,
  },
  {
    name: "home meeting remains for adult care-manager meeting in それ以外",
    actual: candidateMatches(homeMeeting, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
      answers: { careManagerStart: "利用開始あり" },
    }),
    expected: true,
  },
  {
    name: "home meeting does not remain for child target",
    actual: candidateMatches(homeMeeting, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "ケアマネ事業所",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "home work info remains for adult company info sharing",
    actual: candidateMatches(homeWorkInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "情報共有",
      answers: { employmentStart: "新規雇用あり" },
    }),
    expected: true,
  },
  {
    name: "home work info does not remain when new employment is not present",
    actual: candidateMatches(homeWorkInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "計画作成月",
      placeType: "外出先",
      actionType: "情報共有",
      answers: { employmentStart: "新規雇用なし" },
    }),
    expected: false,
  },
  {
    name: "home work info remains for employment support center info sharing",
    actual: candidateMatches(homeWorkInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害者就業・生活支援センター",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
      answers: { employmentStart: "新規雇用あり" },
    }),
    expected: true,
  },
  {
    name: "home work info does not remain for school",
    actual: candidateMatches(homeWorkInfo, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "学校",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "情報共有",
    }),
    expected: false,
  },
  {
    name: "home work visit remains for adult company interview in それ以外",
    actual: candidateMatches(homeWorkVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "面談",
      answers: { employmentStart: "新規雇用あり" },
    }),
    expected: true,
  },
  {
    name: "home work visit does not remain outside それ以外 month",
    actual: candidateMatches(homeWorkVisit, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "面談",
    }),
    expected: false,
  },
  {
    name: "home work meeting remains for adult company meeting in それ以外",
    actual: candidateMatches(homeWorkMeeting, {
      targetType: "者",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
      answers: { employmentStart: "新規雇用あり" },
    }),
    expected: true,
  },
  {
    name: "home work meeting does not remain for child target",
    actual: candidateMatches(homeWorkMeeting, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "企業",
      serviceDecisionCategories: ["障害福祉以外の福祉サービス"],
      monthType: "それ以外",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "conference does not remain in 計画作成月",
    actual: candidateMatches(conference, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "計画作成月",
      placeType: "自事業所内",
      actionType: "担当者会議開催",
    }),
    expected: false,
  },
  {
    name: "conference does not remain for generic 会議",
    actual: candidateMatches(conference, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "会議",
    }),
    expected: false,
  },
  {
    name: "conference remains only for モニタリング月 + 担当者会議開催",
    actual: candidateMatches(conference, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "担当者会議開催",
    }),
    expected: true,
  },
  {
    name: "conference does not remain for hospital group even in モニタリング月",
    actual: candidateMatches(conference, {
      targetType: "児",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "モニタリング月",
      placeType: "外出先",
      actionType: "担当者会議開催",
    }),
    expected: false,
  },
  {
    name: "discharge remains for hospital + outside + pre-discharge meeting",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
      answers: { serviceUseStartMonth: "開始月である" },
    }),
    expected: true,
  },
  {
    name: "discharge remains for welfare-group discharge facility + outside + pre-discharge meeting",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "入所施設",
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
      answers: { serviceUseStartMonth: "開始月である" },
    }),
    expected: true,
  },
  {
    name: "discharge does not remain when it is not the service-start month",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "病院",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
      answers: { serviceUseStartMonth: "開始月ではない" },
    }),
    expected: false,
  },
  {
    name: "discharge does not remain for welfare group",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "福祉サービス等提供機関",
      organizationType: "障害福祉事業所",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
    }),
    expected: false,
  },
  {
    name: "discharge does not remain for visiting nurse",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      organizationType: "訪問看護",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
      answers: { serviceUseStartMonth: "開始月である" },
    }),
    expected: false,
  },
];

const failures = cases.filter((testCase) => testCase.actual !== testCase.expected);

cases.forEach((testCase) => {
  const status = testCase.actual === testCase.expected ? "PASS" : "FAIL";
  console.log(`${status}: ${testCase.name}`);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} prototype addition checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} prototype addition checks passed.`);
