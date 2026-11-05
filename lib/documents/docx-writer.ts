import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  LineRuleType,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlignTable,
  type TableVerticalAlign,
  WidthType,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import type { Block, DocModel, LetterheadData, Run } from "./model";

// Word measures in twentieths of a point ("twips"). A4 = 11906 x 16838.
const A4 = { width: 11906, height: 16838 };
const MARGIN = { top: 1134, bottom: 1134, left: 1440, right: 1304 }; // ~2cm / 2.54cm / 2.3cm
const CONTENT_WIDTH = A4.width - MARGIN.left - MARGIN.right;
const NUMBERING_REF = "pp-paragraphs";
const LETTERHEAD_FONT = "Arial";
const SCRIPT_FONT = "Monotype Corsiva";

export type DocxAssets = { logo?: ArrayBuffer | Uint8Array };

// Header and footer text is always single-spaced, whatever the body uses.
const TIGHT = { line: 240, lineRule: LineRuleType.AUTO, before: 0, after: 0 } as const;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

function runs(rs: Run[], base: { font?: string; size?: number } = {}): TextRun[] {
  return rs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        underline: r.underline ? {} : undefined,
        highlight: r.missing ? "yellow" : undefined,
        font: base.font,
        size: base.size,
      }),
  );
}

function spacing(model: DocModel, after: "none" | "small" | "normal" = "normal"): IParagraphOptions["spacing"] {
  const afterTwips = after === "none" ? 0 : after === "small" ? 120 : 240;
  return { line: Math.round(240 * model.format.lineSpacing), after: afterTwips };
}

function letterheadHeader(lh: LetterheadData, assets: DocxAssets): Header {
  const small = 18; // 9pt, in half-points
  const infoRows = lh.rows.map(
    (row) =>
      new TableRow({
        children: [
          cell(1500, [new Paragraph({ spacing: TIGHT, children: [new TextRun({ text: row.label, font: LETTERHEAD_FONT, size: small })] })]),
          cell(250, [new Paragraph({ spacing: TIGHT, children: [new TextRun({ text: ":", font: LETTERHEAD_FONT, size: small })] })]),
          cell(3950, [
            new Paragraph({
              spacing: TIGHT,
              children: [
                ...runs(row.value, { font: LETTERHEAD_FONT, size: small }),
                ...(row.note
                  ? [new TextRun({ text: ` ${row.note}`, italics: true, font: LETTERHEAD_FONT, size: small - 2 })]
                  : []),
              ],
            }),
          ]),
        ],
      }),
  );

  const info = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 5700, type: WidthType.DXA },
    columnWidths: [1500, 250, 3950],
    borders: NO_BORDERS,
    rows: infoRows,
  });

  const logoCell = assets.logo
    ? [
        new Paragraph({
          spacing: TIGHT,
          children: [
            new ImageRun({
              type: "png",
              data: assets.logo,
              transformation: { width: 190, height: 95 },
              altText: { title: "Firm logo", description: "Firm logo", name: "logo" },
            }),
          ],
        }),
      ]
    : [new Paragraph({ spacing: TIGHT, children: [new TextRun({ text: "", font: LETTERHEAD_FONT })] })];

  const addressLines = [lh.addressLine, lh.extraLine].filter(Boolean).map(
    (line) => new Paragraph({ spacing: { ...TIGHT, before: 40 }, children: [new TextRun({ text: line!, font: LETTERHEAD_FONT, size: small })] }),
  );

  return new Header({
    children: [
      new Table({
        layout: TableLayoutType.FIXED,
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH - 5900, 5900],
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              cell(CONTENT_WIDTH - 5900, logoCell, VerticalAlignTable.CENTER),
              cell(5900, [info, ...addressLines]),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: TIGHT, children: [] }),
    ],
  });
}

function cell(width: number, children: (Paragraph | Table)[], verticalAlign: TableVerticalAlign = VerticalAlignTable.TOP) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    margins: { top: 0, bottom: 0, left: 0, right: 80 },
    verticalAlign,
    children,
  });
}

function letterFooter(lh: LetterheadData): Footer {
  const grey = "7F7F7F";
  const pageRun = (children: (string | (typeof PageNumber)[keyof typeof PageNumber])[], bold = false) =>
    new TextRun({ children, font: LETTERHEAD_FONT, size: 16, color: bold ? "000000" : grey, bold });
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { ...TIGHT, after: 40 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } },
        children: [
          pageRun(["P a g e  |  "]),
          pageRun([PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], true),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: TIGHT,
        children: [new TextRun({ text: lh.footerText, font: LETTERHEAD_FONT, size: 15 })],
      }),
    ],
  });
}

