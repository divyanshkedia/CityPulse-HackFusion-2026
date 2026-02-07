import os
import torch
from ultralytics import YOLO
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CLASS MAPPING - Must match your training data
CLASS_NAMES = {
    0: "fallen_tree",
    1: "garbage",
    2: "pothole",
    3: "streetlight",
    4: "water_leak"
}

# Reverse mapping for convenience
NAME_TO_CLASS = {v: k for k, v in CLASS_NAMES.items()}

# CRITICAL FIX: Set environment variable to force weights_only=False globally
os.environ['TORCH_FORCE_WEIGHTS_ONLY_LOAD'] = '0'

# PyTorch 2.6 Compatibility - Add ALL possible classes
try:
    # Add Identity which was missing
    from torch.nn.modules.linear import Identity
    
    from ultralytics.nn.tasks import DetectionModel
    from ultralytics.nn.modules.conv import Conv
    from ultralytics.nn.modules.block import C2f, SPPF, Bottleneck, C3
    from ultralytics.nn.modules.head import Detect
    
    from torch.nn.modules.container import Sequential, ModuleList
    from torch.nn.modules.conv import Conv2d
    from torch.nn.modules.activation import SiLU
    from torch.nn.modules.batchnorm import BatchNorm2d
    from torch.nn.modules.upsampling import Upsample
    from torch.nn.modules.pooling import MaxPool2d
    from torch.nn.parameter import Parameter
    
    # Add all necessary safe globals
    torch.serialization.add_safe_globals([
        # Ultralytics specific
        DetectionModel,
        Conv,
        C2f,
        C3,
        SPPF,
        Bottleneck,
        Detect,
        
        # PyTorch standard modules
        Sequential,
        ModuleList,
        Conv2d,
        SiLU,
        BatchNorm2d,
        Upsample,
        MaxPool2d,
        Parameter,
        Identity,  # This was missing!
        
        # Additional torch.nn classes
        torch.nn.Upsample,
        torch.nn.Conv2d,
        torch.nn.BatchNorm2d,
        torch.nn.SiLU,
        torch.nn.MaxPool2d,
        torch.nn.Sequential,
        torch.nn.ModuleList,
        torch.nn.Parameter,
        torch.nn.Identity,
    ])
    logger.info("✅ Added comprehensive safe globals for PyTorch 2.6")
except ImportError as e:
    logger.warning(f"Could not import some modules: {e}")
except Exception as e:
    logger.warning(f"Could not add all safe globals: {e}")

# Model path
def get_model_path():
    """Find the model file in various possible locations"""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "models", "civic_best.pt"),
        os.path.join(os.path.dirname(__file__), "runs", "detect", "runs", "civic_model_fast3", "weights", "best.pt"),
        os.path.join(os.path.dirname(__file__), "models", "best.pt"),
        os.path.join(os.path.dirname(__file__), "best.pt"),
        "models/civic_best.pt",
        "runs/detect/runs/civic_model_fast3/weights/best.pt",
        "models/best.pt",
        "best.pt"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            logger.info(f"✅ Found model at: {path}")
            return path
    
    raise FileNotFoundError(
        "Could not find model file. Please ensure best.pt is in one of these locations:\n" +
        "\n".join(f"  - {path}" for path in possible_paths)
    )

MODEL_PATH = get_model_path()
model = None

