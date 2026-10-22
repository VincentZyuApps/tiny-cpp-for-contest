#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
scripts/publish_npm.py - 自动化 NPM 发布脚本 (剥离 +日期，发布 latest+next，即时还原)
================================================================================
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

DEFAULT_REGISTRY = "https://registry.npmjs.org"
PROXY_URL = "http://127.0.0.1:7890"


def publish_package(pkg_dir: Path, tag: str = "latest", add_next: bool = True, registry: str = DEFAULT_REGISTRY):
    pkg_json_path = pkg_dir / "package.json"
    if not pkg_json_path.exists():
        raise FileNotFoundError(f"未找到 package.json: {pkg_json_path}")

    # 读取原始 package.json
    with open(pkg_json_path, "r", encoding="utf-8") as f:
        original_content = f.read()
    pkg_data = json.loads(original_content)

    full_version = pkg_data.get("version", "")
    pkg_name = pkg_data.get("name", "")

    # 提取干净的 SemVer (移除 + 及其后的 build metadata)
    clean_version = re.sub(r"\+.*$", "", full_version)

    print("=" * 68)
    print(f"📦 正在准备发布: {pkg_name}")
    print(f"📌 Git 追踪版本: {full_version}")
    print(f"🚀 NPM 发布版本: {clean_version}")
    print(f"🌐 注册表地址:   {registry}")
    print("=" * 68)

    # 先在本地执行构建以确保产物最新
    print(f"🔨 正在编译打包 {pkg_name} ...")
    subprocess.run(["npm", "run", "build"], cwd=pkg_dir, check=True, shell=True)

    # 准备网络代理环境变量
    env = os.environ.copy()
    env["HTTP_PROXY"] = PROXY_URL
    env["HTTPS_PROXY"] = PROXY_URL

    try:
        # 临时写入去除了 +日期的标准 SemVer
        pkg_data["version"] = clean_version
        with open(pkg_json_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(pkg_data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        # 执行 npm publish
        publish_cmd = [
            "npm", "publish",
            "--access", "public",
            "--tag", tag,
            "--registry", registry,
        ]
        print(f"📤 正在执行: {' '.join(publish_cmd)} ...")
        subprocess.run(publish_cmd, cwd=pkg_dir, env=env, check=True, shell=True)
        print(f"✅ [发布成功] {pkg_name}@{clean_version} 已打上 tag: {tag}！")

        # 同步添加 next tag
        if add_next and tag != "next":
            tag_cmd = [
                "npm", "dist-tag", "add",
                f"{pkg_name}@{clean_version}", "next",
                "--registry", registry,
            ]
            print(f"🏷️ 正在追加 tag: {' '.join(tag_cmd)} ...")
            subprocess.run(tag_cmd, cwd=pkg_dir, env=env, check=True, shell=True)
            print(f"✅ [标签追加成功] {pkg_name}@{clean_version} 已成功打上 tag: next！")

    finally:
        # 无论成功还是异常，毫秒级无损还原原始 package.json
        with open(pkg_json_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(original_content)
        print(f"🛡️ [版本复原] 已无损还原 {pkg_name} 的 package.json 为: {full_version}")
        print("=" * 68)


def main():
    parser = argparse.ArgumentParser(description="自动发布包到 NPM 并维护 Git +日期版本号与多标签")
    parser.add_argument(
        "--pkg",
        choices=["core", "koishi-plugin", "all"],
        default="core",
        help="指定要发布的子包 (core / koishi-plugin / all)",
    )
    parser.add_argument("--tag", default="latest", help="主发布标签 (默认: latest)")
    parser.add_argument("--no-next", action="store_true", help="不追加 next 标签")
    parser.add_argument("--registry", default=DEFAULT_REGISTRY, help="NPM 注册表地址")

    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parent.parent

    target_dirs = []
    if args.pkg in ["core", "all"]:
        target_dirs.append(repo_root / "packages" / "core")
    if args.pkg in ["koishi-plugin", "all"]:
        target_dirs.append(repo_root / "packages" / "koishi-plugin")

    for p in target_dirs:
        publish_package(
            pkg_dir=p,
            tag=args.tag,
            add_next=not args.no_next,
            registry=args.registry,
        )


if __name__ == "__main__":
    main()
