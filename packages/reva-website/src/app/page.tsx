import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import Notice from "@codegouvfr/react-dsfr/Notice";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { MainLayout } from "@/app/_components/layout/main-layout/MainLayout";
import { PICTOGRAMS } from "@/components/pictograms";

import { graphql } from "@/graphql/generated";
import { strapi } from "@/graphql/strapi";

import type { Metadata } from "next";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "France VAE | Bienvenue sur le portail de la VAE",
  description:
    "Découvrez la version beta du portail officiel du service public de la Validation des Acquis de L'Expérience.",
};

const HomeContainer = ({ children }: { children: ReactNode }) => (
  <div className="w-full mx-auto relative flex flex-col items-center">
    {children}
  </div>
);

const HomePage = async () => {
  const homePageItemsResult = await getHomePageItemsFromStrapi();
  const articlesDaide = homePageItemsResult.articlesDAide;
  const articlesFAQ = homePageItemsResult.articlesFAQ;
  const articlesActualite = homePageItemsResult.articlesActualite;
  const homePageNoticeText = homePageItemsResult.homePageNoticeText;

  return (
    <MainLayout className="relative">
      {homePageNoticeText && (
        <Notice data-testid="home-notice-text" title={homePageNoticeText} />
      )}
      <HomeContainer>
        <HomePageContent
          articleDAides={articlesDaide as ArticleDAide[]}
          articlesFAQ={articlesFAQ as ArticleFaq[]}
          articlesActualite={articlesActualite as ArticleActualite[]}
        />
      </HomeContainer>
    </MainLayout>
  );
};

const HomePageContent = ({
  articleDAides,
  articlesFAQ,
  articlesActualite,
}: {
  articleDAides: ArticleDAide[];
  articlesFAQ: ArticleFaq[];
  articlesActualite: ArticleActualite[];
}) => (
  <>
    <BienvenueSection />
    <QuiEtesVousSection />
    <LesActualitesFranceVAESection articlesActualite={articlesActualite} />
    <ToutSavoirSurLaVAESection articlesDaide={articleDAides} />
    <LesAvantagesSection />
    <LaVAEUnDispositifAccessibleATousSection />
    <LAVAEEnChiffresSection />
    <QuestionsFrequentesSection articlesFAQ={articlesFAQ} />
  </>
);

function getBackgroundImage(srcSet = "") {
  const imageSet = srcSet
    .split(", ")
    .map((str) => {
      const [url, dpi] = str.split(" ");
      return `url("${url}") ${dpi}`;
    })
    .join(", ");
  return `image-set(${imageSet})`;
}

const BienvenueSection = async () => {
  const {
    props: { srcSet },
  } = getImageProps({
    alt: "Deux personnes souriant le regard tourné vers l'objectif",
    width: 2880,
    height: 1272,
    src: "/home-page/homepage_hero.png",
  });

  const backgroundImage = getBackgroundImage(srcSet);

  return (
    <section className="w-full md:px-6 md:py-8 md:pt-12 md:pb-20 relative">
      <div
        className="absolute w-full h-full bg-cover inset-0 -z-10 hidden md:block"
        style={{ backgroundImage }}
      />
      <div className="fr-container flex !p-0">
        <div className="md:w-[575px] md:h-[512px] bg-[#FAF9FE] px-6 py-8 md:p-12 flex flex-col items-start shadow-[0px_4px_12px_0px_rgba(0,0,18,0.32)]">
          <h1 className="text-2xl md:text-[40px] leading-tight">
            Bienvenue sur le portail officiel de la VAE
          </h1>
          <p className="text-base md:text-xl">
            La Validation des Acquis de l'Expérience (VAE) offre une 3ème voie
            d'accès à la certification en France, équivalente à la formation
            initiale, continue ou en alternance.
          </p>
          <p className="text-base md:text-xl">
            En 2022, une réforme de la VAE portée par le Ministère du Travail a
            engagé la création du service public de la VAE et de cette
            plateforme.
          </p>
          <Button
            iconId="fr-icon-arrow-right-line"
            iconPosition="right"
            className="mt-auto"
            linkProps={{
              href: `${process.env.NEXT_PUBLIC_CANDIDATE_BASE_URL || "/candidat"}/register/`,
              target: "_self",
            }}
          >
            Commencez votre parcours VAE
          </Button>
        </div>
      </div>
    </section>
  );
};

