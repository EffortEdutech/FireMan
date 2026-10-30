"use client";

export function PrintLabelButton() {
  return (
    <button className="button" onClick={() => window.print()} type="button">
      Print label
    </button>
  );
}
