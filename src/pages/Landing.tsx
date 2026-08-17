import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  MessageCircle,
  Clock,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo-savecar.png.asset.json";
import heroEstrada from "@/assets/hero-estrada-2.svg.asset.json";
import reclameAquiBadge from "@/assets/selo-reclame-aqui.webp.asset.json";
import susepBadge from "@/assets/susep.png.asset.json";
import { useWhatsAppNumber } from "@/contexts/AttendantContext";
import SectionHeading from "@/components/lp/SectionHeading";
import CoverageGrid from "@/components/lp/CoverageGrid";
import FaqSection from "@/components/lp/FaqSection";
import BenefitsCarousel from "@/components/lp/BenefitsCarousel";
import { FAQ, SITE, STATS } from "@/lib/lp-content";
import { trackQuoteClick, trackWhatsAppClick } from "@/lib/analytics";


const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const Landing = () => {
  const navigate = useNavigate();
  const whatsapp = useWhatsAppNumber();
  const [showSticky, setShowSticky] = useState(false);
  const waHref = `https://wa.me/${whatsapp}`;

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* 1. HERO */}
      <section className="surface-dark relative overflow-hidden">
        <img
          src={heroEstrada.url}
          alt="Carro percorrendo estrada em meio a montanhas ao entardecer"
          width={1600}
          height={1104}
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-900/95 via-teal-900/85 to-teal-900/98"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-teal-900 via-teal-900/95 to-teal-900/40"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-teal-900/85 via-teal-900/55 to-teal-900/25"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" aria-hidden="true" />

        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center px-4 py-4 sm:justify-start sm:px-6 lg:px-8">
          <Link to="/" aria-label="SaveCar Brasil - Página inicial">
            <img
              src={logoAsset.url}
              alt="SaveCar Brasil"
              className="h-[90px] w-auto max-w-none object-contain sm:h-20"
            />
          </Link>
        </header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="container-page relative z-10 flex flex-col items-center pt-24 pb-12 text-center sm:pt-28 sm:pb-16"
        >


          <motion.span
            variants={fadeUp}
            className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-500 backdrop-blur-md sm:mb-5"
          >
            13 anos protegendo quem dirige
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="max-w-3xl font-display text-3xl font-extrabold leading-[1.05] text-white sm:text-5xl"
          >
            Sua proteção veicular cotada em <span className="text-amber-500">2 minutos</span>.
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-2 max-w-2xl text-base text-white/75 sm:mt-4">
            <span className="sm:hidden">Descubra o valor da sua mensalidade em menos de 2 minutos.</span>
            <span className="hidden sm:inline">
              Furto, roubo, colisão, terceiros e assistência 24h em todo o Brasil. Informe a placa e veja o valor da sua
              mensalidade agora — sem análise de perfil.
            </span>
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button
              variant="cta"
              size="xl"
              className="group w-full sm:flex-1"
              onClick={() => {
                trackQuoteClick("hero");
                navigate("/cotacao");
              }}
            >
              Fazer minha cotação agora
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="onDark"
              size="xl"
              className="w-full border-white/20 bg-black/25 backdrop-blur-md hover:bg-black/35 sm:flex-1"
              asChild
            >
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick("hero")}
              >
                <MessageCircle />
                Falar no WhatsApp
              </a>
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-sm text-white/70">
            Grátis · Sem compromisso · Resposta na hora
          </motion.p>

          <motion.a
            variants={fadeUp}
            href={SITE.phones.assistance.href}
            className="mt-3 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <Clock className="size-4 text-amber-500" />
            <span>Assistência 24h:</span>
            <span className="font-semibold text-amber-500">{SITE.phones.assistance.display}</span>
          </motion.a>

          <motion.div
            variants={fadeUp}
            className="mt-12 flex w-full items-center justify-center gap-4 sm:mt-14 sm:gap-6"
          >
            <div className="flex h-16 flex-1 items-center justify-center rounded-[var(--radius-card)] border border-white/40 bg-white/35 px-5 py-2.5 shadow-[0_8px_40px_rgba(255,255,255,0.22)] backdrop-blur-xl sm:max-w-[240px]">
              <img
                src={reclameAquiBadge.url}
                alt="Empresa verificada pelo Reclame Aqui"
                className="max-h-11 w-auto object-contain"
                loading="lazy"
              />
            </div>
            <div className="flex h-16 flex-1 items-center justify-center rounded-[var(--radius-card)] border border-white/40 bg-white/35 px-5 py-2.5 shadow-[0_8px_40px_rgba(255,255,255,0.22)] backdrop-blur-xl sm:max-w-[240px]">
              <img
                src={susepBadge.url}
                alt="Regulamentada pela SUSEP"
                className="max-h-11 w-auto object-contain"
                loading="lazy"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-12 grid w-full grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-white/10 sm:mt-14 lg:grid-cols-4"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-teal-900 px-6 py-7 text-center">
                <p className="font-display text-3xl font-extrabold text-amber-500 sm:text-4xl">
                  {stat.prefix}
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* 2. COBERTURAS */}
      <section className="container-page section-y space-y-8">
        <SectionHeading
          eyebrow="Coberturas"
          title="O que a SaveCar protege"
          description="Nove coberturas pensadas para os imprevistos reais de quem roda todos os dias. Toque em cada uma para ver o detalhe."
        />
        <CoverageGrid />
        <div className="text-center">
          <Button
            variant="cta"
            size="lg"
            onClick={() => {
              trackQuoteClick("coberturas");
              navigate("/cotacao");
            }}
          >
            Quero essas coberturas no meu veículo
          </Button>
        </div>
      </section>

      {/* 3. BENEFÍCIOS */}
      <section className="overflow-hidden bg-teal-50">
        <div className="container-page section-y space-y-10">
          <SectionHeading
            eyebrow="Por que a SaveCar"
            title="Direto ao ponto: o que você ganha"
            description="Sem letra miúda e sem burocracia — do primeiro clique até a vistoria."
          />
          <BenefitsCarousel />
        </div>
      </section>

      {/* 4. FAQ */}
      <section className="container-page section-y space-y-8">
        <SectionHeading
          eyebrow="Perguntas frequentes"
          title="As dúvidas que todo mundo tem antes de contratar"
          description="Legalidade, sinistro, cancelamento e vistoria — respondidas de forma direta."
        />
        <FaqSection />
      </section>

      {/* 5. CTA FINAL */}
      <div className="container-page py-14">
        <div className="rounded-[var(--radius-hero)] bg-teal-900 px-6 py-12 text-center">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-4xl">
            Descubra sua mensalidade em 2 minutos
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Sem burocracia e sem compromisso. Você vê o valor na hora.
          </p>
          <Button
            variant="cta"
            size="xl"
            className="mt-8"
            onClick={() => {
              trackQuoteClick("cta_final");
              navigate("/cotacao");
            }}
          >
            Fazer cotação agora
            <ArrowRight />
          </Button>
        </div>
      </div>

      {/* 6. RODAPÉ */}
      <footer className="surface-dark">
        <div className="container-page py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-3">
              <div className="inline-block rounded-2xl bg-white px-4 py-2">
                <img src={logoAsset.url} alt="SaveCar Brasil" className="h-14 object-contain" />
              </div>
              <p className="text-sm text-white/75">Associação de proteção veicular desde {SITE.foundedYear}.</p>
              <p className="flex items-center gap-2 text-sm text-white/75">
                <MapPin className="size-4 text-amber-500" />
                {SITE.city}/{SITE.state} — Brasil
              </p>
              <p className="text-xs text-white/60">
                Filiada à {SITE.affiliation.acronym} — {SITE.affiliation.name}.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-amber-500">Atendimento</h2>
              <a href={SITE.phones.assistance.href} className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  <span className="block font-semibold text-white">{SITE.phones.assistance.display}</span>
                  <span className="text-xs text-white/60">{SITE.phones.assistance.label}</span>
                </span>
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick("rodape")}
                className="flex items-start gap-3"
              >
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  <span className="block font-semibold text-white">Falar no WhatsApp</span>
                  <span className="text-xs text-white/60">Cotação e dúvidas</span>
                </span>
              </a>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-amber-500">
                Siga a SaveCar
              </h2>
              <div className="flex items-center gap-4">
                <a
                  href={SITE.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Save Car Brasil"
                  className="inline-flex size-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                  }}
                >
                  <Instagram className="size-6" strokeWidth={2.2} />
                </a>
                <a
                  href={SITE.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Save Car Brasil"
                  className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#0A66C2] text-white shadow-lg transition-transform hover:scale-105"
                >
                  <Linkedin className="size-6" strokeWidth={2.2} />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} SaveCar Brasil — Associação de Proteção Veicular. Todos os direitos reservados.</p>
            <p>By Hammer</p>
          </div>
        </div>
      </footer>

      {/* 7. STICKY MOBILE */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-card/95 p-3 backdrop-blur sm:hidden">
          <Button
            variant="cta"
            className="h-12 flex-1"
            onClick={() => {
              trackQuoteClick("sticky_mobile");
              navigate("/cotacao");
            }}
          >
            Fazer cotação
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12" aria-label="Falar no WhatsApp" asChild>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("sticky_mobile")}
            >
              <MessageCircle />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Landing;
