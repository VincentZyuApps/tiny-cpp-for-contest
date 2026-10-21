#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
scripts/build_presets.py - 从 packages/core/presets 读取 .cpp 与 .json 生成 TS 代码
================================================================================
"""

import json
from pathlib import Path


def main():
    repo_root = Path(__file__).resolve().parent.parent
    presets_dir = repo_root / "packages" / "core" / "presets"
    examples_json_path = presets_dir / "examples.json"
    output_ts_path = repo_root / "packages" / "core" / "src" / "presets.generated.ts"

    if not examples_json_path.exists():
        raise FileNotFoundError(f"未找到案例配置文件: {examples_json_path}")

    with open(examples_json_path, "r", encoding="utf-8") as f:
        meta_list = json.load(f)

    presets = []
    for item in meta_list:
        cpp_file = presets_dir / item["file"]
        if not cpp_file.exists():
            raise FileNotFoundError(f"未找到 C++ 源码文件: {cpp_file}")

        with open(cpp_file, "r", encoding="utf-8") as cf:
            cpp_content = cf.read().replace("\r\n", "\n")

        presets.append({
            "id": item["id"],
            "title": item["title"],
            "code": cpp_content,
            "stdin": item.get("stdin", ""),
            "expected": item.get("expected", ""),
        })

    ts_content = [
        "/**",
        " * packages/core/src/presets.generated.ts",
        " * ⚠️ 本文件由 scripts/build_presets.py 自动从 packages/core/presets/ 生成，请勿手动编辑！",
        " */",
        "",
        "export interface PresetExample {",
        "  id: string;",
        "  title: string;",
        "  code: string;",
        "  stdin: string;",
        "  expected: string;",
        "}",
        "",
        "export const PRESET_EXAMPLES: PresetExample[] = " + json.dumps(presets, ensure_ascii=False, indent=2) + ";",
        "",
    ]

    with open(output_ts_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(ts_content))

    print(f"✨ [生成成功] 成功从 {presets_dir} 生成预置案例至: {output_ts_path} (共 {len(presets)} 套案例)")


if __name__ == "__main__":
    main()
