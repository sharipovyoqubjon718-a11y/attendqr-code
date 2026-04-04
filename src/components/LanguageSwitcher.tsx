import { useI18n, LANG_LABELS, type Lang } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <Globe className="h-3.5 w-3.5 mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <SelectItem key={l} value={l} className="text-xs">
            {LANG_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
