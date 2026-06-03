"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toPng } from "html-to-image";
import {
  Camera,
  Check,
  Download,
  ImagePlus,
  Instagram,
  Linkedin,
  MessageCircle,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TAKEAWAYS = [
  "Inspired by Africa's scientific future.",
  "Connecting science, innovation, and opportunity.",
  "Learning from Africa's research and laboratory leaders.",
  "Exploring science without limits.",
  "Building the future through scientific collaboration.",
  "Advancing African innovation through research.",
];

const FORMATS = [
  { key: "instagram", label: "Instagram Story", shortLabel: "Story", width: 1080, height: 1920, icon: Instagram },
  { key: "whatsapp", label: "WhatsApp Status", shortLabel: "Status", width: 1080, height: 1920, icon: MessageCircle },
  { key: "linkedin", label: "LinkedIn Square", shortLabel: "LinkedIn", width: 1080, height: 1080, icon: Linkedin },
] as const;

type FormatKey = (typeof FORMATS)[number]["key"];

export default function ScientifrikaExperience() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [experience, setExperience] = useState(TAKEAWAYS[0]);
  const [formatKey, setFormatKey] = useState<FormatKey>("instagram");
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notify, setNotify] = useState<string | null>(null);
  const notifyTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const activeFormat = useMemo(
    () => FORMATS.find((f) => f.key === formatKey) ?? FORMATS[0],
    [formatKey],
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const updatePhoto = useCallback((file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      console.log("[upload] rejected:", file?.name, file?.type);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    console.log("[upload] created blob URL:", nextUrl);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
  }, []);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[upload] file selected:", file?.name, file?.type);
    updatePhoto(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    updatePhoto(e.dataTransfer.files?.[0]);
  };

  const captureFrame = useCallback(async () => {
    if (!exportRef.current) return null;
    await document.fonts.ready;
    return toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: "#111827",
      canvasWidth: activeFormat.width,
      canvasHeight: activeFormat.height,
    });
  }, [activeFormat]);

  const shareCaption = useMemo(
    () =>
      `I was part of Africa's biggest scientific gathering — scientiFRIKA 2026. ${experience} #scientiFRIKA2026 #ScienceWithoutLimits #AfricaWithoutBorders`,
    [experience],
  );

  const downloadFrame = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await captureFrame();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `scientifrika-2026-${activeFormat.key}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getImageBlob = async () => {
    const dataUrl = await captureFrame();
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const showNotify = useCallback((msg: string) => {
    setNotify(msg);
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => setNotify(null), 3000);
  }, []);

  const shareToPlatform = (url: string) => async () => {
    console.log("[share] clicked, photoUrl:", !!photoUrl, "url:", url.slice(0, 50));
    setIsExporting(true);
    try {
      const blob = await getImageBlob();
      console.log("[share] blob obtained:", !!blob);
      if (!blob) return;
      const file = new File([blob], `scientifrika-2026-${activeFormat.key}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareCaption });
      } else {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          showNotify("Image copied! Paste into your post.");
        } catch {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.download = file.name;
          a.href = blobUrl;
          a.click();
          URL.revokeObjectURL(blobUrl);
          showNotify("Image downloaded — attach it to your post.");
        }
        if (url) window.open(url, "_blank", "noopener");
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#111827]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img src="/cropped-IMG-20251009-WA0008.webp" alt="scientiFRIKA" className="size-9 shrink-0 rounded-lg object-contain" />
          <span className="truncate text-sm font-black tracking-normal text-white">scientiFRIKA 2026</span>
        </div>
        <a href="#create" className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20">
          <ImagePlus className="size-3.5" />
          Create
        </a>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-6 pt-8">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-balance text-3xl font-black leading-tight sm:text-4xl">
            I Was Part of Africa&apos;s Biggest Scientific Gathering
          </h1>
          <p className="mt-3 text-base font-semibold text-slate-300">Science Without Limits. Africa Without Borders.</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Upload your photo, pick your takeaway, and create your frame for LinkedIn, Instagram, or WhatsApp.</p>
          <a href="#create" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-magenta px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-transform active:scale-95">
            <ImagePlus className="size-4" />
            Create My Frame
          </a>
        </div>
      </section>

      {/* Create */}
      <section id="create" className="bg-[#f8fafc] px-4 pb-10 pt-8 text-[#111827]">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFile} />

          {/* Frame */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Your Frame</h2>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">HD Export</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5" role="tablist">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                const active = formatKey === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFormatKey(f.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-[10px] font-bold transition-colors",
                      active
                        ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {f.shortLabel}
                  </button>
                );
              })}
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => { if (!photoUrl) fileInputRef.current?.click(); }}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !photoUrl) fileInputRef.current?.click(); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className="mt-4 mx-auto w-full max-w-[420px]"
            >
              <div className={cn("rounded-lg transition-all", !photoUrl && "cursor-pointer ring-2 ring-dashed ring-slate-300 hover:ring-primary/50", isDragging && "ring-primary")}>
                <SocialFrame photoUrl={photoUrl} experience={experience} format={activeFormat} />
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
              {activeFormat.label} &middot; {activeFormat.width}&times;{activeFormat.height}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-magenta px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all active:scale-[0.97]">
                <ImagePlus className="size-4" />
                {photoUrl ? "Replace" : "Upload"}
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary shadow-sm transition-all active:scale-[0.97]">
                <Camera className="size-4" />
                Camera
              </button>
            </div>

            <Button type="button" variant="magenta" className="mt-3 w-full" onClick={downloadFrame} disabled={isExporting || !photoUrl}>
              {isExporting ? <Check className="size-4" /> : <Download className="size-4" />}
              {isExporting ? "Preparing..." : "Download PNG"}
            </Button>
          </div>

          {/* Takeaway */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <h2 className="text-sm font-bold">Your Takeaway</h2>
            <p className="mt-0.5 text-xs text-slate-500">What was your biggest scientiFRIKA takeaway?</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {TAKEAWAYS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setExperience(t)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    experience === t
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-bold text-slate-700">Custom</span>
              <Textarea
                maxLength={200}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Write your takeaway..."
                className="mt-1 border-slate-200 bg-slate-50 text-sm text-[#111827]"
              />
            </label>
            <p className="mt-1 text-right text-xs font-semibold text-slate-400">{experience.length}/200</p>
          </div>

          {/* Share */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <h2 className="text-sm font-bold">Share</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <button type="button" onClick={shareToPlatform(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}`)} disabled={!photoUrl || isExporting} className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 shadow-sm transition-all hover:bg-slate-100 active:scale-[0.97] disabled:opacity-40" title="Share on X">
                <svg viewBox="0 0 24 24" className="size-4 fill-current text-slate-700"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button type="button" onClick={shareToPlatform("")} disabled={!photoUrl || isExporting} className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 shadow-sm transition-all hover:bg-slate-100 active:scale-[0.97] disabled:opacity-40" title="Share on Instagram">
                <Instagram className="size-4 text-slate-700" />
              </button>
              <button type="button" onClick={shareToPlatform(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareCaption)}&u=${encodeURIComponent("https://scientifrika2026.com")}`)} disabled={!photoUrl || isExporting} className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 shadow-sm transition-all hover:bg-slate-100 active:scale-[0.97] disabled:opacity-40" title="Share on Facebook">
                <svg viewBox="0 0 24 24" className="size-4 fill-current text-slate-700"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </button>
              <button type="button" onClick={shareToPlatform(`https://wa.me/?text=${encodeURIComponent(shareCaption)}`)} disabled={!photoUrl || isExporting} className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 shadow-sm transition-all hover:bg-slate-100 active:scale-[0.97] disabled:opacity-40" title="Share on WhatsApp">
                <svg viewBox="0 0 24 24" className="size-4 fill-current text-slate-700"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#111827] px-4 py-6 text-center text-xs text-slate-400">
        <p>Science Without Limits, Africa Without Borders</p>
        <p className="mt-1">&copy; scientiFRIKA 2026</p>
      </footer>

      {/* Notification */}
      {notify && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#111827] px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
          {notify}
        </div>
      )}

      {/* Hidden export target */}
      <div aria-hidden="true" className="pointer-events-none fixed left-[-1400px] top-0">
        <div ref={exportRef} style={{ width: activeFormat.width, height: activeFormat.height }}>
          <SocialFrame photoUrl={photoUrl} experience={experience} format={activeFormat} exportMode />
        </div>
      </div>
    </main>
  );
}

