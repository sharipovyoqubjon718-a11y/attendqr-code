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
  const [id, setId] = useState("");

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
    setName("");
    setId("");
    setOpen(false);
    onStudentAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Иловаи хонанда
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Иловаи хонандаи нав</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
          <Button onClick={handleSave} className="w-full">
            Сабт кардан
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
