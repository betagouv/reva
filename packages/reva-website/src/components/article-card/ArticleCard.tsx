import Card from "@codegouvfr/react-dsfr/Card";

type ArticleDAide = {
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

export const ArticleCard = ({ article }: { article: ArticleDAide | null }) => {
  if (!article) return null;
  const { vignette, titre, description, slug } = article;
  return (
    <div className="container">
      <Card
        background
        border
        enlargeLink
        desc={description}
        imageAlt={vignette?.alternativeText as string}
        imageUrl={vignette?.formats?.small?.url as string}
        nativeImgProps={{
          loading: "lazy",
        }}
        linkProps={{
          href: `/savoir-plus/articles/${slug}`,
        }}
        size="large"
        title={titre}
        classes={{
          title: "!text-dsfrBlue-franceSun",
        }}
      />
    </div>
  );
};
