from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
import os
import shutil
import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.config import settings
from app.models.document import Document
from app.utils.audit import log_action

router = APIRouter(prefix="/documents", tags=["Documents"])

# PRD-defined allowed types per owner
VEHICLE_DOC_TYPES = {"RC", "Insurance", "Pollution Certificate", "Fitness Certificate"}
DRIVER_DOC_TYPES = {"Driving License", "Medical Certificate", "Identity Proof"}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_type: str
    owner_id: int
    document_type: str
    file_url: str
    original_filename: Optional[str]
    issue_date: Optional[datetime.date]
    expiry_date: Optional[datetime.date]
    uploaded_by: Optional[int]
    uploaded_at: datetime.datetime
    status: str


# ── Upload ────────────────────────────────────────────────────────────────────
@router.post("/upload", response_model=DocumentOut, summary="Upload a vehicle or driver document")
def upload_document(
    owner_type: str = Form(..., description="Vehicle or Driver"),
    owner_id: int = Form(...),
    document_type: str = Form(...),
    issue_date: Optional[str] = Form(None, description="YYYY-MM-DD"),
    expiry_date: Optional[str] = Form(None, description="YYYY-MM-DD"),
    user_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate owner_type
    if owner_type not in ("Vehicle", "Driver"):
        raise HTTPException(status_code=400, detail="owner_type must be 'Vehicle' or 'Driver'.")

    # Validate document_type against PRD-defined types
    allowed_types = VEHICLE_DOC_TYPES if owner_type == "Vehicle" else DRIVER_DOC_TYPES
    if document_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type '{document_type}' for {owner_type}. Allowed: {sorted(allowed_types)}",
        )

    # Validate extension
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file_ext}'. Only PDF, JPG, PNG allowed.",
        )

    # Validate size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 10 MB limit.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    timestamp = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    safe_filename = f"{owner_type}_{owner_id}_{document_type.replace(' ', '_')}_{timestamp}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    parsed_issue = datetime.datetime.strptime(issue_date, "%Y-%m-%d").date() if issue_date else None
    parsed_expiry = datetime.datetime.strptime(expiry_date, "%Y-%m-%d").date() if expiry_date else None

    # Mark previous document of same type as Replaced
    prev = db.query(Document).filter(
        Document.owner_type == owner_type,
        Document.owner_id == owner_id,
        Document.document_type == document_type,
        Document.status == "Active",
    ).first()
    if prev:
        prev.status = "Replaced"

    db_doc = Document(
        owner_type=owner_type,
        owner_id=owner_id,
        document_type=document_type,
        file_url=file_path,
        original_filename=file.filename,
        issue_date=parsed_issue,
        expiry_date=parsed_expiry,
        uploaded_by=user_id,
        status="Active",
    )
    db.add(db_doc)
    db.flush()

    log_action(
        db=db,
        user_id=user_id,
        entity_type="Document",
        entity_id=db_doc.id,
        action="Uploaded",
        new_value=f"Type: {document_type}, Owner: {owner_type}#{owner_id}",
    )
    db.commit()
    db.refresh(db_doc)
    return db_doc


# ── GET all documents (admin / cross-entity view) ─────────────────────────────
@router.get("/", response_model=List[DocumentOut], summary="List all documents (admin view)")
def list_all_documents(
    owner_type: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if owner_type:
        query = query.filter(Document.owner_type == owner_type)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if status:
        query = query.filter(Document.status == status)
    return query.order_by(Document.uploaded_at.desc()).offset(offset).limit(limit).all()


# ── GET by owner ──────────────────────────────────────────────────────────────
@router.get("/{owner_id}", response_model=List[DocumentOut], summary="Get all documents for an owner")
def get_documents_by_owner(
    owner_id: int,
    owner_type: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(Document.owner_id == owner_id)
    if owner_type:
        query = query.filter(Document.owner_type == owner_type)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if status:
        query = query.filter(Document.status == status)
    return query.order_by(Document.uploaded_at.desc()).all()


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{document_id}", summary="Delete a document")
def delete_document(
    document_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    if os.path.exists(document.file_url):
        try:
            os.remove(document.file_url)
        except OSError:
            pass
    log_action(
        db=db,
        user_id=user_id,
        entity_type="Document",
        entity_id=document.id,
        action="Deleted",
        old_value=f"Type: {document.document_type}, Owner: {document.owner_type}#{document.owner_id}",
    )
    db.delete(document)
    db.commit()
    return {"message": "Document deleted successfully."}
