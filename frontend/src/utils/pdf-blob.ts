/** Download or open-for-print a PDF blob returned by the API. */
export async function openPdfBlob(
  blob: Blob,
  mode: "download" | "print",
  filename: string
): Promise<void> {
  const url = URL.createObjectURL(blob);
  if (mode === "download") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.focus();
        win.print();
      });
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function pdfErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}
