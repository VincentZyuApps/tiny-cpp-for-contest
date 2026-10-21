#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
scripts/sync_plugin.py - 将 packages/koishi-plugin 同步到 Koishi 外部插件目录
================================================================================

【参数说明与约束】
- 本脚本仅允许通过 `--dst-path` 参数传入【Koishi 项目根目录】路径！
  脚本内部会自动将代码精准同步至:
  <dst-path>/external/tiny-cpp-for-contest

【用法示例】
1. 使用 uv 运行 (推荐):
   uv run python scripts/sync_plugin.py --dst-path "G:\\GGames\\Minecraft\\shuyeyun\\qq-bot\\koishi-dev\\koishi-dev-8"

2. 使用系统 Python 运行:
   python scripts/sync_plugin.py --dst-path "G:\\GGames\\Minecraft\\shuyeyun\\qq-bot\\koishi-dev\\koishi-dev-8"

3. 可选参数:
   --clean    在同步前清理目标插件目录中的旧文件
================================================================================
"""

import argparse
import os
import shutil
import sys
from pathlib import Path


# 同步时忽略的文件/文件夹列表
IGNORE_PATTERNS = shutil.ignore_patterns(
    "node_modules",
    ".git",
    "*.log",
    ".turbo",
    ".cache",
    ".DS_Store",
    "Thumbs.db",
)


def main():
    parser = argparse.ArgumentParser(
        description="将 packages/koishi-plugin 同步到指定的 Koishi 宿主项目根目录"
    )
    parser.add_argument(
        "--dst-path",
        required=True,
        type=str,
        help="【必须】目标 Koishi 宿主项目的根目录路径 (如 G:\\...\\koishi-dev-8)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="同步前清空目标 external/tiny-cpp-for-contest 目录",
    )

    args = parser.parse_args()

    # 规范化路径
    dst_root = Path(args.dst_path).resolve()

    if not dst_root.exists() or not dst_root.is_dir():
        print(f"❌ [错误] 指定的 Koishi 根目录不存在或不是文件夹: {dst_root}", file=sys.stderr)
        sys.exit(1)

    # 检查根目录下是否有典型标志 (如 package.json 或 external 文件夹)
    if not (dst_root / "package.json").exists() and not (dst_root / "external").exists():
        print(
            f"⚠️ [警告] 目标路径似乎不是标准的 Koishi 根目录 (未检测到 package.json 或 external/): {dst_root}",
            file=sys.stderr,
        )

    # 源路径：当前仓库的 packages/koishi-plugin
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    src_plugin_dir = repo_root / "packages" / "koishi-plugin"

    if not src_plugin_dir.exists():
        print(f"❌ [错误] 源码插件目录不存在: {src_plugin_dir}", file=sys.stderr)
        sys.exit(1)

    # 目标插件路径：<dst-path>/external/tiny-cpp-for-contest
    target_plugin_dir = dst_root / "external" / "tiny-cpp-for-contest"

    # 检查是否需要创建目录
    if not target_plugin_dir.exists():
        print(f"📁 [创建] 检测到目标插件目录尚不存在，正在自动创建: {target_plugin_dir}")
        target_plugin_dir.mkdir(parents=True, exist_ok=True)
    elif args.clean:
        print(f"🧹 [清理] 正在清空目标目录: {target_plugin_dir}")
        shutil.rmtree(target_plugin_dir)
        target_plugin_dir.mkdir(parents=True, exist_ok=True)

    print(f"📦 [同步] 正在从 {src_plugin_dir} 同步到 {target_plugin_dir} ...")

    # 执行递归拷贝并忽略临时项
    for item in src_plugin_dir.iterdir():
        if item.name in ["node_modules", ".git", ".cache", "dist", "lib"]:
            continue
        dest_item = target_plugin_dir / item.name
        if item.is_dir():
            if dest_item.exists():
                shutil.rmtree(dest_item)
            shutil.copytree(item, dest_item, ignore=IGNORE_PATTERNS)
        else:
            shutil.copy2(item, dest_item)

    # 关键步骤: 将 packages/core/src 完整内联同步到目标的 src/core 中
    src_core_dir = repo_root / "packages" / "core" / "src"
    target_core_dir = target_plugin_dir / "src" / "core"
    if src_core_dir.exists():
        if target_core_dir.exists():
            shutil.rmtree(target_core_dir)
        print(f"🔗 [内联核心] 正在将核心解释器源码嵌入目标插件: {target_core_dir}")
        shutil.copytree(src_core_dir, target_core_dir, ignore=IGNORE_PATTERNS)

    print()
    print("=" * 68)
    print("✨ [同步完成] 插件文件已成功同步至目标 Koishi 环境！")
    print(f"📂 目标路径: {target_plugin_dir}")
    print()
    print("💡 [后续提示] 若要使 Koishi 成功识别并加载该插件，请在目标 Koishi 根目录下执行：")
    print(f"   > cd \"{dst_root}\"")
    print("   > yarn && yarn dev   (或者: npm install && npm run dev)")
    print("=" * 68)


if __name__ == "__main__":
    main()