const QuiEtesVousSection = async () => {
  return (
    <section className="w-full px-6 py-8 md:pt-12 md:pb-20 bg-[#cedff4]">
      <div className="fr-container !p-0">
        <h2 className="text-[22px] md:text-[32px] mb-8 text-dsfrBlue-franceSun md:text-black">
          Qui êtes-vous ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <QuiEtesVousCard
            title="Candidat"
            titleIcon={
              <Image
                src="/home-page/young_man_dc.png"
                alt="visage jeune homme souriant"
                width={40}
                height={47}
              />
            }
            subtitle="Transformez votre expérience professionnelle en diplôme reconnu !"
            description="Constituez votre dossier VAE pas à pas avec un accompagnement pour vous aider à valoriser vos compétences et  obtenir votre diplôme."
          >
            <Button
              priority="secondary"
              iconId="fr-icon-arrow-right-line"
              iconPosition="right"
              className="mt-auto"
              linkProps={{
                href: `${process.env.NEXT_PUBLIC_CANDIDATE_BASE_URL || "/candidat"}/register/`,
                target: "_self",
              }}
            >
              Commencez votre parcours VAE
            </Button>
          </QuiEtesVousCard>
          <QuiEtesVousCard
            title="Accompagnateur"
            titleIcon={
              <Image
                src="/home-page/young_woman_dc.png"
                alt="visage jeune homme souriant"
                width={40}
                height={47}
              />
            }
            subtitle="Guidez les candidats vers la réussite de leur VAE."
            description="Assurez un suivi complet des parcours VAE : échangez avec les certificateurs et gérez chaque étape, du premier entretien jusqu'au jury sur une plateforme unique et centralisée."
          >
            <Button
              priority="secondary"
              iconId="fr-icon-arrow-right-line"
              iconPosition="right"
              className="mt-auto"
              linkProps={{
                href: "/savoir-plus/articles/espace-architecte-accompagnateur-de-parcours",
                target: "_self",
              }}
            >
              Accompagnez les candidats
            </Button>
          </QuiEtesVousCard>
          <QuiEtesVousCard
            title="Certificateur"
            titleIcon={
              <Image
                src="/home-page/young_man_dc_2.png"
                alt="visage jeune homme souriant"
                width={40}
                height={47}
              />
            }
            subtitle="Simplifiez la gestion des certifications et des candidatures."
            description="Gérez vos certifications, collaborez avec les accompagnateurs et suivez les parcours VAE de la recevabilité au jury en toute autonomie."
          >
            <Button
              priority="secondary"
              iconId="fr-icon-arrow-right-line"
              iconPosition="right"
              className="mt-auto"
              linkProps={{
                href: "/savoir-plus/articles/espace-certificateurs/",
                target: "_self",
              }}
            >
              Créez votre espace certificateur
            </Button>
          </QuiEtesVousCard>
          <QuiEtesVousCard
            title="VAE collective"
            titleIcon={
              <Image
                src="/home-page/young_man_dc_3.png"
                alt="porteur de projet VAE collective"
                width={40}
                height={47}
              />
            }
            subtitle="Lancez un projet de VAE collective à l'échelle de votre organisation."
            description="Ciblez les bons métiers, mobilisez des accompagnateurs et suivez vos collaborateurs vers la certification en valorisant leur expérience."
          >
            <Button
              priority="secondary"
              iconId="fr-icon-arrow-right-line"
              iconPosition="right"
              className="mt-auto"
              linkProps={{
                href: "https://vae.gouv.fr/savoir-plus/articles/lancez-votre-projet-de-vae-collective/",
                target: "_self",
              }}
            >
              Démarrez un projet de VAE collective
            </Button>
          </QuiEtesVousCard>
        </div>
      </div>
    </section>
  );
};

