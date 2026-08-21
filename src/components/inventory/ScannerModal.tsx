"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, Check, Trash2, ImagePlus, Tag, Eye, Circle, Upload } from "lucide-react";
import {
  analyzeDonationPhoto,
  commitScan,
  type DetectedItem,
} from "@/app/(app)/inventory/scan-actions";

type Step = "choose" | "camera" | "analyzing" | "review" | "done" | "error";

type ReviewRow = DetectedItem & { include: boolean };

const CATEGORIES = ["Hygiene", "Clothing", "Food", "First Aid", "Other"];

export function ScannerModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [scanType, setScanType] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setCameraError("");
    setStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setCameraError(
        "Couldn't access the camera — check that this site has camera permission, or upload a photo instead."
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        handleFileSelected(file);
      },
      "image/jpeg",
      0.9
    );
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function handleFileSelected(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setStep("analyzing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await analyzeDonationPhoto(formData);
      setScanType(result.scanType);
      setRows(result.detections.map((d) => ({ ...d, include: true })));
      setStep("review");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Something went wrong analyzing that photo. Try a clearer, well-lit shot, or add items manually instead."
      );
      setStep("error");
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    const confirmedItems = rows
      .filter((r) => r.include && r.estimatedQuantity > 0)
      .map((r) => ({
        matchedItemId: r.matchedItemId,
        name: r.matchedItemName ?? r.detectedName,
        category: r.category,
        unit: "each",
        quantity: r.estimatedQuantity,
      }));

    if (confirmedItems.length === 0) {
      onClose();
      return;
    }

    await commitScan({ scanType, confirmedItems });
    setStep("done");
  }

  return (
    <div
      className="fixed inset-0 bg-ink/30 flex items-center justify-center p-4 z-50"
      onClick={
        step === "analyzing"
          ? undefined
          : () => {
              stopCamera();
              onClose();
            }
      }
    >
      <div
        className="bg-paper-raised rounded-2xl border-2 border-line w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-ink flex items-center gap-2">
            <Camera className="w-5 h-5 text-brick" />
            Scan donations
          </h2>
          {step !== "analyzing" && (
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              aria-label="Close"
              className="text-ink-soft hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {step === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={openCamera}
              className="border-2 border-dashed border-line rounded-xl py-10 flex flex-col items-center gap-2 text-ink-soft hover:border-brick hover:text-brick transition-colors"
            >
              <Camera className="w-8 h-8" />
              <span className="font-medium">Use camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-line rounded-xl py-10 flex flex-col items-center gap-2 text-ink-soft hover:border-brick hover:text-brick transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="font-medium">Upload a photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <p className="col-span-full text-xs text-ink-soft text-center mt-1">
              A single item, a stack of one thing, or a whole box or table of
              mixed donations — either works.
            </p>
          </div>
        )}

        {step === "camera" && (
          <div>
            {cameraError ? (
              <div>
                <p className="text-danger text-sm mb-4">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md bg-brick text-paper-raised px-4 py-2 text-sm font-medium hover:bg-brick-dark"
                >
                  <Upload className="w-4 h-4" />
                  Upload a photo instead
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full rounded-xl overflow-hidden bg-ink relative">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>
                <p className="text-xs text-ink-soft mt-3 mb-4 text-center">
                  Frame the item or box, then tap the shutter to capture.
                </p>
                <button
                  onClick={capturePhoto}
                  aria-label="Capture photo"
                  className="w-16 h-16 rounded-full border-4 border-brick flex items-center justify-center hover:bg-brick/10 transition-colors"
                >
                  <Circle className="w-10 h-10 text-brick" fill="currentColor" />
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-4 py-10">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Uploaded donation photo"
                className="max-h-48 rounded-lg border border-line object-contain"
              />
            )}
            <div className="flex items-center gap-2 text-ink-soft">
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking at what&apos;s in the photo…
            </div>
          </div>
        )}

        {step === "error" && (
          <div>
            <p className="text-danger text-sm mb-4">{errorMessage}</p>
            <button
              onClick={() => setStep("choose")}
              className="rounded-md bg-brick text-paper-raised px-4 py-2 text-sm font-medium hover:bg-brick-dark"
            >
              Try again
            </button>
          </div>
        )}

        {step === "review" && (
          <div>
            <p className="text-sm text-ink-soft mb-4">
              Here&apos;s what we found. Adjust anything before it&apos;s
              added to inventory — nothing is saved yet.
            </p>

            {rows.length === 0 ? (
              <p className="text-ink-soft text-sm mb-4">
                No items detected. Try a clearer photo, or add items
                manually.
              </p>
            ) : (
              <div className="space-y-3 mb-5">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className={`hang-tag ${
                      row.matchedItemId ? "hang-tag--sage" : "hang-tag--ochre"
                    } p-3 flex items-center gap-3 flex-wrap`}
                  >
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) =>
                        updateRow(index, { include: e.target.checked })
                      }
                      className="w-4 h-4"
                    />

                    <div className="flex-1 min-w-[140px]">
                      <input
                        value={row.matchedItemName ?? row.detectedName}
                        onChange={(e) =>
                          updateRow(index, { detectedName: e.target.value })
                        }
                        disabled={!!row.matchedItemId}
                        className="w-full bg-transparent font-medium text-ink disabled:opacity-70"
                      />
                      <p className="text-xs text-ink-soft flex items-center gap-1">
                        {row.matchedItemId
                          ? "Matches existing item — will add to its stock"
                          : "New item — will be created"}
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-0.5">
                        {row.countSource === "printed_label" ? (
                          <span className="flex items-center gap-1 text-sage">
                            <Tag className="w-3 h-3" />
                            Read from printed count
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-ochre">
                            <Eye className="w-3 h-3" />
                            Visual estimate — worth double-checking
                          </span>
                        )}
                      </p>
                    </div>

                    {!row.matchedItemId && (
                      <select
                        value={row.category}
                        onChange={(e) =>
                          updateRow(index, { category: e.target.value })
                        }
                        className="rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="number"
                      min={0}
                      value={row.estimatedQuantity}
                      onChange={(e) =>
                        updateRow(index, {
                          estimatedQuantity: Number(e.target.value),
                        })
                      }
                      className="w-20 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink font-mono tabular"
                    />

                    <button
                      onClick={() => removeRow(index)}
                      aria-label="Remove row"
                      className="text-ink-soft hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-line py-2 text-ink font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-md bg-brick text-paper-raised py-2 font-medium hover:bg-brick-dark transition-colors"
              >
                Add to inventory
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-full bg-sage-soft flex items-center justify-center">
              <Check className="w-6 h-6 text-sage" />
            </div>
            <p className="text-ink font-medium">Inventory updated</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-md bg-brick text-paper-raised px-4 py-2 text-sm font-medium hover:bg-brick-dark"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
