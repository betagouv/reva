import Image from "next/image";

import hexagonBackground from "./hexagonBackground.svg";

export const EmptyState = ({
  title,
  "data-testid": dataTest,
  pictogram,
  children,
}: {
  title: string;
  "data-testid": string;
  pictogram: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div
      data-testid={dataTest}
      className="min-h-80 h-full flex flex-col items-center"
    >
      <div className="my-6 relative flex items-center justify-center w-[208px] h-[234px]">
        <Image
          src={hexagonBackground}
          className="absolute inset-0"
          alt=""
          loading="eager"
        />
        <div className="z-10">{pictogram}</div>
      </div>
      <h3 className="text-center text-balance">{title}</h3>
      <div className="max-w-[600px] [&_p]:text-lg text-center text-balance leading-relaxed flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};
