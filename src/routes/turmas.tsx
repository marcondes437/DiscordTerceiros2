import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Camera, Heart, Sparkles } from "lucide-react";
import { SocialSiteShell } from "@/components/social-site-shell";
import { CommunityAuth } from "@/components/community-auth";
import { useActivityPresence } from "@/components/activity-presence";
import labImage from "@/assets/community-lab.jpg";
import "./turmas.css";

export const Route = createFileRoute("/turmas")({
  validateSearch: (search: Record<string, unknown>): { turma: "a" | "b" } => ({
    turma: search["turma"] === "b" ? "b" : "a",
  }),
  head: () => ({ meta: [{ title: "Nossa história | SENAI Conecta" }] }),
  component: ClassStory,
});

const stories = {
  a: {
    title: "De desconhecidos a uma turma cheia de histórias.",
    intro:
      "O primeiro dia tinha um pouco de tudo: curiosidade, vergonha e aquela dúvida sobre como seria o ano. Aos poucos, os nomes viraram amizades e a sala virou um lugar nosso.",
    quote: "No fim, os melhores projetos foram as conexões que a gente construiu.",
    moments: [
      [
        "01",
        "O primeiro encontro",
        "Uma sala, muitos caminhos",
        "Cada um chegou com um jeito, um sonho e uma expectativa. Entre apresentações e as primeiras atividades, descobrimos que aprender juntos poderia ser muito mais interessante.",
      ],
      [
        "02",
        "Aprender fazendo",
        "Quando a teoria ganhou vida",
        "Vieram os desafios em grupo, as ideias no papel e os testes que nem sempre funcionavam de primeira. Um ajudava o outro, e cada erro virava uma nova tentativa.",
      ],
      [
        "03",
        "Além da sala",
        "As pequenas coisas que ficaram",
        "As conversas no intervalo, as piadas que só a turma entende e o apoio antes das entregas começaram a fazer parte da nossa rotina. Era mais do que dividir uma sala.",
      ],
      [
        "04",
        "Nosso último ano",
        "Ainda temos muito para viver",
        "Agora é hora de aproveitar cada encontro, tirar os projetos do papel e guardar os momentos. O próximo capítulo ainda está sendo escrito por todos nós.",
      ],
    ],
  },
  b: {
    title: "Jeitos diferentes. Uma história construída juntos.",
    intro:
      "Ninguém chegou sabendo como essa história ia ser. Bastaram as primeiras conversas, os trabalhos em equipe e um pouco de convivência para o Terceiro B começar a encontrar a própria identidade.",
    quote: "Uma boa turma é aquela que faz cada conquista parecer de todo mundo.",
    moments: [
      [
        "01",
        "Os primeiros dias",
        "Tudo começou com um “oi”",
        "As primeiras amizades apareceram entre uma atividade e outra. Pessoas com interesses diferentes descobriram assuntos em comum e começaram a dar voz à turma.",
      ],
      [
        "02",
        "Ideias em equipe",
        "Ninguém precisava resolver tudo sozinho",
        "Nos trabalhos e nas aulas práticas, cada pessoa trouxe uma habilidade. Teve planejamento, improviso e muita troca até as ideias começarem a ganhar forma.",
      ],
      [
        "03",
        "Nossa identidade",
        "O jeito B de fazer acontecer",
        "Com o tempo, surgiram as brincadeiras, os costumes e as lembranças que só fazem sentido para quem estava lá. Pequenos momentos viraram parte da nossa história.",
      ],
      [
        "04",
        "O que vem agora",
        "O melhor capítulo ainda está aberto",
        "O último ano traz desafios e vontade de fazer valer a pena. Entre projetos, novas experiências e planos para o futuro, seguimos construindo essa história juntos.",
      ],
    ],
  },
};

