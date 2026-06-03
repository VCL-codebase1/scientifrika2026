"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type ComponentType,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Check,
  Circle,
  Clipboard,
  Download,
  ImagePlus,
  Instagram,
  Linkedin,
  MessageCircle,
  PartyPopper,
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

const LOGO_SRC = "/cropped-IMG-20251009-WA0008.webp";
const INSTAGRAM_CREATE_URL = "https://www.instagram.com/create/select/";

const FORMATS = [
  { key: "instagram", label: "Instagram Story", shortLabel: "Story", width: 1080, height: 1920, icon: Instagram },
  { key: "whatsapp", label: "WhatsApp Status", shortLabel: "Status", width: 1080, height: 1920, icon: MessageCircle },
  { key: "linkedin", label: "LinkedIn Square", shortLabel: "LinkedIn", width: 1080, height: 1080, icon: Linkedin },
] as const;

type FormatKey = (typeof FORMATS)[number]["key"];
type FrameFormat = (typeof FORMATS)[number];
type SocialIconProps = { className?: string };
type SharePlatform = {
  key: string;
  label: string;
  icon: ComponentType<SocialIconProps>;
  getUrl: (caption: string) => string;
};

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    key: "x",
    label: "X",
    icon: XIcon,
    getUrl: (caption) => `https://twitter.com/compose/post?text=${encodeURIComponent(caption)}`,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    getUrl: () => INSTAGRAM_CREATE_URL,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: FacebookIcon,
    getUrl: () => "https://www.facebook.com/",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    getUrl: (caption) => `https://wa.me/?text=${encodeURIComponent(caption)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    getUrl: (caption) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(caption)}`,
  },
];

async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = blobUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.arcTo(x, y, x + safeRadius, y, safeRadius);
  ctx.closePath();
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string | CanvasGradient) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, stroke: string, lineWidth: number) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawImageContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function fitWrappedText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number, startSize: number, minSize: number) {
  let fontSize = startSize;
  let lines: string[] = [];

  while (fontSize >= minSize) {
    ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }

  return { fontSize, lines: lines.slice(0, maxLines) };
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export failed"));
      }
    }, "image/png");
  });
}

