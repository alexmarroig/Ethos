import argparse
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


def build_pdf(input_path: str, output_path: str):
    with open(input_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "EthosTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor="#17313a",
        spaceAfter=10,
    )
    heading_style = ParagraphStyle(
        "EthosHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor="#17313a",
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "EthosBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        textColor="#1d1d1f",
        spaceAfter=6,
    )

    story = []
    story.append(Paragraph(payload.get("title", "ETHOS"), title_style))
    if payload.get("subtitle"):
      story.append(Paragraph(payload["subtitle"], body_style))
      story.append(Spacer(1, 4))

    for section in payload.get("sections", []):
        story.append(Paragraph(section.get("heading", ""), heading_style))
        for paragraph in section.get("paragraphs", []):
            safe = (
                str(paragraph)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>")
            )
            story.append(Paragraph(safe, body_style))

    doc.build(story)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    build_pdf(args.input, args.output)
