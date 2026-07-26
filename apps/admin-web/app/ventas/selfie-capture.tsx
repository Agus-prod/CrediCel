"use client";

import { Camera, CheckCircle2, RefreshCw, UserRound } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type FaceDetectorShape = {
  detect(source: HTMLVideoElement): Promise<readonly unknown[]>;
};

type FaceDetectorConstructor = new (
  options?: Readonly<{ fastMode?: boolean; maxDetectedFaces?: number }>,
) => FaceDetectorShape;

type SelfieStatus = "idle" | "starting" | "ready" | "captured" | "error";

export function SelfieCapture({
  file,
  onCapture,
  preview,
}: Readonly<{
  file: File | null;
  onCapture: (file: File | null) => void;
  preview: string;
}>) {
  const [status, setStatus] = useState<SelfieStatus>(
    file ? "captured" : "idle",
  );
  const [message, setMessage] = useState(
    "Coloca el rostro dentro del óvalo y mira de frente.",
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableFramesRef = useRef(0);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return;

    stopCamera();
    setStatus("captured");
    setMessage("Selfie lista. Puedes repetirla si no quedó clara.");
    onCapture(
      new File([blob], `selfie-cliente-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
  }, [onCapture, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setStatus("starting");
    setMessage("Activando cámara frontal...");

    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setStatus("error");
      setMessage(
        "Para captura en vivo usa HTTPS. En esta prueba puedes abrir la cámara del teléfono.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          height: { ideal: 1280 },
          width: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("ready");
      setMessage("Busca buena luz y mantente dentro del óvalo.");
    } catch {
      stopCamera();
      setStatus("error");
      setMessage("No fue posible abrir la cámara frontal.");
    }
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (status !== "ready") return;
    const FaceDetector = (
      window as typeof window & { FaceDetector?: FaceDetectorConstructor }
    ).FaceDetector;

    if (!FaceDetector) {
      setMessage("Rostro en el óvalo. Toca capturar cuando esté nítido.");
      return;
    }

    const detector = new FaceDetector({
      fastMode: true,
      maxDetectedFaces: 1,
    });
    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      void detector
        .detect(video)
        .then((faces) => {
          if (faces.length === 1) {
            stableFramesRef.current += 1;
            setMessage(
              stableFramesRef.current >= 2
                ? "Rostro detectado. Capturando..."
                : "Mantente quieto un segundo.",
            );
          } else {
            stableFramesRef.current = 0;
            setMessage("Centra un solo rostro dentro del óvalo.");
          }

          if (stableFramesRef.current >= 3) {
            stableFramesRef.current = 0;
            void captureFrame();
          }
        })
        .catch(() => {
          setMessage("Rostro en el óvalo. Toca capturar cuando esté nítido.");
        });
    }, 700);

    return () => window.clearInterval(interval);
  }, [captureFrame, status]);

  function handleFallbackFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    stopCamera();
    setStatus("captured");
    setMessage("Selfie lista. Puedes repetirla si no quedó clara.");
    onCapture(selected);
  }

  function retake() {
    onCapture(null);
    setStatus("idle");
    setMessage("Coloca el rostro dentro del óvalo y mira de frente.");
  }

  return (
    <div className="selfieCapture">
      <div className="selfieViewport">
        {preview ? (
          <Image
            alt="Selfie capturada"
            fill
            sizes="(max-width: 720px) 100vw, 36vw"
            src={preview}
            unoptimized
          />
        ) : (
          <video
            aria-label="Cámara frontal para selfie del cliente"
            autoPlay
            muted
            playsInline
            ref={videoRef}
          />
        )}
        {!preview ? (
          <>
            <span className="faceOval" aria-hidden="true" />
            <div className="selfieHint" aria-live="polite">
              {message}
            </div>
          </>
        ) : (
          <span className="selfieReady">
            <CheckCircle2 aria-hidden="true" size={15} /> Lista
          </span>
        )}
      </div>

      <div className="selfieActions">
        {status === "captured" ? (
          <button className="button secondary compact" onClick={retake} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Repetir selfie
          </button>
        ) : (
          <button
            className="button compact"
            onClick={() => void startCamera()}
            type="button"
          >
            <UserRound aria-hidden="true" size={16} />
            Escanear rostro
          </button>
        )}
        {!preview && status === "ready" ? (
          <button
            className="button secondary compact"
            onClick={() => void captureFrame()}
            type="button"
          >
            <Camera aria-hidden="true" size={16} />
            Capturar
          </button>
        ) : null}
        {status !== "captured" ? (
          <button
            className="button secondary compact"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Camera aria-hidden="true" size={16} />
            Cámara del teléfono
          </button>
        ) : null}
      </div>

      <input
        accept="image/jpeg,image/png"
        capture="user"
        className="hiddenFileInput"
        onChange={handleFallbackFile}
        ref={fileInputRef}
        type="file"
      />

      <style jsx>{`
        .selfieCapture {
          display: grid;
          gap: 12px;
        }

        .selfieViewport {
          position: relative;
          aspect-ratio: 4 / 3;
          min-height: 0;
          overflow: hidden;
          background: #071813;
          border: 1px solid #d8e5df;
          border-radius: 18px;
        }

        .selfieViewport video,
        .selfieViewport :global(img) {
          display: block;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 0;
          object-fit: cover;
          object-position: center center;
        }

        .faceOval {
          position: absolute;
          top: 50%;
          left: 50%;
          width: min(58%, 270px);
          aspect-ratio: 0.72;
          border: 3px solid #f9c846;
          border-radius: 50%;
          box-shadow: 0 0 0 999px rgba(2, 17, 13, 0.52);
          transform: translate(-50%, -50%);
        }

        .selfieHint,
        .selfieReady {
          position: absolute;
          right: 14px;
          bottom: 14px;
          left: 14px;
          z-index: 2;
          width: fit-content;
          max-width: calc(100% - 28px);
          margin: auto;
          padding: 9px 13px;
          color: #fff;
          font-size: 0.82rem;
          font-weight: 750;
          text-align: center;
          background: rgba(2, 17, 13, 0.74);
          border-radius: 999px;
        }

        .selfieReady {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #087a59;
        }

        .selfieActions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .hiddenFileInput {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          clip-path: inset(50%);
        }

        @media (max-width: 640px) {
          .selfieViewport {
            aspect-ratio: 4 / 3;
            min-height: 0;
          }

          .selfieViewport video,
          .selfieViewport :global(img) {
            min-height: 0;
          }

          .faceOval {
            width: min(62%, 280px);
          }
        }
      `}</style>
    </div>
  );
}
