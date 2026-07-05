import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CheckCircle2, QrCode, Square, SwitchCamera, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addLog, formatTajikTime, getLogs, getStudentById, isSessionActive } from "@/lib/store";
import { getSelectedSchool } from "@/lib/schools";
import { findChatIdForStudent, sendParentMessage } from "@/lib/parents";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const parentScanNotice = (name: string, time: string, type: "check-in" | "check-out") =>
  type === "check-in"
    ? `Фарзанди шумо ${name}, соати ${time} ба мактаб омад.`
    : `Фарзанди шумо ${name}, соати ${time} аз мактаб баромад.`;

type ScanResult = { status: "success" | "error"; message: string; studentName?: string; type?: "check-in" | "check-out"; time?: string };
type FacingMode = "environment" | "user";
const SCAN_COOLDOWN_MS = 5000;
const CAMERA_DELAY_MS = 120;
const createLogId = () => `LOG-${Date.now()}`;

export default function Scanner() {
  const { t } = useI18n();
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
      setResult({ status: "error", message: t("scanner.noSession") });
      toast.error(t("scanner.noSession"));
      return;
    }
    const student = getStudentById(code);
    if (!student) {
      setResult({ status: "error", message: `ID: ${code}` });
      toast.error(`ID: ${code}`);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const logs = getLogs();
    const latestTodayLog = logs.find(log => log.studentId === student.id && log.timestamp.startsWith(today));
    const type: "check-in" | "check-out" = !latestTodayLog || latestTodayLog.type === "check-out" ? "check-in" : "check-out";
    const timestamp = new Date().toISOString();
    addLog({ id: createLogId(), studentId: student.id, timestamp, type });
    const label = type === "check-in" ? t("scanner.checkin") : t("scanner.checkout");
    setResult({ status: "success", message: `${label}`, studentName: student.name, type, time: formatTajikTime(timestamp) });
    toast.success(`${student.name} — ${label}`);

    // Notify the parent via Telegram (best-effort, non-blocking).
    void (async () => {
      try {
        const chatId = await findChatIdForStudent(student.id, student.name);
        if (chatId) {
          await sendParentMessage(chatId, parentScanNotice(student.name, formatTajikTime(timestamp), type));
        }
      } catch {
        // ignore notification failures
      }
    })();
  }, [t]);


  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    const video = videoRef.current;
    if (video) { video.pause(); video.srcObject = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    cooldownUntilRef.current = 0;
    setScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const tick = () => {
      const v = videoRef.current, c = canvasRef.current, s = streamRef.current;
      if (!v || !c || !s) return;
      if (v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
        if (c.width !== v.videoWidth) c.width = v.videoWidth;
        if (c.height !== v.videoHeight) c.height = v.videoHeight;
        context.drawImage(v, 0, 0, c.width, c.height);
        const imageData = context.getImageData(0, 0, c.width, c.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
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
      return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode = facingMode) => {
    if (isStartingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setResult({ status: "error", message: t("scanner.cameraNotSupported") });
      return;
    }
    isStartingRef.current = true;
    setStarting(true);
    setResult(null);
    stopCamera();
    try {
      await new Promise(resolve => window.setTimeout(resolve, CAMERA_DELAY_MS));
      const stream = await requestCameraStream(mode);
      const video = videoRef.current;
      if (!video) throw new Error("No video element");
      streamRef.current = stream;
      video.srcObject = stream;
      video.autoplay = true; video.muted = true; video.playsInline = true;
      await video.play();
      cooldownUntilRef.current = 0;
      setFacingMode(mode);
      setScanning(true);
      scanFrame();
    } catch {
      stopCamera();
      setResult({ status: "error", message: t("scanner.cameraFailed") });
    } finally {
      isStartingRef.current = false;
      setStarting(false);
    }
  }, [facingMode, requestCameraStream, scanFrame, stopCamera, t]);

  const switchCamera = useCallback(() => {
    void startCamera(facingMode === "environment" ? "user" : "environment");
  }, [facingMode, startCamera]);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    processCode(manualId);
    setManualId("");
  };

  const todayIso = new Date().toISOString().split("T")[0];
  const isRestToday = (getSelectedSchool().restDays || []).includes(todayIso);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{t("scanner.title")}</h2>
        <p className="text-muted-foreground">{t("scanner.subtitle")}</p>
      </div>

      {isRestToday && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 text-center">
          <p className="font-semibold text-amber-900 dark:text-amber-200">🌴 {t("school.todayRest")}</p>
        </div>
      )}

      {result && (
        <Card className={result.status === "success" ? "border-accent/30 bg-accent/10" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="flex items-center gap-3 p-4">
            {result.status === "success" ? <CheckCircle2 className="h-8 w-8 shrink-0 text-accent" /> : <XCircle className="h-8 w-8 shrink-0 text-destructive" />}
            <div>
              {result.studentName && <p className="font-semibold text-foreground">{result.studentName}</p>}
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.time && <p className="text-xs text-muted-foreground">{result.time}</p>}
              {result.type && <Badge variant="secondary" className="mt-1">{result.type === "check-in" ? t("scanner.checkin") : t("scanner.checkout")}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSessionActive() && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
          <p className="font-semibold text-destructive">⚠️ {t("scanner.noSession")}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Camera className="h-5 w-5" /> {t("scanner.camera")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative min-h-[320px] w-full overflow-hidden rounded-lg border border-border bg-muted">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
            {!scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto mb-3 h-16 w-16 opacity-40" />
                  <p>{t("scanner.pressStart")}</p>
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
              <Button onClick={() => void startCamera()} className="flex-1 transition-transform active:scale-95" size="lg" disabled={starting}>
                <QrCode className="mr-2 h-6 w-6" /> {t("scanner.start")}
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" className="flex-1 transition-transform active:scale-95" size="lg">
                  <Square className="mr-2 h-5 w-5" /> {t("scanner.stop")}
                </Button>
                <Button onClick={switchCamera} variant="outline" size="lg" className="transition-transform active:scale-95">
                  <SwitchCamera className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t("scanner.manual")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input placeholder={t("scanner.manualPlaceholder")} value={manualId} onChange={e => setManualId(e.target.value)} className="flex-1" />
            <Button type="submit" className="transition-transform active:scale-95">{t("scanner.submit")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
