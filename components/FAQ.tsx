"use client";

import { Reveal } from "./Reveal";
import { Accordion, AccordionItem } from "./ui/Accordion";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    question: "Is Heritage a physical product?",
    answer:
      "No. Heritage provides digital 3D-printable model files (.STL / .3MF) that you configure in the Studio, download, and print yourself or through a local printing service.",
  },
  {
    id: 2,
    question: "Do I need a 3D printer to use Heritage?",
    answer:
      "Yes, or access to one. You get print-ready digital files optimised for FDM printers. You can also take the exported files to a print shop or an online printing service.",
  },
  {
    id: 3,
    question: "What file formats will I receive after downloading?",
    answer:
      "Production-ready .3MF and .STL files. The 3MF keeps each layer — walls, roofs, domes, details — as a separate part so you can assign filament colours in multi-colour setups such as Bambu Lab AMS.",
  },
  {
    id: 4,
    question: "Can I scale or reshape a building before printing?",
    answer:
      "Yes. The Studio lets you transform the model, adjust individual layers, pick a printer bed and preview everything live in 3D. You can also rescale the exported file in your slicer.",
  },
  {
    id: 5,
    question: "How accurate are the buildings?",
    answer:
      "Every landmark is researched from archival drawings, surveys and reference imagery, then rebuilt by hand and test-printed so that the proportions and the details hold up at print scale.",
  },
];

export function FAQ() {
  const accordionItems: AccordionItem[] = FAQ_DATA.map((item) => ({
    id: item.id,
    title: item.question,
    content: item.answer,
  }));

  return (
    <section
      id="faq"
      className="px-5 py-20 md:px-12 md:py-28"
    >
      <div className="mx-auto max-w-4xl">
        {/* Section Header */}
        <Reveal className="mb-12 text-center md:mb-16">
          <h2 className="m-0 font-display text-[clamp(30px,4vw,52px)] font-semibold tracking-[-0.02em] text-cream">
            Questions, answered.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/60 md:text-base">
            Everything you need to know about configuring, downloading and printing your Heritage models.
          </p>
        </Reveal>

        {/* Accordion Component */}
        <Reveal>
          <Accordion items={accordionItems} />
        </Reveal>
      </div>
    </section>
  );
}