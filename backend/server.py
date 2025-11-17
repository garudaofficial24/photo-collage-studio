from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io
import base64
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create upload directories
UPLOAD_DIR = ROOT_DIR / 'uploads'
PHOTO_DIR = UPLOAD_DIR / 'photos'
LETTERHEAD_DIR = UPLOAD_DIR / 'letterheads'
PDF_DIR = UPLOAD_DIR / 'pdfs'

for directory in [UPLOAD_DIR, PHOTO_DIR, LETTERHEAD_DIR, PDF_DIR]:
    directory.mkdir(exist_ok=True, parents=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class PhotoMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_path: str
    width: int
    height: int
    size: int
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LetterheadMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    filename: str
    file_path: str
    is_default: bool = False
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CollageProject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    layout: str  # '2x2', '3x3', '4x4', 'mixed'
    letterhead_id: Optional[str] = None
    photo_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pdf_path: Optional[str] = None

class ImageProcessRequest(BaseModel):
    image_data: str  # base64 encoded image
    operation: str  # 'rotate', 'brightness', 'contrast', 'blur', 'sharpen', 'grayscale'
    value: Optional[float] = None

class PDFGenerateRequest(BaseModel):
    project_id: str
    images: List[dict]  # [{id, data, x, y, width, height}]
    letterhead_id: Optional[str] = None

# Upload photo endpoint
@api_router.post("/photos/upload", response_model=PhotoMetadata)
async def upload_photo(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = PHOTO_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get image dimensions and size
        with Image.open(file_path) as img:
            width, height = img.size
        
        file_size = file_path.stat().st_size
        
        # Create metadata
        photo_metadata = PhotoMetadata(
            filename=unique_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            width=width,
            height=height,
            size=file_size
        )
        
        # Save to database
        doc = photo_metadata.model_dump()
        doc['uploaded_at'] = doc['uploaded_at'].isoformat()
        await db.photos.insert_one(doc)
        
        return photo_metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all photos
@api_router.get("/photos", response_model=List[PhotoMetadata])
async def get_photos():
    photos = await db.photos.find({}, {"_id": 0}).to_list(1000)
    for photo in photos:
        if isinstance(photo['uploaded_at'], str):
            photo['uploaded_at'] = datetime.fromisoformat(photo['uploaded_at'])
    return photos

# Get photo file
@api_router.get("/photos/{photo_id}/file")
async def get_photo_file(photo_id: str):
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    file_path = Path(photo['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Delete photo
@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str):
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file
    file_path = Path(photo['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.photos.delete_one({"id": photo_id})
    
    return {"message": "Photo deleted successfully"}

# Image processing endpoint
@api_router.post("/photos/process")
async def process_image(request: ImageProcessRequest):
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_data.split(',')[1])
        img = Image.open(io.BytesIO(image_data))
        
        # Apply operation
        if request.operation == 'rotate':
            img = img.rotate(request.value or 90, expand=True)
        elif request.operation == 'brightness':
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(request.value or 1.0)
        elif request.operation == 'contrast':
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(request.value or 1.0)
        elif request.operation == 'blur':
            img = img.filter(ImageFilter.BLUR)
        elif request.operation == 'sharpen':
            img = img.filter(ImageFilter.SHARPEN)
        elif request.operation == 'grayscale':
            img = ImageOps.grayscale(img)
        
        # Convert back to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        processed_data = base64.b64encode(buffer.getvalue()).decode()
        
        return {"processed_image": f"data:image/png;base64,{processed_data}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Upload letterhead
@api_router.post("/letterheads/upload", response_model=LetterheadMetadata)
async def upload_letterhead(name: str, file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = LETTERHEAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create metadata
        letterhead_metadata = LetterheadMetadata(
            name=name,
            filename=unique_filename,
            file_path=str(file_path)
        )
        
        # Save to database
        doc = letterhead_metadata.model_dump()
        doc['uploaded_at'] = doc['uploaded_at'].isoformat()
        await db.letterheads.insert_one(doc)
        
        return letterhead_metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all letterheads
@api_router.get("/letterheads", response_model=List[LetterheadMetadata])
async def get_letterheads():
    letterheads = await db.letterheads.find({}, {"_id": 0}).to_list(1000)
    for letterhead in letterheads:
        if isinstance(letterhead['uploaded_at'], str):
            letterhead['uploaded_at'] = datetime.fromisoformat(letterhead['uploaded_at'])
    return letterheads

# Get letterhead file
@api_router.get("/letterheads/{letterhead_id}/file")
async def get_letterhead_file(letterhead_id: str):
    letterhead = await db.letterheads.find_one({"id": letterhead_id}, {"_id": 0})
    if not letterhead:
        raise HTTPException(status_code=404, detail="Letterhead not found")
    
    file_path = Path(letterhead['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Generate PDF
@api_router.post("/pdf/generate")
async def generate_pdf(request: PDFGenerateRequest):
    try:
        # Generate unique filename for PDF
        pdf_filename = f"{uuid.uuid4()}.pdf"
        pdf_path = PDF_DIR / pdf_filename
        
        # Create PDF
        c = canvas.Canvas(str(pdf_path), pagesize=A4)
        width, height = A4
        
        # Add letterhead if provided
        if request.letterhead_id:
            letterhead = await db.letterheads.find_one({"id": request.letterhead_id}, {"_id": 0})
            if letterhead:
                letterhead_path = Path(letterhead['file_path'])
                if letterhead_path.exists():
                    img = ImageReader(str(letterhead_path))
                    c.drawImage(img, 0, height - 100, width, 100, preserveAspectRatio=True, mask='auto')
        
        # Add images to PDF
        for img_data in request.images:
            try:
                # Decode base64 image
                image_bytes = base64.b64decode(img_data['data'].split(',')[1])
                img = ImageReader(io.BytesIO(image_bytes))
                
                # Draw image on PDF
                x = img_data.get('x', 0)
                y = height - img_data.get('y', 0) - img_data.get('height', 100)
                w = img_data.get('width', 100)
                h = img_data.get('height', 100)
                
                c.drawImage(img, x, y, w, h, preserveAspectRatio=True, mask='auto')
            except Exception as e:
                logging.error(f"Error adding image to PDF: {e}")
                continue
        
        c.save()
        
        # Update project with PDF path
        await db.collage_projects.update_one(
            {"id": request.project_id},
            {"$set": {"pdf_path": str(pdf_path)}}
        )
        
        return {"pdf_url": f"/api/pdf/{pdf_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Download PDF
@api_router.get("/pdf/{pdf_filename}")
async def download_pdf(pdf_filename: str):
    pdf_path = PDF_DIR / pdf_filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(pdf_path, filename=pdf_filename, media_type='application/pdf')

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()