const QuiEtesVousCard = ({
  title,
  titleIcon,
  subtitle,
  description,
  children,
}: {
  title: string;
  titleIcon: ReactNode;
  subtitle: string;
  description: string;
  children?: ReactNode;
}) => (
  <div className="min-h-[250px] h-full p-6 md:p-8 pb-10 bg-white flex flex-col">
    <div className="flex items-center gap-3 mb-3">
      {titleIcon}
      <h3 className="mb-0 text-[20px] md:text-[22px] text-dsfrBlue-franceSun md:text-black">
        {title}
      </h3>
    </div>
    <p className="font-bold">{subtitle}</p>
    <p>{description}</p>
    {children}
  </div>
);

const LesActualitesFranceVAESection = ({
  articlesActualite,
}: {
  articlesActualite: ArticleActualite[];
}) => (
  <section className="w-full bg-neutral-100 px-6 py-8 md:pt-20 md:pb-20">
    <div className="fr-container flex flex-col !p-0">
      <h2 className="text-[22px] md:text-[32px] mb-8">
        Les actualités de France VAE
      </h2>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-8">
        {articlesActualite.map((article) => (
          <div
            key={article.documentId}
            className="w-[312px] h-fit mx-auto md:mx-0 md:w-[520px] md:h-[252px] p-8 pl-6 flex flex-col border border-neutral-400 bg-white"
          >
            <h3 className="text-dsfrBlue-franceSun text-lg md:text-[22px] mb-3">
              {article.titre}
            </h3>
            <div
              className="ck-content"
              dangerouslySetInnerHTML={{
                __html:
                  article?.contenu?.replaceAll("<a", "<a target='_'") || "",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ToutSavoirSurLaVAESection = ({
  articlesDaide,
}: {
  articlesDaide: ArticleDAide[];
}) => (
  <section className="w-full bg-[#1B1B33] px-6 py-8 md:pt-20 md:pb-20">
    <div className="fr-container flex flex-col !p-0">
      <h2 className="text-[22px] md:text-[32px] mb-8 text-white ">
        Tout savoir sur la Validation des Acquis de l’Expérience
      </h2>
      <div className="flex flex-col md:flex-row gap-6">
        {articlesDaide.map((article) => (
          <Card
            key={article.documentId}
            title={article.titre}
            imageUrl={article.vignette.formats?.small?.url}
            imageAlt={article.vignette.alternativeText || ""}
            desc={article.description}
            className="md:h-[516px] md:w-[400px]"
            nativeImgProps={{
              loading: "lazy",
            }}
            linkProps={{
              href: `/savoir-plus/articles/${article.slug}`,
            }}
            enlargeLink
          />
        ))}
      </div>
      <p className="mt-10 text-xl text-[#CECECE]">
        Retrouvez tous nos articles sur{" "}
        <Link
          href="/savoir-plus/"
          target="_self"
          className="fr-link !text-xl !text-[#8585F6]"
        >
          l’espace d’informations
        </Link>
      </p>
    </div>
  </section>
);

const LesAvantagesSection = () => (
  <section className="w-full bg-neutral-100 px-6 py-8 md:pt-20 md:pb-20">
    <div className="fr-container flex flex-col !p-0">
      <h2 className="text-[22px] md:text-[32px] mb-8 ">
        Les avantages de la plateforme France VAE
      </h2>
      <div className="flex flex-col items-center md:flex-row gap-6">
        <AvantageCard
          title="Démarches et gestion simplifiées"
          description="Une plateforme unique adaptée à chaque acteur de la VAE pour candidater, accompagner les parcours  ou gérer les certifications."
          pictogram={PICTOGRAMS.accessibility}
        />
        <AvantageCard
          title="Accompagnement personnalisé"
          description="Profitez de l'expertise d'un accompagnateur pour sécuriser votre parcours VAE."
          pictogram={PICTOGRAMS.community}
        />
        <AvantageCard
          title="Ressources conçues par des experts de la VAE"
          description="Accédez à des dizaines de contenus utiles, que vous soyez candidat, accompagnateur ou certificateur."
          pictogram={PICTOGRAMS.binders}
        />
      </div>
      <p className="mt-10 text-xl">
        En savoir plus sur{" "}
        <Link href="/cgu/" target="_self" className="fr-link !text-xl">
          les conditions de réalisation d’un parcours de VAE
        </Link>
      </p>
    </div>
  </section>
);

const AvantageCard = ({
  title,
  description,
  pictogram,
}: {
  title: string;
  description: string;
  pictogram: ReactNode;
}) => (
  <div className="md:h-[420px] lg:h-[320px] md:w-[400px] p-8 flex flex-col items-center text-center border border-[#929292] border-b-4 border-b-[#3A3A3A] bg-white">
    <div>{pictogram}</div>
    <h3 className="mt-4 mb-2 text-[20px] leading-snug">{title}</h3>
    <p className="mb-0">{description}</p>
  </div>
);

const LaVAEUnDispositifAccessibleATousSection = async () => {
  return (
    <section className="w-full bg-white px-6 py-8 md:pt-12 md:pb-20">
      <div className="fr-container flex flex-col items-center md:flex-row !p-0 gap-12 md:gap-20">
        <Image
          src="/home-page/avatar_1_section_3.png"
          alt="3 visages souriants"
          width={312}
          height={393}
          className="basis-1/3"
        />
        <div className="flex flex-col basis-2/3">
          <h2 className="text-[22px] md:text-[32px] mb-8">
            La VAE, un dispositif accessible à tous !
          </h2>
          <p className="text-xl mb-8">
            Vous pouvez dès maintenant vous inscrire pour commencer un parcours
            VAE. La seule exception ? Si vous êtes agent public, le parcours VAE
            ne s’effectue pas via notre plateforme.
            <br />
            Contactez les{" "}
            <Link
              href="/savoir-plus/articles/vae-ou-se-renseigner/"
              target="_self"
              className="fr-link !text-xl"
            >
              organismes référents
            </Link>{" "}
            pour en savoir plus.
          </p>
          <Button
            linkProps={{
              href: `${process.env.NEXT_PUBLIC_CANDIDATE_BASE_URL || "/candidat"}/register/`,
              target: "_self",
            }}
          >
            Commencez votre parcours VAE
          </Button>
        </div>
      </div>
    </section>
  );
};

const LAVAEEnChiffresSection = () => (
  <section className="w-full bg-white md:py-8 md:pt-12 md:pb-20">
    <div className="flex flex-col justify-center md:flex-row mb-8 !p-6 md:!py-20 md:!px-16 bg-[#CAE0F6]">
      <div className="flex flex-col justify-center max-w-sm mr-6 mb-8 md:mb-0">
        <h2 className="text-[22px] md:text-[32px]">La VAE en chiffres</h2>
        <p>
          <strong>
            Depuis 2002, plus de 400 000 candidats ont obtenu leur diplôme grâce
            à la VAE.
          </strong>
        </p>
        <p>
          Avec un taux de réussite élevé, un processus efficace et des candidats
          satisfaits, découvrez les chiffres clés.
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[700px]">
          <PolygonChiffre
            title="+ de 87%"
            subtitle="des candidats"
            description="ont obtenu leur diplôme"
          />
          <PolygonChiffre
            title="8 mois"
            subtitle="en moyenne"
            description="pour réaliser son parcours VAE"
          />
          <PolygonChiffre
            title="94%"
            subtitle="des candidats"
            description="recommandent de faire un parcours VAE"
          />
        </div>
      </div>
    </div>
  </section>
);

const PolygonChiffre = ({
  title,
  subtitle,
  description,
}: {
  title: string;
  subtitle: string;
  description: string;
}) => (
  <div className="w-[240px] h-[268px] p-10 flex flex-col justify-center items-center gap-1.5 bg-[url('/home-page/white_polygon.svg')] bg-contain bg-no-repeat">
    <span className="text-[#E1000F] text-[32px] font-bold">{title}</span>
    <span className="font-bold">{subtitle}</span>
    <span className="whitespace-break-spaces text-center">{description}</span>
  </div>
);

const QuestionsFrequentesSection = ({
  articlesFAQ,
}: {
  articlesFAQ: ArticleFaq[];
}) => (
  <section className="w-full bg-white px-6 pb-8 md:pt-0 md:pb-20">
    <div className="fr-container flex flex-col !p-0">
      <h2 className="text-[22px] md:text-[32px] mb-8">Questions fréquentes</h2>
      <div className="flex flex-col mb-8">
        {articlesFAQ.map((a) => (
          <Accordion
            key={a.documentId}
            label={<p className="text-blue-900">{a?.question}</p>}
            className="text-gray-700 font-normal"
          >
            <div
              className="ck-content"
              dangerouslySetInnerHTML={{
                __html: a?.reponse?.replaceAll("<a", "<a target='_'") || "",
              }}
            />
          </Accordion>
        ))}
      </div>
      <p className="text-xl mb-8">
        Accédez à toutes les{" "}
        <Link href="/faq/" target="_self" className="fr-link !text-xl">
          questions fréquentes
        </Link>
      </p>
    </div>
  </section>
);

export type ArticleDAide = {
  documentId: string;
  titre: string;
  slug: string;
  description: string | null;
  vignette: {
    alternativeText: string | null;
    formats: {
      small: {
        url: string;
      };
    };
  };
};

export type ArticleFaq = {
  documentId: string;
  question: string;
  reponse: string | null;
};

export type ArticleActualite = {
  documentId: string;
  titre: string;
  contenu: string | null;
};

const homePageItemsQuery = graphql(`
  query getHomePageItems {
    articleDAides(
      filters: {
        slug: {
          in: [
            "etapes-parcours-france-vae"
            "quest-ce-que-france-vae"
            "qui-accompagne-a-la-vae"
          ]
        }
      }
    ) {
      documentId
      titre
      slug
      vignette {
        alternativeText
        formats
      }
      description
    }
    articleFaqs(
      filters: {
        documentId: {
          in: [
            "uk9035s38u122xg169nqrkhw"
            "rhrg04z5psnnl3ka3em4fo8p"
            "r890ckfm4o29lupb6w22d4he"
            "gbskuvsjqvgzvscvbr75n5vq"
          ]
        }
      }
    ) {
      documentId
      question
      reponse
    }
    articleActualites(sort: "ordre", pagination: { pageSize: 3 }) {
      documentId
      titre
      contenu
    }
    homePage {
      bandeau
    }
  }
`);

const getHomePageItemsFromStrapi = async () => {
  const homePageItems = await strapi.request(homePageItemsQuery);

  return {
    articlesDAide: [
      "etapes-parcours-france-vae",
      "quest-ce-que-france-vae",
      "qui-accompagne-a-la-vae",
    ]
      .map((slug) => homePageItems.articleDAides.find((a) => a?.slug === slug))
      .filter(Boolean),
    articlesFAQ: [
      "uk9035s38u122xg169nqrkhw",
      "rhrg04z5psnnl3ka3em4fo8p",
      "r890ckfm4o29lupb6w22d4he",
      "gbskuvsjqvgzvscvbr75n5vq",
    ]
      .map((documentId) =>
        homePageItems.articleFaqs.find((a) => a?.documentId === documentId),
      )
      .filter(Boolean),
    articlesActualite: homePageItems.articleActualites,
    homePageNoticeText: homePageItems.homePage?.bandeau,
  };
};

export default HomePage;
