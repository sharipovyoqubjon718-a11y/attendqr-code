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
  const [id, setId] = useState("");
  const [lastAdded, setLastAdded] = useState<{ name: string; id: string } | null>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedId = id.trim();

    if (!trimmedName || !trimmedId) {
      toast.error("Лутфан ном ва ID-ро пур кунед");
      return;
    }

    if (trimmedId.length > 20) {
      toast.error("ID бояд аз 20 аломат кӯтоҳтар бошад");
      return;
    }

    const success = addStudent({
      id: trimmedId,
      name: trimmedName,
      className: "",
      qrCode: trimmedId,
    });

    if (!success) {
      toast.error(`ID "${trimmedId}" аллакай вуҷуд дорад. ID бояд беткрор бошад.`);
      return;
    }

    toast.success(`${trimmedName} бо муваффақият илова шуд`);
    setLastAdded({ name: trimmedName, id: trimmedId });
    setName("");
    setId("");
  };

  const renderQRWithLogo = (value: string) => (
    <div className="relative inline-block" style={{ width: 160, height: 160 }}>
      <QRCodeSVG value={value} size={160} level="H" />
      <div
        className="absolute bg-white rounded-full flex items-center justify-center"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 38, height: 38,
        }}
      >
        <img src={gdbhLogo} alt="ГДБҲ" className="rounded-full" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Иловаи хонанда</h2>
        <p className="text-muted-foreground">Хонандаи навро ба система илова кунед</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Маълумоти хонанда
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
            <Label htmlFor="student-id">ID хонанда</Label>
            <Input
              id="student-id"
              placeholder="Масалан: 001"
              value={id}
              onChange={(e) => setId(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">ID бояд беткрор бошад</p>
          </div>
          <Button onClick={handleSave} className="w-full" size="lg">
            <UserPlus className="mr-2 h-5 w-5" /> Сабт кардан
          </Button>
        </CardContent>
      </Card>

      {lastAdded && (
        <Card className="border-success bg-success/5">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="font-semibold text-foreground">{lastAdded.name} илова шуд!</p>
            {renderQRWithLogo(lastAdded.id)}
            <p className="text-xs text-muted-foreground lowercase">
              {lastAdded.name} ({lastAdded.id})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
