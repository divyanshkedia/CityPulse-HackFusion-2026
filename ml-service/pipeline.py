from yolo_infer import run_detection
from severity import compute_severity
from ultralytics import YOLO

IMAGE_PATH = "images/road4.jpg"
MODEL_PATH = "runs/detect/train2/weights/best.pt"

# ---- 1. Run YOLO and SAVE annotated image ----
model = YOLO(MODEL_PATH)
results = model(IMAGE_PATH, save=True)[0]  # this saves image with confidence

# ---- 2. Extract detections for severity ----
detections = []
for box in results.boxes:
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    area = (x2 - x1) * (y2 - y1)

    detections.append({
        "bbox": [x1, y1, x2, y2],
        "area": area,
        "confidence": float(box.conf[0])
    })

image_shape = results.orig_shape

# ---- 3. Compute severity ----
severity_result = compute_severity(detections, image_shape)

# ---- 4. Print final output ----
print("\n===== ROAD DAMAGE ANALYSIS =====")
print("Potholes detected:", severity_result["num_potholes"])
print("Severity:", severity_result["severity"])
print("Risk score:", severity_result["risk_score"])
print("Coverage ratio:", severity_result["coverage_ratio"])
print("Lane impact ratio:", severity_result["lane_impact_ratio"])
print("================================\n")