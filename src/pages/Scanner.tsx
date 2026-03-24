import { useState, useRef, useCallback, useEffect } from "react";
import { QrCode, CheckCircle2, XCircle, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStudentById, addLog, getLogs, isSessionActive } from "@/lib/store";
import { toast } from "@/components/ui/sonner";

type ScanResult = {
  status: 'success' | 'error';
  message: string;
  studentName?: string;
  type?: 'check-in' | 'check-out';
};

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef<any>(null);

  const processCode = useCallback((code: string) => {
    if (!isSessionActive()) {
      setResult({ status: 'error', message: 'Дарс оғоз нашудааст. Аввал аз панели идоракунӣ "Оғози дарс"-ро пахш кунед.' });
      toast.error('Дарс оғоз нашудааст!');
      return;
    }

    const student = getStudentById(code.trim());
    if (!student) {
      setResult({ status: 'error', message: `ID-и хонанда номаълум: ${code}` });
      toast.error(`ID-и хонанда номаълум: ${code}`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const logs = getLogs();
    const todayLogs = logs.filter(l => l.studentId === student.id && l.timestamp.startsWith(today));
    const lastLog = todayLogs[0];
    const type: 'check-in' | 'check-out' = !lastLog || lastLog.type === 'check-out' ? 'check-in' : 'check-out';

    addLog({
      id: `LOG-${Date.now()}`,
      studentId: student.id,
      type,
      timestamp: new Date().toISOString(),
    });

    const msg = type === 'check-in' ? 'Бақайдгирӣ' : 'Баромад';
    setResult({
      status: 'success',
      message: `${msg} бомуваффақият анҷом ёфт`,
      studentName: student.name,
      type,
    });
    toast.success(`${student.name} — ${msg}`);
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Clean up any previous instance
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("qr-reader-container", { verbose: false });
      scannerRef.current = scanner;

      // Try to get back camera first
      let cameraId: string | undefined;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Prefer back/environment camera
          const backCam = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          cameraId = backCam?.id || devices[devices.length - 1].id;
        }
      } catch {}

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      if (cameraId) {
        await scanner.start(cameraId, config, (decodedText) => {
          processCode(decodedText);
          scanner.pause();
          setTimeout(() => { try { scanner.resume(); } catch {} }, 2500);
        }, () => {});
      } else {
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            processCode(decodedText);
            scanner.pause();
            setTimeout(() => { try { scanner.resume(); } catch {} }, 2500);
          },
          () => {}
        );
      }

      setScanning(true);
    } catch (err: any) {
      console.error("Scanner start error:", err);
      setResult({
        status: 'error',
        message: 'Дастрасӣ ба камера рад шуд. Лутфан иҷозатро дар танзимоти браузер диҳед ё дохилкунии дастӣ истифода баред.'
      });
      toast.error('Камера дастнорас аст');
    }
  }, [processCode]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

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
        <p className="text-muted-foreground">Лутфан QR кодро дар пеши камера гиред</p>
      </div>

      {/* Result feedback */}
      {result && (
        <Card className={result.status === 'success' ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'}>
          <CardContent className="p-4 flex items-center gap-3">
            {result.status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
            )}
            <div>
              {result.studentName && <p className="font-semibold text-foreground">{result.studentName}</p>}
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.type && (
                <Badge variant="secondary" className="mt-1">
                  {result.type === 'check-in' ? 'Бақайдгирӣ' : 'Баромад'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session warning */}
      {!isSessionActive() && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-destructive font-semibold">⚠️ Дарс оғоз нашудааст. Аввал аз панели идоракунӣ "Оғози дарс"-ро пахш кунед.</p>
        </div>
      )}

      {/* Camera scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="h-5 w-5" /> Сканери камера
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader-container"
            className="w-full rounded-lg overflow-hidden bg-muted"
            style={{ minHeight: scanning ? 300 : 0, display: scanning ? 'block' : 'none' }}
          />
          {!scanning ? (
            <Button onClick={startScanner} className="w-full" size="lg">
              <QrCode className="mr-2 h-5 w-5" /> Оғоз кардани сканер
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="secondary" className="w-full" size="lg">
              Қатъ кардани сканер
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Дохилкунии дастӣ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="ID-и хонандаро ворид кунед (мас. STU0001)"
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
