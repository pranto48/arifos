import { useState, type PointerEventHandler } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Printer, Move } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PrintInfo {
  label: string;
  value: string;
}

type PrintSize = 'small' | 'medium' | 'large';

interface PrintSizeConfig {
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  qrSize: number; // px in print
  width: string; // mm
  height: string; // mm
  fontSize: string;
  showInfo: boolean;
  maxInfoLines: number;
}

const PRINT_SIZES: Record<PrintSize, PrintSizeConfig> = {
  small: {
    label: 'Small Sticker',
    labelBn: 'ছোট স্টিকার',
    description: '50×25mm – Device label',
    descriptionBn: '৫০×২৫মিমি – ডিভাইস লেবেল',
    qrSize: 60,
    width: '50mm',
    height: '25mm',
    fontSize: '6px',
    showInfo: true,
    maxInfoLines: 2,
  },
  medium: {
    label: 'Medium Label',
    labelBn: 'মাঝারি লেবেল',
    description: '70×40mm – Asset tag',
    descriptionBn: '৭০×৪০মিমি – অ্যাসেট ট্যাগ',
    qrSize: 90,
    width: '70mm',
    height: '40mm',
    fontSize: '8px',
    showInfo: true,
    maxInfoLines: 4,
  },
  large: {
    label: 'Large Card',
    labelBn: 'বড় কার্ড',
    description: '90×55mm – Full details',
    descriptionBn: '৯০×৫৫মিমি – সম্পূর্ণ বিবরণ',
    qrSize: 120,
    width: '90mm',
    height: '55mm',
    fontSize: '9px',
    showInfo: true,
    maxInfoLines: 8,
  },
};

interface QRCodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  qrSvgId: string;
  displayInfo: PrintInfo[];
}

