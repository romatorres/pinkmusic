import { PageContainer } from "../ui/Page-container";

export default function ProductDetails() {
  return (
    <section className="flex flex-col w-full items-center">
      <PageContainer>
        <div className="mt-56">
          <div className="flex text-foreground mt-10">
            <p>
              <span className="font-semibold"> Categorias </span> - Audio -
              Mesas
            </p>
          </div>

          <div className="flex justify-between w-full">
            <div className="flex flex-col shrink-0 gap-4 items-start px-0 py-6 h-[620px] w-[620px] max-md:px-0 max-md:py-5 max-md:w-full max-md:h-auto">
              <div className="flex relative gap-2.5 items-center justify-center p-16 rounded-3xl bg-card h-[620px] w-[620px] max-md:p-10 max-md:w-full max-md:h-auto max-md:aspect-[1/1] max-sm:p-5">
                <div className="flex px-6 w-full items-center justify-between absolute top-6">
                  <img
                    src="/img/icon-logo.svg"
                    alt="Simbolo da Logo"
                    className="aspect-square object-contain object-center w-8 self-stretch shrink-0 my-auto cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
                  />
                  <img
                    src="/img/icon-heart.svg"
                    alt="Heart Icon"
                    className="aspect-square object-contain object-center w-8 self-stretch shrink-0 my-auto cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
                  />
                </div>
                <img
                  src="/img/carousel/carousel-1.png"
                  alt="Mesa Yamaha DM7"
                  className="w-[430px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-16 justify-center items-start  max-md:gap-10 max-md:w-full max-md:h-auto max-sm:gap-8 ">
              <h1 className="self-stretch lg:text-3xl md:text-2xl text-xl font-medium text-foreground">
                MESA YAMAHA DM7
              </h1>

              <div className="flex gap-52 items-center w-[246px] max-md:w-full">
                <div className="flex shrink-0 gap-1.5 items-end w-[106px]">
                  <span className="text-4xl italic font-semibold tracking-tighter leading-9 text-foreground max-md:text-3xl max-sm:text-2xl">
                    R$
                  </span>
                  <span className="text-6xl leading-[56px] text-foreground font-tanker max-md:text-5xl max-sm:text-4xl">
                    290.590
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-20 items-start self-stretch">
                <div className="flex gap-6 items-center self-stretch max-md:flex-col max-md:gap-4 max-md:w-full">
                  <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary lg:px-10 lg:py-4 md:px-7 md:py-3 px-7 py-3 text-lg font-semibold text-white transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-secondary sm:w-auto">
                    <img
                      src="/img/icon-store.svg"
                      alt="E-commerce Icon"
                      className="aspect-square w-[22px] object-contain"
                    />
                    E-commerce
                  </button>
                  <button className="flex w-full items-center justify-center gap-2 whitespace-nowrap border-primary border-[1px] rounded-full bg-white lg:px-10 lg:py-4 md:px-7 md:py-3 px-7 py-3 text-lg font-semibold text-primary transition-colors duration-300 ease-in-out hover:cursor-pointer hover:bg-background sm:w-auto">
                    <img
                      src="/img/icon-location.svg"
                      alt="Store Localização"
                      className="aspect-square w-[22px] object-contain"
                    />
                    Loja Física
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src="/img/icon-facebook.svg"
                    alt="Icon Social Facebook"
                    className="h-[44px] w-[44px] object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                  <img
                    src="/img/icon-instagram.svg"
                    alt="Icon Social Instagram"
                    className="h-[44px] w-[44px] object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                  <img
                    src="/img/icon-twitter.svg"
                    alt="Icon Social Twitter"
                    className="h-[44px] w-[44px] object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-14 max-md:gap-8 max-sm:gap-6 items-start h-[724px] w-[1280px] my-10 max-md:w-full max-md:h-auto">
            <h2 className="self-stretch text-2xl font-semibold text-foreground max-md:text-xl max-sm:text-lg">
              Características
            </h2>
            <div className="self-stretch text-sm whitespace-pre-line text-foreground md:text-base max-sm:leading-snug">
              A série DM7 é uma mesa de mistura digital versátil que combina uma
              qualidade de som ímpar com uma operação suave e possibilidades de
              expansão que oferecem aos utilizadores um fluxo de trabalho de
              engenharia confortável e criativo. Simultaneamente, proporciona ao
              público uma experiência sonora memorável. Com uma abrangente gama
              de ferramentas de mistura e opções de expansão flexíveis, a série
              DM7 cobre todas as necessidades em ambientes que exigem um som de
              alta qualidade, capacitando para responder às exigências em
              constante mudança de uma vasta gama de aplicações de mistura.
              <ul className="mt-10">
                <li>Input Channels: 120 mono</li>
                <li>Mix Buses: 48</li>
                <li>MatricesStereo: 12 (Input to Matrix supported)</li>
                <li>BusesMono: 2 BusesCue: 1 (Stereo B can be changed)</li>
                <li>Buses: 2 Analog</li>
                <li>
                  Input: 32 Analog Output: 16 Dante: Primary / Secondary AES/EBU
                </li>
                <li>
                  Input: 2 (4ch) with SRC AES/EBU Output: 2 (4ch) with SRC
                  Expansion
                </li>
                <li>Slot (PY Slot): 1 Word Clock I/O: In / Out</li>
                <li>MIDI: No (MIDI protocol supported on USB to HOST)</li>
                <li>GPI: 5 in / 5 out</li>
                <li>USB TO DEVICE: 2 (File Save / Load, 2 Track Rec / Play)</li>
                <li>USB TO HOST: 1 (USB Type-C, USB2.0)</li>
                <li>Ethernet: Yes Meter </li>
                <li>Bridge: On</li>
                <li>screen Lamp: 0 (Bulit-in LED Strip Light)</li>
                <li>Video Out: No TC In: Yes</li>
                <li>Phones: 1 AC: 2 (V-Lock Type)</li>
                <li>
                  External Redundant Power Supply: Built-in dual power supply
                </li>
              </ul>
            </div>

            <div className="flex gap-2 leading-5 text-foreground md:text-base text-sm">
              <p className="font-semibold">Mais Informações:</p>
              <p>https//: yamaha.com.br</p>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
