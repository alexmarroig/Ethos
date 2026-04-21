import sys

file_path = 'Frontend/src/pages/AccountPage.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
broken_line = ""
for line in lines:
    if 'const isProfileIncomplete =' in line:
        broken_line = line.strip()
    else:
        new_lines.append(line)

# Find where to insert the broken line. It should probably be inside the component before useEffect or inside it.
# Let's find the AccountPage component start.
final_lines = []
inserted = False
for line in new_lines:
    if 'const AccountPage = ' in line and not inserted:
        final_lines.append(line)
        final_lines.append(f"  {broken_line}\n")
        inserted = True
    else:
        final_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(final_lines)
