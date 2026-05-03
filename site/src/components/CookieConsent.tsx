import { useEffect, useState } from "react";
import { getConsent, initializeTracking, saveConsent } from "@/lib/tracking";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent) {
      initializeTracking(consent);
      return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-4xl rounded-2xl border border-[#1A2D42] bg-[#07111F]/95 p-4 shadow-2xl backdrop-blur md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#EDF2F7]">Privacidade e métricas</p>
          <p className="mt-1 text-sm leading-6 text-[#6B8FA8]">
            Usamos cookies e tags para medir visitas, melhorar campanhas e entender quais conteúdos ajudam psicologos a conhecer o ETHOS.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="rounded-xl border border-[#1A2D42] px-4 py-2 text-sm font-medium text-[#EDF2F7] transition-colors hover:border-[#2F6F73]"
            onClick={() => {
              saveConsent({ analytics: false, marketing: false });
              setVisible(false);
            }}
          >
            Somente essenciais
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#2F6F73] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            onClick={() => {
              saveConsent({ analytics: true, marketing: true });
              setVisible(false);
            }}
          >
            Aceitar métricas
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