function ClassStory() {
  const { turma } = Route.useSearch();
  const story = stories[turma];
  const { user } = useActivityPresence();
  const [authOpen, setAuthOpen] = useState(false);
  const name = String(
    user?.user_metadata?.["display_name"] || user?.email?.split("@")[0] || "Visitante",
  );
  return (
    <SocialSiteShell
      user={user}
      name={name}
      activePage="class-story"
      onSignIn={() => setAuthOpen(true)}
    >
      <main className={`class-story class-story-${turma}`} key={turma}>
        <header className="class-story-toolbar">
          <Link to="/">
            <ArrowLeft size={17} /> Voltar ao início
          </Link>
          <span>NOSSAS TURMAS / NOSSA HISTÓRIA</span>
        </header>
        <nav className="class-story-tabs" aria-label="Escolher turma">
          {(["a", "b"] as const).map((id) => (
            <Link
              key={id}
              to="/turmas"
              search={{ turma: id }}
              aria-current={turma === id ? "page" : undefined}
            >
              <span className={`class-dot is-${id}`} />
              Terceiro {id.toUpperCase()}
            </Link>
          ))}
        </nav>
        <section className="class-story-hero">
          <img src={labImage} alt="Alunos em um laboratório, imagem ilustrativa" />
          <div className="class-story-shade" />
          <div className="class-story-hero-copy">
            <span>
              <BookOpen size={15} /> CADA TURMA TEM UMA HISTÓRIA
            </span>
            <p className="class-story-number">TERCEIRO {turma.toUpperCase()}</p>
            <h1>{story.title}</h1>
            <p>Os encontros, as ideias e os momentos que fazem a gente ser quem é.</p>
            <a href="#nossa-historia">
              Conheça nossa trajetória <ArrowUpRight size={16} />
            </a>
          </div>
          <span className="class-story-watermark" aria-hidden="true">
            {turma.toUpperCase()}
          </span>
        </section>
        <div className="class-story-content">
          <p className="class-story-example">
            <Sparkles size={15} />
            <span>
              História de exemplo — os textos abaixo são ilustrativos e podem ser substituídos pelas
              lembranças reais da turma.
            </span>
          </p>
          <section className="class-story-intro" id="nossa-historia">
            <span>COMO TUDO COMEÇOU</span>
            <h2>
              Mais do que uma sala.
              <br />
              Um pedaço da nossa vida.
            </h2>
            <p>{story.intro}</p>
          </section>
          <section
            className="class-story-timeline"
            aria-label={`Trajetória de exemplo do Terceiro ${turma.toUpperCase()}`}
          >
            <div className="class-story-section-heading">
              <span>CAPÍTULO POR CAPÍTULO</span>
              <h2>Nossa trajetória</h2>
            </div>
            {story.moments.map(([number, label, title, text]) => (
              <article key={number}>
                <span className="class-story-step">{number}</span>
                <div>
                  <span>{label}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </section>
          <blockquote className="class-story-quote">
            <Heart size={24} />
            <p>“{story.quote}”</p>
            <cite>Uma história para escrever juntos.</cite>
          </blockquote>
          <section className="class-story-memories">
            <div className="class-story-section-heading">
              <span>MOMENTOS QUE MERECEM FICAR</span>
              <h2>Nosso mural de lembranças</h2>
            </div>
            <div className="class-story-photo-empty">
              <Camera size={30} />
              <h3>A próxima lembrança pode ser sua.</h3>
              <p>
                Este espaço está reservado para as fotos reais da turma. Por enquanto, compartilhe
                seus momentos no Social.
              </p>
              <Link to="/social">
                Compartilhar um momento <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
          <footer className="class-story-footer">
            <div>
              <span>ESSA HISTÓRIA CONTINUA</span>
              <h2>E você faz parte dela.</h2>
              <p>Encontre a turma e viva o próximo capítulo.</p>
            </div>
            <Link to="/comunidade" className="btn-red">
              Ir para a comunidade <ArrowUpRight size={17} />
            </Link>
          </footer>
        </div>
      </main>
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </SocialSiteShell>
  );
}
