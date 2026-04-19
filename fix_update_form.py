import sys

with open('Frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if 'const updateForm =' in line:
        # We found the line. Now we need to insert our logic INSIDE the function.
        new_lines.append(line)
        new_lines.append('    if (["phone", "whatsapp", "psychiatrist_contact", "emergency_contact_phone"].includes(key as string)) {\n')
        new_lines.append('      value = formatPhone(value as string) as any;\n')
        new_lines.append('    }\n')
        continue
    # Skip the previously wrongly inserted lines if they exist
    if 'if (["phone", "whatsapp", "psychiatrist_contact", "emergency_contact_phone"].includes(key as string)) {' in line:
        continue
    if 'value = formatPhone(value as string) as any;' in line:
        continue
    if '    }' in lines[i-1] and 'if (["phone", "whatsapp"' in lines[i-2] and line.strip() == '}':
         continue
    if line.strip() == '}' and i > 0 and 'value = formatPhone' in lines[i-1]:
        continue

    new_lines.append(line)

with open('Frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
