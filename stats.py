#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
from pathlib import Path

project_dir = Path(r'C:\Users\Administrator\.qclaw\workspace\hotboard-project')

files = []
total_size = 0

for filepath in project_dir.rglob('*'):
    if filepath.is_file():
        size = filepath.stat().st_size
        total_size += size
        files.append({
            'name': filepath.name,
            'relative_path': str(filepath.relative_to(project_dir)),
            'size': size
        })

print('=' * 70)
print('HotBoard 项目文件统计报告')
print('=' * 70)
print()
print(f'项目路径: {project_dir}')
print(f'文件总数: {len(files)}')
print(f'总大小: {total_size / 1024:.1f} KB ({total_size} bytes)')
print()
print('文件列表:')
print('-' * 70)
print(f'{"文件名":<35} {"大小":>12} {"路径"}')
print('-' * 70)

for f in sorted(files, key=lambda x: x['name']):
    size_kb = f['size'] / 1024
    print(f'{f["name"]:<35} {size_kb:>10.1f} KB  {f["relative_path"]}')

print('-' * 70)
print(f'总计: {len(files)} 个文件, {total_size / 1024:.1f} KB')
print()

# 按类型统计
doc_files = [f for f in files if f['name'].endswith('.md')]
config_files = [f for f in files if f['name'].endswith(('.json', '.js', '.ts', '.example'))]

print('按类型统计:')
print(f'  📚 文档文件 (.md): {len(doc_files)} 个')
print(f'  ⚙️  配置文件: {len(config_files)} 个')
print()

print('✅ 项目准备完成！')
print()
print('下一步:')
print('  1. 创建 GitHub 仓库')
print('  2. 设置 Supabase 项目')
print('  3. 获取榜眼数据 API 密钥')
print('  4. 运行 npm install')
print('  5. 配置 .env.local')
print('  6. 运行 npm run dev')
