import { useEffect } from "react";
import { TrueLayerBankSheet } from "./TrueLayerBankSheet";

interface ConnectBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectBankSheet({ open, onOpenChange }: ConnectBankSheetProps) {
  // Directly pass through to TrueLayer - no provider selection needed
  return (
    <TrueLayerBankSheet
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
