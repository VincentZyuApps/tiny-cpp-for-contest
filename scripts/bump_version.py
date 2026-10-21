#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
scripts/bump_version.py - 统一升级 Monorepo 根目录及所有子包版本号
================================================================================

【用法示例】
1. 指定完整版本号 (使用 uv 运行):
   uv run python scripts/bump_version.py -v 0.1.0-beta.1+20261022

2. 分离指定版本号与构建日期:
   uv run python scripts/bump_version.py -v 0.1.0-beta.1 -c 20261022
   (将自动拼接为: 0.1.0-beta.1+20261022)

3. 默认用法 (不加参数时默认使用当前最新 beta 版本):
   uv run python scripts/bump_version.py
================================================================================
"""

import argparse
import json
import re
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="统一升级 Monorepo 根目录及 packages/* 所有子包的 package.json 版本号"
    )
    parser.add_argument(
        "-v",
        "--version",
        type=str,
        default="0.1.0-beta.1",
        help="目标版本号 (如 0.1.0-beta.1 或 0.1.0-beta.1+20261022)",
    )
    parser.add_argument(
        "-c",
        "--build-date",
        type=str,
        default="",
        help="构建日期元数据 (如 20261022)，若版本号未包含 '+' 将自动追加为 '+20261022'",
    )

    args = parser.parse_args()

    # 规范化最终版本号
    target_version = args.version.strip()
    if args.build_date and "+" not in target_version:
        target_version += f"+{args.build_date.strip()}"
    elif "+" not in target_version and "2026" not in target_version:
        # 若未指定 build date 且版本号无 +，默认带上当前日期元数据
        target_version += "+20261022"

    repo_root = Path(__file__).resolve().parent.parent

    # 需要更新的文件列表
    target_files = [
        repo_root / "package.json",
        repo_root / "packages" / "core" / "package.json",
        repo_root / "packages" / "koishi-plugin" / "package.json",
        repo_root / "packages" / "web" / "package.json",
    ]

    print("=" * 68)
    print(f"🚀 [Bump Version] 准备将所有包统一升级至版本: {target_version}")
    print("=" * 68)

    updated_count = 0

    for pkg_path in target_files:
        if not pkg_path.exists():
            print(f"⚠️ [跳过] 文件未找到: {pkg_path}")
            continue

        try:
            with open(pkg_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            old_ver = data.get("version", "未知")
            data["version"] = target_version

            with open(pkg_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")

            rel_path = pkg_path.relative_to(repo_root)
            print(f"✅ [{data.get('name', rel_path)}] {old_ver} -> {target_version}")
            updated_count += 1
        except Exception as e:
            print(f"❌ [错误] 更新文件失败 {pkg_path}: {e}", file=sys.stderr)

    print()
    print("=" * 68)
    print(f"✨ [升级完成] 成功更新了 {updated_count} 个 package.json 文件！")
    print(f"📌 当前统一版本号: {target_version}")
    print("=" * 68)


if __name__ == "__main__":
    main()
