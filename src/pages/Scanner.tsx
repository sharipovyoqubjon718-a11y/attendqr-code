import { useState, useRef, useCallback, useEffect } from "react";
import { QrCode, CheckCircle2, XCircle, Camera, SwitchCamera, Square } from "lucide-react";
import jsQR from "jsqr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStudentById, addLog, getLogs, isSessionActive, formatTajikTime } from "@/lib/store";
import { toast } from "sonner";

type ScanResult = {
  status: 'success' | 'error';
  message: string;
  studentName?: string;
  type?: 'check-in' | 'check-out';
  time?: string;
};

const SCAN_COOLDOWN_MS = 2500;

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualId, setManualId] = useState("");
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const startingRef = useRef(false);

  const processCode = useCallback((code: string) => {
    if (!isSessionActive()) {
      setResult({ status: 'error', message: 'Дарс оғоз нашудааст. Аввал "Оғози дарс"-ро пахш кунед.' });
      toast.error('Дарс оғоз нашудааст!');
      return;
    }
    const trimmed = code.trim();
    if (!trimmed.startsWith('ГДБҲ')) {
      setResult({ status: 'error', message: `Формати ID нодуруст: ${trimmed}` });
      toast.error('Формати ID нодуруст!');
      return;
    }
    const student = getStudentById(trimmed);
    if (!student) {
      setResult({ status: 'error', message: `ID номаълум: ${trimmed}` });
      toast.error(`ID номаълум: ${trimmed}`);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const logs = getLogs();
    const todayLogs = logs.filter(l => l.studentId === student.id && l.timestamp.startsWith(today));
    const lastLog = todayLogs[0];
    const type: 'check-in' | 'check-out' = !lastLog || lastLog.type === 'check-out' ? 'check-in' : 'check-out';
    const now = new Date().toISOString();
    addLog({ id: `LOG-${Date.now()}`, studentId: student.id, type, timestamp: now });
    const msg = type === 'check-in' ? 'Ҳозир' : 'Баромад';
    setResult({ status: 'success', message: `${msg} қайд шуд`, studentName: student.name, type, time: formatTajikTime(now) });
    toast.success(`${student.name} — ${msg}`);
  }, []);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    cooldownUntilRef.current = 0;
    setScanning(false);
  }, []);

  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const scan = () => {
      if (!streamRef.current || !videoRef.current || !canvasRef.current) return;

      const activeTrack = streamRef.current.getVideoTracks()[0];
      if (!activeTrack || activeTrack.readyState !== 'live') return;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (qrCode?.data && Date.now() >= cooldownUntilRef.current) {
          cooldownUntilRef.current = Date.now() + SCAN_COOLDOWN_MS;
          processCode(qrCode.data);
        }
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  }, [processCode]);

  const requestStream = useCallback(async (mode: 'environment' | 'user') => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (primaryError) {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    if (startingRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setResult({ status: 'error', message: 'Камера аз ҷониби ин браузер дастгирӣ намешавад.' });
      toast.error('Камера дастгирӣ намешавад');
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setResult(null);
    stopCamera();

    try {
      await new Promise(resolve => window.setTimeout(resolve, 150));

      const stream = await requestStream(mode);
      const video = videoRef.current;

      if (!video) throw new Error('Video element not ready');

      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');

      await video.play();

      cooldownUntilRef.current = 0;
      setScanning(true);
      setFacingMode(mode);
      startScanLoop();
    } catch (err: any) {
      console.error("Camera error:", err);
      stopCamera();
      setResult({ status: 'error', message: 'Камера фаъол нашуд. Барнома ё камераи дигарро пӯшед ва дубора кӯшиш кунед.' });
      toast.error('Камера фаъол нашуд');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [facingMode, requestStream, startScanLoop, stopCamera]);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    void startCamera(newMode);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      processCode(manualId.trim());
      setManualId("");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Сканери QR</h2>
        <p className="text-muted-foreground">QR кодро дар пеши камера гиред</p>
      </div>

      {result && (
        <Card className={result.status === 'success' ? 'border-accent/30 bg-accent/10' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="p-4 flex items-center gap-3">
            {result.status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-accent shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
            )}
            <div>
              {result.studentName && <p className="font-semibold text-foreground">{result.studentName}</p>}
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.time && <p className="text-xs text-muted-foreground">{result.time}</p>}
              {result.type && (
                <Badge variant="secondary" className="mt-1">
                  {result.type === 'check-in' ? 'Ҳозир' : 'Баромад'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSessionActive() && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-destructive font-semibold">⚠️ Дарс оғоз нашудааст. Аввал "Оғози дарс"-ро пахш кунед.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="h-5 w-5" /> Камера
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-lg border bg-muted" style={{ minHeight: 320 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover absolute inset-0"
            />

            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm" style={{ minHeight: 320 }}>
                <div className="text-center text-muted-foreground">
                  <Camera className="h-16 w-16 mx-auto mb-3 opacity-40" />
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
              onChange={(e) => setManualId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Фиристодан</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
