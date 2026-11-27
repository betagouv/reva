import { useState } from "react";

export const isPreviewableMimeType = (mimeType?: string | null) =>
  mimeType === "application/pdf" || !!mimeType?.startsWith("image/");

interface Props {
  title: string;
  name: string;
  src: string;
  defaultDisplay?: boolean;
}

export const FancyPreview = (props: Props) => {
  const { title, name, src, defaultDisplay = true } = props;

  const [display, setDisplay] = useState<boolean>(defaultDisplay);

  const backgroundColor = display ? "bg-[#E3E3FD]" : "bg-transparent";

  return (
    <div
      className="flex flex-col gap-4 first:border-t border-gray-200 border-b"
      data-testid={`feasibility-files-preview-${title}`}
    >
      <div
        className={`flex flex-row items-center justify-between px-4 py-3 cursor-pointer ${backgroundColor}`}
        onClick={() => setDisplay(!display)}
      >
        <label className="text-blue-800 font-medium cursor-pointer max-w-xs sm:max-w-md break-words">
          {title}
        </label>
        <span
          className={`text-blue-800 ${display ? "fr-icon-eye-off-fill" : "fr-icon-eye-fill"}`}
          aria-hidden="true"
          data-testid={`feasibility-files-preview-${title}-toggle`}
        />
      </div>
      {display && (
        <iframe
          className="w-full h-[500px] px-4"
          title={title}
          name={name}
          src={src}
        />
      )}
    </div>
  );
};
