import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function TrueLayerCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Completing bank connection...");

  useEffect(() => {
    const completeAuth = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Authorization failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("No authorization code received");
        return;
      }

      try {
        // Complete the auth directly here instead of relying on postMessage
        const redirectUri = "https://ahfinance.lovable.app/truelayer/callback";
        
        const response = await supabase.functions.invoke("truelayer", {
          body: { 
            action: "complete-auth", 
            code, 
            redirectUri,
            providerName: "TrueLayer Bank" 
          },
        });

        if (response.error || response.data?.error) {
          throw new Error(response.data?.error || response.error?.message);
        }

        setStatus("success");
        setMessage("Bank connected successfully! You can close this window.");

        // Try to notify opener and close, but don't rely on it
        if (window.opener) {
          try {
            window.opener.postMessage({ type: "truelayer-success" }, "*");
          } catch (e) {
            // Ignore cross-origin errors
          }
        }

        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
          // If window.close() doesn't work (not opened as popup), redirect
          window.location.href = "/settings";
        }, 2000);

      } catch (err) {
        console.error("Failed to complete auth:", err);
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to connect bank");
      }
    };

    completeAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-6">
        {status === "processing" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="font-medium text-lg mb-2">Connected!</p>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="font-medium text-lg mb-2">Connection Failed</p>
            <p className="text-muted-foreground">{message}</p>
            <button 
              onClick={() => window.close()} 
              className="mt-4 text-primary underline"
            >
              Close window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
