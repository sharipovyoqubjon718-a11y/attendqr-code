import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { addStudent } from "@/lib/store";
import { toast } from "sonner";

interface AddStudentDialogProps {
  onStudentAdded: () => void;
}

export default function AddStudentDialog({ onStudentAdded }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [idNum, setIdNum] = useState("");

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNum = idNum.trim();

    if (!trimmedName || !trimmedNum) {
      toast.error("Лутфан ном ва рақами ID-ро пур кунед");
      return;
    }

    if (!/^\d{1,3}$/.test(trimmedNum)) {
      toast.error("Рақами ID бояд аз 1 то 999 бошад");
      return;
    }

    const fullId = `ГДБҲ${trimmedNum.padStart(3, '0')}`;

    const success = addStudent({
      id: fullId,
      name: trimmedName,
      grade: '',
      shift: 'morning',
      qrCode: fullId,
    });

    if (!success) {
      toast.error(`ID "${fullId}" аллакай вуҷуд дорад.`);
      return;
    }

    toast.success(`${trimmedName} бо муваффақият илова шуд`);
    setName("");
    setIdNum("");
    setOpen(false);
    onStudentAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-secondary hover:bg-secondary/90">
          <UserPlus className="h-4 w-4" /> Иловаи хонанда
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Иловаи хонандаи нав</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Номи пурра</Label>
            <Input placeholder="Масалан: Ёқубҷон Шарипов" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Рақами ID</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-primary">ГДБҲ</span>
              <Input placeholder="001" value={idNum} onChange={(e) => setIdNum(e.target.value.replace(/\D/g, '').slice(0, 3))} className="flex-1" maxLength={3} />
            </div>
            <p className="text-xs text-muted-foreground">ID бояд беткрор бошад</p>
          </div>
          <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90">
            Сабт кардан
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