export function QRCodePrintDialog({
  open,
  onOpenChange,
  deviceName,
  qrSvgId,
  displayInfo,
}: QRCodePrintDialogProps) {
  const { language } = useLanguage();
  const [size, setSize] = useState<PrintSize>('medium');
  const [mode, setMode] = useState<'preset' | 'canvas'>('preset');
  const [dragTarget, setDragTarget] = useState<'qr' | 'text' | null>(null);
  const [customLayout, setCustomLayout] = useState({
    qrX: 5,
    qrY: 10,
    qrWidth: 35,
    qrHeight: 75,
    textX: 45,
    textY: 10,
    textWidth: 50,
    textHeight: 75,
    textFontSize: 8,
    textColor: '#333333',
    textWeight: 600,
    textItalic: false,
  });

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const updateLayout = (key: keyof typeof customLayout, value: number | string | boolean) => {
    setCustomLayout(prev => ({ ...prev, [key]: value }));
  };

  const handlePreviewPointerDown = (target: 'qr' | 'text') => {
    setDragTarget(target);
  };

  const handlePreviewPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

    setCustomLayout((prev) => {
      if (dragTarget === 'qr') {
        return {
          ...prev,
          qrX: clamp(xPercent - prev.qrWidth / 2, 0, 100 - prev.qrWidth),
          qrY: clamp(yPercent - prev.qrHeight / 2, 0, 100 - prev.qrHeight),
        };
      }

      return {
        ...prev,
        textX: clamp(xPercent - prev.textWidth / 2, 0, 100 - prev.textWidth),
        textY: clamp(yPercent - prev.textHeight / 2, 0, 100 - prev.textHeight),
      };
    });
  };

  const handlePrint = () => {
    const svg = document.getElementById(qrSvgId);
    if (!svg) {
      console.error('QR SVG element not found:', qrSvgId);
      return;
    }

    const config = PRINT_SIZES[size];
    const svgClone = svg.cloneNode(true) as Element;
    const svgData = new XMLSerializer().serializeToString(svgClone);

    const visibleInfo = displayInfo.slice(0, config.maxInfoLines);
    const infoHtml = config.showInfo
      ? visibleInfo
          .map(
            (item) =>
              `<p style="margin:1px 0;font-size:${config.fontSize};color:#333;"><strong>${item.label}:</strong> ${item.value}</p>`
          )
          .join('')
      : '';

    const baseCardStyles = mode === 'canvas'
      ? `
            .card {
              position: relative;
              width: 100%;
              height: 100%;
            }
            .qr {
              position: absolute;
              left: ${customLayout.qrX}%;
              top: ${customLayout.qrY}%;
              width: ${customLayout.qrWidth}%;
              height: ${customLayout.qrHeight}%;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .qr svg { 
              width: 100%; 
              height: 100%; 
            }
            .info { 
              position: absolute;
              left: ${customLayout.textX}%;
              top: ${customLayout.textY}%;
              width: ${customLayout.textWidth}%;
              height: ${customLayout.textHeight}%;
              min-width: 0; 
              overflow: hidden; 
              font-size: ${customLayout.textFontSize}px;
              color: ${customLayout.textColor};
              font-weight: ${customLayout.textWeight};
              font-style: ${customLayout.textItalic ? 'italic' : 'normal'};
            }
      `
      : `
            .card {
              display: flex;
              align-items: center;
              gap: ${size === 'small' ? '2mm' : '3mm'};
              width: 100%;
              height: 100%;
            }
            .qr svg { 
              width: ${config.qrSize}px; 
              height: ${config.qrSize}px; 
            }
            .info { 
              flex: 1; 
              min-width: 0; 
              overflow: hidden; 
            }
      `;

    const htmlContent = `<!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${deviceName}</title>
          <style>
            @page { size: ${config.width} ${config.height}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${config.width};
              height: ${config.height};
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2mm;
            }
            ${baseCardStyles}
            .name {
              font-weight: ${mode === 'canvas' ? customLayout.textWeight : 700};
              font-size: ${size === 'small' ? '7px' : size === 'medium' ? '9px' : '11px'};
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            p { 
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis; 
              color: inherit;
              font-size: inherit;
              font-style: inherit;
              font-weight: inherit;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="qr">${svgData}</div>
            <div class="info">
              <div class="name">${deviceName}</div>
              ${infoHtml}
            </div>
          </div>
        </body>
      </html>`;

    // Use iframe approach to avoid popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4" />
            {language === 'bn' ? 'QR প্রিন্ট সেটিংস' : 'QR Print Settings'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'preset' | 'canvas')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="preset">{language === 'bn' ? 'রেডি লেআউট' : 'Preset Layout'}</TabsTrigger>
            <TabsTrigger value="canvas">{language === 'bn' ? 'ক্যানভাস' : 'Canvas Layout'}</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="mt-4 space-y-3">
            <RadioGroup
              value={size}
              onValueChange={(v) => setSize(v as PrintSize)}
              className="space-y-2"
            >
              {(Object.entries(PRINT_SIZES) as [PrintSize, PrintSizeConfig][]).map(
                ([key, config]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      size === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <RadioGroupItem value={key} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {language === 'bn' ? config.labelBn : config.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? config.descriptionBn : config.description}
                      </p>
                    </div>
                  </label>
                )
              )}
            </RadioGroup>
          </TabsContent>

          <TabsContent value="canvas" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Move className="h-4 w-4" />
                  {language === 'bn' ? 'ড্র্যাগ করে পজিশন সেট করুন' : 'Drag blocks to set position'}
                </p>
                <div
                  className="relative border rounded-lg bg-muted/30 h-64 select-none touch-none"
                  onPointerMove={handlePreviewPointerMove}
                  onPointerUp={() => setDragTarget(null)}
                  onPointerLeave={() => setDragTarget(null)}
                >
                  <div
                    className="absolute border-2 border-primary/70 bg-white/90 rounded cursor-move flex items-center justify-center text-xs font-medium"
                    style={{
                      left: `${customLayout.qrX}%`,
                      top: `${customLayout.qrY}%`,
                      width: `${customLayout.qrWidth}%`,
                      height: `${customLayout.qrHeight}%`,
                    }}
                    onPointerDown={() => handlePreviewPointerDown('qr')}
                  >
                    QR
                  </div>
                  <div
                    className="absolute border-2 border-emerald-600/70 bg-white/90 rounded cursor-move px-2 py-1 text-xs overflow-hidden"
                    style={{
                      left: `${customLayout.textX}%`,
                      top: `${customLayout.textY}%`,
                      width: `${customLayout.textWidth}%`,
                      height: `${customLayout.textHeight}%`,
                      color: customLayout.textColor,
                      fontSize: `${Math.max(9, customLayout.textFontSize + 2)}px`,
                      fontWeight: customLayout.textWeight,
                      fontStyle: customLayout.textItalic ? 'italic' : 'normal',
                    }}
                    onPointerDown={() => handlePreviewPointerDown('text')}
                  >
                    {deviceName}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">QR X %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={0} max={100} value={customLayout.qrX} onChange={(e) => updateLayout('qrX', clamp(Number(e.target.value), 0, 100))} /></label>
                  <label className="text-xs">QR Y %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={0} max={100} value={customLayout.qrY} onChange={(e) => updateLayout('qrY', clamp(Number(e.target.value), 0, 100))} /></label>
                  <label className="text-xs">QR W %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={10} max={100} value={customLayout.qrWidth} onChange={(e) => updateLayout('qrWidth', clamp(Number(e.target.value), 10, 100))} /></label>
                  <label className="text-xs">QR H %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={10} max={100} value={customLayout.qrHeight} onChange={(e) => updateLayout('qrHeight', clamp(Number(e.target.value), 10, 100))} /></label>
                  <label className="text-xs">Text X %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={0} max={100} value={customLayout.textX} onChange={(e) => updateLayout('textX', clamp(Number(e.target.value), 0, 100))} /></label>
                  <label className="text-xs">Text Y %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={0} max={100} value={customLayout.textY} onChange={(e) => updateLayout('textY', clamp(Number(e.target.value), 0, 100))} /></label>
                  <label className="text-xs">Text W %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={10} max={100} value={customLayout.textWidth} onChange={(e) => updateLayout('textWidth', clamp(Number(e.target.value), 10, 100))} /></label>
                  <label className="text-xs">Text H %<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={10} max={100} value={customLayout.textHeight} onChange={(e) => updateLayout('textHeight', clamp(Number(e.target.value), 10, 100))} /></label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">Font Size (px)<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={6} max={24} value={customLayout.textFontSize} onChange={(e) => updateLayout('textFontSize', clamp(Number(e.target.value), 6, 24))} /></label>
                  <label className="text-xs">Font Weight<input className="mt-1 w-full border rounded px-2 py-1 text-xs" type="number" min={300} max={900} step={100} value={customLayout.textWeight} onChange={(e) => updateLayout('textWeight', clamp(Number(e.target.value), 300, 900))} /></label>
                  <label className="text-xs col-span-1">Text Color<input className="mt-1 w-full h-8 border rounded px-1 py-1" type="color" value={customLayout.textColor} onChange={(e) => updateLayout('textColor', e.target.value)} /></label>
                  <label className="text-xs flex items-end gap-2 pb-1">
                    <input type="checkbox" checked={customLayout.textItalic} onChange={(e) => updateLayout('textItalic', e.target.checked)} />
                    {language === 'bn' ? 'ইটালিক' : 'Italic'}
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handlePrint} className="w-full mt-2">
          <Printer className="h-4 w-4 mr-2" />
          {language === 'bn' ? 'প্রিন্ট করুন' : 'Print'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
