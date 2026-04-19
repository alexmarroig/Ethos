import sys

with open('Frontend/src/pages/FormsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''{form.description ? (
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

new_block = '''{form.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {form.fields?.length ?? 0} campos
                          </span>
                          <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {assignmentCount} pacientes
                          </span>
                          <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {responseCount} respostas
                          </span>
                        </div>
                      </div>
                    </div>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Moved badges inside the title div.")
else:
    print("Could not find the exact block.")

with open('Frontend/src/pages/FormsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
