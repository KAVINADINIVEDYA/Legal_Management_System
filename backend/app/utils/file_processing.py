
import os
import uuid
from app.config import settings

def extract_text_from_file(file_path: str, content_type: str) -> str:
    """Extract text from PDF or DOCX files."""
    text = ""
    try:
        if content_type == "application/pdf" or file_path.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        elif file_path.endswith(".docx") or "wordprocessing" in (content_type or ""):
            import docx
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif file_path.endswith(".txt") or "text" in (content_type or ""):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
    except Exception as e:
        text = f"[Text extraction error: {str(e)}]"

    return text.strip()


def save_uploaded_file(file_content: bytes, original_filename: str) -> tuple:
    """Save an uploaded file to the uploads directory. Returns (saved_path, unique_filename)."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(original_filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(file_content)

    return file_path, unique_name
