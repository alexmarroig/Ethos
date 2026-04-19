import sys

with open('Frontend/src/pages/FormsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Redesign the card header and badges
search_badges = '''<div className="flex shrink-0 gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {assignmentCount} pacientes
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {responseCount} respostas
                        </span>
                      </div>'''

# Move badges below the title and description, and give more padding/spacing
new_badges_location = '''<div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {assignmentCount} pacientes
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {responseCount} respostas
                        </span>
                      </div>'''

# Replace the old badges block with nothing (we will insert it elsewhere)
content = content.replace(search_badges, '')

# Find where to insert the new badges (after the description)
search_title_block = '''<h3 className="font-serif text-lg font-medium text-foreground">
                          {form.name}
                        </h3>
                        {form.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        ) : null}'''

replacement_title_block = search_title_block + '\n\n                      ' + new_badges_location

content = content.replace(search_title_block, replacement_title_block)

# Improve card padding and airiness
content = content.replace('session-card flex flex-col gap-4', 'session-card flex flex-col gap-6 p-6 md:p-8')

# Clean up "Disponibilizações" section - make it more subtle
content = content.replace('rounded-2xl border border-border/70 bg-muted/20 p-4', 'rounded-2xl border border-border/50 bg-muted/10 p-5')
content = content.replace('uppercase tracking-[0.18em]', 'uppercase tracking-[0.12em] font-medium')

with open('Frontend/src/pages/FormsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
