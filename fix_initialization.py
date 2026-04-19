import sys

with open('Frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace initial assignments with formatted ones
content = content.replace('phone: detail.patient.phone ?? "",', 'phone: formatPhone(detail.patient.phone ?? ""),')
content = content.replace('whatsapp: detail.patient.whatsapp ?? detail.patient.phone ?? "",', 'whatsapp: formatPhone(detail.patient.whatsapp ?? detail.patient.phone ?? ""),')
content = content.replace('psychiatrist_contact: detail.patient.psychiatrist_contact ?? "",', 'psychiatrist_contact: formatPhone(detail.patient.psychiatrist_contact ?? ""),')
content = content.replace('emergency_contact_phone: detail.patient.emergency_contact_phone ?? "",', 'emergency_contact_phone: formatPhone(detail.patient.emergency_contact_phone ?? ""),')

with open('Frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
