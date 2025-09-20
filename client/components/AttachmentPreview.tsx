import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  ExternalLink,
  Printer,
  X,
} from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// Use CDN worker URL - more reliable than bundling with Vite
const pdfWorkerSrcUrl = "https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs";

type PreviewItem = {
  url: string;
  mimeType?: string | null;
  name?: string | null;
  size?: number | null;
};

interface AttachmentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PreviewItem | null;
  canDownload?: boolean;
}

function isImage(mime?: string | null, url?: string) {
  if (mime && mime.startsWith("image/")) return true;
  if (!mime && url) {
    const lower = url.toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].some(
      (ext) => lower.endsWith(ext),
    );
  }
  return false;
}

function isPdf(mime?: string | null, url?: string) {
  if (mime === "application/pdf") return true;
  if (!mime && url) return url.toLowerCase().endsWith(".pdf");
  return false;
}

function isDocx(mime?: string | null, url?: string) {
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return true;
  if (!mime && url) return url.toLowerCase().endsWith(".docx");
  return false;
}

function isDoc(mime?: string | null, url?: string) {
  if (mime === "application/msword") return true;
  if (!mime && url) return url.toLowerCase().endsWith(".doc");
  return false;
}

function PdfViewer({ url }: { url: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerSizerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    GlobalWorkerOptions.workerSrc = pdfWorkerSrcUrl as any;
  }, []);

  useEffect(() => {
    const resize = () => {
      const el = containerSizerRef.current;
      if (el) setContainerWidth(el.clientWidth);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Load PDF when URL changes
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setNumPages(0);
    pdfRef.current = null;

    GlobalWorkerOptions.workerSrc = pdfWorkerSrcUrl as any;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.withCredentials = true;
    xhr.onload = async () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        try {
          const pdf = await getDocument({ data: xhr.response }).promise;
          if (cancelled) return;
          pdfRef.current = pdf;
          setNumPages(pdf.numPages);
        } catch (e) {
          if (!cancelled) setError("failed");
        }
      } else {
        if (!cancelled) setError("failed");
      }
    };
    xhr.onerror = () => {
      if (!cancelled) setError("failed");
    };
    xhr.send();

    return () => {
      cancelled = true;
      xhr.abort();
    };
  }, [url]);

  // Render pages when scale or numPages changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdf = pdfRef.current;
      if (!pdf) return;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const width = (containerSizerRef.current?.clientWidth || 800) * scale;
        const computedScale = Math.max(
          0.5,
          Math.min(3, width / baseViewport.width),
        );
        const viewport = page.getViewport({ scale: computedScale });
        const wrapper = pageRefs.current[pageNum - 1];
        if (!wrapper) continue;
        wrapper.innerHTML = "";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";
        canvas.className = "bg-white shadow rounded";
        wrapper.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [numPages, scale]);

  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onScroll = () => {
      const top = sc.scrollTop;
      let pageIdx = 0;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        if (el.offsetTop - 16 <= top) pageIdx = i;
        else break;
      }
      setCurrentPage(pageIdx + 1);
    };
    sc.addEventListener("scroll", onScroll);
    return () => sc.removeEventListener("scroll", onScroll);
  }, [numPages]);

  const goToPage = (n: number) => {
    if (!scrollRef.current) return;
    const idx = Math.max(1, Math.min(numPages, n)) - 1;
    const el = pageRefs.current[idx];
    if (el)
      scrollRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
  };

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.1));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.1));
  const resetZoom = () => setScale(1);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">PDF</span>
        <Button
          size="sm"
          variant="outline"
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetZoom}
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="ml-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            {"<"}
          </Button>
          <span className="text-xs">
            Page {currentPage} / {numPages || "-"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            {">"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="p-4 text-center">
          <p className="text-sm text-red-600 mb-2">
            This file cannot be previewed. Please download to view.
          </p>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        <div ref={containerSizerRef}>
          {Array.from({ length: numPages }).map((_, index) => (
            <div
              key={`pwrap_${index}`}
              ref={(el) => (pageRefs.current[index] = el)}
              className="mb-4 flex justify-center"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DocxViewer({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch document");
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        if (ref.current) {
          ref.current.innerHTML = "";
          // Dynamically import docx-preview to avoid top-level resolution issues
          const mod = await import("docx-preview");
          const renderDocx = (mod as any).renderAsync || (mod as any).default?.renderAsync;
          if (typeof renderDocx !== "function") {
            throw new Error("docx-preview renderAsync not available");
          }
          await renderDocx(buf, ref.current, undefined, {
            className: "docx-preview",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            useMathMLPolyfill: true,
          });
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load document");
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [url]);

  return (
    <div className="w-full h-full overflow-auto p-4">
      {loading && (
        <div className="text-sm text-muted-foreground px-2 py-1">
          Loading document…
        </div>
      )}
      {error && <div className="text-sm text-red-600 px-2 py-1">{error}</div>}
      <div ref={ref} className="prose max-w-none" />
    </div>
  );
}

export default function AttachmentPreview({
  open,
  onOpenChange,
  item,
  canDownload = true,
}: AttachmentPreviewProps) {
  const name =
    item?.name ||
    (item?.url ? item.url.split("/").pop() || "Attachment" : "Attachment");
  const [scale, setScale] = useState(1);

  const contentType = useMemo(() => {
    if (!item) return "none" as const;
    if (isImage(item.mimeType, item.url)) return "image" as const;
    if (isPdf(item.mimeType, item.url)) return "pdf" as const;
    if (isDocx(item.mimeType, item.url)) return "docx" as const;
    if (isDoc(item.mimeType, item.url)) return "doc" as const;
    return "other" as const;
  }, [item]);

  const resetZoom = () => setScale(1);
  const zoomIn = () => setScale((s) => Math.min(4, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.25, s - 0.25));

  const printAttachment = () => {
    if (!item?.url) return;
    if (contentType === "image") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      const html = `<!doctype html><html><head><title>${name}</title><style>html,body{margin:0;padding:0}img{max-width:100%;width:100%}</style></head><body><img src="${item.url}" onload="window.focus();window.print();"/></body></html>`;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      const w = window.open(item.url, "_blank");
      if (w) w.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setScale(1);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[92vw] w-[92vw] h-[86vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="truncate">{name}</DialogTitle>
              {item?.mimeType && (
                <DialogDescription className="truncate">
                  {item.mimeType}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {contentType === "image" && (
                <div className="flex items-center gap-1 mr-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={zoomOut}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={zoomIn}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {item?.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={printAttachment}
                  aria-label="Print"
                >
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              )}
              {canDownload && item?.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button size="sm" variant="default" aria-label="Download">
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </a>
              )}
              <DialogClose asChild>
                <Button size="sm" variant="destructive" className="font-bold">
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="w-full h-[calc(86vh-72px)] bg-muted/20 flex items-center justify-center overflow-hidden">
          {contentType === "image" && item?.url && (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={item.url}
                alt={name || "attachment"}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
                className="max-w-none select-none rounded shadow"
                draggable={false}
              />
            </div>
          )}

          {contentType === "pdf" && item?.url && <PdfViewer url={item.url} />}

          {contentType === "docx" && item?.url && <DocxViewer url={item.url} />}

          {contentType === "doc" && (
            <div className="text-center p-8">
              <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                DOC preview is not supported. Please download to view.
              </p>
              {item?.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" /> Open / Download
                  </Button>
                </a>
              )}
            </div>
          )}

          {contentType === "other" && (
            <div className="text-center p-8">
              <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                No inline preview available.
              </p>
              {item?.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" /> Open / Download
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
