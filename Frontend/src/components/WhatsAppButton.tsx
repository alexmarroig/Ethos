import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const WhatsAppButton = ({
  phone,
  message,
  label = "Enviar lembrete",
  variant = "secondary",
  size = "default",
}: WhatsAppButtonProps) => {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-2"
      onClick={() => window.open(url, "_blank", "noopener")}
    >
      <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
      {label}
    </Button>
  );
};

export default WhatsAppButton;
