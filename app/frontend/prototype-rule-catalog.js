(function (global) {
  var catalog = {
  "generatedAt": "2026-03-31T13:44:49.953Z",
  "questions": [
    {
      "key": "monthType",
      "order": 10,
      "label": "対応した時期はどれですか",
      "helper": "利用者の対象区分と機関・サービス条件は、選択済みの文脈から自動で候補に反映します。",
      "visibilityMode": "always",
      "visibilityConfig": null,
      "visibilityRules": [],
      "options": [
        {
          "value": "モニタリング月",
          "label": "モニタリング月",
          "note": "モニタリング実施月に該当する場合",
          "optionRules": []
        },
        {
          "value": "計画作成月",
          "label": "計画作成月",
          "note": "計画作成や更新の対象月に該当する場合",
          "optionRules": []
        },
        {
          "value": "それ以外",
          "label": "それ以外",
          "note": "通常月の支援や集中支援など",
          "optionRules": []
        }
      ]
    },
    {
      "key": "placeType",
      "order": 20,
      "label": "対応した場所はどこですか",
      "helper": "ここでは制度用語より先に、実際にどこで対応したかだけを聞きます。",
      "visibilityMode": "always",
      "visibilityConfig": null,
      "visibilityRules": [],
      "options": [
        {
          "value": "自事業所内",
          "label": "自事業所内",
          "note": "電話、自事業所内の会議、面談など",
          "optionRules": []
        },
        {
          "value": "外出先",
          "label": "外出先",
          "note": "訪問、同行、外部会議、現地確認など",
          "optionRules": []
        }
      ]
    },
    {
      "key": "actionType",
      "order": 30,
      "label": "その場で何をしましたか",
      "helper": "相談員が迷いやすい用語は、あとで管理者説明を載せられる前提です。",
      "visibilityMode": "answer_rules",
      "visibilityConfig": null,
      "visibilityRules": [
        {
          "dependsOnFieldKey": "placeType",
          "matchValues": [
            "自事業所内",
            "外出先"
          ],
          "clearOnHide": true,
          "displayOrder": 10
        }
      ],
      "options": [
        {
          "value": "訪問",
          "label": "訪問",
          "note": "現地へ行って支援状況や本人の様子を確認した",
          "optionRules": [
            {
              "dependsOnFieldKey": "placeType",
              "matchValues": [
                "外出先"
              ],
              "displayOrder": 10,
              "note": "Prototype の動的選択肢条件から生成。"
            }
          ]
        },
        {
          "value": "通院同行",
          "label": "通院同行",
          "note": "病院受診などに同行し、必要な情報を共有した",
          "optionRules": [
            {
              "dependsOnFieldKey": "placeType",
              "matchValues": [
                "外出先"
              ],
              "displayOrder": 10,
              "note": "Prototype の動的選択肢条件から生成。"
            }
          ]
        },
        {
          "value": "情報共有",
          "label": "情報共有",
          "note": "外部機関を訪ねるなどして必要な情報を伝えた",
          "optionRules": []
        },
        {
          "value": "会議",
          "label": "会議",
          "note": "担当者会議以外の外部会議や打合せに参加した",
          "optionRules": []
        },
        {
          "value": "担当者会議開催",
          "label": "担当者会議開催",
          "note": "外部会場などでサービス担当者会議を開催した",
          "optionRules": []
        },
        {
          "value": "面談",
          "label": "面談",
          "note": "外部で関係者や本人と面談した",
          "optionRules": []
        },
        {
          "value": "サービス提供場面確認",
          "label": "サービス提供場面確認",
          "note": "サービス提供の実際の場面を確認した",
          "optionRules": [
            {
              "dependsOnFieldKey": "placeType",
              "matchValues": [
                "外出先"
              ],
              "displayOrder": 10,
              "note": "Prototype の動的選択肢条件から生成。"
            }
          ]
        },
        {
          "value": "退院前面談",
          "label": "退院前面談",
          "note": "退院・退所前の面談や調整を行った",
          "optionRules": [
            {
              "dependsOnFieldKey": "placeType",
              "matchValues": [
                "外出先"
              ],
              "displayOrder": 10,
              "note": "Prototype の動的選択肢条件から生成。"
            }
          ]
        }
      ]
    },
    {
      "key": "hospitalAdmissionContext",
      "order": 40,
      "label": "今回の情報提供は入院に当たってのものですか",
      "helper": "入院時情報連携 I / II では、通常の病院連携と分けるために、入院に当たっての情報提供かどうかを先に確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "hospitalAdmissionContext",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "入院に当たっている",
          "label": "入院に当たっている",
          "note": "今回の情報提供は入院に当たって病院へ行った、または病院へ連絡したもの",
          "optionRules": []
        },
        {
          "value": "入院に当たっていない",
          "label": "入院に当たっていない",
          "note": "今回の情報提供は入院対応ではなく、通常の連携や別件の情報共有",
          "optionRules": []
        }
      ]
    },
    {
      "key": "requiredInfoReceived",
      "order": 44,
      "label": "判定に必要な情報を相手から受けましたか",
      "helper": "医保教の面談・会議や退院・退所では、面談や調整だけでなく、必要な情報の提供を受けたかを確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "requiredInfoReceived",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "受けた",
          "label": "受けた",
          "note": "加算判定に必要な情報の提供を受けた",
          "optionRules": []
        },
        {
          "value": "受けていない",
          "label": "受けていない",
          "note": "面談や調整はしたが、必要な情報の提供は受けていない",
          "optionRules": []
        }
      ]
    },
    {
      "key": "dischargeFacilityStaffOnlyInfo",
      "order": 45,
      "label": "得た情報は退院・退所する施設の職員からだけですか",
      "helper": "医保教の面談・会議では、退院・退所する施設の職員からの情報だけで終わる場合は不可です。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "dischargeFacilityStaffOnlyInfo",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "施設職員以外も含む",
          "label": "施設職員以外も含む",
          "note": "退院・退所する施設の職員以外からの情報や調整も含まれている",
          "optionRules": []
        },
        {
          "value": "施設職員のみ",
          "label": "施設職員のみ",
          "note": "退院・退所する施設の職員からの情報だけで対応した",
          "optionRules": []
        }
      ]
    },
    {
      "key": "dischargeInpatientPeriodCount",
      "order": 47,
      "label": "今回の調整は、同じ入所・入院期間中で何回目ですか",
      "helper": "退院・退所加算は、同じ入所・入院期間中で3回までです。分からない場合も要確認に回します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "dischargeInpatientPeriodCount",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "1回目",
          "label": "1回目",
          "note": "この入所・入院期間で最初の調整",
          "optionRules": []
        },
        {
          "value": "2回目",
          "label": "2回目",
          "note": "この入所・入院期間ですでに1回記録がある",
          "optionRules": []
        },
        {
          "value": "3回目",
          "label": "3回目",
          "note": "この入所・入院期間ですでに2回記録がある",
          "optionRules": []
        },
        {
          "value": "4回目以上・不明",
          "label": "4回目以上・不明",
          "note": "4回目以上、または回数を確定できない",
          "optionRules": []
        }
      ]
    },
    {
      "key": "initialAdditionPlanned",
      "order": 50,
      "label": "この月に初回加算も算定しますか",
      "helper": "面談・会議系や退院・退所系では、初回加算との重複可否を最後に確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "initialAdditionPlanned",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "初回加算なし",
          "label": "初回加算なし",
          "note": "この月は初回加算を算定しない",
          "optionRules": []
        },
        {
          "value": "初回加算あり",
          "label": "初回加算あり",
          "note": "この月に初回加算も算定する予定がある",
          "optionRules": []
        }
      ]
    },
    {
      "key": "careManagerStart",
      "order": 40,
      "label": "今回の支援はケアマネ利用開始に伴うものですか",
      "helper": "居宅連携系では、ケアマネ利用開始の文脈かどうかを候補の前提として確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "careManagerStart",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "利用開始あり",
          "label": "利用開始あり",
          "note": "今回の支援はケアマネ利用開始に伴う",
          "optionRules": []
        },
        {
          "value": "利用開始なし",
          "label": "利用開始なし",
          "note": "ケアマネ利用開始とは別の文脈",
          "optionRules": []
        }
      ]
    },
    {
      "key": "employmentStart",
      "order": 40,
      "label": "今回の支援は通常の事業所への新規雇用に伴うものですか",
      "helper": "居宅連携（就労）系では、新規雇用開始の文脈かどうかを候補の前提として確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "employmentStart",
        "singleCandidateOnly": false
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "新規雇用あり",
          "label": "新規雇用あり",
          "note": "通常の事業所への新規雇用に伴う支援",
          "optionRules": []
        },
        {
          "value": "新規雇用なし",
          "label": "新規雇用なし",
          "note": "新規雇用開始とは別の文脈",
          "optionRules": []
        }
      ]
    },
    {
      "key": "serviceUseStartMonth",
      "order": 46,
      "label": "今回の調整はサービス等の利用開始月のものですか",
      "helper": "退院・退所加算では、候補が絞れた段階で、サービス等の利用開始月に行った調整かどうかを最後に確認します。",
      "visibilityMode": "candidate_requirement",
      "visibilityConfig": {
        "answerKey": "serviceUseStartMonth",
        "singleCandidateOnly": true
      },
      "visibilityRules": [],
      "options": [
        {
          "value": "開始月である",
          "label": "開始月である",
          "note": "今回の調整はサービス等の利用開始月に行った",
          "optionRules": []
        },
        {
          "value": "開始月ではない",
          "label": "開始月ではない",
          "note": "利用開始月とは別の月の調整",
          "optionRules": []
        }
      ]
    }
  ],
  "additions": [
    {
      "additionId": 1,
      "additionBranchId": 101,
      "additionCode": "mededu_tsuuin",
      "additionName": "医療・保育・教育機関等連携加算（通院同行）",
      "additionFamilyCode": "mededu",
      "additionFamilyName": "医療・保育・教育機関等連携加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "モニタリング月または計画作成月の病院等への通院同行で候補に残す",
        "後段では同月3回までと同一病院等は月1回までを確認する"
      ],
      "provisionalRules": [
        "診療所は病院と同じ扱いで判定する",
        "初回加算との関係はまだ後段へ未反映"
      ],
      "priority": 90,
      "historyAdditionCodes": [
        "mededu",
        "mededu_tsuuin"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "通院同行"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 3,
          "additionCodes": [
            "mededu",
            "mededu_tsuuin"
          ],
          "recordActionTypes": [
            "通院同行"
          ],
          "label": "同月3回まで"
        },
        {
          "code": "monthly_limit_per_client_by_organization",
          "limit": 1,
          "additionCodes": [
            "mededu",
            "mededu_tsuuin"
          ],
          "recordActionTypes": [
            "通院同行"
          ],
          "label": "同一病院等は月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 1,
      "additionBranchId": 102,
      "additionCode": "mededu_info",
      "additionName": "医療・保育・教育機関等連携加算（情報共有）",
      "additionFamilyCode": "mededu",
      "additionFamilyName": "医療・保育・教育機関等連携加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "情報共有で候補に残す",
        "障害福祉サービスは除外する",
        "後段では同グループ月1回までを確認する"
      ],
      "provisionalRules": [
        "元資料上は月区分の限定が薄いが、現段階では従来どおりモニタリング月または計画作成月に寄せている",
        "機関グループの最終境界はまだ仮置き"
      ],
      "priority": 100,
      "historyAdditionCodes": [
        "mededu",
        "mededu_info"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ",
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "excludes_all",
              "expectedValue": [
                "障害福祉サービス"
              ],
              "note": "サービス判定区分の除外条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client_by_organization_group",
          "limit": 1,
          "additionCodes": [
            "mededu",
            "mededu_info"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同グループ月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 1,
      "additionBranchId": 103,
      "additionCode": "mededu_interview",
      "additionName": "医療・保育・教育機関等連携加算（面談）",
      "additionFamilyCode": "mededu",
      "additionFamilyName": "医療・保育・教育機関等連携加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "児対象のみ",
        "モニタリング月または計画作成月で候補に残す",
        "面談のみ",
        "必要な情報を受けた場合のみ",
        "障害福祉サービスは除外する",
        "同月1回まで",
        "初回加算算定時は不可",
        "担当者会議加算との併算定不可を後段で確認する"
      ],
      "provisionalRules": [
        "退院・退所加算との関係の細部はまだ未確定",
        "対象機関を福祉サービス等提供機関だけに絞っているが、制度境界の細部は未確定"
      ],
      "priority": 110,
      "historyAdditionCodes": [
        "mededu",
        "mededu_interview"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "excludes_all",
              "expectedValue": [
                "障害福祉サービス"
              ],
              "note": "サービス判定区分の除外条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "requiredInfoReceived",
              "operatorCode": "one_of",
              "expectedValue": [
                "受けた"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "blocked_if_answer_true",
          "answerKey": "dischargeFacilityStaffOnlyInfo",
          "blockedValue": "施設職員のみ",
          "label": "退院・退所する施設の職員のみからの情報なら不可"
        },
        {
          "code": "blocked_if_answer_true",
          "answerKey": "initialAdditionPlanned",
          "blockedValue": "初回加算あり",
          "label": "初回加算算定時は不可"
        },
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "mededu",
            "mededu_interview",
            "mededu_meeting"
          ],
          "recordActionTypes": [
            "面談",
            "会議"
          ],
          "label": "同月1回まで"
        },
        {
          "code": "exclusive_with_addition_codes",
          "additionCodes": [
            "conference"
          ],
          "label": "担当者会議加算との併算定不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 1,
      "additionBranchId": 104,
      "additionCode": "mededu_meeting",
      "additionName": "医療・保育・教育機関等連携加算（会議）",
      "additionFamilyCode": "mededu",
      "additionFamilyName": "医療・保育・教育機関等連携加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "児対象のみ",
        "モニタリング月または計画作成月で候補に残す",
        "会議のみ",
        "必要な情報を受けた場合のみ",
        "障害福祉サービスは除外する",
        "同月1回まで",
        "初回加算算定時は不可",
        "担当者会議加算との併算定不可を後段で確認する"
      ],
      "provisionalRules": [
        "退院・退所加算との関係の細部はまだ未確定",
        "対象機関を福祉サービス等提供機関だけに絞っているが、制度境界の細部は未確定"
      ],
      "priority": 120,
      "historyAdditionCodes": [
        "mededu",
        "mededu_meeting"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "excludes_all",
              "expectedValue": [
                "障害福祉サービス"
              ],
              "note": "サービス判定区分の除外条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "requiredInfoReceived",
              "operatorCode": "one_of",
              "expectedValue": [
                "受けた"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "blocked_if_answer_true",
          "answerKey": "dischargeFacilityStaffOnlyInfo",
          "blockedValue": "施設職員のみ",
          "label": "退院・退所する施設の職員のみからの情報なら不可"
        },
        {
          "code": "blocked_if_answer_true",
          "answerKey": "initialAdditionPlanned",
          "blockedValue": "初回加算あり",
          "label": "初回加算算定時は不可"
        },
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "mededu",
            "mededu_interview",
            "mededu_meeting"
          ],
          "recordActionTypes": [
            "面談",
            "会議"
          ],
          "label": "同月1回まで"
        },
        {
          "code": "exclusive_with_addition_codes",
          "additionCodes": [
            "conference"
          ],
          "label": "担当者会議加算との併算定不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 201,
      "additionCode": "intensive_visit",
      "additionName": "集中支援加算（訪問）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "訪問のみ",
        "同月2回以上の訪問を後段で確認する"
      ],
      "provisionalRules": [
        "機関グループの範囲は仮置き"
      ],
      "priority": 200,
      "historyAdditionCodes": [
        "intensive",
        "intensive_visit"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "訪問"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_action_count_min",
          "minimum": 2,
          "actionTypes": [
            "訪問"
          ],
          "label": "同月2回以上の訪問が必要"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 202,
      "additionCode": "intensive_scene_check",
      "additionName": "集中支援加算（サービス提供場面確認）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "サービス提供場面確認のみ"
      ],
      "provisionalRules": [
        "機関グループの範囲は仮置き"
      ],
      "priority": 210,
      "historyAdditionCodes": [
        "intensive",
        "intensive_scene_check"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "サービス提供場面確認"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 203,
      "additionCode": "intensive_meeting_host",
      "additionName": "集中支援加算（会議開催）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "サービス担当者会議の開催のみ",
        "旧資料上、追加の回数上限は見当たらない"
      ],
      "provisionalRules": [
        "現行UIでは「サービス担当者会議の開催」を「担当者会議開催」に寄せている"
      ],
      "priority": 215,
      "historyAdditionCodes": [
        "intensive",
        "intensive_meeting_host"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "担当者会議開催"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 204,
      "additionCode": "intensive_meeting_join",
      "additionName": "集中支援加算（会議参加）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "会議参加のみ",
        "旧資料上、追加の回数上限は見当たらない"
      ],
      "provisionalRules": [
        "現行UIでは「会議参加」を「会議」に寄せている"
      ],
      "priority": 220,
      "historyAdditionCodes": [
        "intensive",
        "intensive_meeting_join"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 205,
      "additionCode": "intensive_tsuuin",
      "additionName": "集中支援加算（通院同行）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "確定条件あり",
      "confirmedRules": [
        "それ以外月の病院等への通院同行のみ候補に残す",
        "後段では同月3回までと同一病院等は月1回までを確認する"
      ],
      "provisionalRules": [],
      "priority": 230,
      "historyAdditionCodes": [
        "intensive",
        "intensive_tsuuin"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "通院同行"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 3,
          "additionCodes": [
            "intensive",
            "intensive_tsuuin"
          ],
          "recordActionTypes": [
            "通院同行"
          ],
          "label": "同月3回まで"
        },
        {
          "code": "monthly_limit_per_client_by_organization",
          "limit": 1,
          "additionCodes": [
            "intensive",
            "intensive_tsuuin"
          ],
          "recordActionTypes": [
            "通院同行"
          ],
          "label": "同一病院等は月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 206,
      "additionCode": "intensive_info",
      "additionName": "集中支援加算（情報共有）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "福祉サービス等提供機関への情報共有のみ",
        "後段では同グループ月1回までを確認する"
      ],
      "provisionalRules": [
        "病院・訪看・薬局は内部的に別枝へ分けている"
      ],
      "priority": 240,
      "historyAdditionCodes": [
        "intensive",
        "intensive_info"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client_by_organization_group",
          "limit": 1,
          "additionCodes": [
            "intensive",
            "intensive_info",
            "intensive_info_medical",
            "intensive_info_pharmacy"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同グループ月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 207,
      "additionCode": "intensive_info_medical",
      "additionName": "集中支援加算（情報共有）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "病院または訪問看護への情報共有のみ",
        "入院に当たっての情報共有は除外する",
        "後段では同グループ月1回までを確認する"
      ],
      "provisionalRules": [
        "薬局は別枝へ分けて、入院確認の質問対象から外している"
      ],
      "priority": 241,
      "historyAdditionCodes": [
        "intensive",
        "intensive_info_medical"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院",
                "訪問看護"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "hospitalAdmissionContext",
              "operatorCode": "one_of",
              "expectedValue": [
                "入院に当たっていない"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client_by_organization_group",
          "limit": 1,
          "additionCodes": [
            "intensive",
            "intensive_info",
            "intensive_info_medical",
            "intensive_info_pharmacy"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同グループ月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 2,
      "additionBranchId": 208,
      "additionCode": "intensive_info_pharmacy",
      "additionName": "集中支援加算（情報共有）",
      "additionFamilyCode": "intensive",
      "additionFamilyName": "集中支援加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "それ以外月で候補に残す",
        "薬局への情報共有のみ",
        "後段では同グループ月1回までを確認する"
      ],
      "provisionalRules": [
        "薬局は病院/訪看枝と分けて、入院確認の質問を出さない"
      ],
      "priority": 242,
      "historyAdditionCodes": [
        "intensive",
        "intensive_info_pharmacy"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "薬局"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client_by_organization_group",
          "limit": 1,
          "additionCodes": [
            "intensive",
            "intensive_info",
            "intensive_info_medical",
            "intensive_info_pharmacy"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同グループ月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 3,
      "additionBranchId": 301,
      "additionCode": "monitoring",
      "additionName": "モニタリング加算",
      "additionFamilyCode": "monitoring",
      "additionFamilyName": "モニタリング加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "提供現場の訪問確認で候補に残す",
        "モニタリング月に限定しない",
        "同月1回まで"
      ],
      "provisionalRules": [
        "現行UIでは「提供現場訪問」を「サービス提供場面確認」に寄せている",
        "対象機関と対象サービスの制度境界はまだ仮置き"
      ],
      "priority": 250,
      "historyAdditionCodes": [
        "monitoring",
        "monitoring"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "サービス提供場面確認"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "monitoring"
          ],
          "label": "同月1回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 4,
      "additionBranchId": 401,
      "additionCode": "conference",
      "additionName": "担当者会議加算",
      "additionFamilyCode": "conference",
      "additionFamilyName": "担当者会議加算",
      "promptTemplate": "",
      "ruleStatus": "確定条件あり",
      "confirmedRules": [
        "モニタリング月のみ",
        "福祉サービス等提供機関のみ",
        "担当者会議開催のみ",
        "同月1回まで",
        "医保教（面談・会議）との併算定不可を後段で確認する"
      ],
      "provisionalRules": [],
      "priority": 300,
      "historyAdditionCodes": [
        "conference",
        "conference"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連",
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "担当者会議開催"
              ],
              "note": "行為種別"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "conference"
          ],
          "label": "同月1回まで"
        },
        {
          "code": "exclusive_with_addition_codes",
          "additionCodes": [
            "mededu",
            "mededu_interview",
            "mededu_meeting"
          ],
          "recordActionTypes": [
            "面談",
            "会議"
          ],
          "label": "医保教（面談・会議）との併算定不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 5,
      "additionBranchId": 501,
      "additionCode": "discharge",
      "additionName": "退院・退所加算",
      "additionFamilyCode": "discharge",
      "additionFamilyName": "退院・退所加算",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "モニタリング月以外で候補に残す",
        "退院・退所対象施設の職員との対面面談のみ",
        "場所は限定しない",
        "必要な情報を受けた場合のみ",
        "サービス等の利用開始月の調整のみ",
        "同一の入所・入院期間中は3回まで",
        "初回加算算定時は不可"
      ],
      "provisionalRules": [
        "現行UIでは旧ラベルの「退院前面談」も面談として受ける",
        "入所施設、更生施設、児童施設、刑事施設等は名称推定に強い語だけを使っている"
      ],
      "priority": 400,
      "historyAdditionCodes": [
        "discharge",
        "discharge"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ",
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院",
                "入所施設",
                "更生施設",
                "児童施設",
                "刑事施設"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連",
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談",
                "退院前面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "serviceUseStartMonth",
              "operatorCode": "one_of",
              "expectedValue": [
                "開始月である"
              ],
              "note": "設問回答の必須条件"
            },
            {
              "fieldKey": "requiredInfoReceived",
              "operatorCode": "one_of",
              "expectedValue": [
                "受けた"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "blocked_if_answer_true",
          "answerKey": "dischargeInpatientPeriodCount",
          "blockedValue": "4回目以上・不明",
          "label": "同一の入所・入院期間中は3回まで"
        },
        {
          "code": "blocked_if_answer_true",
          "answerKey": "initialAdditionPlanned",
          "blockedValue": "初回加算あり",
          "label": "初回加算算定時は不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 6,
      "additionBranchId": 601,
      "additionCode": "hospital_info_i",
      "additionName": "入院時情報連携加算 I",
      "additionFamilyCode": "hospital_info_i",
      "additionFamilyName": "入院時情報連携加算 I",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "入院に当たって病院へ訪問して必要情報を提供した場合に候補に残す",
        "サービス判定区分では限定しない",
        "同月1回まで",
        "IIとの併算定不可"
      ],
      "provisionalRules": [
        "現行UIでは「訪問情報提供」を「外出先 + 情報共有」に寄せている",
        "診療所は病院と同じ扱いで判定する"
      ],
      "priority": 350,
      "historyAdditionCodes": [
        "hospital_info_i",
        "hospital_info_i"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連",
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "hospitalAdmissionContext",
              "operatorCode": "one_of",
              "expectedValue": [
                "入院に当たっている"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "hospital_info_i"
          ],
          "label": "同月1回まで"
        },
        {
          "code": "exclusive_with_addition_codes",
          "additionCodes": [
            "hospital_info_ii"
          ],
          "label": "IIとの併算定不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 7,
      "additionBranchId": 701,
      "additionCode": "hospital_info_ii",
      "additionName": "入院時情報連携加算 II",
      "additionFamilyCode": "hospital_info_ii",
      "additionFamilyName": "入院時情報連携加算 II",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "入院に当たって病院へ訪問以外の方法で必要情報を提供した場合に候補に残す",
        "サービス判定区分では限定しない",
        "同月1回まで",
        "Iとの併算定不可"
      ],
      "provisionalRules": [
        "現行UIでは「訪問以外情報提供」を「自事業所内 + 情報共有」に寄せている",
        "診療所は病院と同じ扱いで判定する"
      ],
      "priority": 360,
      "historyAdditionCodes": [
        "hospital_info_ii",
        "hospital_info_ii"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院・訪看・薬局グループ"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "病院"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "医療関連",
                "障害福祉サービス",
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "hospitalAdmissionContext",
              "operatorCode": "one_of",
              "expectedValue": [
                "入院に当たっている"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 1,
          "additionCodes": [
            "hospital_info_ii"
          ],
          "label": "同月1回まで"
        },
        {
          "code": "exclusive_with_addition_codes",
          "additionCodes": [
            "hospital_info_i"
          ],
          "label": "Iとの併算定不可"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 8,
      "additionBranchId": 801,
      "additionCode": "edu_info",
      "additionName": "保・教支援（情報共有）",
      "additionFamilyCode": "edu_support",
      "additionFamilyName": "保・教支援",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "児対象のみ",
        "障害福祉以外の福祉サービスの利用文脈で候補に残す",
        "学校・保育・児童施設への情報共有で候補に残す",
        "企業・就業生活支援センター等は新規雇用文脈のときだけ残す"
      ],
      "provisionalRules": [
        "集団生活施設など、学校・保育以外の対象境界はまだ仮置き"
      ],
      "priority": 500,
      "historyAdditionCodes": [
        "edu_support",
        "edu_info"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "学校",
                "保育",
                "児童施設"
              ],
              "note": "conditionalRequiredAnswers 非該当の機関種別"
            }
          ]
        },
        {
          "groupNo": 2,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "conditionalRequiredAnswers で絞られた機関種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "conditionalRequiredAnswers 由来の追加条件"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 8,
      "additionBranchId": 802,
      "additionCode": "edu_visit",
      "additionName": "保・教支援（訪問面接）",
      "additionFamilyCode": "edu_support",
      "additionFamilyName": "保・教支援",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "児対象のみ",
        "それ以外月のみ",
        "障害福祉以外の福祉サービスの利用文脈で候補に残す",
        "学校・保育・児童施設への訪問面接で候補に残す",
        "企業・就業生活支援センター等は新規雇用文脈のときだけ残す"
      ],
      "provisionalRules": [
        "現行UIでは「訪問面接」を「外出先 + 面談」に寄せている",
        "集団生活施設など、学校・保育以外の対象境界はまだ仮置き",
        "旧の総称記録は訪問面接の回数へ自動換算していない"
      ],
      "priority": 510,
      "historyAdditionCodes": [
        "edu_support",
        "edu_visit"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "学校",
                "保育",
                "児童施設"
              ],
              "note": "conditionalRequiredAnswers 非該当の機関種別"
            }
          ]
        },
        {
          "groupNo": 2,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "conditionalRequiredAnswers で絞られた機関種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "conditionalRequiredAnswers 由来の追加条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_addition_count_min",
          "minimum": 2,
          "additionCodes": [
            "edu_visit"
          ],
          "label": "同月2回以上の訪問面接が必要"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 8,
      "additionBranchId": 803,
      "additionCode": "edu_meeting",
      "additionName": "保・教支援（会議参加）",
      "additionFamilyCode": "edu_support",
      "additionFamilyName": "保・教支援",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "児対象のみ",
        "それ以外月のみ",
        "障害福祉以外の福祉サービスの利用文脈で候補に残す",
        "学校・保育・児童施設との会議参加で候補に残す",
        "企業・就業生活支援センター等は新規雇用文脈のときだけ残す"
      ],
      "provisionalRules": [
        "現行UIでは「会議参加」を「会議」に寄せている",
        "集団生活施設など、学校・保育以外の対象境界はまだ仮置き"
      ],
      "priority": 520,
      "historyAdditionCodes": [
        "edu_support",
        "edu_meeting"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "学校",
                "保育",
                "児童施設"
              ],
              "note": "conditionalRequiredAnswers 非該当の機関種別"
            }
          ]
        },
        {
          "groupNo": 2,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "児"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "serviceDecisionCategories",
              "operatorCode": "includes_any",
              "expectedValue": [
                "障害福祉以外の福祉サービス"
              ],
              "note": "サービス判定区分の包含条件"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "conditionalRequiredAnswers で絞られた機関種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "conditionalRequiredAnswers 由来の追加条件"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 9,
      "additionBranchId": 901,
      "additionCode": "home_info",
      "additionName": "居宅連携（情報共有）",
      "additionFamilyCode": "home_collab",
      "additionFamilyName": "居宅連携",
      "promptTemplate": "",
      "ruleStatus": "確定条件あり",
      "confirmedRules": [
        "者対象のみ",
        "ケアマネ事業所への情報共有で候補に残す",
        "ケアマネ利用開始時のみ",
        "後段では同月2回までを確認する"
      ],
      "provisionalRules": [],
      "priority": 600,
      "historyAdditionCodes": [
        "home_collab",
        "home_info"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "ケアマネ事業所"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "careManagerStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "利用開始あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 2,
          "additionCodes": [
            "home_collab",
            "home_info"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同月2回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 9,
      "additionBranchId": 902,
      "additionCode": "home_visit",
      "additionName": "居宅連携（訪問面接）",
      "additionFamilyCode": "home_collab",
      "additionFamilyName": "居宅連携",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "者対象のみ",
        "それ以外月のみ",
        "ケアマネ事業所への訪問面接で候補に残す",
        "ケアマネ利用開始時のみ",
        "後段では同月2回以上の訪問面接を確認する"
      ],
      "provisionalRules": [
        "現行UIでは「訪問面接」を「外出先 + 面談」に寄せている",
        "旧の総称記録は訪問面接の回数へ自動換算していない"
      ],
      "priority": 610,
      "historyAdditionCodes": [
        "home_collab",
        "home_visit"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "ケアマネ事業所"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "careManagerStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "利用開始あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_addition_count_min",
          "minimum": 2,
          "additionCodes": [
            "home_visit"
          ],
          "label": "同月2回以上の訪問面接が必要"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 9,
      "additionBranchId": 903,
      "additionCode": "home_meeting",
      "additionName": "居宅連携（会議参加）",
      "additionFamilyCode": "home_collab",
      "additionFamilyName": "居宅連携",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "者対象のみ",
        "それ以外月のみ",
        "ケアマネ事業所との会議参加で候補に残す",
        "ケアマネ利用開始時のみ"
      ],
      "provisionalRules": [
        "現行UIでは「会議参加」を「会議」に寄せている"
      ],
      "priority": 620,
      "historyAdditionCodes": [
        "home_collab",
        "home_meeting"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "ケアマネ事業所"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "careManagerStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "利用開始あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    },
    {
      "additionId": 10,
      "additionBranchId": 1001,
      "additionCode": "home_work_info",
      "additionName": "居宅連携（就労）（情報共有）",
      "additionFamilyCode": "home_work_collab",
      "additionFamilyName": "居宅連携（就労）",
      "promptTemplate": "",
      "ruleStatus": "確定条件あり",
      "confirmedRules": [
        "者対象のみ",
        "企業または障害者就業・生活支援センター等への情報共有で候補に残す",
        "新規雇用開始時のみ",
        "後段では同月2回までを確認する"
      ],
      "provisionalRules": [],
      "priority": 700,
      "historyAdditionCodes": [
        "home_work_collab",
        "home_work_info"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "モニタリング月",
                "計画作成月",
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "情報共有"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_limit_per_client",
          "limit": 2,
          "additionCodes": [
            "home_work_collab",
            "home_work_info"
          ],
          "recordActionTypes": [
            "情報共有"
          ],
          "label": "同月2回まで"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 10,
      "additionBranchId": 1002,
      "additionCode": "home_work_visit",
      "additionName": "居宅連携（就労）（訪問面接）",
      "additionFamilyCode": "home_work_collab",
      "additionFamilyName": "居宅連携（就労）",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "者対象のみ",
        "それ以外月のみ",
        "企業または障害者就業・生活支援センター等への訪問面接で候補に残す",
        "新規雇用開始時のみ",
        "後段では同月2回以上の訪問面接を確認する"
      ],
      "provisionalRules": [
        "現行UIでは「訪問面接」を「外出先 + 面談」に寄せている",
        "旧の総称記録は訪問面接の回数へ自動換算していない"
      ],
      "priority": 710,
      "historyAdditionCodes": [
        "home_work_collab",
        "home_work_visit"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "面談"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [
        {
          "code": "monthly_addition_count_min",
          "minimum": 2,
          "additionCodes": [
            "home_work_visit"
          ],
          "label": "同月2回以上の訪問面接が必要"
        }
      ],
      "postCheck": ""
    },
    {
      "additionId": 10,
      "additionBranchId": 1003,
      "additionCode": "home_work_meeting",
      "additionName": "居宅連携（就労）（会議参加）",
      "additionFamilyCode": "home_work_collab",
      "additionFamilyName": "居宅連携（就労）",
      "promptTemplate": "",
      "ruleStatus": "一部確定",
      "confirmedRules": [
        "者対象のみ",
        "それ以外月のみ",
        "企業または障害者就業・生活支援センター等との会議参加で候補に残す",
        "新規雇用開始時のみ"
      ],
      "provisionalRules": [
        "現行UIでは「会議参加」を「会議」に寄せている"
      ],
      "priority": 720,
      "historyAdditionCodes": [
        "home_work_collab",
        "home_work_meeting"
      ],
      "conditionGroups": [
        {
          "groupNo": 1,
          "conditions": [
            {
              "fieldKey": "targetType",
              "operatorCode": "one_of",
              "expectedValue": [
                "者"
              ],
              "note": "利用者の対象区分"
            },
            {
              "fieldKey": "organizationGroup",
              "operatorCode": "one_of",
              "expectedValue": [
                "福祉サービス等提供機関"
              ],
              "note": "機関グループ"
            },
            {
              "fieldKey": "organizationType",
              "operatorCode": "one_of",
              "expectedValue": [
                "企業",
                "障害者就業・生活支援センター"
              ],
              "note": "機関種別"
            },
            {
              "fieldKey": "monthType",
              "operatorCode": "one_of",
              "expectedValue": [
                "それ以外"
              ],
              "note": "対応月区分"
            },
            {
              "fieldKey": "placeType",
              "operatorCode": "one_of",
              "expectedValue": [
                "自事業所内",
                "外出先"
              ],
              "note": "対応場所"
            },
            {
              "fieldKey": "actionType",
              "operatorCode": "one_of",
              "expectedValue": [
                "会議"
              ],
              "note": "行為種別"
            },
            {
              "fieldKey": "employmentStart",
              "operatorCode": "one_of",
              "expectedValue": [
                "新規雇用あり"
              ],
              "note": "設問回答の必須条件"
            }
          ]
        }
      ],
      "postCheckRules": [],
      "postCheck": ""
    }
  ]
};
  global.__KASAN_PROTOTYPE_RULE_CATALOG__ = catalog;
  if (global.window && typeof global.window === "object") {
    global.window.__KASAN_PROTOTYPE_RULE_CATALOG__ = catalog;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
