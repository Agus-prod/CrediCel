"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type IdentityScannerSide = "front" | "back";

export type IdentityScannerFiles = Readonly<{
  front: File | null;
  back: File | null;
}>;

export type CompletedIdentityScannerFiles = Readonly<{
  front: File;
  back: File;
}>;

export type IdentityCameraScannerProps = Readonly<{
  /** Controls whether the full-screen scanner is visible. */
  open: boolean;
  /** Existing captures to show when the scanner is reopened. */
  initialFiles?: Partial<IdentityScannerFiles>;
  /** Side shown first. Defaults to the front of the identity card. */
  initialSide?: IdentityScannerSide;
  /** Fired each time the user accepts a front or back capture. */
  onCapture: (side: IdentityScannerSide, file: File) => void;
  /** Fired when both accepted files are available. */
  onComplete?: (files: CompletedIdentityScannerFiles) => void;
  /** Fired from the close button, Escape key, or final action. */
  onClose: () => void;
}>;

type CameraStatus = "idle" | "starting" | "ready" | "error";

const EMPTY_FILES: IdentityScannerFiles = { front: null, back: null };
const CARD_ASPECT_RATIO = 85.6 / 53.98;

function sideLabel(side: IdentityScannerSide): string {
  return side === "front" ? "frente" : "reverso";
}

function cameraErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return "En esta conexión de prueba usaremos la cámara del teléfono. Toca el botón y encuadra la identidad completa.";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "No se autorizó la cámara. Permite el acceso o usa la cámara del teléfono.";
    }
    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return "No encontramos una cámara disponible en este dispositivo.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "La cámara está siendo usada por otra aplicación. Ciérrala e intenta nuevamente.";
    }
  }

  return "No fue posible iniciar la cámara. Puedes tomar la foto con la cámara del teléfono.";
}

function useObjectUrl(file: File | null): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

