"""Fail when an upstream route or UI page lacks a reviewed coverage decision."""
import ast
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[3]
coverage = json.loads((root / 'synology/ctl-coverage.json').read_text())
registry = json.loads((root / 'synology/operations.json').read_text())
rows = {row['surface']: row for row in coverage['surfaces']}
assert len(rows) == len(coverage['surfaces']), 'Duplicate inventory surfaces'
for row in rows.values():
    assert row['reason'] and row['source'] and row['status'] in ['mapped', 'excluded']
    assert all(command in registry['operations'] for command in row['commands'])

urls = ast.parse((root / 'src/paperless/urls.py').read_text())
classes = {}
for file in ['src/documents/views.py', 'src/paperless/views.py', 'src/paperless_mail/views.py']:
    for node in ast.parse((root / file).read_text()).body:
        if isinstance(node, ast.ClassDef):
            classes[node.name] = node

for node in ast.walk(urls):
    if not isinstance(node, ast.Call):
        continue
    if isinstance(node.func, ast.Attribute) and node.func.attr == 'register':
        route = ast.literal_eval(node.args[0])
        assert 'router:' + route in rows, 'Unreviewed router: ' + route
        seen = set()
        def check_actions(name):
            if name in seen or name not in classes:
                return
            seen.add(name)
            for method in classes[name].body:
                if isinstance(method, ast.FunctionDef) and any(
                    isinstance(d, ast.Call) and isinstance(d.func, ast.Name)
                    and d.func.id == 'action' for d in method.decorator_list
                ):
                    assert 'action:' + route + '.' + method.name in rows, 'Unreviewed action'
            for base in classes[name].bases:
                if isinstance(base, ast.Name):
                    check_actions(base.id)
        check_actions(node.args[1].id)
    if isinstance(node.func, ast.Name) and node.func.id in ['path', 're_path'] and node.args and isinstance(node.args[0], ast.Constant):
        assert 'url:' + str(node.lineno) + ':' + node.args[0].value in rows, 'Unreviewed explicit URL'
ui = (root / 'src-ui/src/app/app-routing.module.ts').read_text()
for path in set(re.findall(r"path: '([^']*)'", ui)):
    assert 'ui:' + path in rows, 'Unreviewed UI page: ' + path

# The runtime is the official pinned image, not a development source tree.
assert subprocess.check_output(['git', 'diff', coverage['upstream']['commit'], '--', 'src', 'src-ui'], cwd=root) == b''
views = (root / 'src/documents/views.py').read_text()
assert 'owner_id=request.user.id' in views
assert 'return Response(async_task.id)' in views
assert 'related_document_ids' in (root / 'src/documents/serialisers.py').read_text()
assert 'class StandardPagination(PageNumberPagination)' in (root / 'src/paperless/views.py').read_text()
print(f"Reviewed {len(rows)} UI/API surfaces against pinned upstream source")
