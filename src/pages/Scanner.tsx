import { useState, useRef, useCallback, useEffect } from "react";
import { QrCode, CheckCircle2, XCircle, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStudentById, addLog, getLogs } from "@/lib/store";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const processCode = useCallback((code: string) => {
    const student = getStudentById(code.trim());
    if (!student) {
      setResult({ status: 'error', message: `Unknown student ID: ${code}` });
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

    setResult({
      status: 'success',
      message: `${type === 'check-in' ? 'Checked in' : 'Checked out'} successfully`,
      studentName: student.name,
      type,
    });
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          processCode(decodedText);
          scanner.pause();
          setTimeout(() => {
            try { scanner.resume(); } catch {}
          }, 2000);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setResult({ status: 'error', message: 'Camera access denied or not available. Use manual entry.' });
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
    return () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} } };
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
        <h2 className="font-display text-2xl font-bold text-foreground">QR Scanner</h2>
        <p className="text-muted-foreground">Scan student QR codes for check-in/out</p>
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
              {result.type && <Badge variant="secondary" className="mt-1">{result.type}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="h-5 w-5" /> Camera Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={containerRef}
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden bg-muted"
            style={{ minHeight: scanning ? 300 : 0, display: scanning ? 'block' : 'none' }}
          />
          {!scanning ? (
            <Button onClick={startScanner} className="w-full" size="lg">
              <QrCode className="mr-2 h-5 w-5" /> Start Camera Scanner
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="secondary" className="w-full" size="lg">
              Stop Scanner
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Enter Student ID (e.g. STU0001)"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Submit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
