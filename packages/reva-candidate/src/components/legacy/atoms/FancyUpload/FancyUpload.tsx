import CallOut from "@codegouvfr/react-dsfr/CallOut";
import { Upload } from "@codegouvfr/react-dsfr/Upload";
import {
  DetailedHTMLProps,
  InputHTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 } from "uuid";

import { FancyPreview } from "../FancyPreview/FancyPreview";

export const FancyUpload = ({
  title,
  description,
  hint,
  className,
  nativeInputProps,
  state,
  stateRelatedMessage,
  defaultFile,
  onClickDelete,
}: {
  title: string;
  description?: ReactNode;
  hint?: string;
  className?: string;
  nativeInputProps?: DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >;
  state?: "error" | "success" | "default";
  stateRelatedMessage?: ReactNode;
  defaultFile?: { name: string; url: string; mimeType: string };
  onClickDelete?: () => void;
}) => {
  const [filePreview, setFilePreview] = useState<File | null>(null);
  const urlPreview = useMemo(
    () => (filePreview ? URL.createObjectURL(filePreview) : null),
    [filePreview],
  );

  const inputId = useMemo(() => v4(), []);

  const downloadFiles = useCallback(async () => {
    if (!defaultFile) return;

    try {
      const dataTransfer = new DataTransfer();

      const { name, mimeType, url } = defaultFile;
      const response = await fetch(url);
      const data = await response.blob();

      const file = new File([data], name, {
        type: mimeType,
      });

      dataTransfer.items.add(file);

      const inputElement = document.getElementById(inputId);
      if (inputElement) {
        const input = inputElement as HTMLInputElement;
        input.files = dataTransfer.files;

        const event = new Event("change", { bubbles: true });
        input.dispatchEvent(event);
      }

      setFilePreview(file);
    } catch (error) {
      console.error(error);
    }
  }, [defaultFile, inputId]);

  useEffect(() => {
    downloadFiles();
  }, [downloadFiles]);

  return (
    <div className={`relative ${className || ""}`}>
      <Upload
        className={`border bg-gray-100 p-8`}
        label={
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex flex-row justify-between">
              <span className="text-2xl font-bold">{title}</span>

              {onClickDelete && (
                <div
                  className="flex flex-row items-center gap-2 text-sm font-medium text-dsfr-blue-france-sun-113 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    onClickDelete();
                  }}
                >
                  Supprimer
                  <span className="fr-icon-delete-line" />
                </div>
              )}
            </div>

            {description && (
              <CallOut
                className="ml-8 my-4 py-0 bg-transparent"
                classes={{
                  text: "text-sm leading-6 ",
                }}
              >
                {description}
              </CallOut>
            )}
          </div>
        }
        hint={hint}
        nativeInputProps={{
          id: inputId,
          ...nativeInputProps,
          onChange: (e) => {
            if (e.target.files) {
              const mappedFiles: File[] = [];
              for (let index = 0; index < e.target.files.length; index++) {
                const file = e.target.files[index];
                mappedFiles.push(file);
              }
              setFilePreview(mappedFiles[0]);
            } else {
              setFilePreview(null);
            }

            nativeInputProps?.onChange?.(e);
          },
        }}
        state={state}
        stateRelatedMessage={stateRelatedMessage}
      />

      {filePreview && urlPreview && (
        <FancyPreview title={title} name={filePreview.name} src={urlPreview} />
      )}
    </div>
  );
};
