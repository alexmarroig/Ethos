import { type PatientSession } from "@/services/patientPortalService";

/**
 * Generates an iCal format string for a session
 */
export const generateICalData = (session: PatientSession, psychologistName = "Psicólogo(a) Ethos") => {
  const start = session.scheduled_at
    ? new Date(session.scheduled_at).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : `${session.date.replace(/-/g, "")}T${session.time.replace(/:/g, "")}00Z`;
  
  // Default duration 50 mins
  const startDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date(`${session.date}T${session.time}`);
  const endDate = new Date(startDate.getTime() + 50 * 60000);
  const end = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PROID:-//Ethos//Clinical Platform//PT",
    "BEGIN:VEVENT",
    `SUMMARY:Sessão de Psicoterapia - ${psychologistName}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    "DESCRIPTION:Sessão agendada na plataforma Ethos.",
    `UID:${session.id}@ethos-clinical`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

/**
 * Downloads the iCal file
 */
export const downloadICal = (session: PatientSession, psychologistName?: string) => {
  const data = generateICalData(session, psychologistName);
  const blob = new Blob([data], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `sessao-${session.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates a Google Calendar link
 */
export const generateGoogleLink = (session: PatientSession, psychologistName = "Psicólogo(a) Ethos") => {
  const startDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date(`${session.date}T${session.time}`);
  const endDate = new Date(startDate.getTime() + 50 * 60000);
  
  const start = startDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  
  const title = encodeURIComponent(`Sessão de Psicoterapia - ${psychologistName}`);
  const details = encodeURIComponent("Sessão agendada na plataforma Ethos.");

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
};

/**
 * Generates an Outlook Web Calendar link
 */
export const generateOutlookLink = (session: PatientSession, psychologistName = "Psicólogo(a) Ethos") => {
  const startDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date(`${session.date}T${session.time}`);
  const endDate = new Date(startDate.getTime() + 50 * 60000);
  
  const start = startDate.toISOString();
  const end = endDate.toISOString();
  
  const title = encodeURIComponent(`Sessão de Psicoterapia - ${psychologistName}`);

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&body=Sessão+agendada+na+plataforma+Ethos.`;
};
