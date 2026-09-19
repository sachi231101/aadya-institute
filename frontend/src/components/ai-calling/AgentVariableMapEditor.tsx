import React, { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AgentVariableMap } from "@/services/ai-calling.api";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  phoneNumber: "Phone number",
  email: "Email",
  interestedIn: "Course interest",
  "course.name": "Course name",
  "branch.name": "Branch name",
  source: "Source",
  notes: "Notes",
  stage: "Lead stage",
  priority: "Priority",
  tags: "Tags",
};

export function agentFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

type MapRow = { id: string; sarvamVar: string; aadyaField: string };

function mapToRows(map: AgentVariableMap): MapRow[] {
  return Object.entries(map).map(([sarvamVar, aadyaField], index) => ({
    id: `${sarvamVar}-${index}`,
    sarvamVar,
    aadyaField,
  }));
}

function rowsToMap(rows: MapRow[]): AgentVariableMap {
  const out: AgentVariableMap = {};
  for (const row of rows) {
    const key = row.sarvamVar.trim();
    const field = row.aadyaField.trim();
    if (key && field) out[key] = field;
  }
  return out;
}

export interface AgentVariableMapEditorProps {
  value: AgentVariableMap;
  defaultMap: AgentVariableMap;
  allowedFields: string[];
  isDefault: boolean;
  disabled?: boolean;
  onChange: (map: AgentVariableMap) => void;
  onResetToDefault: () => void;
}

export const AgentVariableMapEditor: React.FC<AgentVariableMapEditorProps> = ({
  value,
  defaultMap,
  allowedFields,
  isDefault,
  disabled,
  onChange,
  onResetToDefault,
}) => {
  const [rows, setRows] = useState<MapRow[]>(() => mapToRows(value));

  useEffect(() => {
    setRows(mapToRows(value));
  }, [value]);

  const fieldOptions = useMemo(() => {
    const set = new Set([...allowedFields, ...Object.values(value)]);
    return Array.from(set);
  }, [allowedFields, value]);

  const emit = (nextRows: MapRow[]) => {
    setRows(nextRows);
    onChange(rowsToMap(nextRows));
  };

  const updateRow = (id: string, patch: Partial<Pick<MapRow, "sarvamVar" | "aadyaField">>) => {
    emit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    emit(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    const fallback = allowedFields[0] || "name";
    emit([
      ...rows,
      {
        id: `new-${Date.now()}`,
        sarvamVar: "",
        aadyaField: fallback,
      },
    ]);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <Label className="text-sm font-semibold">Sarvam agent variable map</Label>
          <p className="text-xs text-text-secondary mt-1">
            Map Sarvam Voice Agent variable names to Aadya lead fields. Known values are sent on
            dial; empty fields are listed in <code className="text-[11px]">missing_fields</code> so
            the agent can ask only for those. Separate from WhatsApp template mapping.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDefault ? (
            <Badge variant="outline">Using defaults</Badge>
          ) : (
            <Badge variant="secondary">Custom map</Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={disabled}
            onClick={() => {
              onResetToDefault();
              setRows(mapToRows(defaultMap));
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset defaults
          </Button>
        </div>
      </div>

      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto] gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
        <span>Sarvam variable</span>
        <span>Aadya field</span>
        <span className="w-9" />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center"
          >
            <Input
              value={row.sarvamVar}
              disabled={disabled}
              placeholder="e.g. lead_name"
              className="font-mono text-xs h-9"
              onChange={(e) => updateRow(row.id, { sarvamVar: e.target.value })}
            />
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
              value={row.aadyaField}
              disabled={disabled}
              onChange={(e) => updateRow(row.id, { aadyaField: e.target.value })}
            >
              {fieldOptions.map((f) => (
                <option key={f} value={f}>
                  {agentFieldLabel(f)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              disabled={disabled || rows.length <= 1}
              onClick={() => removeRow(row.id)}
              aria-label="Remove mapping row"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={disabled}
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        Add variable
      </Button>
    </div>
  );
};
