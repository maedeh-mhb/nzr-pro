from pathlib import Path

root = Path("app/api")
route_files = sorted(root.rglob("route.ts"))
patched = []

for path in route_files:
    text = path.read_text(encoding="utf-8")
    parsed_lines = text.splitlines()
    dynamic_line = 'export const dynamic = "force-dynamic";'
    if dynamic_line not in text:
        continue

    # Remove all existing dynamic lines first
    lines = [line for line in parsed_lines if line.strip() != dynamic_line]

    # Remove any existing dynamic lines
    lines = [line for line in parsed_lines if line.strip() != dynamic_line]

    # Find the end of the last import block (handles multi-line imports)
    insert_idx = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("import "):
            # if it's a single-line import, move insert after it
            if "from" in stripped and ("{" not in stripped or "}" in stripped):
                insert_idx = i + 1
                i += 1
                continue
            # multi-line import: scan until we find a line with '}' (end of specifiers)
            j = i
            saw_close = False
            while j < len(lines):
                if "}" in lines[j]:
                    saw_close = True
                    break
                j += 1
            # if we found closing brace, advance until we hit a line containing 'from' or a semicolon
            if saw_close:
                k = j
                while k < len(lines):
                    if "from" in lines[k] or lines[k].strip().endswith(";"):
                        insert_idx = k + 1
                        break
                    k += 1
                else:
                    insert_idx = j + 1
                i = k + 1
                continue
            else:
                # unterminated import, just stop
                insert_idx = i + 1
                break
        i += 1

    lines.insert(insert_idx, dynamic_line)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    patched.append(str(path))

print(f"Fixed {len(patched)} route files")
for p in patched[:20]:
    print(p)