async function createFramePngBlob({
  photoUrl,
  experience,
  format,
}: {
  photoUrl: string;
  experience: string;
  format: FrameFormat;
}) {
  const [photo, logo] = await Promise.all([
    loadCanvasImage(photoUrl),
    loadCanvasImage(LOGO_SRC).catch(() => null),
  ]);

  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  const { width, height } = canvas;
  const isTall = height > width;
  const cqw = width / 100;
  const padding = cqw * (isTall ? 6 : 5);
  const gap = cqw * (isTall ? 4 : 3);
  const radius = cqw * 2.6;
  const safeExperience = experience.trim() || "Exploring science without limits.";

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#5a123f");
  background.addColorStop(0.48, "#111827");
  background.addColorStop(1, "#2f174d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.22, height * 0.18, 0, width * 0.22, height * 0.18, width * 0.82);
  glow.addColorStop(0, "rgba(216, 27, 96, 0.42)");
  glow.addColorStop(1, "rgba(216, 27, 96, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  strokeRoundedRect(ctx, cqw * 1.1, cqw * 1.1, width - cqw * 2.2, height - cqw * 2.2, radius, "rgba(255,255,255,0.22)", Math.max(2, cqw * 0.12));

  const logoSize = cqw * 9;
  const headerY = padding;
  const headerHeight = logoSize;
  const smallFont = Math.min(cqw * 1.9, 22);
  const copyFont = Math.min(cqw * 2.3, 28);

  if (logo) {
    fillRoundedRect(ctx, padding, headerY, logoSize, logoSize, cqw * 0.9, "rgba(255,255,255,0.92)");
    drawImageContain(ctx, logo, padding + cqw * 0.7, headerY + cqw * 0.7, logoSize - cqw * 1.4, logoSize - cqw * 1.4);
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 ${smallFont}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText("SCIENTIFRIKA", padding + logoSize + cqw * 2, headerY + cqw * 0.8);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${copyFont}px Inter, Arial, sans-serif`;
  ctx.fillText("scientiFRIKA 2026", padding + logoSize + cqw * 2, headerY + cqw * 3.8);

  const badgeText = "Attendee";
  ctx.font = `700 ${smallFont}px Inter, Arial, sans-serif`;
  const badgeWidth = ctx.measureText(badgeText).width + cqw * 4;
  const badgeHeight = cqw * 4.6;
  fillRoundedRect(ctx, width - padding - badgeWidth, headerY + cqw * 1.8, badgeWidth, badgeHeight, cqw * 0.8, "rgba(255,255,255,0.10)");
  strokeRoundedRect(ctx, width - padding - badgeWidth, headerY + cqw * 1.8, badgeWidth, badgeHeight, cqw * 0.8, "rgba(255,255,255,0.16)", Math.max(1, cqw * 0.1));
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, width - padding - badgeWidth / 2, headerY + cqw * 1.8 + badgeHeight / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const photoX = padding;
  const photoY = headerY + headerHeight + gap;
  const photoWidth = width - padding * 2;
  const textBlockHeight = isTall ? cqw * 34 : cqw * 25;
  const photoHeight = isTall ? height - photoY - gap - textBlockHeight - padding : cqw * 50;

  fillRoundedRect(ctx, photoX, photoY, photoWidth, photoHeight, cqw * 3, "rgba(255,255,255,0.10)");
  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, cqw * 3);
  ctx.clip();
  drawImageContain(ctx, photo, photoX, photoY, photoWidth, photoHeight);
  const photoShade = ctx.createLinearGradient(0, photoY, 0, photoY + photoHeight);
  photoShade.addColorStop(0.45, "rgba(17,24,39,0)");
  photoShade.addColorStop(1, "rgba(17,24,39,0.34)");
  ctx.fillStyle = photoShade;
  ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
  ctx.restore();
  strokeRoundedRect(ctx, photoX, photoY, photoWidth, photoHeight, cqw * 3, "rgba(255,255,255,0.18)", Math.max(2, cqw * 0.1));

  const textX = padding;
  let textY = photoY + photoHeight + gap;
  const maxTextWidth = width - padding * 2;
  const quoteFit = fitWrappedText(ctx, `\u201c${safeExperience}\u201d`, maxTextWidth, isTall ? 4 : 3, cqw * 3.6, cqw * 2.4);
  const quoteLineHeight = quoteFit.fontSize * 1.12;

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${quoteFit.fontSize}px Inter, Arial, sans-serif`;
  for (const line of quoteFit.lines) {
    ctx.fillText(line, textX, textY);
    textY += quoteLineHeight;
  }

  textY += cqw * 2.2;
  ctx.font = `900 ${cqw * 4}px Inter, Arial, sans-serif`;
  ctx.fillText("Science Without Limits", textX, textY);
  textY += cqw * 4.3;
  ctx.fillText("Africa Without Borders", textX, textY);

  textY += cqw * 5;
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = `600 ${smallFont}px Inter, Arial, sans-serif`;
  ctx.fillText("#scientiFRIKA2026  #ScienceWithoutLimits  #AfricaWithoutBorders", textX, textY, maxTextWidth);

  return canvasToPngBlob(canvas);
}

export default function ScientifrikaExperience() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [experience, setExperience] = useState(TAKEAWAYS[0]);
  const [formatKey, setFormatKey] = useState<FormatKey>("instagram");
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [openedPlatform, setOpenedPlatform] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notify, setNotify] = useState<string | null>(null);
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeFormat = useMemo(
    () => FORMATS.find((f) => f.key === formatKey) ?? FORMATS[0],
    [formatKey],
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      if (notifyTimer.current) clearTimeout(notifyTimer.current);
    };
  }, []);

  const showNotify = useCallback((msg: string) => {
    setNotify(msg);
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => setNotify(null), 3000);
  }, []);

  const updatePhoto = useCallback((file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      showNotify("Choose a JPG, PNG, or WebP image.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPhotoUrl(nextUrl);
    setHasDownloaded(false);
    setCaptionCopied(false);
    setOpenedPlatform(false);
    showNotify("Photo locked in. Pick your takeaway and download.");
  }, [showNotify]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    updatePhoto(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    updatePhoto(e.dataTransfer.files?.[0]);
  };

  const shareCaption = useMemo(
    () =>
      `I was part of Africa's biggest scientific gathering - scientiFRIKA 2026. ${experience} #scientiFRIKA2026 #ScienceWithoutLimits #AfricaWithoutBorders`,
    [experience],
  );

  const flowSteps = useMemo(
    () => [
      { key: "upload", label: "Upload", complete: Boolean(photoUrl) },
      { key: "download", label: "Download", complete: hasDownloaded },
      { key: "caption", label: "Caption", complete: captionCopied },
      { key: "post", label: "Post", complete: openedPlatform },
    ],
    [captionCopied, hasDownloaded, openedPlatform, photoUrl],
  );

  const completedSteps = flowSteps.filter((step) => step.complete).length;
  const progressWidth = `${Math.min(100, (completedSteps / flowSteps.length) * 100)}%`;

  const copyCaption = useCallback(async () => {
    const copied = await copyTextToClipboard(shareCaption);
    setCaptionCopied(copied);
    showNotify(copied ? "Caption copied. Open a platform and paste it." : "Caption could not be copied. Select and copy it manually.");
  }, [shareCaption, showNotify]);

  const downloadFrame = async () => {
    if (!photoUrl) {
      showNotify("Upload a photo first, then download your PNG.");
      fileInputRef.current?.click();
      return;
    }

    setIsExporting(true);
    try {
      const blob = await createFramePngBlob({ photoUrl, experience, format: activeFormat });
      downloadBlob(blob, `scientifrika-2026-${activeFormat.key}.png`);
      setHasDownloaded(true);
      setOpenedPlatform(false);

      const copied = await copyTextToClipboard(shareCaption);
      setCaptionCopied(copied);
      showNotify(copied ? "PNG downloaded and caption copied. Pick a platform." : "PNG downloaded. Copy the caption, then pick a platform.");
    } catch {
      showNotify("Could not download the PNG. Try replacing the photo and downloading again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#111827]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Image src={LOGO_SRC} alt="scientiFRIKA" width={36} height={36} priority className="size-9 shrink-0 rounded-lg object-contain" />
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

            <div className="mt-3 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Frame format">
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
              aria-label={photoUrl ? "Replace photo" : "Upload photo"}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
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

            <Button type="button" variant="magenta" className="mt-3 w-full" onClick={downloadFrame} disabled={isExporting}>
              {isExporting ? <Check className="size-4" /> : <Download className="size-4" />}
              {isExporting ? "Preparing..." : photoUrl ? "Download PNG" : "Upload Photo First"}
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">Post Flow</h2>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase",
                hasDownloaded ? "bg-primary text-white" : "bg-slate-100 text-slate-500",
              )}>
                {hasDownloaded ? <PartyPopper className="size-3" /> : <Circle className="size-3" />}
                {hasDownloaded ? "Ready" : "Build"}
              </span>
            </div>

            <div className="relative mt-4">
              <div className="absolute left-4 right-4 top-3 h-1 rounded-full bg-slate-100" />
              <div className="absolute left-4 top-3 h-1 rounded-full bg-primary transition-all" style={{ width: progressWidth }} />
              <div className="relative grid grid-cols-4 gap-2">
                {flowSteps.map((step) => (
                  <div key={step.key} className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "grid size-7 place-items-center rounded-full border text-[10px] font-black shadow-sm",
                      step.complete ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-400",
                    )}>
                      {step.complete ? <Check className="size-3.5" /> : <Circle className="size-2.5 fill-current" />}
                    </span>
                    <span className={cn("text-[10px] font-bold", step.complete ? "text-primary" : "text-slate-400")}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="line-clamp-3 text-xs font-semibold leading-5 text-slate-700">{shareCaption}</p>
              <button
                type="button"
                onClick={copyCaption}
                className={cn(
                  "mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-black transition-all active:scale-[0.98]",
                  captionCopied ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                )}
              >
                {captionCopied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
                {captionCopied ? "Caption Copied" : "Copy Caption"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {SHARE_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.key}
                    href={platform.getUrl(shareCaption)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (!hasDownloaded) {
                        event.preventDefault();
                        showNotify("Download your PNG first, then open a platform.");
                        return;
                      }

                      setOpenedPlatform(true);
                      showNotify("Platform opened. Upload the PNG and paste your caption.");
                    }}
                    aria-label={`Open ${platform.label} to upload your downloaded PNG`}
                    aria-busy={isExporting || undefined}
                    aria-disabled={!hasDownloaded}
                    className={cn(
                      "flex items-center justify-center rounded-xl border border-slate-200 px-2 py-2.5 shadow-sm transition-all active:scale-[0.97]",
                      hasDownloaded ? "bg-slate-50 hover:bg-slate-100" : "bg-slate-100 opacity-55",
                    )}
                    title={`Open ${platform.label}`}
                  >
                    <Icon className="size-4 text-slate-700" />
                  </a>
                );
              })}
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

    </main>
  );
}

function XIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function SocialFrame({
  photoUrl, experience, format,
}: {
  photoUrl: string | null; experience: string; format: (typeof FORMATS)[number];
}) {
  const isTall = format.height > format.width;
  const safeExperience = experience.trim() || "Exploring science without limits.";

  return (
    <div
      className={cn("frame-shell w-full text-white", isTall ? "aspect-[9/16]" : "aspect-square")}
    >
      <div className={cn("relative z-10 flex h-full flex-col", isTall ? "gap-[4cqw] p-[6cqw]" : "gap-[3cqw] p-[5cqw]")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-[2cqw]">
            {/* eslint-disable-next-line @next/next/no-img-element -- Plain img keeps the preview aligned with canvas export assets. */}
            <img src={LOGO_SRC} alt="" className="size-[9cqw] min-h-9 min-w-9 rounded-md object-contain" />
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
            // eslint-disable-next-line @next/next/no-img-element -- User-uploaded blob URLs render most reliably with plain img.
            <img src={photoUrl} alt="" className="absolute inset-0 size-full object-contain" />
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
