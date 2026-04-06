import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { addStudent } from "@/lib/store";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { UserPlus, CheckCircle2, Sun, Moon, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ALL_GRADES, getShiftForGrade, isSaturdayRestDay } from "@/lib/students-data";
import gdbhLogo from "@/assets/gdbh-logo.png";

export default function AddStudent() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [idNum, setIdNum] = useState("");
  const [grade, setGrade] = useState("");
  const [lastAdded, setLastAdded] = useState<{ name: string; id: string } | null>(null);

  const selectedShift = grade ? getShiftForGrade(grade) : null;
  const saturdayRest = grade ? isSaturdayRestDay(grade) : null;

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNum = idNum.trim();
    if (!trimmedName || !trimmedNum) {
      toast.error("Лутфан ном ва рақами ID-ро пур кунед");
      return;
    }
    if (!grade) {
      toast.error("Лутфан синфро интихоб кунед");
      return;
    }
    if (!/^\d{1,3}$/.test(trimmedNum)) {
      toast.error("Рақами ID бояд аз 1 то 999 бошад");
      return;
    }
    const fullId = `ГДБҲ${trimmedNum.padStart(3, '0')}`;
    const shift = getShiftForGrade(grade);
    const success = addStudent({ id: fullId, name: trimmedName, grade, shift, qrCode: fullId });
    if (!success) {
      toast.error(`ID "${fullId}" аллакай вуҷуд дорад.`);
      return;
    }
    toast.success(`${trimmedName} ${t("addStudent.added")}`);
    setLastAdded({ name: trimmedName, id: fullId });
    setName("");
    setIdNum("");
    setGrade("");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{t("addStudent.title")}</h2>
        <p className="text-muted-foreground">{t("addStudent.subtitle")}</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> {t("addStudent.info")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-name">{t("addStudent.fullName")}</Label>
            <Input id="student-name" placeholder={t("addStudent.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-id">{t("addStudent.idNum")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-primary">ГДБҲ</span>
              <Input id="student-id" placeholder="001" value={idNum} onChange={(e) => setIdNum(e.target.value.replace(/\D/g, '').slice(0, 3))} className="flex-1" maxLength={3} />
            </div>
            <p className="text-xs text-muted-foreground">{t("addStudent.idAuto")}</p>
          </div>

          {/* Grade selector */}
          <div className="space-y-2">
            <Label>{t("addStudent.grade")}</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder={t("addStudent.selectGrade")} />
              </SelectTrigger>
              <SelectContent>
                {ALL_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{t("students.grade")} {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedShift && (
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline" className="gap-1 text-xs">
                  {selectedShift === 'morning' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                  {selectedShift === 'morning' ? t("shift.morning") : t("shift.afternoon")}
                </Badge>
                <Badge variant={saturdayRest ? "destructive" : "secondary"} className="gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {saturdayRest ? t("addStudent.saturdayOff") : t("addStudent.saturdayOn")}
                </Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("addStudent.shiftAuto")}</p>
          </div>

          <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90 transition-transform active:scale-95" size="lg">
            <UserPlus className="mr-2 h-5 w-5" /> {t("addStudent.save")}
          </Button>
        </CardContent>
      </Card>

      {lastAdded && (
        <Card className="glass-card border-secondary/30 bg-secondary/5 animate-fade-in">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-secondary" />
            <p className="font-semibold text-foreground">{lastAdded.name} {t("addStudent.added")}</p>
            <div className="relative inline-block" style={{ width: 160, height: 160 }}>
              <QRCodeSVG value={lastAdded.id} size={160} level="H" />
              <div className="absolute bg-card rounded-full flex items-center justify-center" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 38, height: 38 }}>
                <img src={gdbhLogo} alt="ГДБҲ" className="rounded-full" style={{ width: 32, height: 32 }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{lastAdded.name} ({lastAdded.id})</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
