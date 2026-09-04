import React, { useRef, useState } from 'react';
import { useStudioStore, AudioTrackState } from '../store/useStudioStore';
import {
  Music,
  X,
  Upload,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
} from 'lucide-react';

interface AudioTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioTrackModal: React.FC<AudioTrackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const audioTrack = useStudioStore((state) => state.audioTrack);
  const setAudioTrack = useStudioStore((state) => state.setAudioTrack);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const audioObj = new Audio(dataUrl);
      audioObj.onloadedmetadata = () => {
        setAudioTrack({
          name: file.name,
          dataUrl,
          duration: audioObj.duration || 5,
          offset: 0,
          muted: false,
          volume: 0.8,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Audio Track</h2>
              <p className="text-xs text-[#71717A]">
                Synchronize background music & sound effects (MP3 / WAV)
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
            accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg"
            className="hidden"
          />

          {!audioTrack ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-[#E5E5EA] hover:border-purple-500 hover:bg-purple-50/50 cursor-pointer transition-all text-center group"
            >
              <div className="p-3 rounded-2xl bg-[#F7F7FA] group-hover:bg-purple-100 text-[#71717A] group-hover:text-purple-600 transition-colors mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#18181B]">
                Import Audio File (MP3 / WAV)
              </span>
              <span className="text-[11px] text-[#71717A] mt-1">
                Plays in sync with FPS and included in video exports
              </span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <audio
                ref={audioRef}
                src={audioTrack.dataUrl}
                onEnded={() => setIsPlayingAudio(false)}
              />

              {/* Track Card */}
              <div className="p-3.5 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={toggleAudioPlayback}
                      className="p-2 rounded-xl bg-purple-600 text-white shadow-sm flex-shrink-0 hover:bg-purple-700 transition-colors"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-[#18181B] truncate">
                        {audioTrack.name}
                      </span>
                      <span className="text-[10px] text-[#71717A]">
                        Duration: {audioTrack.duration.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setAudioTrack({
                        ...audioTrack,
                        muted: !audioTrack.muted,
                      })
                    }
                    className={`p-2 rounded-xl transition-colors ${
                      audioTrack.muted
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-[#71717A] hover:bg-[#E5E5EA]'
                    }`}
                  >
                    {audioTrack.muted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#71717A] mb-1">
                    <span>Volume</span>
                    <span className="font-mono text-purple-600 font-bold">
                      {Math.round(audioTrack.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioTrack.volume * 100)}
                    onChange={(e) => {
                      const vol = Number(e.target.value) / 100;
                      if (audioRef.current) audioRef.current.volume = vol;
                      setAudioTrack({ ...audioTrack, volume: vol });
                    }}
                    className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Start Offset Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#71717A] mb-1">
                    <span>Start Offset</span>
                    <span className="font-mono text-purple-600 font-bold">
                      {audioTrack.offset.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.min(30, Math.floor(audioTrack.duration))}
                    step={0.1}
                    value={audioTrack.offset}
                    onChange={(e) =>
                      setAudioTrack({
                        ...audioTrack,
                        offset: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* Replace / Remove */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F1F1F5] hover:bg-[#E5E5EA] text-[#18181B] transition-colors"
                >
                  Replace Audio
                </button>
                <button
                  onClick={() => setAudioTrack(null)}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Audio</span>
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
