import { Card } from "@codegouvfr/react-dsfr/Card";

import { graphql } from "@/graphql/generated";
import { strapi } from "@/graphql/strapi";

type ArticleDAide = {
  documentId: string;
  titre: string;
  slug: string;
  description: string | null;
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
  const articlesDAideFromStrapi = (await strapi.request(articlesQuery))
    .articleDAides;

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
            className="md:h-[284px] md:w-[384px]"
            linkProps={{
              href: `/savoir-plus/articles/${article.slug}`,
            }}
            enlargeLink
          />
        ))}
      </div>
    </div>
  );
};
