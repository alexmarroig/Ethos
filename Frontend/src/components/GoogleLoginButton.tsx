import { GoogleLogin } from '@react-oauth/google';
import { useToast } from "@/hooks/use-toast";

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  isLoading?: boolean;
}

export const GoogleLoginButton = ({ onSuccess, isLoading }: GoogleLoginButtonProps) => {
  const { toast } = useToast();

  return (
    <div
      className={`flex min-h-11 w-full justify-center overflow-visible ${
        isLoading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential);
          }
        }}
        onError={() => {
          toast({
            title: "Erro no login",
            description: "Não foi possível autenticar com o Google. Tente novamente.",
            variant: "destructive",
          });
        }}
        useOneTap
        type="standard"
        theme="outline"
        size="large"
        shape="rectangular"
        logo_alignment="left"
        locale="pt-BR"
        text="continue_with"
        width="400"
      />
    </div>
  );
};
