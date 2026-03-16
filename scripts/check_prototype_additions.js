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

const mededu = getAddition("mededu");
const intensive = getAddition("intensive");
const conference = getAddition("conference");
const discharge = getAddition("discharge");

const cases = [
  {
    name: "mededu excludes 障害福祉サービス",
    actual: candidateMatches(mededu, {
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
    name: "mededu remains for 障害福祉以外の福祉サービス",
    actual: candidateMatches(mededu, {
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
    name: "intensive only remains in それ以外",
    actual: candidateMatches(intensive, {
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
    name: "intensive remains in それ以外 with visit",
    actual: candidateMatches(intensive, {
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
    name: "conference does not remain in 計画作成月",
    actual: candidateMatches(conference, {
      targetType: "児",
      organizationGroup: "福祉サービス等提供機関",
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
      serviceDecisionCategories: ["障害福祉サービス"],
      monthType: "モニタリング月",
      placeType: "自事業所内",
      actionType: "担当者会議開催",
    }),
    expected: true,
  },
  {
    name: "discharge remains for hospital + outside + pre-discharge meeting",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "病院・訪看・薬局グループ",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
    }),
    expected: true,
  },
  {
    name: "discharge does not remain for welfare group",
    actual: candidateMatches(discharge, {
      targetType: "共通",
      organizationGroup: "福祉サービス等提供機関",
      serviceDecisionCategories: ["医療関連"],
      monthType: "それ以外",
      placeType: "外出先",
      actionType: "退院前面談",
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