function SocialFrame({
  photoUrl, experience, format, exportMode,
}: {
  photoUrl: string | null; experience: string; format: (typeof FORMATS)[number]; exportMode?: boolean;
}) {
  const isTall = format.height > format.width;
  const safeExperience = experience.trim() || "Exploring science without limits.";

  return (
    <div
      className={cn("frame-shell w-full text-white", isTall ? "aspect-[9/16]" : "aspect-square")}
      style={exportMode ? { width: format.width, height: format.height, aspectRatio: "auto" } : undefined}
    >
      <div className={cn("relative z-10 flex h-full flex-col", isTall ? "gap-[4cqw] p-[6cqw]" : "gap-[3cqw] p-[5cqw]")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-[2cqw]">
            <img src="/cropped-IMG-20251009-WA0008.webp" alt="" className="size-[9cqw] min-h-9 min-w-9 rounded-md object-contain" />
            <div className="flex flex-col">
              <span className="frame-small font-semibold uppercase text-white/72">scientiFRIKA</span>
              <span className="frame-copy font-black">scientiFRIKA 2026</span>
            </div>
          </div>
          <div className="rounded-md border border-white/16 bg-white/10 px-[2cqw] py-[1.2cqw]">
            <span className="frame-small font-bold">Attendee</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-[3cqw] border border-white/18 bg-white/10 shadow-2xl shadow-black/35", isTall ? "min-h-0 flex-1" : "h-[50cqw]")}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className="absolute inset-0 size-full object-scale-down" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_28%),linear-gradient(135deg,rgba(216,27,96,0.72),rgba(123,31,162,0.84))]">
              <UploadCloud className="size-[6cqw]" />
              <span className="frame-copy font-bold text-white/88">Your photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,24,39,0.34))]" />
        </div>

        <div className="flex flex-col gap-[2.4cqw]">
          <blockquote className="frame-quote text-balance font-black leading-tight">&ldquo;{safeExperience}&rdquo;</blockquote>
          <div className="flex flex-col gap-[1cqw]">
            <p className="frame-title font-black leading-none">
              Science Without Limits<br />Africa Without Borders
            </p>
            <p className="frame-small font-semibold text-white/76">
              #scientiFRIKA2026&nbsp;&nbsp;#ScienceWithoutLimits&nbsp;&nbsp;#AfricaWithoutBorders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
