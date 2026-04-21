import { GoogleLogin } from '@react-oauth/google';
import { useToast } from "@/hooks/use-toast";

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  isLoading?: boolean;
}

export const GoogleLoginButton = ({ onSuccess, isLoading }: GoogleLoginButtonProps) => {
  const { toast } = useToast();

  return (
    <div className="w-full flex justify-center">
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
        theme="filled_blue"
        shape="pill"
        locale="pt-BR"
        text="continue_with"
        width="320"
      />
    </div>
  );
};
