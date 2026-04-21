import sys

file_path = 'Frontend/src/pages/AgendaPage.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace the single Agendar button with two buttons
old_button = """              <Button variant="secondary" className="gap-2" onClick={() => setSessionDialogOpen(true)}>
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Agendar sessão
              </Button>"""

new_buttons = """              <div className="flex gap-2">
                <Button variant="secondary" className="gap-2" onClick={() => {
                  setSessionDialogDefaults({ eventType: 'session' });
                  setSessionDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Agendar sessão
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
                  setSessionDialogDefaults({ eventType: 'block' });
                  setSessionDialogOpen(true);
                }}>
                  <CalendarPlus className="w-4 h-4" strokeWidth={1.5} />
                  Outra tarefa
                </Button>
              </div>"""

if old_button in content:
    content = content.replace(old_button, new_buttons)

# Update state
old_state = 'const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string }>({});'
new_state = "const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string; eventType?: 'session' | 'block' }>({});"
if old_state in content:
    content = content.replace(old_state, new_state)

# Update Dialog call
old_dialog = """    <SessionDialog
      open={sessionDialogOpen}
      onOpenChange={(v) => { setSessionDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={patients}
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      onCreated={async () => {"""

new_dialog = """    <SessionDialog
      open={sessionDialogOpen}
      onOpenChange={(v) => { setSessionDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={patients}
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      defaultEventType={sessionDialogDefaults.eventType}
      onCreated={async () => {"""

if old_dialog in content:
    content = content.replace(old_dialog, new_dialog)

# Update session card icons and labels
old_card_status = """<span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                      {session.event_type === "block" ? "Bloqueio" : session.status === "pending" ? "Pendente" : session.status === "confirmed" ? "Confirmada" : session.status === "completed" ? "Concluída" : "Faltou"}
                                    </span>"""

new_card_status = """<div className="flex items-center gap-1.5">
                                      {session.event_type === "session" && session.location_type && (
                                        <span className="text-muted-foreground">
                                          {session.location_type === "remote" ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                        </span>
                                      )}
                                      <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                        {session.event_type === "block" ? "Tarefa" : session.status === "pending" ? "Pendente" : session.status === "confirmed" ? "Confirmada" : session.status === "completed" ? "Concluída" : "Faltou"}
                                      </span>
                                    </div>"""

if old_card_status in content:
    content = content.replace(old_card_status, new_card_status)

# Update mobile card status
old_mobile_status = """<span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                              {session.event_type === "block" ? "Bloqueio" : session.status === "pending" ? "Pendente" : session.status === "confirmed" ? "Confirmada" : session.status === "completed" ? "Concluída" : "Faltou"}
                            </span>"""

new_mobile_status = """<div className="flex items-center gap-1.5">
                              {session.event_type === "session" && session.location_type && (
                                <span className="text-muted-foreground">
                                  {session.location_type === "remote" ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                </span>
                              )}
                              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                {session.event_type === "block" ? "Tarefa" : session.status === "pending" ? "Pendente" : session.status === "confirmed" ? "Confirmada" : session.status === "completed" ? "Concluída" : "Faltou"}
                              </span>
                            </div>"""

if old_mobile_status in content:
    content = content.replace(old_mobile_status, new_mobile_status)

# Update bottom icons
old_bottom_icons = """<div className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    {session.event_type === "block"
                                      ? <Ban className="h-3.5 w-3.5" />
                                      : <UserRound className="h-3.5 w-3.5" />}
                                    {session.event_type === "block"
                                      ? (session.duration ? `${session.duration} min` : "Bloqueio")
                                      : (session.duration ? `${session.duration} min` : "Sessão")}
                                  </div>"""

new_bottom_icons = """<div className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    {session.event_type === "block"
                                      ? <CalendarPlus className="h-3.5 w-3.5" />
                                      : <UserRound className="h-3.5 w-3.5" />}
                                    {session.event_type === "block"
                                      ? (session.duration ? `${session.duration} min` : "Tarefa")
                                      : (session.duration ? `${session.duration} min` : "Sessão")}
                                    {session.event_type === "session" && session.location_type && (
                                      <span className="ml-1 opacity-70">
                                        · {session.location_type === "remote" ? "Remoto" : "Presencial"}
                                      </span>
                                    )}
                                  </div>"""

if old_bottom_icons in content:
    content = content.replace(old_bottom_icons, new_bottom_icons)

# Update imports
old_icons = 'Ban, ChevronLeft, ChevronRight, Clock3, Loader2, Plus, Repeat2, Settings2, Sparkles, UserRound, X'
new_icons = 'Ban, ChevronLeft, ChevronRight, Clock3, Loader2, Plus, Repeat2, Settings2, Sparkles, UserRound, X, Monitor, Building2, CalendarPlus'
if old_icons in content:
    content = content.replace(old_icons, new_icons)

# Final cleanup of any remaining "Bloqueio" in labels
content = content.replace('"Bloqueio"', '"Tarefa"')
content = content.replace(' : "Bloqueio"', ' : "Tarefa"')

with open(file_path, 'w') as f:
    f.write(content)
