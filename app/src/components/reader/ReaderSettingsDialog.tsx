import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EffectivePrefs } from "@/lib/use-reader-prefs";
import type { FitMode } from "@/lib/library-api";
import type { ReaderMode } from "@/components/MangaReader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: EffectivePrefs;
  mode: ReaderMode;
  onChange: (patch: Partial<EffectivePrefs>) => void;
}

const FIT_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "width", label: "Fit width" },
  { value: "height", label: "Fit height" },
  { value: "original", label: "Original size" },
];

function ReaderSettingsDialogImpl({ open, onOpenChange, prefs, mode, onChange }: Props) {
  const fitKey = mode === "vertical" ? "fit_vertical" : "fit_book";
  const fitValue = prefs[fitKey];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reader settings</DialogTitle>
          <DialogDescription>
            Saved per account. Fit is remembered separately for each mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Fit ({mode})
            </Label>
            <Select
              value={fitValue}
              onValueChange={(v) => onChange({ [fitKey]: v as FitMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ToggleRow
            label="Left-handed mode"
            sub="Swaps prev/next tap zones."
            checked={prefs.left_handed}
            onChange={(v) => onChange({ left_handed: v })}
          />
          <ToggleRow
            label="Invert tap direction"
            sub="Flip which side is next vs previous."
            checked={prefs.invert_taps}
            onChange={(v) => onChange({ invert_taps: v })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tap zone width</Label>
              <span className="text-xs text-muted-foreground">{prefs.tap_zone_pct}%</span>
            </div>
            <Slider
              min={10}
              max={45}
              step={5}
              value={[prefs.tap_zone_pct]}
              onValueChange={([v]) => onChange({ tap_zone_pct: v })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Dim overlay</Label>
              <span className="text-xs text-muted-foreground">{prefs.dim_level}%</span>
            </div>
            <Slider
              min={0}
              max={70}
              step={5}
              value={[prefs.dim_level]}
              onValueChange={([v]) => onChange({ dim_level: v })}
            />
          </div>

          <ToggleRow
            label="Always hide chrome"
            sub="Reader UI stays hidden until you tap."
            checked={prefs.always_hide_chrome}
            onChange={(v) => onChange({ always_hide_chrome: v })}
          />
          <ToggleRow
            label="Auto-resume on open"
            sub="Skip the prompt and jump to last position."
            checked={prefs.auto_resume}
            onChange={(v) => onChange({ auto_resume: v })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ToggleRow = memo(function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="pr-3">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
});

export const ReaderSettingsDialog = memo(ReaderSettingsDialogImpl);
