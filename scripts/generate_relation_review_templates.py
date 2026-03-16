#!/usr/bin/env python3
"""Generate review CSV templates for organization_service and client_enrollment.

The legacy workbook does not fully determine:
- which organization offers which service
- which client uses which organization service

This script extracts the reviewable candidates and writes UTF-8 BOM CSV files
that open cleanly in Excel.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from generate_appsheet_master_seed import XlsxReader, normalize_service_scope, normalize_text


@dataclass
class ServiceRow:
    service_code: str
    service_name: str
    target_scope: str
    group_name: str
    service_category: str


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    base_dir = Path(__file__).resolve().parents[1]
    default_workbook = base_dir.parent / "加算入力アプリ２０２６NEW のコピー.xlsx"
    runtime_dir = base_dir / "runtime" / "import"

    parser = argparse.ArgumentParser(description="Generate review CSVs for relation data.")
    parser.add_argument("--workbook", type=Path, default=default_workbook, help="Source workbook path.")
    parser.add_argument(
        "--organization-review",
        type=Path,
        default=runtime_dir / "organization_service_review.csv",
        help="Output CSV for organization_service review.",
    )
    parser.add_argument(
        "--enrollment-review",
        type=Path,
        default=runtime_dir / "client_enrollment_review.csv",
        help="Output CSV for client_enrollment review.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=runtime_dir / "relation_review_report.json",
        help="Output summary report path.",
    )
    return parser.parse_args(argv)


def split_multi_values(raw_value: str) -> List[str]:
    pieces = [item.strip() for item in raw_value.replace("、", ",").replace("/", ",").split(",")]
    return [item for item in pieces if item]


def parse_confirmed_service_codes(raw_value: str) -> List[str]:
    normalized = raw_value.replace(";", ",").replace("|", ",").replace(" ", ",")
    return [item.strip() for item in normalized.split(",") if item.strip()]


def summarize_counter(counter: Counter[str]) -> str:
    return " / ".join(f"{key}:{value}" for key, value in counter.most_common() if key)


def dedupe_preserve_order(values: Iterable[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def load_services(reader: XlsxReader) -> List[ServiceRow]:
    rows = reader.read_sheet("サービス")
    services: List[ServiceRow] = []
    for row in rows:
        service_code = normalize_text(row.get("サービスID"))
        service_name = normalize_text(row.get("サービス名"))
        target_type = normalize_service_scope(
            normalize_text(row.get("児者")),
            warnings=[],
            context=f"サービスID={service_code or '(空)'}",
        )
        group_name = normalize_text(row.get("グループ"))
        service_category = normalize_text(row.get("障害福祉別"))
        if not service_code or not service_name:
            continue
        services.append(
            ServiceRow(
                service_code=service_code,
                service_name=service_name,
                target_scope=target_type or "児者",
                group_name=group_name,
                service_category=service_category,
            )
        )
    return services


def build_service_indexes(services: Iterable[ServiceRow]) -> Tuple[Dict[str, List[ServiceRow]], Dict[str, List[ServiceRow]]]:
    by_name: Dict[str, List[ServiceRow]] = defaultdict(list)
    by_name_scope_match: Dict[str, List[ServiceRow]] = defaultdict(list)
    for service in services:
        by_name[service.service_name].append(service)
        by_name_scope_match[service.service_name].append(service)
    return dict(by_name), dict(by_name_scope_match)


def build_client_map(reader: XlsxReader) -> Dict[str, Dict[str, str]]:
    rows = reader.read_sheet("利用者")
    result: Dict[str, Dict[str, str]] = {}
    for row in rows:
        client_code = normalize_text(row.get("利用者ID"))
        if not client_code:
            continue
        result[client_code] = {
            "client_code": client_code,
            "client_name": normalize_text(row.get("利用者名")),
            "client_name_kana": normalize_text(row.get("ふりがな")),
            "target_type": normalize_text(row.get("児者")),
            "legacy_service_id": normalize_text(row.get("サービスID")),
        }
    return result


def build_organization_map(reader: XlsxReader) -> Dict[str, Dict[str, str]]:
    rows = reader.read_sheet("機関")
    result: Dict[str, Dict[str, str]] = {}
    for row in rows:
        organization_code = normalize_text(row.get("機関ID"))
        if not organization_code:
            continue
        result[organization_code] = {
            "organization_code": organization_code,
            "organization_name": normalize_text(row.get("機関名")),
        }
    return result


def guess_context_from_name(organization_name: str) -> Tuple[str, str, List[str], str]:
    name = normalize_text(organization_name)
    if "訪問看護" in name or "訪看" in name:
        return ("訪問看護", "病院・訪看・薬局グループ", ["訪看"], "名称ヒント")
    if "薬局" in name:
        return ("薬局", "病院・訪看・薬局グループ", ["薬局"], "名称ヒント")
    if "病院" in name:
        return ("病院", "病院・訪看・薬局グループ", ["病院"], "名称ヒント")
    if "学園" in name or "学校" in name:
        return ("学校", "福祉サービス等提供機関", ["学校"], "名称ヒント")
    if "保育" in name:
        return ("保育", "福祉サービス等提供機関", ["保育"], "名称ヒント")
    if "日中一時" in name:
        return ("日中一時", "福祉サービス等提供機関", ["日中一時"], "名称ヒント")
    if "移動支援" in name:
        return ("移動支援", "福祉サービス等提供機関", ["移動支援"], "名称ヒント")
    if "生活サポート" in name:
        return ("生活サポート", "福祉サービス等提供機関", ["生活サポート"], "名称ヒント")
    return ("", "", [], "")


def build_record_aggregates(reader: XlsxReader) -> Tuple[Dict[str, Dict[str, object]], Dict[Tuple[str, str], Dict[str, object]]]:
    rows = reader.read_sheet("加算記録")
    organization_stats: Dict[str, Dict[str, object]] = defaultdict(lambda: {
        "record_count": 0,
        "legacy_categories": Counter(),
        "month_types": Counter(),
        "actions": Counter(),
    })
    enrollment_stats: Dict[Tuple[str, str], Dict[str, object]] = defaultdict(lambda: {
        "record_count": 0,
        "month_types": Counter(),
        "actions": Counter(),
        "staff_ids": Counter(),
        "addition_ids": Counter(),
    })

    for row in rows:
        client_code = normalize_text(row.get("利用者ID"))
        organization_code = normalize_text(row.get("機関ID"))
        legacy_category = normalize_text(row.get("機関区分"))
        month_type = normalize_text(row.get("月区分"))
        action_type = normalize_text(row.get("行動区分"))
        staff_code = normalize_text(row.get("相談員ID"))
        addition_id = normalize_text(row.get("加算ID"))

        if organization_code:
            org_stat = organization_stats[organization_code]
            org_stat["record_count"] += 1
            if legacy_category:
                org_stat["legacy_categories"][legacy_category] += 1
            if month_type:
                org_stat["month_types"][month_type] += 1
            if action_type:
                org_stat["actions"][action_type] += 1

        if client_code and organization_code:
            pair_stat = enrollment_stats[(client_code, organization_code)]
            pair_stat["record_count"] += 1
            if month_type:
                pair_stat["month_types"][month_type] += 1
            if action_type:
                pair_stat["actions"][action_type] += 1
            if staff_code:
                pair_stat["staff_ids"][staff_code] += 1
            if addition_id:
                pair_stat["addition_ids"][addition_id] += 1

    return dict(organization_stats), dict(enrollment_stats)


def guess_organization_review(
    organization_name: str,
    org_stat: Dict[str, object],
    service_by_name: Dict[str, List[ServiceRow]],
) -> Dict[str, str]:
    suggested_type, suggested_group, service_bases, basis = guess_context_from_name(organization_name)
    legacy_counter: Counter[str] = org_stat["legacy_categories"]
    legacy_summary = summarize_counter(legacy_counter)
    confidence = "low"

    if service_bases:
        confidence = "high"
    else:
        top_category = legacy_counter.most_common(1)[0][0] if legacy_counter else ""
        if top_category == "病院":
            suggested_type = suggested_type or "病院"
            suggested_group = suggested_group or "病院・訪看・薬局グループ"
            service_bases = service_bases or ["病院"]
            basis = basis or "旧加算記録"
            confidence = "medium"
        elif top_category in ("障害福祉", "障害福祉以外"):
            suggested_group = "福祉サービス等提供機関"
            suggested_type = suggested_type or top_category
            basis = basis or "旧加算記録"

    suggested_services = []
    for service_base in service_bases:
        suggested_services.extend(service_by_name.get(service_base, []))
    suggested_codes = dedupe_preserve_order(service.service_code for service in suggested_services)
    suggested_names = dedupe_preserve_order(service.service_name for service in suggested_services)

    return {
        "organization_type_suggestion": suggested_type,
        "organization_group_hint": suggested_group,
        "legacy_category_summary": legacy_summary,
        "legacy_record_count": str(org_stat["record_count"]),
        "suggested_service_codes": ",".join(suggested_codes),
        "suggested_service_names": ",".join(suggested_names),
        "suggestion_basis": basis,
        "suggestion_confidence": confidence,
    }


def guess_enrollment_services(
    client_target_type: str,
    organization_review: Dict[str, str],
    service_by_name: Dict[str, List[ServiceRow]],
) -> Tuple[List[str], List[str]]:
    base_names = split_multi_values(organization_review["suggested_service_names"])
    if not base_names:
        return [], []

    suggested_services: List[ServiceRow] = []
    for base_name in base_names:
        for service in service_by_name.get(base_name, []):
            if service.target_scope == "児者" or service.target_scope == client_target_type:
                suggested_services.append(service)

    suggested_codes = dedupe_preserve_order(item.service_code for item in suggested_services)
    suggested_names = dedupe_preserve_order(item.service_name for item in suggested_services)
    return suggested_codes, suggested_names


def write_csv(path: Path, fieldnames: Sequence[str], rows: Iterable[Dict[str, str]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    if not args.workbook.is_file():
        raise SystemExit(f"Workbook not found: {args.workbook}")

    reader = XlsxReader(args.workbook)
    try:
        services = load_services(reader)
        service_by_name, service_by_name_scope = build_service_indexes(services)
        client_map = build_client_map(reader)
        organization_map = build_organization_map(reader)
        organization_stats, enrollment_stats = build_record_aggregates(reader)
    finally:
        reader.close()

    organization_review_rows: List[Dict[str, str]] = []
    organization_review_map: Dict[str, Dict[str, str]] = {}
    for organization_code, organization in organization_map.items():
        review = guess_organization_review(
            organization["organization_name"],
            organization_stats.get(organization_code, {
                "record_count": 0,
                "legacy_categories": Counter(),
                "month_types": Counter(),
                "actions": Counter(),
            }),
            service_by_name,
        )
        row = {
            "organization_code": organization_code,
            "organization_name": organization["organization_name"],
            **review,
            "confirmed_service_codes": "",
            "review_status": "",
            "note": "",
        }
        organization_review_rows.append(row)
        organization_review_map[organization_code] = row

    enrollment_review_rows: List[Dict[str, str]] = []
    for (client_code, organization_code), stat in sorted(enrollment_stats.items(), key=lambda item: (-item[1]["record_count"], item[0][0], item[0][1])):
        client = client_map.get(client_code)
        organization = organization_map.get(organization_code)
        if not client or not organization:
            continue
        org_review = organization_review_map.get(organization_code, {})
        suggested_codes, suggested_names = guess_enrollment_services(
            client["target_type"],
            org_review,
            service_by_name_scope,
        )
        enrollment_review_rows.append(
            {
                "client_code": client_code,
                "client_name": client["client_name"],
                "target_type": client["target_type"],
                "organization_code": organization_code,
                "organization_name": organization["organization_name"],
                "source_record_count": str(stat["record_count"]),
                "legacy_month_types": summarize_counter(stat["month_types"]),
                "legacy_actions": summarize_counter(stat["actions"]),
                "legacy_staff_codes": summarize_counter(stat["staff_ids"]),
                "suggested_service_codes": ",".join(suggested_codes),
                "suggested_service_names": ",".join(suggested_names),
                "confirmed_service_code": "",
                "confirmed_group_name": "",
                "started_on": "",
                "ended_on": "",
                "review_status": "",
                "note": "",
            }
        )

    organization_count = write_csv(
        args.organization_review,
        [
            "organization_code",
            "organization_name",
            "organization_type_suggestion",
            "organization_group_hint",
            "legacy_category_summary",
            "legacy_record_count",
            "suggested_service_codes",
            "suggested_service_names",
            "suggestion_basis",
            "suggestion_confidence",
            "confirmed_service_codes",
            "review_status",
            "note",
        ],
        organization_review_rows,
    )
    enrollment_count = write_csv(
        args.enrollment_review,
        [
            "client_code",
            "client_name",
            "target_type",
            "organization_code",
            "organization_name",
            "source_record_count",
            "legacy_month_types",
            "legacy_actions",
            "legacy_staff_codes",
            "suggested_service_codes",
            "suggested_service_names",
            "confirmed_service_code",
            "confirmed_group_name",
            "started_on",
            "ended_on",
            "review_status",
            "note",
        ],
        enrollment_review_rows,
    )

    report = {
        "source_workbook": str(args.workbook),
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "organization_review_count": organization_count,
        "enrollment_review_count": enrollment_count,
        "organization_suggestion_confidence": dict(
            Counter(row["suggestion_confidence"] or "(blank)" for row in organization_review_rows)
        ),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Generated:")
    print(f"  {args.organization_review}")
    print(f"  {args.enrollment_review}")
    print(f"  {args.report}")
    print("Counts:")
    print(f"  organization_review: {organization_count}")
    print(f"  enrollment_review: {enrollment_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
