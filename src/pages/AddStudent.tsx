import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addStudent } from "@/lib/store";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { UserPlus, CheckCircle2 } from "lucide-react";
import gdbhLogo from "@/assets/gdbh-logo.png";

export default function AddStudent() {
  const [name, setName] = useState("");
  const [idNum, setIdNum] = useState("");
  const [lastAdded, setLastAdded] = useState<{ name: string; id: string } | null>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNum = idNum.trim();

    if (!trimmedName || !trimmedNum) {
      toast.error("Лутфан ном ва рақами ID-ро пур кунед");
      return;
    }

    if (!/^\d{1,3}$/.test(trimmedNum)) {
      toast.error("Рақами ID бояд аз 1 то 999 бошад (масалан: 001)");
      return;
    }

    const fullId = `ГДБҲ${trimmedNum.padStart(3, '0')}`;

    const success = addStudent({
      id: fullId,
      name: trimmedName,
      className: "",
      qrCode: fullId,
    });

    if (!success) {
      toast.error(`ID "${fullId}" аллакай вуҷуд дорад. ID бояд беткрор бошад.`);
      return;
    }

    toast.success(`${trimmedName} бо муваффақият илова шуд`);
    setLastAdded({ name: trimmedName, id: fullId });
    setName("");
    setIdNum("");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Иловаи хонанда</h2>
        <p className="text-muted-foreground">Хонандаи навро ба система илова кунед</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Маълумоти хонанда
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">Номи пурра</Label>
            <Input
              id="student-name"
              placeholder="Масалан: Ёқубҷон Шарипов"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-id">Рақами ID (бе ГДБҲ)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-primary">ГДБҲ</span>
              <Input
                id="student-id"
                placeholder="001"
                value={idNum}
                onChange={(e) => setIdNum(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="flex-1"
                maxLength={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">ID ба таври худкор бо префикси ГДБҲ сохта мешавад</p>
          </div>
          <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90" size="lg">
            <UserPlus className="mr-2 h-5 w-5" /> Сабт кардан
          </Button>
        </CardContent>
      </Card>

      {lastAdded && (
        <Card className="glass-card border-secondary/30 bg-secondary/5">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-secondary" />
            <p className="font-semibold text-foreground">{lastAdded.name} илова шуд!</p>
            <div className="relative inline-block" style={{ width: 160, height: 160 }}>
              <QRCodeSVG value={lastAdded.id} size={160} level="H" />
              <div
                className="absolute bg-card rounded-full flex items-center justify-center"
                style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 38, height: 38 }}
              >
                <img src={gdbhLogo} alt="ГДБҲ" className="rounded-full" style={{ width: 32, height: 32 }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground lowercase">
              {lastAdded.name} ({lastAdded.id})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
