import { Card } from "@codegouvfr/react-dsfr/Card";
import request from "graphql-request";

import { STRAPI_GRAPHQL_API_URL, WEBSITE_BASE_URL } from "@/config/config";

import { graphql } from "@/graphql/generated";

type ArticleDAide = {
  documentId: string;
  titre: string;
  slug: string;
  description: string;
};

const articlesQuery = graphql(`
  query getArticlesForCertificationPageUsefulResources {
    articleDAides(
      filters: {
        slug: {
          in: [
            "comment-bien-choisir-son-diplome"
            "quand-faire-une-vae"
            "financer-son-accompagnement-vae"
          ]
        }
      }
    ) {
      documentId
      titre
      slug
      description
    }
  }
`);

export const UsefulResources = async ({
  classname,
}: {
  classname?: string;
}) => {
  const articlesDAideFromStrapi = (
    await request(STRAPI_GRAPHQL_API_URL, articlesQuery)
  ).articleDAides;

  const articlesDAide = [
    "comment-bien-choisir-son-diplome",
    "quand-faire-une-vae",
    "financer-son-accompagnement-vae",
  ]
    .map((slug) => articlesDAideFromStrapi.find((a) => a?.slug === slug))
    .filter((a): a is ArticleDAide => !!a);

  return (
    <div className={`flex flex-col ${classname || ""}`}>
      <h2>Ressources utiles</h2>
      <p>
        À la recherche de plus d’informations ? Découvrez nos articles de blog
        pour mieux comprendre, préparer et réussir sa VAE.
      </p>
      <div className="flex flex-wrap gap-6">
        {articlesDAide.map((article) => (
          <Card
            key={article.documentId}
            title={article.titre}
            desc={article.description}
            className="h-auto md:w-[calc(33.3%-1.5rem)] grow"
            linkProps={{
              href: `${WEBSITE_BASE_URL}/savoir-plus/articles/${article.slug}`,
            }}
            enlargeLink
          />
        ))}
      </div>
    </div>
  );
};
