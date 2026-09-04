import React from 'react';
import { HelpCircle, X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_CATEGORIES = [
  {
    category: 'Tools',
    items: [
      { key: 'B', desc: 'Smooth Brush' },
      { key: 'E', desc: 'Eraser' },
      { key: 'V', desc: 'Selection & Transform' },
      { key: 'L', desc: 'Line Tool' },
      { key: 'R', desc: 'Rectangle Shape' },
      { key: 'C', desc: 'Circle / Oval Shape' },
      { key: 'G', desc: 'Fill Bucket' },
      { key: 'I', desc: 'Eyedropper Color Picker' },
      { key: 'H', desc: 'Hand Pan Tool' },
    ],
  },
  {
    category: 'Selection & Transform',
    items: [
      { key: 'Ctrl / ⌘ + C', desc: 'Copy Selection' },
      { key: 'Ctrl / ⌘ + V', desc: 'Paste Selection' },
      { key: 'Ctrl / ⌘ + X', desc: 'Cut Selection' },
      { key: 'Ctrl / ⌘ + D', desc: 'Duplicate Selection' },
      { key: 'Enter', desc: 'Apply / Commit Transform' },
      { key: 'Delete / Backspace', desc: 'Delete Selected Area' },
      { key: 'Esc', desc: 'Cancel Selection' },
    ],
  },
  {
    category: 'Animation & Playback',
    items: [
      { key: 'Space', desc: 'Play / Pause Animation' },
      { key: ',', desc: 'Previous Frame' },
      { key: '.', desc: 'Next Frame' },
      { key: 'O', desc: 'Toggle Onion Skin' },
      { key: 'G', desc: 'Toggle Rule of Thirds Guides' },
    ],
  },
  {
    category: 'Navigation & History',
    items: [
      { key: 'Space + Drag', desc: 'Pan Viewport' },
      { key: 'Ctrl / ⌘ + Scroll', desc: 'Zoom In / Out' },
      { key: 'Ctrl / ⌘ + Z', desc: 'Undo Action' },
      { key: 'Ctrl / ⌘ + Y', desc: 'Redo Action' },
      { key: 'Ctrl / ⌘ + S', desc: 'Save Project' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Keyboard Shortcuts</h2>
              <p className="text-xs text-[#71717A]">
                Boost your 2D animation workflow speed
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
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          {SHORTCUT_CATEGORIES.map((cat) => (
            <div key={cat.category} className="space-y-1.5">
              <span className="text-[11px] font-bold text-black uppercase tracking-wider">
                {cat.category}
              </span>
              <div className="space-y-1 p-2 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA]">
                {cat.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-1 px-2 rounded-lg text-xs"
                  >
                    <span className="text-[#18181B] font-medium">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded-md bg-white border border-[#E5E5EA] shadow-xs font-mono text-[11px] font-bold text-black">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-[#E5E5EA] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
