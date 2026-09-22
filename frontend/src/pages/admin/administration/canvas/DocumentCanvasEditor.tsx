import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, Loader2, RotateCcw, Save } from "lucide-react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/constants/routes";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganizationContext";
import { useDocumentTemplate, useSaveDocumentTemplate } from "@/hooks/useDocumentTemplate";
import { documentTemplateApi } from "@/services/document-template.api";
import {
  CANVAS_DOCUMENTS,
  CANVAS_PAGE,
  DOCUMENT_PALETTE,
  SAMPLE_VALUES,
  TABLE_SAMPLES,
  blockFromPalette,
  defaultDocumentLayout,
  isCanvasSlug,
  type CanvasAlign,
  type CanvasBlock,
  type CanvasSlug,
  type DocumentLayout,
} from "./document-canvas.catalog";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const errorMessage = (err: unknown): string => {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || "Could not save this design.";
};

const logoImageSrc = (block: CanvasBlock, organizationLogo: string | null): string | null => {
  const value = block.text?.trim();
  if (value && (value.startsWith("/api/") || value.startsWith("http://") || value.startsWith("https://"))) {
    return value;
  }
  return organizationLogo;
};

const blockValue = (block: CanvasBlock): string => {
  if (block.value !== undefined) return block.value;
  if (!block.binding) return "";
  return SAMPLE_VALUES[block.binding] ?? block.binding;
};

/** Live Code128 preview matching the PDF barcode. */
const BarcodePreview: React.FC<{ value: string }> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);
  const text = value.trim() || "SAMPLE";

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, text, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 40,
        width: 1.6,
        background: "transparent",
        lineColor: "#111827",
      });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [text]);

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center text-[10px] text-slate-500">
        Barcode
      </div>
    );
  }

  return <svg ref={svgRef} className="h-full w-full" role="img" aria-label={`Barcode ${text}`} />;
};

/** Live QR preview matching the PDF QR block. */
const QrPreview: React.FC<{ value: string }> = ({ value }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const text = value.trim() || "SAMPLE";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void QRCode.toCanvas(canvas, text, {
      margin: 0,
      width: Math.max(canvas.parentElement?.clientWidth || 96, 64),
      color: { dark: "#111827", light: "#00000000" },
    })
      .then(() => {
        if (!cancelled) setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center text-[10px] text-slate-500">
        QR
      </div>
    );
  }

  return <canvas ref={canvasRef} className="h-full w-full object-contain" aria-label={`QR ${text}`} />;
};

