import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CheckCircle2, QrCode, Square, SwitchCamera, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addLog, formatTajikTime, getLogs, getStudentById, isSessionActive } from "@/lib/store";
import { toast } from "sonner";

type ScanResult = {
  status: "success" | "error";
  message: string;
  studentName?: string;
  type?: "check-in" | "check-out";
  time?: string;
};

type FacingMode = "environment" | "user";

const SCAN_COOLDOWN_MS = 2500;
const CAMERA_DELAY_MS = 120;

const createLogId = () => `LOG-${Date.now()}`;

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [manualId, setManualId] = useState("");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [result, setResult] = useState<ScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const isStartingRef = useRef(false);

  const processCode = useCallback((rawCode: string) => {
    const code = rawCode.trim();

    if (!isSessionActive()) {
      const message = 'Дарс оғоз нашудааст. Аввал "Оғози дарс"-ро пахш кунед.';
      setResult({ status: "error", message });
      toast.error("Дарс оғоз нашудааст");
      return;
    }

    if (!code.startsWith("ГДБҲ")) {
      setResult({ status: "error", message: `Формати ID нодуруст: ${code}` });
      toast.error("Формати ID нодуруст");
      return;
    }

    const student = getStudentById(code);

    if (!student) {
      setResult({ status: "error", message: `ID номаълум: ${code}` });
      toast.error(`ID номаълум: ${code}`);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const logs = getLogs();
    const latestTodayLog = logs.find(
      (log) => log.studentId === student.id && log.timestamp.startsWith(today),
    );
    const type: "check-in" | "check-out" = !latestTodayLog || latestTodayLog.type === "check-out"
      ? "check-in"
      : "check-out";

    const timestamp = new Date().toISOString();
    addLog({
      id: createLogId(),
      studentId: student.id,
      timestamp,
      type,
    });

    const attendanceLabel = type === "check-in" ? "Ҳозир" : "Баромад";
    setResult({
      status: "success",
      message: `${attendanceLabel} қайд шуд`,
      studentName: student.name,
      type,
      time: formatTajikTime(timestamp),
    });
    toast.success(`${student.name} — ${attendanceLabel}`);
  }, []);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    cooldownUntilRef.current = 0;
    setScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamRef.current) {
      return;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    const tick = () => {
      const currentVideo = videoRef.current;
      const currentCanvas = canvasRef.current;
      const currentStream = streamRef.current;

      if (!currentVideo || !currentCanvas || !currentStream) {
        return;
      }

      if (
        currentVideo.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        currentVideo.videoWidth > 0 &&
        currentVideo.videoHeight > 0
      ) {
        if (currentCanvas.width !== currentVideo.videoWidth) {
          currentCanvas.width = currentVideo.videoWidth;
        }

        if (currentCanvas.height !== currentVideo.videoHeight) {
          currentCanvas.height = currentVideo.videoHeight;
        }

        context.drawImage(currentVideo, 0, 0, currentCanvas.width, currentCanvas.height);
        const imageData = context.getImageData(0, 0, currentCanvas.width, currentCanvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (qrCode?.data && Date.now() >= cooldownUntilRef.current) {
          cooldownUntilRef.current = Date.now() + SCAN_COOLDOWN_MS;
          processCode(qrCode.data);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [processCode]);

  const requestCameraStream = useCallback(async (mode: FacingMode) => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode = facingMode) => {
    if (isStartingRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setResult({ status: "error", message: "Камера аз ҷониби ин браузер дастгирӣ намешавад." });
      toast.error("Камера дастгирӣ намешавад");
      return;
    }

    isStartingRef.current = true;
    setStarting(true);
    setResult(null);
    stopCamera();

    try {
      await new Promise((resolve) => window.setTimeout(resolve, CAMERA_DELAY_MS));

      const stream = await requestCameraStream(mode);
      const video = videoRef.current;

      if (!video) {
        throw new Error("Video element not available");
      }

      streamRef.current = stream;
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("autoplay", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("playsinline", "true");

      await video.play();

      cooldownUntilRef.current = 0;
      setFacingMode(mode);
      setScanning(true);
      scanFrame();
    } catch (error) {
      console.error("Scanner camera error:", error);
      stopCamera();
      setResult({
        status: "error",
        message: "Камера фаъол нашуд. Лутфан дубора кӯшиш кунед ё камераи дигарро интихоб намоед.",
      });
      toast.error("Камера фаъол нашуд");
    } finally {
      isStartingRef.current = false;
      setStarting(false);
    }
  }, [facingMode, requestCameraStream, scanFrame, stopCamera]);

  const switchCamera = useCallback(() => {
    const nextMode: FacingMode = facingMode === "environment" ? "user" : "environment";
    void startCamera(nextMode);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!manualId.trim()) {
      return;
    }

    processCode(manualId);
    setManualId("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Сканери QR</h2>
        <p className="text-muted-foreground">QR кодро дар пеши камера гиред</p>
      </div>

      {result && (
        <Card className={result.status === "success" ? "border-accent/30 bg-accent/10" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="flex items-center gap-3 p-4">
            {result.status === "success" ? (
              <CheckCircle2 className="h-8 w-8 shrink-0 text-accent" />
            ) : (
              <XCircle className="h-8 w-8 shrink-0 text-destructive" />
            )}
            <div>
              {result.studentName && <p className="font-semibold text-foreground">{result.studentName}</p>}
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.time && <p className="text-xs text-muted-foreground">{result.time}</p>}
              {result.type && (
                <Badge variant="secondary" className="mt-1">
                  {result.type === "check-in" ? "Ҳозир" : "Баромад"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSessionActive() && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
          <p className="font-semibold text-destructive">⚠️ Дарс оғоз нашудааст. Аввал "Оғози дарс"-ро пахш кунед.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="h-5 w-5" /> Камера
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative min-h-[320px] w-full overflow-hidden rounded-lg border border-border bg-muted">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />

            {!scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto mb-3 h-16 w-16 opacity-40" />
                  <p>Тугмаи "Оғози сканер"-ро пахш кунед</p>
                </div>
              </div>
            )}

            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-56 rounded-2xl border-2 border-primary/70 shadow-lg" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          <div className="flex gap-2">
            {!scanning ? (
              <Button onClick={() => void startCamera()} className="flex-1" size="lg" disabled={starting}>
                <QrCode className="mr-2 h-6 w-6" /> Оғози сканер
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" className="flex-1" size="lg">
                  <Square className="mr-2 h-5 w-5" /> Қатъ кардан
                </Button>
                <Button onClick={switchCamera} variant="outline" size="lg" title="Иваз кардани камера">
                  <SwitchCamera className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Дохилкунии дастӣ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="ID-ро ворид кунед (мас. ГДБҲ001)"
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              className="flex-1"
            />
            <Button type="submit">Фиристодан</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
