"use client";

import { Button } from "@/components/ui/button";

export function PrintLabelButton() {
  return (
    <Button onClick={() => window.print()} type="button" variant="secondary">
      Print label
    </Button>
  );
}
