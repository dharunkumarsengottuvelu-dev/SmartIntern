import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from extractor.resume_extractor import ResumeExtractor
from pdf.pdf_extractor import PdfExtractor
from scoring.ats_scorer import AtsScorer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/parse")
async def parse_resume_route(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Enterprise ATS Resume Parsing Pipeline
    """
    logger.info(f"Received resume upload for user_id: {user_id}, filename: {file.filename}")
    
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    # 1. Read File Bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read file.")

    # 2. Extract Text
    try:
        raw_text = PdfExtractor.extract_text(file_bytes)
        logger.info(f"Extracted {len(raw_text)} chars from {file.filename}")
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        return {"status": "failed", "reason": "Unreadable PDF"}

    # 3. LLM Extraction & Validation
    try:
        parsed_resume = await ResumeExtractor.extract(raw_text)
    except Exception as e:
        logger.error(f"LLM Extraction failed: {e}")
        raise HTTPException(status_code=500, detail="AI extraction failed.")

    # 4. ATS Scoring
    ats_score = AtsScorer.calculate_score(parsed_resume, raw_text)
    parsed_resume.ats_score = ats_score

    # Return the clean structured JSON
    return {
        "user_id": user_id,
        "parsed": parsed_resume.model_dump(),
        "model_used": "llama3.2"
    }
