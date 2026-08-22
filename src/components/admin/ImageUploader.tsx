import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { adminUploadProductImage } from "@/lib/admin.functions";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1600;

async function optimize(file: File): Promise<{ data: string; contentType: "image/webp" | "image/jpeg" | "image/png"; filename: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("Could not process image");
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { data: btoa(binary), contentType: "image/webp", filename: file.name };
}

function useUploader() {
  const upload = useServerFn(adminUploadProductImage);
  return useCallback(
    async (file: File) => {
      if (!ACCEPT.split(",").includes(file.type)) throw new Error(`${file.name}: only JPG, PNG or WebP are allowed`);
      if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 8 MB`);
      const payload = await optimize(file);
      const res = await upload({ data: payload });
      return res.url;
    },
    [upload],
  );
}

function DropZone({
  label,
  multiple,
  busy,
  onFiles,
}: {
  label: string;
  multiple?: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
        over ? "border-primary bg-primary/5" : "border-input bg-muted/30"
      }`}
    >
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </button>
      <p className="text-xs text-muted-foreground">Drag &amp; drop or choose from your device — JPG, PNG or WebP, up to 8 MB{multiple ? " each" : ""}.</p>
    </div>
  );
}

export function MainImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const uploadOne = useUploader();
  const [busy, setBusy] = useState(false);

  async function handle(files: File[]) {
    const file = files[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      onChange(await uploadOne(file));
      toast.success("Main image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-medium">Main Product Image</span>
      {value ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <img src={value} alt="Main product preview" className="h-28 w-28 rounded-md border border-border object-cover" />
          <div className="flex gap-2">
            <DropZone label="Replace image" busy={busy} onFiles={handle} />
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex h-9 items-center gap-1.5 self-center rounded-md border border-input px-3 text-sm text-muted-foreground hover:bg-accent"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <DropZone label="Upload Image" busy={busy} onFiles={handle} />
      )}
    </div>
  );
}

export type GalleryImage = { url: string; is_primary: boolean };

/** Multi-image manager: upload many, preview, delete, reorder (drag or arrows) and pick the main image. */
export function ProductImagesManager({
  value,
  onChange,
}: {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}) {
  const uploadOne = useUploader();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const dragIndex = useRef<number | null>(null);

  const normalise = (list: GalleryImage[]): GalleryImage[] => {
    if (!list.length) return [];
    const primary = list.some((i) => i.is_primary) ? list.findIndex((i) => i.is_primary) : 0;
    return list.map((img, i) => ({ ...img, is_primary: i === primary }));
  };

  async function handle(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    const batch = files.slice(0, 20);
    setProgress({ done: 0, total: batch.length });
    const added: GalleryImage[] = [];
    for (const file of batch) {
      try {
        added.push({ url: await uploadOne(file), is_primary: false });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `${file.name}: upload failed`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    if (added.length) {
      onChange(normalise([...value, ...added]));
      toast.success(`${added.length} image${added.length > 1 ? "s" : ""} uploaded`);
    }
    setProgress(null);
    setBusy(false);
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(normalise(next));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Product Images</span>
        <span className="text-xs text-muted-foreground">{value.length} image{value.length === 1 ? "" : "s"}</span>
      </div>
      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {value.map((img, index) => (
            <li
              key={img.url}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex.current != null) move(dragIndex.current, index);
                dragIndex.current = null;
              }}
              className={`w-36 cursor-grab rounded-lg border p-2 ${img.is_primary ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="relative">
                <img src={img.url} alt={`Product image ${index + 1}`} className="h-24 w-full rounded-md object-cover" loading="lazy" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => onChange(normalise(value.filter((_, i) => i !== index)))}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move left" onClick={() => move(index, index - 1)} className="rounded border border-input px-1.5 py-0.5 text-xs">
                    ←
                  </button>
                  <button type="button" aria-label="Move right" onClick={() => move(index, index + 1)} className="rounded border border-input px-1.5 py-0.5 text-xs">
                    →
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground">#{index + 1}</span>
              </div>
              {img.is_primary ? (
                <p className="mt-1 text-center text-[11px] font-medium text-primary">Main image</p>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange(value.map((it, i) => ({ ...it, is_primary: i === index })))}
                  className="mt-1 w-full rounded border border-input py-0.5 text-[11px] hover:bg-accent"
                >
                  Set as main
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <DropZone label="Upload Images" multiple busy={busy} onFiles={handle} />
      {progress && (
        <p className="mt-2 text-xs text-muted-foreground">
          Uploading {progress.done} of {progress.total}…
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Drag a card to reorder. The image marked “Main image” appears first on the product page.
      </p>
    </div>
  );
}

export function GalleryUpload({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const uploadOne = useUploader();
  const [busy, setBusy] = useState(false);

  async function handle(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    const added: string[] = [];
    for (const file of files.slice(0, 10)) {
      try {
        added.push(await uploadOne(file));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }
    if (added.length) {
      onChange([...value, ...added].slice(0, 10));
      toast.success(`${added.length} image${added.length > 1 ? "s" : ""} uploaded`);
    }
    setBusy(false);
  }

  return (
    <div>
      <span className="text-sm font-medium">Additional Product Images</span>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {value.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="Product gallery preview" className="h-24 w-24 rounded-md border border-border object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <DropZone label="Upload Images" multiple busy={busy} onFiles={handle} />
    </div>
  );
}
