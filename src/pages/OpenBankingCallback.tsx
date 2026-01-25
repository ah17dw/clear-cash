import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OpenBankingCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const consent = searchParams.get("consent");
    const error = searchParams.get("error");

    if (window.opener) {
      if (consent) {
        window.opener.postMessage({
          type: "open-banking-callback",
          consent,
        }, window.location.origin);
      } else if (error) {
        window.opener.postMessage({
          type: "open-banking-callback",
          error,
        }, window.location.origin);
      }
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authorization...</p>
      </div>
    </div>
  );
}
