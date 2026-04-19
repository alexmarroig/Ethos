import sys

with open('Frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'const formatPhoneInput =' in line:
        skip = True
        continue
    if skip:
        if '};' in line:
            skip = False
        continue

    # Replace any leftover formatPhoneInput with formatPhone
    line = line.replace('formatPhoneInput(', 'formatPhone(')
    new_lines.append(line)

with open('Frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
