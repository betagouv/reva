import { Button } from "@codegouvfr/react-dsfr/Button";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import { Upload } from "@codegouvfr/react-dsfr/Upload";
import {
  ReactNode,
  DetailedHTMLProps,
  InputHTMLAttributes,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { v4 } from "uuid";

import { FancyPreview } from "../fancy-preview/FancyPreview";

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
  dataTest,
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
  dataTest?: string;
}) => {
  const [filePreview, setFilePreview] = useState<File | null>(null);
  const urlPreview = useMemo(
    () => (filePreview ? URL.createObjectURL(filePreview) : null),
    [filePreview],
  );

  const inputId = useMemo(() => v4(), []);

  const downloadFiles = useCallback(async () => {
    if (!defaultFile) {
      setFilePreview(null);
      return;
    }

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

  if (filePreview) {
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      const input = inputElement as HTMLInputElement;
      if (!input.files?.length) {
        setFilePreview(null);

        downloadFiles();
      }
    }
  }

  return (
    <div className={`relative ${className || ""}`} data-testid={dataTest}>
      <Upload
        className={`border bg-dsfrGray-50 p-8`}
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
                <Button
                  data-testid="delete-file-button"
                  priority="tertiary no outline"
                  size="small"
                  iconId="fr-icon-delete-line"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClickDelete();
                  }}
                >
                  Supprimer
                </Button>
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
        <FancyPreview
          title={title}
          name={filePreview.name}
          src={urlPreview}
          showFileName={false}
          transparentBg={false}
        />
      )}
    </div>
  );
};
