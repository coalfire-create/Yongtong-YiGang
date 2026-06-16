import fitz
import sys

pdf_path = "/Users/leejeonghan/Downloads/2026 고3 시즌3 시간표.pdf"

try:
    doc = fitz.open(pdf_path)
    print(f"Number of pages: {len(doc)}")
    
    full_text = ""
    for i, page in enumerate(doc):
        text = page.get_text()
        full_text += f"\n--- Page {i+1} ---\n{text}\n"
        
    with open("scratch/g3_pdf_text.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    print("Successfully extracted text to scratch/g3_pdf_text.txt")
except Exception as e:
    print(f"Error: {e}")
