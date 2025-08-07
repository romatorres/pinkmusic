"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "../ui/Page-container";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Contact form submitted:", formData);
      toast.success("Formulário enviado com sucesso!");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error("Falha ao enviar formulário. Tente novamente mais tarde.");
    }
  };

  return (
    <section className="flex flex-col w-full items-center">
      <PageContainer>
        <div className="flex items-center gap-2 whitespace-nowrap font-tanker text-3xl text-foreground lg:whitespace-initial pt-12">
          <div className="my-auto h-7 w-2 shrink-0 self-stretch bg-secondary" />
          <h2 className="my-auto self-stretch font-normal">Contatos</h2>
        </div>
        <div className="flex md:flex-row flex-col w-full items-center justify-between flex-wrap py-12 gap-8">
          <form
            onSubmit={handleSubmit}
            className="self-stretch min-w-[240px] whitespace-nowrap w-[652px] my-auto font-medium text-xl max-w-full md:whitespace-normal"
          >
            <div className="flex md:flex-col items-center justify-start flex-wrap w-full mb-6 gap-3 md:gap-3">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="NOME"
                className="rounded-full self-stretch flex min-w-[240px] w-full items-center gap-2.5 justify-start flex-grow flex-shrink my-auto py-4 px-7 border border-primary text-primary bg-transparent font-medium text-xl placeholder-primary/70 focus:outline-none focus:border-secondary focus:ring-2 focus:bg-secondary/20"
                required
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="E-MAIL"
                className="rounded-full self-stretch flex min-w-[240px] w-full items-center gap-2.5 justify-start flex-grow flex-shrink my-auto py-4 px-7 border border-primary text-primary bg-transparent font-medium text-xl placeholder-primary/70 focus:outline-none focus:border-secondary focus:ring-2 focus:bg-secondary/20"
                required
              />

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="TELEFONE"
                className="rounded-full self-stretch flex min-w-[240px] w-full items-center gap-2.5 justify-start flex-grow flex-shrink my-auto py-4 px-7 border border-primary text-primary bg-transparent font-medium text-xl placeholder-primary/70 focus:outline-none focus:border-secondary focus:ring-2 focus:bg-secondary/20"
                required
              />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="ASSUNTO"
                className="rounded-full self-stretch flex min-w-[240px] w-full items-center gap-2.5 justify-start flex-grow flex-shrink my-auto py-4 px-7 border border-primary text-primary bg-transparent font-medium text-xl placeholder-primary/70 focus:outline-none focus:border-secondary focus:ring-2 focus:bg-secondary/20"
                required
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="MENSAGEM"
                className="rounded-[40px] flex min-h-[176px] w-full items-start gap-2.5 justify-start border border-primary text-primary bg-transparent font-medium text-xl resize-y placeholder-primary/70 focus:outline-none focus:border-secondary focus:ring-2 focus:bg-secondary/20 md:whitespace-normal p-5 px-7 md:px-5 md:pb-24 "
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-primary flex min-h-[56px] w-full items-center gap-2.5 text-white justify-center mt-8 py-4 px-32 border-none cursor-pointer transition-colors duration-300 ease-in-out font-medium text-xl hover:bg-secondary md:whitespace-normal"
            >
              Enviar
            </button>
          </form>

          <div className="self-stretch flex min-w-[240px] flex-col items-start justify-start sm:my-0 my-6 gap-5 max-w-full">
            <div className="flex items-center justify-start w-full sm:gap-6 gap-4">
              <img
                src="/img/icon-location_contacts.svg"
                alt="Localização"
                className="aspect-square object-contain object-center sm:w-20 w-16 self-stretch flex-shrink-0 my-auto"
              />
              <div>
                <h3 className="text-primary self-start sm:text-2xl text-xl font-normal sm:mb-2 mb-0">
                  LOCALIZAÇÃO
                </h3>
                <p className="text-foreground m-0 font-medium sm:text-xl text-lg">
                  FEIRA DE SANTANA, BAHIA, BRASIL
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start w-full sm:gap-6 gap-4">
              <img
                src="/img/icon-whats_contacts.svg"
                alt="WhatsApp"
                className="aspect-square object-contain object-center sm:w-20 w-16 self-stretch flex-shrink-0 my-auto"
              />
              <div>
                <h3 className="text-primary self-start sm:text-2xl text-xl font-normal sm:mb-2 mb-0">
                  WHATSAPP
                </h3>
                <p className="text-foreground m-0 font-medium sm:text-xl text-lg">
                  75 99966-1614
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start w-full sm:gap-6 gap-4">
              <img
                src="/img/icon-phone_contacts.svg"
                alt="Telefone"
                className="aspect-square object-contain object-center sm:w-20 w-16 self-stretch flex-shrink-0 my-auto"
              />
              <div>
                <h3 className="text-primary self-start sm:text-2xl text-xl font-normal sm:mb-2 mb-0">
                  TELEFONE
                </h3>
                <p className="text-foreground m-0 font-medium sm:text-xl text-lg">
                  75 3221-1530
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start w-full sm:gap-6 gap-4">
              <img
                src="/img/icon-email_contacts.svg"
                alt="Email"
                className="aspect-square object-contain object-center sm:w-20 w-16 self-stretch flex-shrink-0 my-auto"
              />
              <div>
                <h3 className="text-primary self-start sm:text-2xl text-xl font-normal sm:mb-2 mb-0">
                  E-MAIL
                </h3>
                <p className="text-foreground m-0 font-medium sm:text-xl text-lg">
                  VENDAS@PINKMUSIC.COM.BR
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
