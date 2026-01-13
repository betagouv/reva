export const sectionBuilder = (doc: PDFKit.PDFDocument) => {
  const addSection = ({
    title,
    iconPath,
    content,
  }: {
    title: string;
    iconPath: string;
    content: (doc: PDFKit.PDFDocument) => void;
  }) => {
    const yStart = doc.y;
    doc.image(iconPath, doc.x + pxToPt(40), doc.y + pxToPt(40), {
      fit: [pxToPt(40), pxToPt(40)],
    });

    doc
      .fontSize(14)
      .font("assets/fonts/Marianne/Marianne-Bold.otf")
      .text(title, doc.x + pxToPt(90), doc.y + pxToPt(32));

    doc.moveDown(0.5);

    content(doc);

    doc.moveDown(1);
    const yEnd = doc.y;

    doc
      .rect(pxToPt(100), yStart, pxToPt(1280), yEnd - yStart)
      .strokeColor("#DDDDDD")
      .lineWidth(0.5)
      .stroke();
  };

  return { addSection, addSubTitle };
};

export const pxToPt = (pixels: number) => pixels / 2.48;

export const addSubTitle = ({
  subTitle,
  doc,
}: {
  subTitle: string;
  doc: PDFKit.PDFDocument;
}) => {
  doc
    .fontSize(12)
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .text(subTitle, doc.x + pxToPt(-50));
  doc.moveDown(0.5);
};
