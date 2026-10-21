"use client";
import { useEffect, useState, type RefObject } from "react";

export type CameraStatus = "starting" | "on" | "denied" | "unavailable";

/** Starts the rear camera into a <video>; stops it on unmount. */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, enabled = true) {
  const [status, setStatus] = useState<CameraStatus>("starting");

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus("on");
      } catch (err) {
        const name = (err as DOMException)?.name;
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    }
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [videoRef, enabled]);

  return status;
}

export const CAMERA_MESSAGES: Record<Exclude<CameraStatus, "on" | "starting">, string> = {
  denied: "اجازه‌ی دوربین داده نشده. از تنظیمات مرورگر اجازه بده، یا از گالری عکس انتخاب کن.",
  unavailable: "دوربین در دسترس نیست (برای دوربین زنده HTTPS لازمه). از گالری عکس انتخاب کن.",
};
