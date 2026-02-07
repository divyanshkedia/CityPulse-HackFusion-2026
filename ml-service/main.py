from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import uuid
import shutil
import base64
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import after logging setup
from yolo_infer import run_detection, model as yolo_model, CLASS_NAMES
from severity import compute_severity

app = FastAPI(title="Civic Incident Detection API")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check model status
if "DummyModel" in str(type(yolo_model)):
    logger.warning("⚠️ Using DUMMY MODEL for testing. Real YOLO model failed to load.")
else:
    logger.info("✅ Real multi-class YOLO model loaded successfully")
    logger.info(f"✅ Detects: {list(CLASS_NAMES.values())}")

# Ensure temp directory exists
TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

# Map frontend category names to model class names
CATEGORY_MAPPING = {
    "pothole": "pothole",
    "flooding": "water_leak",
    "garbage": "garbage",
    "debris": "garbage",
    "fallen_tree": "fallen_tree",
    "street_light": "streetlight",
    "traffic_signal": "streetlight",  # Map to streetlight for now
    "other": None  # Will analyze all detected classes
}

@app.post("/analyze/{incident_id}")
async def analyze_image_with_save(
    incident_id: str,
    file: UploadFile = File(...)
):
    """
    Analyze an uploaded image for civic incidents.
    Detects: potholes, garbage, water leaks, fallen trees, streetlights
    """
    try:
        # Validate incident_id
        if not incident_id or len(incident_id) < 10:
            raise HTTPException(status_code=400, detail="Invalid incident ID")
        
        logger.info(f"Analyzing image for incident {incident_id}")
        
        # Save uploaded file
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        temp_filename = f"{incident_id}_{uuid.uuid4()}.{file_extension}"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Image saved temporarily to {temp_path}")
        
        # Run multi-class detection
        detections_by_class, image_shape = run_detection(temp_path, conf_threshold=0.15)
        
        logger.info(f"Detection results: {list(detections_by_class.keys())}")
        
        # If no detections, return low severity
        if not detections_by_class:
            logger.warning("No incidents detected in image")
            
            # Return default low severity
            with open(temp_path, "rb") as img_file:
                annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            os.remove(temp_path)
            
            return JSONResponse({
                "status": "success",
                "incident_id": incident_id,
                "analysis": {
                    "severity": "low",
                    "risk_score": 0.0,
                    "num_detections": 0,
                    "detected_types": [],
                    "coverage_ratio": 0.0,
                    "primary_issue": "none"
                },
                "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
                "model_type": "dummy" if "DummyModel" in str(type(yolo_model)) else "real",
                "timestamp": datetime.now().isoformat()
            })
        
        # Determine primary issue (the one with most detections)
        primary_issue = max(detections_by_class.items(), key=lambda x: len(x[1]))[0]
        primary_detections = detections_by_class[primary_issue]
        
        logger.info(f"Primary issue: {primary_issue} ({len(primary_detections)} detections)")
        
        # Compute severity for primary issue
        severity_result = compute_severity(
            primary_detections, 
            image_shape,
            incident_type=primary_issue
        )
        
        # Add detection summary
        severity_result["detected_types"] = list(detections_by_class.keys())
        severity_result["primary_issue"] = primary_issue
        severity_result["all_detections"] = {
            class_name: len(dets) 
            for class_name, dets in detections_by_class.items()
        }
        
        # Rename some fields for consistency with frontend
        if "num_potholes" in severity_result:
            severity_result["num_detections"] = severity_result["num_potholes"]
        elif "num_detections" not in severity_result:
            severity_result["num_detections"] = len(primary_detections)
        
        if "lane_impact_ratio" not in severity_result:
            severity_result["lane_impact_ratio"] = 0.0
        
        # Create annotated image (for now, just return original)
        # TODO: Draw bounding boxes on image
        with open(temp_path, "rb") as img_file:
            annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Clean up
        os.remove(temp_path)
        
        logger.info(f"Analysis complete: {severity_result['severity']} severity")
        
        return JSONResponse({
            "status": "success",
            "incident_id": incident_id,
            "analysis": severity_result,
            "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
            "model_type": "dummy" if "DummyModel" in str(type(yolo_model)) else "real",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Endpoint without incident ID for preview/testing"""
    try:
        logger.info("Analyzing image (preview mode)")
        
        # Save uploaded file
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        temp_filename = f"preview_{uuid.uuid4()}.{file_extension}"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run detection
        detections_by_class, image_shape = run_detection(temp_path, conf_threshold=0.15)
        
        if not detections_by_class:
            # Return default
            with open(temp_path, "rb") as img_file:
                annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            os.remove(temp_path)
            
            return JSONResponse({
                "status": "success",
                "analysis": {
                    "severity": "low",
                    "risk_score": 0.0,
                    "num_detections": 0,
                    "detected_types": [],
                    "coverage_ratio": 0.0
                },
                "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
                "model_type": "dummy" if "DummyModel" in str(type(yolo_model)) else "real",
                "timestamp": datetime.now().isoformat()
            })
        
        # Determine primary issue
        primary_issue = max(detections_by_class.items(), key=lambda x: len(x[1]))[0]
        primary_detections = detections_by_class[primary_issue]
        
        # Compute severity
        severity_result = compute_severity(
            primary_detections,
            image_shape,
            incident_type=primary_issue
        )
        
        severity_result["detected_types"] = list(detections_by_class.keys())
        severity_result["primary_issue"] = primary_issue
        
        # Create annotated image
        with open(temp_path, "rb") as img_file:
            annotated_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        os.remove(temp_path)
        
        return JSONResponse({
            "status": "success",
            "analysis": severity_result,
            "annotated_image": f"data:image/jpeg;base64,{annotated_base64}",
            "model_type": "dummy" if "DummyModel" in str(type(yolo_model)) else "real",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    model_status = "dummy" if "DummyModel" in str(type(yolo_model)) else "real"
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_type": model_status,
        "supported_classes": list(CLASS_NAMES.values()),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/classes")
async def get_classes():
    """Return supported incident classes"""
    return {
        "classes": CLASS_NAMES,
        "category_mapping": CATEGORY_MAPPING
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Multi-Class Civic ML Service on http://0.0.0.0:8000")
    logger.info(f"Detects: {list(CLASS_NAMES.values())}")
    uvicorn.run(app, host="0.0.0.0", port=8000)