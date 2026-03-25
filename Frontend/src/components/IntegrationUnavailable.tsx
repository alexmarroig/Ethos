import { AlertCircle } from "lucide-react";

interface IntegrationUnavailableProps {
  message?: string;
  requestId?: string;
}

const IntegrationUnavailable = ({
  message = "Integração indisponível. Tente novamente em instantes.",
  requestId,
}: IntegrationUnavailableProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
      <p className="text-muted-foreground text-sm max-w-md">{message}</p>
      {requestId && (
        <p className="mt-2 text-xs text-muted-foreground/50 font-mono">
          request_id: {requestId}
        </p>
      )}
    </div>
  );
};

export default IntegrationUnavailable;
