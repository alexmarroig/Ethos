import sys

file_path = 'Frontend/src/pages/AccountPage.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
broken_line = ""
for line in lines:
    if 'const isProfileIncomplete = ' in line and 'const { user,' not in line:
        broken_line = line.strip()
    else:
        new_lines.append(line)

final_lines = []
for line in new_lines:
    final_lines.append(line)
    if 'const { user, isCloudAuthenticated, updateProfile } = useAuth();' in line:
        final_lines.append(f"  {broken_line}\n")

with open(file_path, 'w') as f:
    f.writelines(final_lines)