export function IdentityCameraScanner({
  initialFiles,
  initialSide = "front",
  onCapture,
  onClose,
  onComplete,
  open,
}: IdentityCameraScannerProps) {
  const [side, setSide] = useState<IdentityScannerSide>(initialSide);
  const [files, setFiles] = useState<IdentityScannerFiles>(EMPTY_FILES);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wasOpenRef = useRef(false);

  const pendingPreview = useObjectUrl(pendingFile);
  const frontPreview = useObjectUrl(files.front);
  const backPreview = useObjectUrl(files.back);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage("");
    setCameraStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setCameraStatus("error");
      setErrorMessage(cameraErrorMessage(null));
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (error) {
        if (
          !(error instanceof DOMException) ||
          error.name !== "OverconstrainedError"
        ) {
          throw error;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setCameraStatus("ready");
    } catch (error) {
      stopCamera();
      setCameraStatus("error");
      setErrorMessage(cameraErrorMessage(error));
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      stopCamera();
      return;
    }

    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setFiles({
      front: initialFiles?.front ?? null,
      back: initialFiles?.back ?? null,
    });
    setSide(initialSide);
    setPendingFile(null);
    setCompleted(false);
    closeButtonRef.current?.focus();
  }, [initialFiles?.back, initialFiles?.front, initialSide, open, stopCamera]);

  useEffect(() => {
    if (!open || pendingFile || completed) return;
    void startCamera();
    return stopCamera;
  }, [completed, open, pendingFile, side, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const guide = guideRef.current;
    if (
      !video ||
      !guide ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      setErrorMessage(
        "La cámara todavía se está preparando. Intenta de nuevo.",
      );
      return;
    }

    const videoRect = video.getBoundingClientRect();
    const guideRect = guide.getBoundingClientRect();
    const scale = Math.max(
      videoRect.width / video.videoWidth,
      videoRect.height / video.videoHeight,
    );
    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;
    const hiddenX = (renderedWidth - videoRect.width) / 2;
    const hiddenY = (renderedHeight - videoRect.height) / 2;

    const sourceX = Math.max(
      0,
      (guideRect.left - videoRect.left + hiddenX) / scale,
    );
    const sourceY = Math.max(
      0,
      (guideRect.top - videoRect.top + hiddenY) / scale,
    );
    const sourceWidth = Math.min(
      guideRect.width / scale,
      video.videoWidth - sourceX,
    );
    const sourceHeight = Math.min(
      guideRect.height / scale,
      video.videoHeight - sourceY,
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));
    const context = canvas.getContext("2d");
    if (!context) {
      setErrorMessage(
        "No fue posible procesar la fotografía. Intenta nuevamente.",
      );
      return;
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setErrorMessage(
        "No fue posible guardar la fotografía. Intenta nuevamente.",
      );
      return;
    }

    stopCamera();
    setPendingFile(
      new File([blob], `identidad-${sideLabel(side)}-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
  }, [side, stopCamera]);

  const acceptPhoto = useCallback(() => {
    if (!pendingFile) return;

    const nextFiles: IdentityScannerFiles = { ...files, [side]: pendingFile };
    setFiles(nextFiles);
    onCapture(side, pendingFile);
    setPendingFile(null);

    if (nextFiles.front && nextFiles.back) {
      setCompleted(true);
      stopCamera();
      onComplete?.({ front: nextFiles.front, back: nextFiles.back });
      return;
    }

    if (side === "front") {
      setSide("back");
    }
  }, [files, onCapture, onComplete, pendingFile, side, stopCamera]);

  const repeatPhoto = useCallback(() => {
    setPendingFile(null);
    setErrorMessage("");
  }, []);

  const handleFallbackFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setErrorMessage(
          "Selecciona una fotografía en formato JPG, PNG o WebP.",
        );
        return;
      }
      stopCamera();
      setErrorMessage("");
      setPendingFile(file);
    },
    [stopCamera],
  );

  const retake = useCallback((nextSide: IdentityScannerSide) => {
    setCompleted(false);
    setSide(nextSide);
    setPendingFile(null);
    setErrorMessage("");
  }, []);

  const finish = useCallback(() => {
    onClose();
  }, [onClose]);

  const instruction = useMemo(
    () =>
      side === "front"
        ? "Alinea el frente dentro del marco"
        : "Ahora alinea el reverso dentro del marco",
    [side],
  );
  const canRetryLiveCamera =
    typeof window !== "undefined" && window.isSecureContext;

  if (!open) return null;

  return createPortal(
    <div className="identityScannerBackdrop">
      <section
        aria-describedby="identity-scanner-help"
        aria-labelledby="identity-scanner-title"
        aria-modal="true"
        className="identityScanner"
        role="dialog"
      >
        <header className="scannerHeader">
          <div className="scannerHeading">
            <span className="scannerBrandIcon" aria-hidden="true">
              <ScanLine size={21} strokeWidth={2.4} />
            </span>
            <div>
              <p className="scannerEyebrow">Captura de identidad</p>
              <h2 id="identity-scanner-title">
                {completed
                  ? "Identidad capturada"
                  : `Escanea el ${sideLabel(side)}`}
              </h2>
            </div>
          </div>
          <button
            aria-label="Cerrar escáner"
            className="scannerIconButton"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </header>

        <div className="scannerProgress" aria-label="Progreso de captura">
          <span
            className={
              files.front ? "complete" : side === "front" ? "active" : ""
            }
          >
            {files.front ? <Check size={14} /> : "1"} Frente
          </span>
          <i aria-hidden="true" />
          <span
            className={
              files.back ? "complete" : side === "back" ? "active" : ""
            }
          >
            {files.back ? <Check size={14} /> : "2"} Reverso
          </span>
        </div>

        {completed ? (
          <div className="completionView">
            <div className="completionSeal" aria-hidden="true">
              <ShieldCheck size={34} />
            </div>
            <h3>Las dos imágenes están listas</h3>
            <p>Revisa que los datos se lean con claridad antes de continuar.</p>

            <div className="capturedCards">
              <CapturePreview
                label="Frente"
                onRetake={() => retake("front")}
                preview={frontPreview}
              />
              <CapturePreview
                label="Reverso"
                onRetake={() => retake("back")}
                preview={backPreview}
              />
            </div>

            <button
              className="primaryAction finishAction"
              onClick={finish}
              type="button"
            >
              <Check aria-hidden="true" size={20} />
              Usar estas imágenes
            </button>
          </div>
        ) : (
          <>
            <div className="cameraViewport">
              {pendingPreview ? (
                // A temporary object URL is required here because the image is a local File.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Vista previa del ${sideLabel(side)}`}
                  src={pendingPreview}
                />
              ) : (
                <video
                  aria-label={`Cámara para capturar el ${sideLabel(side)} de la identidad`}
                  autoPlay
                  muted
                  playsInline
                  ref={videoRef}
                />
              )}

              {!pendingPreview && cameraStatus !== "error" ? (
                <>
                  <div className="cardGuide" ref={guideRef}>
                    <span className="corner topLeft" />
                    <span className="corner topRight" />
                    <span className="corner bottomLeft" />
                    <span className="corner bottomRight" />
                    {cameraStatus === "ready" ? (
                      <i className="scanBeam" />
                    ) : null}
                  </div>
                  <div className="liveInstruction" aria-live="polite">
                    {cameraStatus === "starting"
                      ? "Activando cámara…"
                      : instruction}
                  </div>
                </>
              ) : null}

              {cameraStatus === "error" && !pendingPreview ? (
                <div className="cameraFallback" role="status">
                  <span aria-hidden="true">
                    <Camera size={34} />
                  </span>
                  <h3>Abre la cámara del teléfono</h3>
                  <p>{errorMessage}</p>
                  <button
                    className="primaryAction"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Camera aria-hidden="true" size={20} />
                    Tomar foto
                  </button>
                  {canRetryLiveCamera ? (
                    <button
                      className="textAction"
                      onClick={() => void startCamera()}
                      type="button"
                    >
                      Intentar cámara en vivo
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="scannerHelp" id="identity-scanner-help">
              {pendingPreview
                ? "Confirma que la identidad esté completa, enfocada y sin reflejos."
                : "Coloca la identidad sobre una superficie plana y mantén el teléfono estable."}
            </p>

            {errorMessage && cameraStatus !== "error" ? (
              <p className="inlineError" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {pendingPreview || cameraStatus !== "error" ? (
              <div className="scannerActions">
                {pendingPreview ? (
                  <>
                    <button
                      className="secondaryAction"
                      onClick={repeatPhoto}
                      type="button"
                    >
                      <RefreshCw aria-hidden="true" size={19} />
                      Repetir
                    </button>
                    <button
                      className="primaryAction"
                      onClick={acceptPhoto}
                      type="button"
                    >
                      <Check aria-hidden="true" size={20} />
                      Usar foto
                    </button>
                  </>
                ) : (
                  <>
                    {side === "back" ? (
                      <button
                        className="secondaryAction"
                        onClick={() => retake("front")}
                        type="button"
                      >
                        <ArrowLeft aria-hidden="true" size={19} />
                        Volver
                      </button>
                    ) : (
                      <button
                        className="secondaryAction uploadAction"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <ImagePlus aria-hidden="true" size={19} />
                        Galería
                      </button>
                    )}
                    <button
                      aria-label={`Capturar ${sideLabel(side)} de la identidad`}
                      className="shutterButton"
                      disabled={cameraStatus !== "ready"}
                      onClick={() => void captureFrame()}
                      type="button"
                    >
                      <span aria-hidden="true" />
                    </button>
                    <button
                      className="secondaryAction mobileCameraAction"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Camera aria-hidden="true" size={19} />
                      Cámara
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}

        <input
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Tomar o seleccionar foto del ${sideLabel(side)} de la identidad`}
          capture="environment"
          className="hiddenFileInput"
          onChange={handleFallbackFile}
          ref={fileInputRef}
          type="file"
        />
      </section>

      <style jsx>{`
        .identityScannerBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(3, 20, 16, 0.78);
          backdrop-filter: blur(12px);
        }

        .identityScanner {
          width: min(100%, 860px);
          max-height: min(940px, calc(100dvh - 40px));
          overflow: auto;
          color: #12251f;
          background: #f5faf8;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
        }

        .scannerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px 12px;
        }

        .scannerHeading {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .scannerBrandIcon {
          display: grid;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          place-items: center;
          color: #fff;
          background: #087a59;
          border-radius: 13px;
        }

        .scannerEyebrow {
          margin: 0 0 2px;
          color: #087a59;
          font-size: 0.69rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .scannerHeader h2 {
          margin: 0;
          overflow: hidden;
          font-size: clamp(1.1rem, 3vw, 1.4rem);
          font-weight: 750;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .scannerIconButton {
          display: grid;
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          place-items: center;
          color: #36534a;
          background: #e6f0ec;
          border: 0;
          border-radius: 50%;
          cursor: pointer;
        }

        .scannerProgress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px 14px;
          color: #70847d;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .scannerProgress span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 28px;
          padding: 4px 10px;
          background: #e9f1ee;
          border-radius: 999px;
        }

        .scannerProgress span.active {
          color: #075f47;
          background: #d5eee5;
          box-shadow: inset 0 0 0 1px rgba(8, 122, 89, 0.14);
        }

        .scannerProgress span.complete {
          color: #fff;
          background: #087a59;
        }

        .scannerProgress i {
          width: min(12vw, 70px);
          height: 2px;
          background: #d4e0dc;
        }

        .cameraViewport {
          position: relative;
          width: 100%;
          height: min(58vh, 535px);
          min-height: 360px;
          overflow: hidden;
          background: #071813;
        }

        .cameraViewport video,
        .cameraViewport > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cameraViewport > img {
          object-fit: contain;
          background: #071813;
        }

        .cardGuide {
          position: absolute;
          top: 50%;
          left: 50%;
          width: min(82%, 610px);
          aspect-ratio: ${CARD_ASPECT_RATIO} / 1;
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 18px;
          box-shadow: 0 0 0 9999px rgba(2, 17, 13, 0.54);
          transform: translate(-50%, -50%);
        }

        .corner {
          position: absolute;
          width: 38px;
          height: 38px;
          border-color: #f9c846;
          border-style: solid;
        }

        .topLeft {
          top: -3px;
          left: -3px;
          border-width: 4px 0 0 4px;
          border-radius: 18px 0 0;
        }

        .topRight {
          top: -3px;
          right: -3px;
          border-width: 4px 4px 0 0;
          border-radius: 0 18px 0 0;
        }

        .bottomLeft {
          bottom: -3px;
          left: -3px;
          border-width: 0 0 4px 4px;
          border-radius: 0 0 0 18px;
        }

        .bottomRight {
          right: -3px;
          bottom: -3px;
          border-width: 0 4px 4px 0;
          border-radius: 0 0 18px;
        }

        .scanBeam {
          position: absolute;
          right: 4%;
          left: 4%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #f9c846, transparent);
          box-shadow: 0 0 14px rgba(249, 200, 70, 0.8);
          animation: scan 2.4s ease-in-out infinite;
        }

        .liveInstruction {
          position: absolute;
          right: 16px;
          bottom: 18px;
          left: 16px;
          z-index: 2;
          width: fit-content;
          max-width: calc(100% - 32px);
          margin: auto;
          padding: 9px 14px;
          color: #fff;
          font-size: 0.86rem;
          font-weight: 700;
          text-align: center;
          background: rgba(2, 17, 13, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          backdrop-filter: blur(8px);
        }

        .cameraFallback {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px;
          color: #fff;
          text-align: center;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(23, 126, 91, 0.34),
              transparent 45%
            ),
            #071813;
        }

        .cameraFallback > span {
          display: grid;
          width: 66px;
          height: 66px;
          margin-bottom: 14px;
          place-items: center;
          color: #f9c846;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 22px;
        }

        .cameraFallback h3,
        .completionView h3 {
          margin: 0 0 7px;
          font-size: 1.2rem;
        }

        .cameraFallback p,
        .completionView > p {
          max-width: 470px;
          margin: 0 0 20px;
          color: #c4d2cd;
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .scannerHelp {
          margin: 0;
          padding: 13px 22px 3px;
          color: #5e736b;
          font-size: 0.82rem;
          line-height: 1.45;
          text-align: center;
        }

        .inlineError {
          margin: 8px 22px 0;
          padding: 9px 12px;
          color: #952f2f;
          font-size: 0.82rem;
          background: #fff0ef;
          border-radius: 10px;
        }

        .scannerActions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          min-height: 96px;
          padding: 14px 22px 20px;
        }

        .primaryAction,
        .secondaryAction,
        .textAction {
          display: inline-flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 750;
          border: 0;
          border-radius: 13px;
          cursor: pointer;
        }

        .primaryAction {
          color: #fff;
          background: #087a59;
          box-shadow: 0 9px 22px rgba(8, 122, 89, 0.24);
        }

        .secondaryAction {
          justify-self: stretch;
          color: #21463b;
          background: #e5efeb;
        }

        .textAction {
          min-height: 40px;
          margin-top: 6px;
          padding-inline: 10px;
          color: #cfe7df;
          background: transparent;
        }

        .shutterButton {
          display: grid;
          width: 68px;
          height: 68px;
          padding: 5px;
          place-items: center;
          background: transparent;
          border: 3px solid #087a59;
          border-radius: 50%;
          cursor: pointer;
        }

        .shutterButton span {
          width: 50px;
          height: 50px;
          background: #087a59;
          border-radius: 50%;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.48);
        }

        .shutterButton:disabled {
          border-color: #9eaea8;
          cursor: wait;
          opacity: 0.56;
        }

        .shutterButton:disabled span {
          background: #9eaea8;
        }

        .mobileCameraAction {
          justify-self: stretch;
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

        .completionView {
          display: flex;
          min-height: min(70vh, 650px);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 34px 24px;
          text-align: center;
        }

        .completionSeal {
          display: grid;
          width: 70px;
          height: 70px;
          margin-bottom: 16px;
          place-items: center;
          color: #087a59;
          background: #dcefe8;
          border-radius: 24px;
        }

        .completionView > p {
          color: #5e736b;
        }

        .capturedCards {
          display: grid;
          width: min(100%, 650px);
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin: 6px 0 22px;
        }

        .finishAction {
          width: min(100%, 330px);
        }

        button:focus-visible {
          outline: 3px solid #f9c846;
          outline-offset: 3px;
        }

        @keyframes scan {
          0%,
          100% {
            top: 8%;
            opacity: 0.4;
          }
          50% {
            top: calc(92% - 2px);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .identityScannerBackdrop {
            display: block;
            padding: 0;
            background: #071813;
          }

          .identityScanner {
            width: 100%;
            height: 100dvh;
            max-height: none;
            border: 0;
            border-radius: 0;
          }

          .scannerHeader {
            padding-top: max(14px, env(safe-area-inset-top));
          }

          .cameraViewport {
            height: min(56dvh, 520px);
            min-height: 330px;
          }

          .cardGuide {
            width: 88%;
            border-radius: 14px;
          }

          .scannerActions {
            padding-bottom: max(18px, env(safe-area-inset-bottom));
          }

          .capturedCards {
            grid-template-columns: 1fr;
          }

          .completionView {
            min-height: calc(100dvh - 126px);
            justify-content: flex-start;
            padding-top: 28px;
          }
        }

        @media (max-width: 390px) {
          .scannerHeader {
            padding-inline: 16px;
          }

          .scannerProgress {
            padding-inline: 16px;
          }

          .scannerActions {
            gap: 9px;
            padding-inline: 14px;
          }

          .secondaryAction {
            padding-inline: 10px;
            font-size: 0.78rem;
          }

          .shutterButton {
            width: 62px;
            height: 62px;
          }

          .shutterButton span {
            width: 44px;
            height: 44px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scanBeam {
            animation: none;
            top: 50%;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function CapturePreview({
  label,
  onRetake,
  preview,
}: Readonly<{
  label: string;
  onRetake: () => void;
  preview: string;
}>) {
  return (
    <article className="capturePreview">
      <div>
        {/* A temporary object URL is required here because the image is a local File. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={`${label} de la identidad capturado`} src={preview} />
        <span>
          <Check aria-hidden="true" size={14} /> Listo
        </span>
      </div>
      <footer>
        <strong>{label}</strong>
        <button onClick={onRetake} type="button">
          <RefreshCw aria-hidden="true" size={15} /> Repetir
        </button>
      </footer>

      <style jsx>{`
        .capturePreview {
          overflow: hidden;
          text-align: left;
          background: #fff;
          border: 1px solid #d8e5e0;
          border-radius: 16px;
          box-shadow: 0 8px 26px rgba(14, 48, 37, 0.08);
        }

        .capturePreview > div {
          position: relative;
          aspect-ratio: ${CARD_ASPECT_RATIO} / 1;
          overflow: hidden;
          background: #10201b;
        }

        img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        span {
          position: absolute;
          top: 9px;
          right: 9px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 800;
          background: #087a59;
          border-radius: 999px;
        }

        footer {
          display: flex;
          min-height: 50px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 12px;
        }

        strong {
          font-size: 0.85rem;
        }

        button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          gap: 5px;
          padding: 0 9px;
          color: #087a59;
          font: inherit;
          font-size: 0.76rem;
          font-weight: 800;
          background: #e7f2ee;
          border: 0;
          border-radius: 9px;
          cursor: pointer;
        }

        button:focus-visible {
          outline: 3px solid #f9c846;
          outline-offset: 2px;
        }
      `}</style>
    </article>
  );
}