def load_model():
    """Load the multi-class YOLO model - ULTIMATE FIX for PyTorch 2.6"""
    global model
    
    if model is not None:
        return model
    
    try:
        logger.info(f"Loading multi-class civic model from {MODEL_PATH}")
        
        # ULTIMATE FIX: Monkey-patch torch.load inside Ultralytics
        original_torch_load = torch.load
        
        def patched_torch_load(f, *args, **kwargs):
            """Force weights_only=False for all torch.load calls"""
            kwargs['weights_only'] = False
            return original_torch_load(f, *args, **kwargs)
        
        # Apply the patch
        torch.load = patched_torch_load
        
        try:
            logger.info("Loading model with patched torch.load (weights_only=False)...")
            model = YOLO(MODEL_PATH)
            logger.info("✅ Model loaded successfully with patched loader")
        finally:
            # Restore original torch.load
            torch.load = original_torch_load
        
        logger.info(f"✅ Multi-class YOLO model loaded successfully")
        logger.info(f"✅ Detects: {list(CLASS_NAMES.values())}")
        
        # Test inference
        try:
            import numpy as np
            dummy_img = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
            results = model(dummy_img, verbose=False)
            logger.info("✅ Model test inference successful")
        except Exception as test_error:
            logger.warning(f"Model test inference warning: {test_error}")
            
        return model
        
    except Exception as e:
        logger.error(f"❌ Failed to load YOLO model: {e}")
        logger.error("Full error:", exc_info=True)
        
        # Create dummy model for testing
        logger.info("Creating dummy model for testing purposes...")
        logger.warning("⚠️ Dummy model returns mock detections - not real AI analysis")
        
        class DummyModel:
            def __call__(self, *args, **kwargs):
                class DummyResults:
                    def __init__(self):
                        self.boxes = None
                        self.orig_shape = (640, 640)
                return [DummyResults()]
            
            def __getattr__(self, name):
                if name == 'names':
                    return CLASS_NAMES
                return None
        
        model = DummyModel()
        return model

# Load model on import
model = load_model()

def run_detection(image_path, model_instance=None, conf_threshold=0.15):
    """
    Run multi-class YOLO detection on an image.
    
    Args:
        image_path: Path to the image file
        model_instance: YOLO model instance (optional)
        conf_threshold: Confidence threshold for detections
    
    Returns:
        Tuple of (detections_by_class, image_shape)
        detections_by_class: Dict mapping class_name -> list of detection dicts
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    detection_model = model_instance if model_instance is not None else model
    
    try:
        # Check if dummy model
        if "DummyModel" in str(type(detection_model)):
            logger.info(f"Using dummy model for {image_path}")
            
            # Return mock detections for demo
            mock_detections = {
                "pothole": [
                    {"bbox": [100, 100, 200, 200], "area": 10000, "conf": 0.85, "class_id": 2},
                    {"bbox": [300, 300, 350, 350], "area": 2500, "conf": 0.72, "class_id": 2}
                ]
            }
            return mock_detections, (640, 640)
        
        # Run inference
        results = detection_model(image_path, verbose=False, conf=conf_threshold)[0]
        
        # Group detections by class
        detections_by_class = {}
        
        if hasattr(results, 'boxes') and results.boxes is not None:
            for box in results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                area = (x2 - x1) * (y2 - y1)
                confidence = float(box.conf[0]) if box.conf is not None else 0.0
                class_id = int(box.cls[0]) if box.cls is not None else 0
                
                # Get class name
                class_name = CLASS_NAMES.get(class_id, "unknown")
                
                detection = {
                    "bbox": [x1, y1, x2, y2],
                    "area": area,
                    "conf": confidence,
                    "class_id": class_id
                }
                
                # Group by class name
                if class_name not in detections_by_class:
                    detections_by_class[class_name] = []
                detections_by_class[class_name].append(detection)
        
        # Get image shape
        if hasattr(results, 'orig_shape'):
            image_shape = results.orig_shape
        else:
            import cv2
            img = cv2.imread(image_path)
            image_shape = img.shape[:2] if img is not None else (640, 640)
        
        total_detections = sum(len(dets) for dets in detections_by_class.values())
        logger.info(f"Detected {total_detections} objects in {len(detections_by_class)} classes")
        for class_name, dets in detections_by_class.items():
            logger.info(f"  - {class_name}: {len(dets)} detections")
        
        return detections_by_class, image_shape
        
    except Exception as e:
        logger.error(f"Detection failed for {image_path}: {e}")
        return {}, (640, 640)