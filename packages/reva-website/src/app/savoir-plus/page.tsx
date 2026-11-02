import { Accordion } from "@codegouvfr/react-dsfr/Accordion";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { draftMode } from "next/headers";

import { MainLayout } from "@/app/_components/layout/main-layout/MainLayout";

import { graphql } from "@/graphql/generated";
import { strapi } from "@/graphql/strapi";

import { HelpSection } from "./_components/HelpSection";

export const metadata = {
  title: "France VAE | Espace d'information ",
  description:
    "Retrouvez des informations sur la VAE, des conseils et des réponses à vos questions sur la Validation des Acquis de l'Expérience.",
};

export const revalidate = 600;

const SavoirPlusPage = async () => {
  const { isEnabled: preview } = await draftMode();
  const sections = await getSectionDAides(preview);
  return (
    <>
      <MainLayout preview={preview}>
        <div className="flex flex-col">
          <div className="flex flex-col min-h-[300px] items-center justify-center bg-white p-4">
            <h1 className="text-5xl font-bold">En savoir plus sur la VAE</h1>
            <h2 className="text-2xl font-bold">
              Trouvez des réponses à vos questions à propos de votre VAE.
            </h2>
            <div className="flex gap-4">
              <Button size="small" linkProps={{ href: "/faq" }}>
                Questions fréquentes
              </Button>
            </div>
          </div>
          <div className="flex flex-col p-4 lg:p-32 lg:pt-8 ">
            {sections?.sectionDAides?.map((sa, index) => {
              const articles = sa?.article_d_aides.filter((a) => a !== null);
              if (!articles?.length) return null;

              return (
                <Accordion
                  label={
                    <span className="text-2xl text-dsfrBlue-franceSun">
                      {sa?.titre || ""}
                    </span>
                  }
                  defaultExpanded={!index}
                  key={sa?.documentId}
                >
                  <HelpSection articles={articles} />
                </Accordion>
              );
            })}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

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

const sectionsQuery = graphql(`
  query getSectionDAides($publicationState: PublicationStatus!) {
    sectionDAides(sort: "ordre", status: $publicationState) {
      documentId
      titre
      article_d_aides(
        sort: "ordre"
        filters: { publishedAt: { notNull: true } }
      ) {
        documentId
        slug
        titre
        publishedAt
        vignette {
          url
          alternativeText
          formats
        }
        description
      }
    }
  }
`);

const getSectionDAides = async (preview = false) => {
  return strapi.request(sectionsQuery, {
    publicationState: preview ? "DRAFT" : "PUBLISHED",
  });
};

export default SavoirPlusPage;
