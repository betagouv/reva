import CallOut from "@codegouvfr/react-dsfr/CallOut";
import { Upload } from "@codegouvfr/react-dsfr/Upload";
import {
  DetailedHTMLProps,
  InputHTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 } from "uuid";

import {
  FancyPreview,
  isPreviewableMimeType,
} from "../fancy-preview/FancyPreview";

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

  const refInputId = useRef<string>(v4());

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

      const inputElement = document.getElementById(refInputId.current);
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
  }, [defaultFile]);

  useEffect(() => {
    downloadFiles();
  }, [downloadFiles]);

  if (filePreview) {
    const inputElement = document.getElementById(refInputId.current);
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
        className={`border bg-dsfr-light-neutral-grey-1000 p-8`}
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
                  data-testid="delete-file-button"
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
          id: refInputId.current,
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

      {filePreview && urlPreview && isPreviewableMimeType(filePreview.type) && (
        <FancyPreview title={title} name={filePreview.name} src={urlPreview} />
      )}
    </div>
  );
};
