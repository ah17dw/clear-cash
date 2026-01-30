import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OpenBankingCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const provider = searchParams.get("provider");
    const consent = searchParams.get("consent");
    const error = searchParams.get("error");
    const ref = searchParams.get("ref");
    const code = searchParams.get("code");

    if (window.opener) {
      if (provider === "nordigen") {
        // Nordigen callback - send ref back to parent
        window.opener.postMessage({
          type: "nordigen-callback",
          ref: ref || searchParams.get("reference"),
        }, window.location.origin);
      } else if (provider === "truelayer") {
        // TrueLayer callback - send code back to parent
        window.opener.postMessage({
          type: "truelayer-callback",
          code,
          error,
        }, window.location.origin);
      } else if (consent) {
        // Plaid callback
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
