import { Facebook, Instagram } from "lucide-react";
import Image from "next/image";

export default function Social() {
  return (
    <section>
      <div className="flex gap-6">
        <a
          href="https://www.instagram.com/pinkmusicinstrumentos"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram da Pink Music"
          className="grid size-12 place-items-center rounded-full border-2 border-primary hover:scale-110 transition-all cursor-pointer"
        >
          <Instagram className="size-6 text-primary" />
        </a>
        <a
          href="https://www.facebook.com/PinkMusicInstrumentos/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook da Pink Music"
          className="grid size-12 place-items-center rounded-full border-2 border-primary hover:scale-110 transition-all cursor-pointer"
        >
          <Facebook className="size-6 text-primary" />
        </a>
      </div>
    </section>
  );
}
