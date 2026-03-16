#!/usr/bin/env python3
"""Generate v3 master seed SQL from the legacy AppSheet workbook.

This importer is intentionally narrow:
- reads only client / staff / organization / service master sheets
- uses Python standard library only
- writes an idempotent SQL seed file plus a JSON report

It does not import organization-service links or client enrollments.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKGREL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CELL_REF_RE = re.compile(r"([A-Z]+)")


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def sql_quote(value: Optional[str]) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("\\", "\\\\").replace("'", "''")
    return "'" + escaped + "'"


def column_index(cell_ref: str) -> int:
    letters = CELL_REF_RE.match(cell_ref).group(1)
    total = 0
    for char in letters:
        total = total * 26 + (ord(char) - 64)
    return total - 1


def extract_si_text(si_node: ET.Element) -> str:
    parts: List[str] = []
    for child in list(si_node):
        if child.tag == f"{{{MAIN_NS}}}t":
            parts.append(child.text or "")
        elif child.tag == f"{{{MAIN_NS}}}r":
            text_node = child.find(f"{{{MAIN_NS}}}t")
            if text_node is not None:
                parts.append(text_node.text or "")
    return "".join(parts)


class XlsxReader:
    def __init__(self, workbook_path: Path) -> None:
        self.workbook_path = workbook_path
        self.archive = zipfile.ZipFile(workbook_path)
        self.shared_strings = self._read_shared_strings()
        self.sheet_targets = self._read_sheet_targets()

    def close(self) -> None:
        self.archive.close()

    def _read_shared_strings(self) -> List[str]:
        shared_strings_path = "xl/sharedStrings.xml"
        if shared_strings_path not in self.archive.namelist():
            return []

        root = ET.fromstring(self.archive.read(shared_strings_path))
        return [extract_si_text(item) for item in root.findall(f"{{{MAIN_NS}}}si")]

    def _read_sheet_targets(self) -> Dict[str, str]:
        workbook_root = ET.fromstring(self.archive.read("xl/workbook.xml"))
        rels_root = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))

        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels_root.findall(f"{{{PKGREL_NS}}}Relationship")
        }

        sheet_targets: Dict[str, str] = {}
        for sheet in workbook_root.find(f"{{{MAIN_NS}}}sheets"):
            rel_id = sheet.attrib[f"{{{REL_NS}}}id"]
            sheet_targets[sheet.attrib["name"]] = "xl/" + rel_map[rel_id]
        return sheet_targets

    def read_sheet(self, sheet_name: str) -> List[Dict[str, str]]:
        if sheet_name not in self.sheet_targets:
            raise KeyError(f"Sheet not found: {sheet_name}")

        root = ET.fromstring(self.archive.read(self.sheet_targets[sheet_name]))
        rows = root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row")
        if not rows:
            return []

        header = self._read_row(rows[0])
        records: List[Dict[str, str]] = []
        for row in rows[1:]:
            values = self._read_row(row)
            if not any(values):
                continue
            record = {
                header[index]: values[index] if index < len(values) else ""
                for index in range(len(header))
                if header[index]
            }
            records.append(record)
        return records

    def _read_row(self, row_node: ET.Element) -> List[str]:
        cells: Dict[int, str] = {}
        max_index = -1

        for cell in row_node.findall(f"{{{MAIN_NS}}}c"):
            index = column_index(cell.attrib["r"])
            max_index = max(max_index, index)
            cells[index] = self._read_cell(cell)

        return [cells.get(index, "") for index in range(max_index + 1)]

    def _read_cell(self, cell_node: ET.Element) -> str:
        cell_type = cell_node.attrib.get("t")

        if cell_type == "inlineStr":
            inline = cell_node.find(f"{{{MAIN_NS}}}is")
            return extract_si_text(inline) if inline is not None else ""

        value_node = cell_node.find(f"{{{MAIN_NS}}}v")
        if value_node is None or value_node.text is None:
            return ""

        raw = value_node.text
        if cell_type == "s":
            return self.shared_strings[int(raw)]
        return raw


@dataclass
class ImportResult:
    organizations: List[Dict[str, Optional[str]]]
    staffs: List[Dict[str, Optional[str]]]
    clients: List[Dict[str, Optional[str]]]
    services: List[Dict[str, Optional[str]]]
    report: Dict[str, object]


def normalize_target_type(
    raw_value: str,
    *,
    allow_blank: bool,
    warnings: List[str],
    context: str,
) -> Optional[str]:
    value = normalize_text(raw_value)
    if not value:
        return None if allow_blank else ""

    mapping = {
        "児": "児",
        "者": "者",
        "共通": "共通",
    }
    if value in mapping:
        return mapping[value]

    warnings.append(f"{context}: 未知の対象区分 '{value}'")
    return value if allow_blank else ""


def normalize_service_scope(
    raw_value: str,
    *,
    warnings: List[str],
    context: str,
) -> str:
    value = normalize_text(raw_value)
    if not value:
        warnings.append(f"{context}: サービス対象範囲が空のため '児者' として扱います")
        return "児者"

    mapping = {
        "児": "児",
        "者": "者",
        "児者": "児者",
        "共通": "児者",
    }
    if value in mapping:
        return mapping[value]

    warnings.append(f"{context}: 未知のサービス対象範囲 '{value}'")
    return value


def hashed_group_code(raw_group_name: str) -> Optional[str]:
    value = normalize_text(raw_group_name)
    if not value:
        return None
    digest = hashlib.md5(value.encode("utf-8")).hexdigest()[:8]
    return f"legacy_group_{digest}"


def merge_service_scopes(scopes: Iterable[str]) -> str:
    normalized = {normalize_text(scope) for scope in scopes if normalize_text(scope)}
    if not normalized:
        return "児者"
    if "児者" in normalized or "共通" in normalized:
        return "児者"
    if "児" in normalized and "者" in normalized:
        return "児者"
    if "児" in normalized:
        return "児"
    if "者" in normalized:
        return "者"
    return sorted(normalized)[0]


def build_import_result(reader: XlsxReader) -> ImportResult:
    warnings: List[str] = []
    skipped_blank_rows = Counter()

    organization_rows = reader.read_sheet("機関")
    staff_rows = reader.read_sheet("相談員")
    client_rows = reader.read_sheet("利用者")
    service_rows = reader.read_sheet("サービス")

    organizations: List[Dict[str, Optional[str]]] = []
    seen_organizations = set()
    for row in organization_rows:
        code = normalize_text(row.get("機関ID"))
        name = normalize_text(row.get("機関名"))
        if not code and not name:
            skipped_blank_rows["organization"] += 1
            continue
        if not code or not name:
            warnings.append(f"機関: IDまたは名称が欠けています {row!r}")
            continue
        if code in seen_organizations:
            warnings.append(f"機関: 重複ID '{code}' を後勝ちで無視しました")
            continue
        seen_organizations.add(code)
        organizations.append(
            {
                "organization_code": code,
                "organization_name": name,
                "organization_type": None,
                "is_active": "1",
                "note": "旧AppSheet import",
            }
        )

    staffs: List[Dict[str, Optional[str]]] = []
    seen_staffs = set()
    for row in staff_rows:
        code = normalize_text(row.get("相談員ID"))
        name = normalize_text(row.get("相談員名"))
        email = normalize_text(row.get("Email")) or None
        source_home_org = normalize_text(row.get("所属機関ID"))

        if not code and not name:
            skipped_blank_rows["staff"] += 1
            continue
        if not code or not name:
            warnings.append(f"相談員: IDまたは名称が欠けています {row!r}")
            continue
        if code in seen_staffs:
            warnings.append(f"相談員: 重複ID '{code}' を後勝ちで無視しました")
            continue
        seen_staffs.add(code)

        note_parts = ["旧AppSheet import"]
        if source_home_org:
            note_parts.append(f"旧所属機関ID={source_home_org}")

        staffs.append(
            {
                "home_organization_id": None,
                "staff_code": code,
                "staff_name": name,
                "email": email,
                "is_active": "1",
                "note": " / ".join(note_parts),
            }
        )

    clients: List[Dict[str, Optional[str]]] = []
    seen_clients = set()
    client_target_counter: Counter[str] = Counter()
    for row in client_rows:
        code = normalize_text(row.get("利用者ID"))
        name = normalize_text(row.get("利用者名"))
        kana = normalize_text(row.get("ふりがな")) or None
        target_type = normalize_target_type(
            normalize_text(row.get("児者")),
            allow_blank=False,
            warnings=warnings,
            context=f"利用者ID={code or '(空)'}",
        )
        legacy_service_id = normalize_text(row.get("サービスID"))

        if not code and not name:
            skipped_blank_rows["client"] += 1
            continue
        if not code or not name:
            warnings.append(f"利用者: IDまたは名称が欠けています {row!r}")
            continue
        if code in seen_clients:
            warnings.append(f"利用者: 重複ID '{code}' を後勝ちで無視しました")
            continue
        seen_clients.add(code)

        note_parts = ["旧AppSheet import"]
        if legacy_service_id:
            note_parts.append(f"旧サービスID={legacy_service_id}")

        clients.append(
            {
                "client_code": code,
                "client_name": name,
                "client_name_kana": kana,
                "target_type": target_type or "",
                "is_active": "1",
                "note": " / ".join(note_parts),
            }
        )
        client_target_counter[target_type or ""] += 1

    service_groups: Dict[tuple, Dict[str, object]] = {}
    service_target_counter: Counter[str] = Counter()
    service_group_counter: Counter[str] = Counter()
    service_category_counter: Counter[str] = Counter()
    for row in service_rows:
        code = normalize_text(row.get("サービスID"))
        name = normalize_text(row.get("サービス名"))
        target_scope = normalize_service_scope(
            normalize_text(row.get("児者")),
            warnings=warnings,
            context=f"サービスID={code or '(空)'}",
        )
        group_name = normalize_text(row.get("グループ"))
        disability_kind = normalize_text(row.get("障害福祉別")) or None

        if not code and not name:
            skipped_blank_rows["service"] += 1
            continue
        if not code or not name:
            warnings.append(f"サービス: IDまたは名称が欠けています {row!r}")
            continue
        key = (
            name,
            disability_kind or "",
            hashed_group_code(group_name) or "",
        )
        bucket = service_groups.setdefault(
            key,
            {
                "service_codes": [],
                "service_name": name,
                "service_category": disability_kind,
                "constraint_group_code": hashed_group_code(group_name),
                "group_name": group_name,
                "scopes": set(),
            },
        )
        bucket["service_codes"].append(code)
        bucket["scopes"].add(target_scope)
        service_target_counter[target_scope or "(空)"] += 1
        service_group_counter[group_name or "(空)"] += 1
        service_category_counter[(disability_kind or "(空)")] += 1

    services: List[Dict[str, Optional[str]]] = []
    for bucket in sorted(service_groups.values(), key=lambda item: (item["service_name"], item["service_category"] or "")):
        source_codes = sorted(set(bucket["service_codes"]))
        merged_scope = merge_service_scopes(bucket["scopes"])

        note_parts = ["旧AppSheet import"]
        if bucket["group_name"]:
            note_parts.append(f"旧グループ={bucket['group_name']}")
        if bucket["service_category"]:
            note_parts.append(f"旧障害福祉別={bucket['service_category']}")
        if len(source_codes) > 1:
            note_parts.append(f"統合元サービスID={','.join(source_codes)}")

        services.append(
            {
                "service_code": source_codes[0],
                "service_name": bucket["service_name"],
                "service_category": bucket["service_category"],
                "target_scope": merged_scope,
                "constraint_group_code": bucket["constraint_group_code"],
                "is_active": "1",
                "note": " / ".join(note_parts),
            }
        )

    report = {
        "source_workbook": str(reader.workbook_path),
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "sheet_row_counts": {
            "organization": len(organization_rows),
            "staff": len(staff_rows),
            "client": len(client_rows),
            "service": len(service_rows),
        },
        "import_row_counts": {
            "organization": len(organizations),
            "staff": len(staffs),
            "client": len(clients),
            "service": len(services),
        },
        "skipped_blank_rows": dict(skipped_blank_rows),
        "distinct_values": {
            "client_target_type": dict(client_target_counter),
            "service_target_scope": dict(service_target_counter),
            "service_group": dict(service_group_counter),
            "service_category": dict(service_category_counter),
        },
        "warnings": warnings,
    }

    return ImportResult(
        organizations=organizations,
        staffs=staffs,
        clients=clients,
        services=services,
        report=report,
    )


def render_insert_statement(
    table_name: str,
    columns: Sequence[str],
    rows: Iterable[Dict[str, Optional[str]]],
    update_columns: Sequence[str],
) -> List[str]:
    statements: List[str] = []
    column_sql = ", ".join(f"`{column}`" for column in columns)
    update_sql = ", ".join(f"`{column}`=VALUES(`{column}`)" for column in update_columns)

    for row in rows:
        value_sql = ", ".join(sql_quote(row.get(column)) for column in columns)
        statements.append(
            f"INSERT INTO `{table_name}` ({column_sql}) VALUES ({value_sql}) "
            f"ON DUPLICATE KEY UPDATE {update_sql};"
        )
    return statements


def render_seed_sql(result: ImportResult, workbook_path: Path) -> str:
    lines = [
        "-- Generated by v3/scripts/generate_appsheet_master_seed.py",
        f"-- Source workbook: {workbook_path}",
        f"-- Generated at: {result.report['generated_at']}",
        "",
        "SET NAMES utf8mb4;",
        "START TRANSACTION;",
        "",
        "-- organization",
    ]

    lines.extend(
        render_insert_statement(
            "organization",
            ["organization_code", "organization_name", "organization_type", "is_active", "note"],
            result.organizations,
            ["organization_name", "organization_type", "is_active", "note"],
        )
    )
    lines.extend(
        [
            "",
            "-- staff",
            *render_insert_statement(
                "staff",
                ["home_organization_id", "staff_code", "staff_name", "email", "is_active", "note"],
                result.staffs,
                ["home_organization_id", "staff_name", "email", "is_active", "note"],
            ),
            "",
            "-- client",
            *render_insert_statement(
                "client",
                ["client_code", "client_name", "client_name_kana", "target_type", "is_active", "note"],
                result.clients,
                ["client_name", "client_name_kana", "target_type", "is_active", "note"],
            ),
            "",
            "-- service_definition",
            *render_insert_statement(
                "service_definition",
                [
                    "service_code",
                    "service_name",
                    "service_category",
                    "target_scope",
                    "constraint_group_code",
                    "is_active",
                    "note",
                ],
                result.services,
                [
                    "service_name",
                    "service_category",
                    "target_scope",
                    "constraint_group_code",
                    "is_active",
                    "note",
                ],
            ),
            "",
            "COMMIT;",
            "",
        ]
    )

    return "\n".join(lines)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    default_workbook = Path(__file__).resolve().parents[2] / "加算入力アプリ２０２６NEW のコピー.xlsx"
    default_output_sql = Path(__file__).resolve().parents[1] / "runtime" / "import" / "master_seed_appsheet.sql"
    default_output_report = Path(__file__).resolve().parents[1] / "runtime" / "import" / "master_seed_appsheet_report.json"

    parser = argparse.ArgumentParser(description="Generate v3 master seed SQL from the AppSheet workbook.")
    parser.add_argument("--workbook", type=Path, default=default_workbook, help="Path to the source workbook.")
    parser.add_argument("--output-sql", type=Path, default=default_output_sql, help="Output SQL file path.")
    parser.add_argument("--output-report", type=Path, default=default_output_report, help="Output JSON report path.")
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)

    if not args.workbook.is_file():
        print(f"Workbook not found: {args.workbook}", file=sys.stderr)
        return 1

    reader = XlsxReader(args.workbook)
    try:
        result = build_import_result(reader)
    finally:
        reader.close()

    sql_text = render_seed_sql(result, args.workbook)

    args.output_sql.parent.mkdir(parents=True, exist_ok=True)
    args.output_report.parent.mkdir(parents=True, exist_ok=True)
    args.output_sql.write_text(sql_text, encoding="utf-8")
    args.output_report.write_text(
        json.dumps(result.report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Generated:")
    print(f"  SQL   : {args.output_sql}")
    print(f"  Report: {args.output_report}")
    print("Counts:")
    for key, value in result.report["import_row_counts"].items():
        print(f"  {key}: {value}")
    if result.report["warnings"]:
        print(f"Warnings: {len(result.report['warnings'])}")
    else:
        print("Warnings: 0")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
