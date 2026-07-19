import fitz  # PyMuPDF
import pdfplumber
import logging
from io import BytesIO
from typing import Optional
from ocr.ocr_extractor import OcrExtractor

logger = logging.getLogger(__name__)

class PdfExtractor:
    """Extracts text from PDF files using multiple fallbacks."""

    @staticmethod
    def extract_text(file_bytes: bytes) -> str:
        text = PdfExtractor._extract_with_pymupdf(file_bytes)
        
        if not text or len(text.strip()) < 50:
            logger.warning("[PdfExtractor] PyMuPDF extraction failed or yielded too little text. Trying pdfplumber...")
            text = PdfExtractor._extract_with_pdfplumber(file_bytes)
            
        if not text or len(text.strip()) < 50:
            logger.warning("[PdfExtractor] pdfplumber extraction failed. Treating as image-based PDF. Trying EasyOCR...")
            text = OcrExtractor.extract_from_pdf(file_bytes)
            
        if not text or len(text.strip()) < 50:
            raise Exception("Unreadable PDF: All extraction methods failed.")
            
        return text

    @staticmethod
    def _extract_with_pymupdf(file_bytes: bytes) -> str:
        try:
            text = ""
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                for page in doc:
                    text += page.get_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"[PdfExtractor] PyMuPDF error: {e}")
            return ""

    @staticmethod
    def _extract_with_pdfplumber(file_bytes: bytes) -> str:
        try:
            text = ""
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text
        except Exception as e:
            logger.error(f"[PdfExtractor] pdfplumber error: {e}")
            return ""
