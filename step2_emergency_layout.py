import sys

with open('Frontend/src/pages/PatientDetailPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the psychiatric section
search_text = '''<div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do psiquiatra</label>
              <Input value={form.psychiatrist_name} onChange={(event) => updateForm("psychiatrist_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato do psiquiatra</label>
              <Input value={form.psychiatrist_contact} onChange={(event) => updateForm("psychiatrist_contact", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato de emergência</label>
              <Input value={form.emergency_contact_name} onChange={(event) => updateForm("emergency_contact_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Relação com o paciente</label>
              <Input value={form.emergency_contact_relationship} onChange={(event) => updateForm("emergency_contact_relationship", event.target.value)} placeholder="Mãe, pai, irmã, parceiro..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone de emergência</label>
              <Input value={form.emergency_contact_phone} onChange={(event) => updateForm("emergency_contact_phone", event.target.value)} />
            </div>
          </div>'''

# New layout: Psychiatrist in one grid (2 cols), Emergency in another grid (3 cols)
# Actually, I'll just change the main grid to handle it properly.
# The user wants "Contato de emergência", "Relação" and "Telefone" on the same line.

replacement_text = '''<div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do psiquiatra</label>
              <Input value={form.psychiatrist_name} onChange={(event) => updateForm("psychiatrist_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato do psiquiatra</label>
              <Input value={form.psychiatrist_contact} onChange={(event) => updateForm("psychiatrist_contact", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contato de emergência</label>
              <Input value={form.emergency_contact_name} onChange={(event) => updateForm("emergency_contact_name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Relação com o paciente</label>
              <Input value={form.emergency_contact_relationship} onChange={(event) => updateForm("emergency_contact_relationship", event.target.value)} placeholder="Mãe, pai, irmã, parceiro..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Telefone de emergência</label>
              <Input value={form.emergency_contact_phone} onChange={(event) => updateForm("emergency_contact_phone", event.target.value)} />
            </div>
          </div>'''

if search_text in content:
    content = content.replace(search_text, replacement_text)
    print("Successfully replaced layout.")
else:
    # Try with slight differences in whitespace/indentation if needed
    print("Could not find exact block. Searching for key labels...")
    if 'Telefone de emergência' in content:
        print("Found Telefone de emergência label.")

with open('Frontend/src/pages/PatientDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
