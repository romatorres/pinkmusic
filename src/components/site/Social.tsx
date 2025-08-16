import Image from "next/image";

export default function Social() {
  return (
    <section>
      <div className="flex items-center gap-6 md:gap-4 md:mt-0 mt-8 justify-center md:justify-normal">
        <a
          href="https://www.facebook.com/PinkMusicInstrumentos/"
          target="_blank"
        >
          <Image
            src="/img/icon-facebook.svg"
            alt="Icon Social Facebook"
            width={44}
            height={44}
            className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
          />
        </a>
        <a
          href="https://www.instagram.com/pinkmusicinstrumentos"
          target="_blank"
        >
          <Image
            src="/img/icon-instagram.svg"
            alt="Icon Social Instagram"
            width={44}
            height={44}
            className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
          />
        </a>
        <a href="https://wa.me/5575991988685" target="_blank">
          <Image
            src="/img/icon-whatsapp.svg"
            alt="Icon Social Twitter"
            width={44}
            height={44}
            className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
          />
        </a>
      </div>
    </section>
  );
}
