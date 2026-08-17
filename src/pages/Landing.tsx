import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MessageCircle,
  Clock,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Zap,
  Unlock,
  Smartphone,
  Headphones,
  UsersRound,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-savecar.png";
import bordaSuperior from "@/assets/borda-superior.png";
import bordaMaior from "@/assets/borda-maior.png";
import { useWhatsAppNumber } from "@/contexts/AttendantContext";
import SectionHeading from "@/components/lp/SectionHeading";
import CoverageGrid from "@/components/lp/CoverageGrid";
import FaqSection from "@/components/lp/FaqSection";
import { BENEFITS, FAQ, SITE, STATS } from "@/lib/lp-content";
import { trackQuoteClick, trackWhatsAppClick } from "@/lib/analytics";

const benefitIcons: Record<string, LucideIcon> = {
  zap: Zap,
  unlock: Unlock,
  smartphone: Smartphone,
  headphones: Headphones,
  "users-round": UsersRound,
  "badge-check": BadgeCheck,
};

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
          src={heroEstrada}
          alt="Carro percorrendo estrada em meio a montanhas ao entardecer"
          width={1920}
          height={1024}
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-900/95 via-teal-900/85 to-teal-900/95"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.10),transparent_65%)]" aria-hidden="true" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="container-page relative z-10 flex flex-col items-center py-12 text-center sm:py-16"
        >


          <motion.span
            variants={fadeUp}
            className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-500"
          >
            13 anos protegendo quem dirige
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="max-w-3xl font-display text-3xl font-extrabold leading-[1.05] text-white sm:text-5xl"
          >
            Sua proteção veicular cotada em <span className="text-amber-500">30 segundos</span>.
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base text-white/75">
            Furto, roubo, colisão, terceiros e assistência 24h em todo o Brasil. Informe a placa e veja o valor da sua
            mensalidade agora — sem análise de perfil.
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
            <Button variant="onDark" size="xl" className="w-full sm:flex-1" asChild>
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
            Assistência 24h: {SITE.phones.assistance.display}
          </motion.a>

          <motion.div
            variants={fadeUp}
            className="mt-10 grid w-full grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-white/10 lg:grid-cols-4"
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
      <section className="bg-teal-50">
        <div className="container-page section-y space-y-10">
          <SectionHeading
            eyebrow="Por que a SaveCar"
            title="Direto ao ponto: o que você ganha"
            description="Sem letra miúda e sem burocracia — do primeiro clique até a vistoria."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => {
              const Icon = benefitIcons[benefit.icon] ?? Zap;
              return (
                <div
                  key={benefit.title}
                  className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-lift"
                >
                  <span className="grid size-11 place-items-center rounded-[var(--radius-input)] bg-teal-900 text-amber-500">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-teal-900">{benefit.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
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
            Descubra sua mensalidade em 30 segundos
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
                <img src={logo} alt="SaveCar Brasil" className="h-14 object-contain" />
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
              <a href={SITE.phones.commercial.href} className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  <span className="block font-semibold text-white">{SITE.phones.commercial.display}</span>
                  <span className="text-xs text-white/60">{SITE.phones.commercial.label}</span>
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
