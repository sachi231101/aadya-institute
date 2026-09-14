import { useCallback, useState } from "react";
import { Code2, X } from "lucide-react";
import { Inspector, gotoServerEditor } from "react-dev-inspector";

/**
 * Dev-only click-to-source.
 * Chrome F12 cannot open React JSX — use this button (or Ctrl+Shift+Alt+C).
 */
export function DevSourceInspector() {
  const [active, setActive] = useState(false);

  const openInCursor = useCallback(
    (codeInfo: {
      absolutePath?: string;
      relativePath?: string;
      lineNumber?: string | number;
      columnNumber?: string | number;
    }) => {
      gotoServerEditor(codeInfo);

      const filePath =
        codeInfo.absolutePath ||
        (codeInfo.relativePath
          ? `${__PROJECT_ROOT__.replace(/\\/g, "/")}/${codeInfo.relativePath.replace(/^\.\//, "")}`
          : undefined);

      if (!filePath) {
        console.warn("[DevSourceInspector] No source path found for element", codeInfo);
        return;
      }

      const line = codeInfo.lineNumber ?? 1;
      const column = codeInfo.columnNumber ?? 1;
      window.location.href = `cursor://file/${filePath}:${line}:${column}`;
    },
    [],
  );

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <Inspector
        active={active}
        onActiveChange={setActive}
        keys={["Ctrl", "Shift", "Alt", "C"]}
        onInspectElement={({ codeInfo }) => {
          if (codeInfo) openInCursor(codeInfo);
          setActive(false);
        }}
      />

      <button
        type="button"
        title={
          active
            ? "Click any UI element to open its source in Cursor (Esc to cancel)"
            : "Inspect element → open source in Cursor (Ctrl+Shift+Alt+C)"
        }
        onClick={() => setActive((v) => !v)}
        className={[
          "fixed bottom-4 right-4 z-[2147483646] flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-semibold shadow-lg transition",
          "border border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
          active
            ? "bg-rose-600 text-white hover:bg-rose-500"
            : "bg-slate-900 text-white hover:bg-slate-800",
        ].join(" ")}
      >
        {active ? <X className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
        {active ? "Click an element…" : "Inspect Source"}
      </button>
    </>
  );
}