const BlockPreview: React.FC<{ block: CanvasBlock; logoUrl: string | null }> = ({
  block,
  logoUrl,
}) => {
  const align = block.style.align;
  const shared: React.CSSProperties = {
    color: block.style.color,
    fontSize: block.style.fontSize,
    fontWeight: block.style.bold ? 700 : 400,
    textAlign: align,
    textDecoration: block.style.underline ? "underline" : undefined,
  };

  if (block.type === "line") {
    return block.style.dashed ? (
      <div
        className="w-full"
        style={{ borderTop: `1px dashed ${block.style.color}`, height: 0 }}
      />
    ) : (
      <div className="h-full w-full" style={{ backgroundColor: block.style.color }} />
    );
  }

  if (block.type === "panel") {
    return (
      <div
        className="flex h-full items-center overflow-hidden px-1.5"
        style={{ ...shared, backgroundColor: block.style.background }}
      >
        <span className="w-full truncate">{block.text}</span>
      </div>
    );
  }

  if (block.type === "barcode") {
    return (
      <div className="flex h-full w-full flex-col justify-center overflow-hidden">
        <BarcodePreview value={blockValue(block)} />
      </div>
    );
  }

  if (block.type === "qr") {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden p-0.5">
        <QrPreview value={blockValue(block)} />
      </div>
    );
  }

  if (block.type === "logo") {
    const src = logoImageSrc(block, logoUrl);
    return src ? (
      <img src={src} alt="" className="h-full w-full object-contain" />
    ) : (
      <div className="grid h-full w-full place-items-center rounded border border-dashed border-slate-300 text-[10px] text-slate-500">
        Logo
      </div>
    );
  }

  if (block.type === "table") {
    const sample = block.binding ? TABLE_SAMPLES[block.binding] : undefined;
    if (!sample) {
      return (
        <div className="grid h-full w-full place-items-center rounded border border-dashed border-slate-300 text-[10px] text-slate-500">
          Table
        </div>
      );
    }
    return (
      <table
        className="w-full border-collapse"
        style={{ color: block.style.color, fontSize: block.style.fontSize }}
      >
        <thead>
          <tr style={{ backgroundColor: block.style.background ?? "#e5e7eb" }}>
            {sample.columns.map((column, index) => (
              <th
                key={column || index}
                className="whitespace-nowrap px-1.5 py-1 font-semibold leading-tight"
                style={{ textAlign: sample.align?.[index] ?? "left" }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sample.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-200">
              {row.map((cell, index) => (
                <td
                  key={index}
                  className="px-1.5 py-1 align-top leading-tight"
                  style={{ textAlign: sample.align?.[index] ?? "left" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {sample.totals ? (
            <tr className="border-y border-slate-400 font-semibold">
              {sample.totals.map((cell, index) => (
                <td
                  key={index}
                  className="px-1.5 py-1 leading-tight"
                  style={{ textAlign: sample.align?.[index] ?? "left" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    );
  }

  if (block.type === "signature") {
    const caption = blockValue(block) || block.text;
    return (
      <div className="flex h-full flex-col justify-end" style={shared}>
        <div className="mb-1 border-t border-current" />
        <span className="truncate text-[11px]">{caption || "Signature"}</span>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="flex h-full items-center overflow-hidden" style={shared}>
        <span className="w-full whitespace-pre-wrap leading-tight">{block.text || "Text"}</span>
      </div>
    );
  }

  const value = blockValue(block);
  const padded = block.style.background ? "px-1.5" : "";

  if (block.style.inline) {
    return (
      <div
        className={`flex h-full items-center gap-1 overflow-hidden ${padded}`}
        style={{ ...shared, backgroundColor: block.style.background }}
      >
        {block.text ? <span className="shrink-0">{block.text}</span> : null}
        <span className="truncate">{value}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col justify-center overflow-hidden leading-tight ${padded}`}
      style={{ ...shared, backgroundColor: block.style.background }}
    >
      {block.text ? <span className="truncate text-[10px] opacity-60">{block.text}</span> : null}
      <span className="break-words">{value}</span>
    </div>
  );
};

const UnknownCanvas: React.FC = () => (
  <PageContainer maxWidth="narrow">
    <div className="py-20 text-center">
      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
      <p className="text-red-600">This document type is not available.</p>
      <Button variant="link" asChild>
        <Link to={ROUTES.ADMIN.ADMINISTRATION.CANVAS}>Back to Canvas</Link>
      </Button>
    </div>
  </PageContainer>
);

const DocumentCanvasEditorBody: React.FC<{ slug: CanvasSlug }> = ({ slug }) => {
  const doc = CANVAS_DOCUMENTS[slug];
  const palette = DOCUMENT_PALETTE[slug];
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("institute.update");
  const { organization } = useOrganization();
  const { data, isLoading, isError, refetch } = useDocumentTemplate(slug);
  const save = useSaveDocumentTemplate(slug);
  const [draft, setDraft] = useState<DocumentLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const layout = draft ?? data?.layout ?? defaultDocumentLayout(slug);
  const selected = layout.blocks.find((block) => block.id === selectedId) ?? null;

  const replaceBlock = (id: string, next: CanvasBlock) => {
    const source = draft ?? data?.layout;
    if (!source) return;
    setDraft({
      blocks: source.blocks.map((block) => (block.id === id ? next : block)),
    });
    setNotice(null);
  };

  const addItem = (key: string) => {
    const item = palette.find((entry) => entry.key === key);
    if (!item || !canEdit) return;
    const source = draft ?? data?.layout ?? defaultDocumentLayout(slug);
    if (item.binding) {
      const existing = source.blocks.find(
        (block) => block.binding === item.binding && block.type === item.type
      );
      if (existing) {
        setSelectedId(existing.id);
        return;
      }
    }
    const id = `${item.key}-${crypto.randomUUID().slice(0, 8)}`;
    const y = clamp(48 + source.blocks.length * 8, 24, CANVAS_PAGE.height - item.height);
    const next = blockFromPalette(item, id, 48, y);
    setDraft({ blocks: [...source.blocks, next] });
    setSelectedId(id);
    setNotice(null);
  };

  const removeSelected = () => {
    if (!selected || !canEdit) return;
    const source = draft ?? data?.layout;
    if (!source) return;
    setDraft({ blocks: source.blocks.filter((block) => block.id !== selected.id) });
    setSelectedId(null);
    setNotice(null);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, block: CanvasBlock) => {
    if (!canEdit) {
      setSelectedId(block.id);
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(block.id);
    dragRef.current = {
      id: block.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: block.x,
      originY: block.y,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !canEdit) return;
    const source = draft ?? data?.layout;
    if (!source) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setDraft({
      blocks: source.blocks.map((block) => {
        if (block.id !== drag.id) return block;
        return {
          ...block,
          x: clamp(Math.round(drag.originX + dx), 0, CANVAS_PAGE.width - block.width),
          y: clamp(Math.round(drag.originY + dy), 0, CANVAS_PAGE.height - block.height),
        };
      }),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const resetLayout = () => {
    setSelectedId(null);
    setNotice(null);
    if (data?.saved) {
      setDraft(defaultDocumentLayout(slug));
      setNotice("Reset to the starter layout. Save to keep it.");
      setNoticeTone("success");
      return;
    }
    setDraft(null);
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({ layout, name: doc.title });
      setDraft(null);
      setNotice("Design saved.");
      setNoticeTone("success");
    } catch (err) {
      setNotice(errorMessage(err));
      setNoticeTone("error");
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <div className="py-20 text-center text-red-600">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          Failed to load this design.
          <Button variant="link" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title={`${doc.title} design`}
        description="Drag blocks on the page. Sample details fill the fields so you can see the document."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={ROUTES.ADMIN.ADMINISTRATION.CANVAS}>All documents</Link>
            </Button>
            <Button variant="outline" onClick={resetLayout} disabled={!canEdit}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!canEdit || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </>
        }
      />

      {notice ? (
        <p className={noticeTone === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}>
          {notice}
        </p>
      ) : null}
      {!data.saved && !draft ? (
        <p className="text-sm text-muted-foreground">Showing the starter layout. Save it when you want to keep this design.</p>
      ) : null}

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="grid grid-cols-2 items-start gap-4 2xl:order-2">
        <aside className="rounded-xl border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocks</p>
          <div className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
            {palette.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={!canEdit}
                onClick={() => addItem(item.key)}
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <aside className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Block settings
          </p>
          {selected ? (
            <BlockSettings
              block={selected}
              disabled={!canEdit}
              onChange={(next) => replaceBlock(selected.id, next)}
              onRemove={removeSelected}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a block on the page.</p>
          )}
        </aside>
        </div>

        <div
          className="overflow-auto rounded-xl border bg-muted/40 p-4 2xl:order-1"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="relative mx-auto bg-white shadow-sm"
            style={{ width: CANVAS_PAGE.width, height: CANVAS_PAGE.height }}
          >
            {layout.blocks.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground">Add blocks from the list.</p>
            ) : null}
            {layout.blocks.map((block) => (
              <div
                key={block.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(block.id);
                }}
                onPointerDown={(event) => onPointerDown(event, block)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className={`absolute cursor-grab overflow-hidden rounded-sm ${
                  selectedId === block.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40"
                }`}
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  height: block.height,
                }}
              >
                <BlockPreview block={block} logoUrl={organization?.branding.logoUrl ?? null} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

const BlockSettings: React.FC<{
  block: CanvasBlock;
  disabled: boolean;
  onChange: (block: CanvasBlock) => void;
  onRemove: () => void;
}> = ({ block, disabled, onChange, onRemove }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const setStyle = (patch: Partial<CanvasBlock["style"]>) =>
    onChange({ ...block, style: { ...block.style, ...patch } });

  const onLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await documentTemplateApi.uploadLogo(file);
      onChange({ ...block, text: url });
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const setNumber = (key: "x" | "y" | "width" | "height", raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const next = { ...block, [key]: Math.round(value) };
    next.x = clamp(next.x, 0, CANVAS_PAGE.width - 4);
    next.y = clamp(next.y, 0, CANVAS_PAGE.height - 4);
    next.width = clamp(next.width, 8, CANVAS_PAGE.width);
    next.height = clamp(next.height, 2, CANVAS_PAGE.height);
    onChange(next);
  };

  const uploadedLogo = logoImageSrc(block, null);

  return (
    <div className="space-y-3">
      {block.type === "logo" ? (
        <div className="space-y-2">
          <Label htmlFor="block-logo">Logo image</Label>
          {uploadedLogo ? (
            <img src={uploadedLogo} alt="" className="h-16 w-full rounded border object-contain" />
          ) : (
            <p className="text-xs text-muted-foreground">No logo uploaded yet. The page uses the organization logo when one is set.</p>
          )}
          <input
            ref={fileRef}
            id="block-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={onLogoFile}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Upload logo"}
          </Button>
          {uploadedLogo ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={disabled || uploading}
              onClick={() => onChange({ ...block, text: undefined })}
            >
              Remove uploaded logo
            </Button>
          ) : null}
          {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, or GIF. Max 2 MB.</p>
        </div>
      ) : null}
      {block.type === "text" || block.type === "field" || block.type === "signature" || block.type === "panel" ? (
        <div className="space-y-1.5">
          <Label htmlFor="block-label">
            {block.type === "text" || block.type === "panel" ? "Text" : "Label"}
          </Label>
          <Input
            id="block-label"
            value={block.text ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </div>
      ) : null}
      {block.type === "field" || block.type === "signature" ? (
        <div className="space-y-1.5">
          <Label htmlFor="block-value">Value</Label>
          <Input
            id="block-value"
            value={
              block.value !== undefined
                ? block.value
                : block.binding
                  ? SAMPLE_VALUES[block.binding] ?? ""
                  : ""
            }
            disabled={disabled}
            onChange={(event) => onChange({ ...block, value: event.target.value })}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="block-x">X</Label>
          <Input id="block-x" type="number" value={block.x} disabled={disabled} onChange={(event) => setNumber("x", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-y">Y</Label>
          <Input id="block-y" type="number" value={block.y} disabled={disabled} onChange={(event) => setNumber("y", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-w">Width</Label>
          <Input id="block-w" type="number" value={block.width} disabled={disabled} onChange={(event) => setNumber("width", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-h">Height</Label>
          <Input id="block-h" type="number" value={block.height} disabled={disabled} onChange={(event) => setNumber("height", event.target.value)} />
        </div>
      </div>
      {block.type !== "line" && block.type !== "logo" && block.type !== "barcode" && block.type !== "qr" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="block-size">Font size</Label>
            <Input
              id="block-size"
              type="number"
              min={8}
              max={72}
              value={block.style.fontSize}
              disabled={disabled}
              onChange={(event) => {
                const fontSize = Number(event.target.value);
                if (Number.isFinite(fontSize)) setStyle({ fontSize: clamp(fontSize, 8, 72) });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="block-bold">Bold</Label>
            <Switch
              checked={block.style.bold}
              disabled={disabled}
              onCheckedChange={(bold) => setStyle({ bold })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Align</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as CanvasAlign[]).map((align) => (
                <Button
                  key={align}
                  type="button"
                  size="sm"
                  variant={block.style.align === align ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => setStyle({ align })}
                >
                  {align}
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {block.type !== "logo" && block.type !== "barcode" && block.type !== "qr" ? (
        <div className="space-y-1.5">
          <Label htmlFor="block-color">Color</Label>
          <Input
            id="block-color"
            type="color"
            value={block.style.color}
            disabled={disabled}
            onChange={(event) => setStyle({ color: event.target.value })}
            className="h-10 w-full p-1"
          />
        </div>
      ) : null}
      <Button type="button" variant="outline" className="w-full" disabled={disabled} onClick={onRemove}>
        Remove block
      </Button>
    </div>
  );
};

export const DocumentCanvasEditor: React.FC = () => {
  const { type } = useParams();
  if (!isCanvasSlug(type)) return <UnknownCanvas />;
  return <DocumentCanvasEditorBody key={type} slug={type} />;
};
