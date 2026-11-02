"use client";
import Button from "@codegouvfr/react-dsfr/Button";
import { truncate } from "lodash";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

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

const ArrowRight = () => (
  <span className="fr-icon-arrow-right-line" aria-hidden="true" />
);

const HelpArticle = ({
  title,
  description,
  thumbnailUrl,
  thumbnailAlt,
  url,
}: {
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  url: string;
}) => (
  <Link href={url} className="!bg-none">
    <div className="grid w-[340px] h-[150px] lg:h-[400px] rounded-[32px] bg-white shadow-[0px_8px_24px_0px_rgba(11,11,248,0.16)] hover:scale-105 transition-all">
      <div className="hidden lg:flex">
        <Image
          src={thumbnailUrl}
          alt={thumbnailAlt}
          width={340}
          height={150}
          className="object-cover w-full rounded-t-[32px] max-w-[340px] max-h-[150px]"
          style={{ height: "auto" }}
        />
      </div>
      <div className="flex flex-col p-4 sm:p-6 h-auto justify-center lg:justify-start">
        <h4 className="text-md sm:text-xl font-bold mb-2 lg:mb-6">{title}</h4>
        <span className="text-sm sm:text-md sm:overflow-hidden">
          {description}
        </span>
      </div>
    </div>
  </Link>
);

export const HelpSection = ({ articles }: { articles: ArticleDAide[] }) => {
  const [
    numberOfArticlesToDisplayInitially,
    setNumberOfArticlesToDisplayInitially,
  ] = useState(4);

  const [textArticleToTruncate, setTextArticleToTruncate] = useState({
    forLongTitle: 90,
    forShortTitle: 120,
  });

  useEffect(() => {
    const screenWidth = window.innerWidth;
    setNumberOfArticlesToDisplayInitially(screenWidth < 1200 ? 2 : 4);
    setTextArticleToTruncate({
      forLongTitle: screenWidth < 1024 ? 90 : 200,
      forShortTitle: screenWidth < 1024 ? 120 : 250,
    });
  }, []);

  const [showMore, setShowMore] = useState(false);
  const articlesToDisplay = useMemo(
    () =>
      showMore
        ? articles
        : articles.slice(0, numberOfArticlesToDisplayInitially),
    [showMore, articles, numberOfArticlesToDisplayInitially],
  );
  const displayMoreButton =
    articles.length > numberOfArticlesToDisplayInitially && !showMore;

  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-8 items-center lg:items-start">
      {articlesToDisplay.map(({ documentId, ...article }) => {
        const isLongTitle = (article?.titre?.length ?? 0) > 40;

        return (
          <HelpArticle
            key={documentId}
            title={article?.titre || ""}
            description={truncate(article?.description || "", {
              length: isLongTitle
                ? textArticleToTruncate.forLongTitle
                : textArticleToTruncate.forShortTitle,
            })}
            thumbnailUrl={article?.vignette?.formats?.small?.url || ""}
            thumbnailAlt={article?.vignette?.alternativeText || ""}
            url={`/savoir-plus/articles/${article?.slug}`}
          />
        );
      })}
      {displayMoreButton && (
        <div className="flex w-full justify-center lg:justify-end lg:pr-16">
          <Button
            priority="secondary"
            onClick={() => {
              setShowMore(true);
            }}
          >
            <span className="mr-2">Voir tous les articles...</span>
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
};
