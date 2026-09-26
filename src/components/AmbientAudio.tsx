import { useEffect, useRef, useState } from "react";
import { Music, Volume2, VolumeX } from "lucide-react";
import track from "@/assets/karpur-gauram.mp3.asset.json";

const STORAGE_KEY = "swastik-ambient-muted";

/** Optional low-volume devotional music. Plays only after the visitor taps the button. */
export function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Music never starts on its own (no autoplay on scroll or tap anywhere on the page).
  // It plays only when the visitor taps the music button, and the file downloads only then.
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = 0.18;
  }, [ready]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  return (
    <>
      <audio ref={audioRef} src={track.url} loop preload="none" playsInline />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mute background music" : "Play background music"}
        title={playing ? "Mute Karpur Gauram" : "Play Karpur Gauram"}
        className="float-lift group fixed bottom-24 left-5 z-40 hidden h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-background/80 text-accent shadow-lg backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:bg-accent/15 md:flex"
      >
        {playing ? (
          <span className="relative flex items-center justify-center">
            <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-accent/20" aria-hidden="true" />
            <Volume2 className="relative h-5 w-5" aria-hidden="true" />
          </span>
        ) : ready ? (
          <VolumeX className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Music className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </>
  );
}