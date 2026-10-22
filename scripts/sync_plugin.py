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
1. 使用 uv 运行 (推荐，本地绝对路径如 "G:\\GGames\\Minecraft\\shuyeyun\\qq-bot\\koishi-dev\\koishi-dev-8"):
   uv run python scripts/sync_plugin.py --dst-path "/path/to/koishi-app"

2. 使用系统 Python 运行:
   python scripts/sync_plugin.py --dst-path "/path/to/koishi-app"

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

    # 执行递归拷贝并忽略临时项 (保留已编译的 lib 目录供 Koishi LocalScanner 解析)
    for item in src_plugin_dir.iterdir():
        if item.name in ["node_modules", ".git", ".cache", "dist"]:
            continue
        dest_item = target_plugin_dir / item.name
        if item.is_dir():
            if dest_item.exists():
                shutil.rmtree(dest_item)
            shutil.copytree(item, dest_item, ignore=IGNORE_PATTERNS)
        else:
            shutil.copy2(item, dest_item)

    # 彻底清理目标目录中遗留的历史 src/core 冗余目录 (已解耦为独立 npm 依赖)
    legacy_core_dir = target_plugin_dir / "src" / "core"
    if legacy_core_dir.exists():
        print(f"🧹 [清理冗余] 正在清除目标中旧版的嵌入核心源码: {legacy_core_dir}")
        shutil.rmtree(legacy_core_dir)

    # 关键步骤 2: 自动建立宿主 node_modules 下的 workspace Junction 软链接
    # Koishi 控制台的 LocalScanner 仅扫描宿主 node_modules/koishi-plugin-* 目录
    node_modules_dir = dst_root / "node_modules"
    if node_modules_dir.exists() and node_modules_dir.is_dir():
        link_name = node_modules_dir / "koishi-plugin-tiny-cpp-for-contest"
        if not link_name.exists():
            print(f"🔗 [自动链接] 正在为 Koishi 宿主创建 node_modules 软链接: {link_name}")
            try:
                import subprocess
                subprocess.run(
                    ["cmd", "/c", "mklink", "/J", str(link_name), str(target_plugin_dir)],
                    check=True,
                    capture_output=True,
                )
                print(f"✅ [软链接建立成功] {link_name} -> {target_plugin_dir}")
            except Exception as e:
                print(f"⚠️ [软链接提示] 未能自动创建 Junction，可手动创建: {e}", file=sys.stderr)
        else:
            print(f"✅ [软链接已就绪] 检测到宿主 node_modules 中已存在该插件链接: {link_name}")

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
