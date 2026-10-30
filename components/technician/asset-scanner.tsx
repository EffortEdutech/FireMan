"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { normalizeAssetCode } from "@/lib/maintenance/asset-scan";

type AssetResult = {
  id: string;
  assetCode: string;
  status: string;
  typeName: string;
  location: string;
  buildingName: string;
  siteName: string;
  clientName: string;
  fieldUrl: string;
};
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

export function AssetScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanningRef = useRef(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(
    "Enter an asset code or start the camera.",
  );
  const [result, setResult] = useState<AssetResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [cameraSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  );

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function lookup(value = code) {
    const normalized = normalizeAssetCode(value);
    if (!normalized)
      return setMessage("Enter an asset code or QR value first.");
    let lookupUrl = `/api/technician/scan?assetCode=${encodeURIComponent(normalized)}`;
    try {
      const parsed = new URL(normalized, window.location.origin);
      const qrMatch = parsed.pathname.match(
        /\/equipment\/qr\/([^/]+)|\/technician\/scan/,
      );
      const qrValue = qrMatch?.[1] ?? parsed.searchParams.get("qrToken");
      if (qrValue)
        lookupUrl = `/api/technician/scan?qrToken=${encodeURIComponent(qrValue)}`;
    } catch {
      /* Use manual asset-code lookup. */
    }
    setCode(normalized);
    setMessage("Looking up asset...");
    setResult(null);
    setLookingUp(true);
    try {
      const response = await fetch(lookupUrl);
      const payload = (await response.json()) as {
        asset?: AssetResult;
        error?: string;
      };
      if (!response.ok || !payload.asset) {
        setMessage(
          payload.error === "asset-not-found"
            ? "No active asset matched that code."
            : "Asset lookup failed. Try again.",
        );
        return;
      }
      setResult(payload.asset);
      setMessage("Asset identified. Open an assigned job to use it.");
    } catch {
      setMessage(
        "Asset lookup could not connect. Check your connection and retry.",
      );
    } finally {
      setLookingUp(false);
    }
  }

  async function startCamera() {
    if (!cameraSupported)
      return setMessage(
        "Camera scanning is not supported in this browser. Use manual asset code entry.",
      );
    setCameraStarting(true);
    try {
      if (!("BarcodeDetector" in window)) {
        if (!videoRef.current)
          return setMessage(
            "Camera preview is unavailable. Use manual asset code entry.",
          );
        setCameraActive(true);
        setMessage("Point the camera at an asset QR or barcode.");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        zxingControlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              zxingControlsRef.current?.stop();
              zxingControlsRef.current = null;
              stopCamera();
              void lookup(result.getText());
            }
          },
        );
        return;
      }
      const detectorConstructor = (
        window as Window & { BarcodeDetector?: new () => BarcodeDetectorLike }
      ).BarcodeDetector;
      detectorRef.current = detectorConstructor
        ? new detectorConstructor()
        : null;
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      scanningRef.current = true;
      setCameraActive(true);
      setMessage("Point the camera at an asset QR or barcode.");
      scanFrame();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access or use manual asset code entry."
          : "Camera is unavailable. Use manual asset code entry.",
      );
    } finally {
      setCameraStarting(false);
    }
  }

  async function scanFrame() {
    if (
      !scanningRef.current ||
      !detectorRef.current ||
      !videoRef.current ||
      !streamRef.current
    )
      return;
    try {
      const matches = await detectorRef.current.detect(videoRef.current);
      const value = matches[0]?.rawValue;
      if (value) {
        stopCamera();
        await lookup(value);
        return;
      }
    } catch {
      /* Continue scanning; manual entry remains available. */
    }
    if (scanningRef.current)
      scanTimerRef.current = window.setTimeout(() => void scanFrame(), 350);
  }

  function stopCamera() {
    scanningRef.current = false;
    if (scanTimerRef.current !== null)
      window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    setCameraActive(false);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="scanner-camera-frame">
        {cameraActive ? (
          <video ref={videoRef} autoPlay muted playsInline />
        ) : (
          <span>
            {cameraSupported ? "Camera ready" : "Manual code fallback"}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {!cameraActive ? (
          <Button
            busy={cameraStarting}
            onClick={() => void startCamera()}
            pendingLabel="Starting camera…"
            type="button"
          >
            Start camera
          </Button>
        ) : (
          <Button
            onClick={stopCamera}
            type="button"
            variant="secondary"
          >
            Stop camera
          </Button>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <input
          aria-label="Asset code"
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter asset code"
          value={code}
        />
        <Button busy={lookingUp} pendingLabel="Finding asset…" type="submit">
          Find asset
        </Button>
      </form>
      <div
        aria-live="polite"
        style={{ color: "var(--muted)", fontSize: "0.875rem" }}
      >
        {message}
      </div>
      {result ? (
        <div className="scanner-result">
          <strong>{result.assetCode}</strong>
          <span>
            {result.typeName} / {result.location}
          </span>
          <span>
            {result.clientName} / {result.siteName}
          </span>
          <Link href={result.fieldUrl}>Open field asset page</Link>
          <Link href="/technician/jobs">Open assigned jobs</Link>
        </div>
      ) : null}
    </div>
  );
}
