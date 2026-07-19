import easyocr
import fitz  # PyMuPDF for rendering pages to images
import logging
import numpy as np

logger = logging.getLogger(__name__)

class OcrExtractor:
    """Extracts text from image-based PDFs using EasyOCR."""

    _reader = None

    @classmethod
    def _get_reader(cls):
        if cls._reader is None:
            logger.info("[OcrExtractor] Initializing EasyOCR reader (this may take a moment)...")
            cls._reader = easyocr.Reader(['en'], gpu=False) # Fallback to CPU if GPU not available
        return cls._reader

    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> str:
        try:
            reader = OcrExtractor._get_reader()
            text = ""
            
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                for i, page in enumerate(doc):
                    logger.info(f"[OcrExtractor] Processing page {i+1}/{len(doc)}")
                    # Render page to an image (pixmap)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # 2x zoom for better OCR
                    
                    # Convert to numpy array (RGB)
                    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                    
                    if pix.n == 4: # RGBA -> RGB
                        import cv2
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

                    # Extract text
                    results = reader.readtext(img_array, detail=0, paragraph=True)
                    text += "\n".join(results) + "\n"
            
            return text
        except Exception as e:
            logger.error(f"[OcrExtractor] EasyOCR error: {e}")
            return ""
