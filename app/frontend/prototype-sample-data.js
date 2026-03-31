(function (global) {
  var sampleData = {
  "generatedAt": "2026-03-31T13:44:49.727Z",
  "data": {
    "staff": [
      {
        "staffId": "501",
        "staffName": "相談 花子",
        "email": "hanako@example.jp"
      },
      {
        "staffId": "502",
        "staffName": "支援 次郎",
        "email": "jiro@example.jp"
      },
      {
        "staffId": "503",
        "staffName": "調整 三郎",
        "email": "saburo@example.jp"
      }
    ],
    "clients": [
      {
        "clientId": "1001",
        "clientName": "山田 太郎",
        "clientNameKana": "やまだ たろう",
        "targetType": "児"
      },
      {
        "clientId": "1002",
        "clientName": "佐藤 花子",
        "clientNameKana": "さとう はなこ",
        "targetType": "者"
      },
      {
        "clientId": "1003",
        "clientName": "高橋 一郎",
        "clientNameKana": "たかはし いちろう",
        "targetType": "者"
      }
    ],
    "organizations": [
      {
        "organizationId": "10",
        "organizationName": "しののめ相談支援",
        "organizationType": "相談支援事業所",
        "organizationGroup": "福祉サービス等提供機関",
        "serviceIds": [
          "201",
          "202"
        ]
      },
      {
        "organizationId": "11",
        "organizationName": "あおぞら支援室",
        "organizationType": "相談支援事業所",
        "organizationGroup": "福祉サービス等提供機関",
        "serviceIds": [
          "202",
          "203"
        ]
      },
      {
        "organizationId": "21",
        "organizationName": "東雲総合病院",
        "organizationType": "病院",
        "organizationGroup": "病院・訪看・薬局グループ",
        "serviceIds": [
          "301"
        ]
      },
      {
        "organizationId": "22",
        "organizationName": "みらい訪問看護",
        "organizationType": "訪問看護",
        "organizationGroup": "病院・訪看・薬局グループ",
        "serviceIds": [
          "302"
        ]
      }
    ],
    "services": [
      {
        "serviceId": "201",
        "serviceName": "計画相談",
        "serviceCategory": "相談支援",
        "targetScope": "児者",
        "groupName": "初回群"
      },
      {
        "serviceId": "202",
        "serviceName": "障害児相談",
        "serviceCategory": "福祉",
        "targetScope": "児",
        "groupName": "モニタ群"
      },
      {
        "serviceId": "203",
        "serviceName": "生活介護",
        "serviceCategory": "障害福祉サービス",
        "targetScope": "者",
        "groupName": "地域支援群"
      },
      {
        "serviceId": "301",
        "serviceName": "医療連携",
        "serviceCategory": "医療",
        "targetScope": "児者",
        "groupName": "病院群"
      },
      {
        "serviceId": "302",
        "serviceName": "訪看連携",
        "serviceCategory": "医療",
        "targetScope": "児者",
        "groupName": "訪看群"
      }
    ],
    "enrollments": [
      {
        "enrollmentId": "e1001-10-201",
        "clientId": "1001",
        "organizationId": "10",
        "serviceId": "201"
      },
      {
        "enrollmentId": "e1001-21-301",
        "clientId": "1001",
        "organizationId": "21",
        "serviceId": "301"
      },
      {
        "enrollmentId": "e1002-11-203",
        "clientId": "1002",
        "organizationId": "11",
        "serviceId": "203"
      },
      {
        "enrollmentId": "e1002-22-302",
        "clientId": "1002",
        "organizationId": "22",
        "serviceId": "302"
      },
      {
        "enrollmentId": "e1003-10-201",
        "clientId": "1003",
        "organizationId": "10",
        "serviceId": "201"
      }
    ],
    "reportRecords": [
      {
        "recordId": "r1",
        "targetMonth": "2026-03",
        "performedAt": "2026-03-14 09:05",
        "clientId": "1001",
        "organizationId": "21",
        "serviceId": "301",
        "staffId": "501",
        "additionCode": "mededu",
        "actionType": "情報共有",
        "finalStatus": "自動確定",
        "postCheckStatus": "ok",
        "postCheckSummary": "同グループ月1回まで（病院・訪看・薬局グループ）。今月既存0件で範囲内です。",
        "evaluatedAt": "2026-03-14 09:20",
        "rationale": "病院グループ / 計画作成月 / 自事業所内 / 情報共有",
        "savedNote": "病院と支援方針を共有し、今後の通院支援計画を確認した。"
      },
      {
        "recordId": "r2",
        "targetMonth": "2026-03",
        "performedAt": "2026-03-14 09:50",
        "clientId": "1002",
        "organizationId": "11",
        "serviceId": "203",
        "staffId": "502",
        "additionCode": "intensive",
        "actionType": "訪問",
        "finalStatus": "要確認",
        "postCheckStatus": "review",
        "postCheckSummary": "同月2回以上の訪問が必要。今回を含めて1回です。",
        "evaluatedAt": "2026-03-14 10:05",
        "rationale": "福祉サービス等提供機関 / それ以外 / 外出先 / 訪問",
        "savedNote": "生活介護の現場を訪問し、利用状況と支援上の課題を確認した。"
      },
      {
        "recordId": "r3",
        "targetMonth": "2026-03",
        "performedAt": "2026-03-14 11:10",
        "clientId": "1003",
        "organizationId": "10",
        "serviceId": "201",
        "staffId": "501",
        "additionCode": "conference",
        "actionType": "担当者会議開催",
        "finalStatus": "自動確定",
        "postCheckStatus": "ok",
        "postCheckSummary": "同月1回まで。今月既存0件で範囲内です。 / 医保教（面談・会議）との併算定不可。今月の併算定不可記録は見つかっていません。",
        "evaluatedAt": "2026-03-14 11:42",
        "rationale": "福祉サービス等提供機関 / モニタリング月 / 自事業所内 / 担当者会議開催",
        "savedNote": "モニタリングに当たり担当者会議を開催し、関係機関で支援方針を共有した。"
      },
      {
        "recordId": "r4",
        "targetMonth": "2026-02",
        "performedAt": "2026-02-28 15:30",
        "clientId": "1001",
        "organizationId": "21",
        "serviceId": "301",
        "staffId": "501",
        "additionCode": "discharge",
        "actionType": "面談",
        "finalStatus": "自動確定",
        "postCheckStatus": "ok",
        "postCheckSummary": "当該施設職員との面談内容と受けた情報を記録する。",
        "evaluatedAt": "2026-02-28 16:18",
        "rationale": "病院 / それ以外 / 外出先 / 面談",
        "savedNote": "当該施設の職員と面談し、退院後支援に必要な情報を受けて調整した。"
      },
      {
        "recordId": "r5",
        "targetMonth": "2026-03",
        "performedAt": "2026-03-13 13:25",
        "clientId": "1001",
        "organizationId": "11",
        "serviceId": "202",
        "staffId": "503",
        "additionCode": "mededu_interview",
        "actionType": "面談",
        "finalStatus": "自動確定",
        "postCheckStatus": "ok",
        "postCheckSummary": "同月1回まで。今月既存0件で範囲内です。",
        "evaluatedAt": "2026-03-13 14:00",
        "rationale": "福祉サービス等提供機関 / モニタリング月 / 外出先 / 面談",
        "savedNote": "福祉サービス等提供機関の担当者と面談し、モニタリングに必要な情報を受けた。"
      },
      {
        "recordId": "r6",
        "targetMonth": "2026-01",
        "performedAt": "2026-01-21 10:15",
        "clientId": "1003",
        "organizationId": "21",
        "serviceId": "301",
        "staffId": "501",
        "additionCode": "hospital_info_i",
        "actionType": "情報共有",
        "finalStatus": "自動確定",
        "postCheckStatus": "ok",
        "postCheckSummary": "同月1回まで。今月既存0件で範囲内です。 / IIとの併算定不可。今月の併算定不可記録は見つかっていません。",
        "evaluatedAt": "2026-01-21 10:40",
        "rationale": "病院グループ / 外出先 / 情報共有",
        "savedNote": "入院に当たり病院を訪問し、生活状況と支援上の留意点を情報提供した。"
      }
    ]
  }
};
  global.__KASAN_PROTOTYPE_SAMPLE_DATA__ = sampleData;
  if (global.window && typeof global.window === "object") {
    global.window.__KASAN_PROTOTYPE_SAMPLE_DATA__ = sampleData;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
