export const SITE = {
  name: "SaveCar Brasil",
  legalName: "SaveCar Brasil — Associação de Proteção Veicular",
  foundedYear: 2013,
  yearsOnMarket: 13,
  city: "Contagem",
  state: "MG",
  affiliation: {
    acronym: "AAAPV",
    name: "Agência de Autorregulamentação das Entidades de Autogestão de Planos de Proteção Contra Riscos Patrimoniais",
  },
  phones: {
    assistance: { label: "Assistência 24h", display: "0800 591 0654", href: "tel:08005910654" },
    commercial: { label: "Comercial", display: "(31) 3157-6768", href: "tel:+553131576768" },
  },
  social: {
    instagram: "https://www.instagram.com/savecarbrasil?igsh=dWJjbnVhbGF1MzZz",
    linkedin: "https://www.linkedin.com/company/save-car-brasil/",
  },
} as const;

export const STATS = [
  { prefix: "+", value: "30", label: "Filiais" },
  { prefix: "+", value: "100 mi", label: "Indenizados" },
  { prefix: "+", value: "90 mil", label: "Associados" },
  { prefix: "", value: "13 anos", label: "de mercado" },
] as const;

export type Coverage = { title: string; description: string; icon: string };

export const COVERAGES: Coverage[] = [
  { title: "Furto / Roubo", description: "Seja ressarcido em até 100% do valor de tabela FIPE caso seu veículo seja roubado ou furtado.", icon: "shield" },
  { title: "Colisão", description: "Em caso de acidente, nós providenciamos o conserto do seu veículo.", icon: "car-front" },
  { title: "Perda total", description: "Se o estrago configurar perda total, nós indenizamos o prejuízo.", icon: "car-taxi-front" },
  { title: "Incêndio", description: "Seu veículo protegido em casos de incêndio, com indenização total ou parcial.", icon: "flame" },
  { title: "Fenômenos naturais", description: "Alagamentos, quedas de árvores ou chuvas de granizo: ressarcimos o prejuízo.", icon: "cloud-lightning" },
  { title: "Cobertura em todo o Brasil", description: "Não importa onde aconteça o evento, você conta conosco em território nacional.", icon: "map" },
  { title: "Carro reserva", description: "Um carro reserva à disposição enquanto o seu está na oficina.", icon: "key-round" },
  { title: "Proteção para terceiros", description: "Acidente com outro veículo: os consertos ficam por nossa conta.", icon: "users" },
  { title: "Cobertura para vidros", description: "Danos nos vidros são substituídos.", icon: "layers" },
];

export type FaqItem = { question: string; answer: string };

export const FAQ: FaqItem[] = [
  { question: "Proteção veicular é legal?", answer: "Sim. O modelo associativo se apoia na liberdade de associação prevista na Constituição Federal e foi organizado pela Lei Complementar 213/2025, que trouxe exigências de governança e transparência ao setor. A SaveCar Brasil é filiada à AAAPV." },
  { question: "Qual a diferença para um seguro tradicional?", answer: "No seguro, o preço vem de uma análise de perfil do condutor e o pagamento segue a apólice. Na proteção veicular, os associados rateiam os custos dos eventos do grupo, sem análise de perfil, com regras definidas em regulamento." },
  { question: "Preciso passar por análise de perfil?", answer: "Não. A cotação considera o veículo e as coberturas escolhidas. Você descobre o valor da mensalidade em menos de 2 minutos, sem compromisso." },
  { question: "E se eu tiver um sinistro?", answer: "Você aciona a nossa central 24h, abrimos o evento, indicamos a oficina da rede e acompanhamos o conserto. Em caso de perda total, furto ou roubo, o ressarcimento segue o valor de tabela FIPE conforme o regulamento." },
  { question: "A cobertura vale em todo o Brasil?", answer: "Sim. As coberturas e a assistência 24h (reboque, chaveiro, troca de pneus, táxi, hospedagem e guarda do veículo) valem em todo o território nacional." },
  { question: "Posso cancelar quando quiser?", answer: "Sim. A adesão não tem fidelidade contratual: o associado pode solicitar o desligamento a qualquer momento, respeitando os prazos e condições descritos no regulamento vigente." },
  { question: "Como funciona a vistoria?", answer: "Depois de contratar, você baixa o aplicativo e faz a própria vistoria pelo celular, com fotos guiadas. Isso acelera a ativação da proteção, sem precisar deslocar o veículo." },
];

export const BENEFITS = [
  { icon: "zap", title: "Cotação em 30 segundos", description: "Sem cadastro longo, sem análise de perfil. Você informa a placa e vê o valor na hora." },
  { icon: "unlock", title: "Sem fidelidade", description: "Você pode solicitar o desligamento quando quiser, conforme o regulamento vigente." },
  { icon: "smartphone", title: "Vistoria pelo app", description: "Fotos guiadas pelo celular. A proteção ativa mais rápido, sem deslocar o veículo." },
  { icon: "headphones", title: "Central 24h de verdade", description: "Reboque, chaveiro, pneu, táxi e hospedagem acionados a qualquer hora, em todo o país." },
  { icon: "users-round", title: "Atendimento humano", description: "Equipe interna de regulação e rede própria de oficinas parceiras — sem robô no meio do caminho." },
  { icon: "badge-check", title: "13 anos e +90 mil associados", description: "Sede própria em Contagem/MG e mais de R$ 100 milhões já indenizados." },
] as const;
