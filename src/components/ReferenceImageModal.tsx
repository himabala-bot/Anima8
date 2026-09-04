import React, { useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Image as ImageIcon, X, Upload, Trash2, Eye, EyeOff } from 'lucide-react';

interface ReferenceImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceImageModal: React.FC<ReferenceImageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const referenceImage = useStudioStore((state) => state.referenceImage);
  const setReferenceImage = useStudioStore((state) => state.setReferenceImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const cw = useStudioStore.getState().canvasWidth || 1280;
        const ch = useStudioStore.getState().canvasHeight || 720;
        let w = img.width || 640;
        let h = img.height || 480;
        if (w > cw || h > ch) {
          const ratio = Math.min(cw / w, ch / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const x = Math.max(0, Math.round((cw - w) / 2));
        const y = Math.max(0, Math.round((ch - h) / 2));

        setReferenceImage({
          visible: true,
          opacity: 0.5,
          x,
          y,
          width: w,
          height: h,
          dataUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteReference = () => {
    setReferenceImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black text-white">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Reference Tracing Image</h2>
              <p className="text-xs text-[#71717A]">
                Overlay a guide image behind your hand-drawn animation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="my-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {!referenceImage?.dataUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-[#E5E5EA] hover:border-black hover:bg-zinc-50 cursor-pointer transition-all text-center group"
            >
              <div className="p-3 rounded-2xl bg-[#F7F7FA] group-hover:bg-zinc-200 text-black transition-colors mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#18181B]">
                Upload Reference Image (PNG / JPG)
              </span>
              <span className="text-[11px] text-[#71717A] mt-1">
                Rendered as a light translucent guide layer
              </span>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Image Preview Box */}
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-[#E5E5EA] bg-[#F7F7FA] flex items-center justify-center p-2">
                <img
                  src={referenceImage.dataUrl}
                  alt="Reference"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ opacity: referenceImage.opacity }}
                />
              </div>

              {/* Controls */}
              <div className="p-3.5 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-3">
                {/* Visibility */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18181B]">
                    Visibility
                  </span>
                  <button
                    onClick={() =>
                      setReferenceImage({
                        ...referenceImage,
                        visible: !referenceImage.visible,
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      referenceImage.visible
                        ? 'bg-black text-white'
                        : 'bg-white border border-[#E5E5EA] text-[#71717A]'
                    }`}
                  >
                    {referenceImage.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{referenceImage.visible ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#71717A] mb-1">
                    <span>Opacity</span>
                    <span className="font-mono text-black font-bold">
                      {Math.round(referenceImage.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(referenceImage.opacity * 100)}
                    onChange={(e) =>
                      setReferenceImage({
                        ...referenceImage,
                        opacity: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Freeform Width & Height Info */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Width</span>
                    <span className="font-mono font-bold text-black">{referenceImage.width || 640}px</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Height</span>
                    <span className="font-mono font-bold text-black">{referenceImage.height || 480}px</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium leading-relaxed">
                  💡 <strong>Freeform Sizing:</strong> Click <strong>"Adjust Guide"</strong> on the canvas to freely drag any side or corner to resize without ratio lock.
                </div>
              </div>

              {/* Replace / Delete Reference Image */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F1F1F5] hover:bg-[#E5E5EA] text-[#18181B] transition-colors"
                >
                  Replace Image
                </button>
                <button
                  onClick={handleDeleteReference}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Reference</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