function blockToDocx(blk: Block, model: DocModel): (Paragraph | Table)[] {
  const justify = model.format.justified ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;
  switch (blk.type) {
    case "spacer":
      return [new Paragraph({ spacing: { after: blk.size === "large" ? 480 : 120 }, children: [] })];

    case "refs":
      return blk.rows.map(
        (row, i) =>
          new Paragraph({
            tabStops: [
              { type: TabStopType.LEFT, position: 1250 },
              { type: TabStopType.LEFT, position: 1550 },
            ],
            spacing: { after: i === blk.rows.length - 1 ? 240 : 0, line: 276 },
            children: [new TextRun({ text: row.label }), new TextRun({ text: "\t:\t" }), ...runs(row.value)],
          }),
      );

    case "address": {
      const lines = (ls: Run[][]) =>
        ls.length
          ? ls.map((l) => new Paragraph({ spacing: { after: 0, line: 252 }, children: runs(l) }))
          : [new Paragraph({ children: [] })];
      return [
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [Math.round(CONTENT_WIDTH * 0.5), CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.5)],
          borders: NO_BORDERS,
          rows: [
            new TableRow({
              children: [
                cell(Math.round(CONTENT_WIDTH * 0.5), lines(blk.lines)),
                cell(CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.5), lines(blk.right)),
              ],
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 240 }, children: [] }),
      ];
    }

    case "heading":
      return [
        new Paragraph({
          alignment: justify,
          keepNext: true,
          spacing: { ...spacing(model), after: 240 },
          border: blk.rule
            ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000", space: 2 } }
            : undefined,
          children: runs(blk.runs.map((r) => ({ ...r, bold: r.bold ?? true }))),
        }),
      ];

    case "para":
      return [
        new Paragraph({
          alignment:
            blk.align === "center" ? AlignmentType.CENTER
            : blk.align === "right" ? AlignmentType.RIGHT
            : blk.align === "left" ? AlignmentType.LEFT
            : justify,
          keepNext: blk.keepNext,
          spacing: spacing(model, blk.spaceAfter),
          numbering: blk.numbered !== undefined ? { reference: NUMBERING_REF, level: blk.numbered } : undefined,
          children: runs(blk.runs),
        }),
      ];

    case "signature":
      return [
        new Paragraph({ keepNext: true, spacing: { after: 120 }, children: [new TextRun({ text: blk.closing })] }),
        new Paragraph({
          keepNext: true,
          spacing: { after: 0 },
          children: [new TextRun({ text: blk.firmScript, font: SCRIPT_FONT, italics: true, size: 34 })],
        }),
        new Paragraph({ keepNext: true, spacing: { after: 0 }, children: [new TextRun({ text: "__________________" })] }),
        new Paragraph({ keepNext: true, spacing: { after: 0 }, children: runs(blk.signatoryName.map((r) => ({ ...r, bold: true }))) }),
        new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: blk.firmName, bold: true })] }),
      ];
  }
}

export function buildDocx(model: DocModel, assets: DocxAssets = {}): Document {
  const sub = model.format.subNumbering;
  const level = (lvl: 0 | 1 | 2) => {
    const format = lvl === 0 ? LevelFormat.DECIMAL : lvl === 1 ? LevelFormat.LOWER_LETTER : LevelFormat.LOWER_ROMAN;
    const text = lvl === 0 ? "%1." : sub === "dot" ? `%${lvl + 1}.` : `(%${lvl + 1})`;
    return {
      level: lvl,
      format,
      text,
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720 * (lvl + 1), hanging: 720 } } },
    };
  };

  const children: (Paragraph | Table)[] = model.blocks.flatMap((blk) => blockToDocx(blk, model));
  const lh = model.letterhead;

  return new Document({
    creator: "Precedent Pack",
    title: model.title,
    styles: {
      default: {
        document: {
          run: { font: model.format.font, size: Math.round(model.format.fontSizePt * 2) },
          paragraph: { spacing: { line: Math.round(240 * model.format.lineSpacing) } },
        },
      },
    },
    numbering: { config: [{ reference: NUMBERING_REF, levels: [level(0), level(1), level(2)] }] },
    sections: [
      {
        properties: {
          titlePage: Boolean(lh),
          page: { size: A4, margin: { ...MARGIN, header: 567, footer: 454 } },
        },
        headers: lh ? { first: letterheadHeader(lh, assets), default: new Header({ children: [] }) } : undefined,
        footers: lh ? { first: letterFooter(lh), default: letterFooter(lh) } : undefined,
        children,
      },
    ],
  });
}

export async function docxBlob(model: DocModel, assets: DocxAssets = {}): Promise<Blob> {
  return Packer.toBlob(buildDocx(model, assets));
}

export async function docxBuffer(model: DocModel, assets: DocxAssets = {}): Promise<Buffer> {
  return Packer.toBuffer(buildDocx(model, assets));
}

export type { ParagraphChild };
