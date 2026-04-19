import sys

with open('Frontend/src/pages/FormsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken div structure from the previous automated replacement
# The replacement added a </div> inside the first div, but there was already one.

old_block = '''{form.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {assignmentCount} pacientes
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {responseCount} respostas
                        </span>
                      </div>
                      </div>


                    </div>'''

new_block = '''{form.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-0 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {assignmentCount} pacientes
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {responseCount} respostas
                        </span>
                      </div>
                    </div>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Fixed div structure.")
else:
    print("Could not find the exact block to fix.")

with open('Frontend/src/pages/FormsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
