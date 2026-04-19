import sys

def process_file(filename, replacements):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix PatientsPage.tsx
process_file('Frontend/src/pages/PatientsPage.tsx', [
    ('whatsapp: newWhatsApp.trim() || undefined,', 'whatsapp: newWhatsApp.replace(/\\D/g, "") || undefined,'),
])

# Fix PatientDetailPage.tsx
process_file('Frontend/src/pages/PatientDetailPage.tsx', [
    ('phone: form.phone.trim() || undefined,', 'phone: onlyDigits(form.phone) || undefined,'),
    ('whatsapp: form.whatsapp.trim() || undefined,', 'whatsapp: onlyDigits(form.whatsapp) || undefined,'),
    ('psychiatrist_contact: form.psychiatrist_contact.trim() || undefined,', 'psychiatrist_contact: onlyDigits(form.psychiatrist_contact) || undefined,'),
    ('emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,', 'emergency_contact_phone: onlyDigits(form.emergency_contact_phone) || undefined,'),
])
