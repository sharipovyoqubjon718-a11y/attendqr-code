import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { updateStudent, deleteStudent, type Student } from "@/lib/store";
import { ALL_GRADES } from "@/lib/students-data";
import { useI18n } from "@/lib/i18n";
import { useAdminPin } from "@/components/AdminPinDialog";
import { toast } from "sonner";

interface Props {
  student: Student;
  onChanged: () => void;
}

export function EditDeleteActions({ student, onChanged }: Props) {
  const { t } = useI18n();
  const { requirePin } = useAdminPin();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(student.name);
  const [grade, setGrade] = useState(student.grade);
  const [shift, setShift] = useState(student.shift);

  const handleSave = () => {
    updateStudent(student.id, { name, grade, shift });
    toast.success(t("edit.saved"));
    setEditOpen(false);
    onChanged();
  };

  const handleDelete = () => {
    deleteStudent(student.id);
    toast.success(t("delete.done"));
    setDeleteOpen(false);
    onChanged();
  };

  const handleEditClick = () => {
    requirePin(() => {
      setName(student.name);
      setGrade(student.grade);
      setShift(student.shift);
      setEditOpen(true);
    });
  };

  const handleDeleteClick = () => {
    requirePin(() => {
      setDeleteOpen(true);
    });
  };

  return (
    <>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-primary/10 transition-transform active:scale-90"
          onClick={handleEditClick}
          title={t("edit.title")}
        >
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-destructive/10 transition-transform active:scale-90"
          onClick={handleDeleteClick}
          title={t("delete.title")}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}: {student.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("edit.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("edit.grade")}</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_GRADES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("edit.shift")}</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as 'morning' | 'afternoon')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t("shift.morning")}</SelectItem>
                  <SelectItem value="afternoon">{t("shift.afternoon")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">{t("edit.save")}</Button>
              <Button onClick={() => setEditOpen(false)} variant="outline" className="flex-1">{t("edit.cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SilentConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </>
  );
}

function SilentConfirmDialog({
  open, onOpenChange, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const [val, setVal] = useState("");
  const ok = val === "CONFIRM";
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) setVal(""); onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="sr-only">confirm</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">confirm</AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={val} onChange={(e) => setVal(e.target.value)} autoComplete="off" autoFocus />
        <AlertDialogFooter>
          <AlertDialogCancel>·</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setVal(""); onConfirm(); }}
            disabled={!ok}
            className="bg-destructive hover:bg-destructive/90"
          >
            ✓
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
