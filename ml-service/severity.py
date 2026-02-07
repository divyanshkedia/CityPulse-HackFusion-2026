"""
Multi-class severity analysis for civic incidents
Supports: pothole, garbage, water_leak, fallen_tree, streetlight
"""

def pothole_logic(dets, img_h, img_w):
    """Analyze pothole severity based on area, lane position, and count"""
    image_area = img_h * img_w
    total_area, lane_hits, confs = 0, 0, []

    for d in dets:
        x1, y1, x2, y2 = d["bbox"]
        total_area += d["area"]
        confs.append(d["conf"])
        # Check if pothole is in bottom 60% (likely vehicle path)
        if (y1 + y2) / 2 > img_h * 0.4:
            lane_hits += 1

    area_ratio = total_area / image_area if image_area > 0 else 0
    lane_ratio = lane_hits / len(dets) if len(dets) > 0 else 0
    avg_conf = sum(confs) / len(confs) if confs else 0

    # Risk calculation: weighted by area coverage (50%), lane impact (30%), count (20%)
    risk = min((area_ratio * 10) * 0.5 + lane_ratio * 0.3 + len(dets) * 0.2, 1.0)

    # Determine severity
    severity = "LOW"
    if risk > 0.75:
        severity = "CRITICAL"
    elif risk > 0.45:
        severity = "HIGH"
    elif risk > 0.25:
        severity = "MODERATE"

    return {
        "severity": severity.lower(),
        "risk_score": round(risk, 3),
        "num_potholes": len(dets),
        "coverage_ratio": round(area_ratio, 4),
        "lane_impact_ratio": round(lane_ratio, 3),
        "confidence": round(avg_conf, 2)
    }


def garbage_logic(dets, img_h, img_w):
    """Analyze garbage/debris severity"""
    image_area = img_h * img_w
    total_area = sum(d["area"] for d in dets)
    avg_conf = sum(d["conf"] for d in dets) / len(dets) if dets else 0
    area_ratio = total_area / image_area if image_area > 0 else 0
    concentration = len(dets) / (area_ratio * 100 + 1)

    # Risk based on coverage and pile count
    risk = min(area_ratio * 8 + len(dets) * 0.1, 1.0)

    # Severity categories for garbage
    severity = "LOW"  # Litter
    if risk > 0.7:
        severity = "CRITICAL"  # Health hazard
    elif risk > 0.4:
        severity = "HIGH"  # Unclean area

    return {
        "severity": severity.lower(),
        "risk_score": round(risk, 3),
        "num_detections": len(dets),
        "coverage_ratio": round(area_ratio, 4),
        "concentration": round(concentration, 3),
        "confidence": round(avg_conf, 2)
    }


def water_leak_logic(dets, img_h, img_w):
    """Analyze water leak/flooding severity"""
    image_area = img_h * img_w
    total_area, bottom_hits, confs = 0, 0, []

    for d in dets:
        x1, y1, x2, y2 = d["bbox"]
        total_area += d["area"]
        confs.append(d["conf"])
        # Check if water is in bottom 40% (road surface)
        if y2 > img_h * 0.6:
            bottom_hits += 1

    spread_ratio = total_area / image_area if image_area > 0 else 0
    road_ratio = bottom_hits / len(dets) if len(dets) > 0 else 0
    avg_conf = sum(confs) / len(confs) if confs else 0

    # Risk based on spread and road coverage
    risk = min(spread_ratio * 5 + road_ratio * 0.3, 1.0)

    severity = "LOW"  # Minor leakage
    if risk > 0.7:
        severity = "CRITICAL"  # Flooded
    elif risk > 0.3:
        severity = "HIGH"  # Water logging

    return {
        "severity": severity.lower(),
        "risk_score": round(risk, 3),
        "num_detections": len(dets),
        "coverage_ratio": round(spread_ratio, 4),
        "road_coverage_ratio": round(road_ratio, 3),
        "confidence": round(avg_conf, 2)
    }


def fallen_tree_logic(dets, img_h, img_w):
    """Analyze fallen tree severity - typically always high priority"""
    avg_conf = sum(d["conf"] for d in dets) / len(dets) if dets else 0
    
    # Fallen trees are generally high priority
    severity = "HIGH"
    if len(dets) > 2:  # Multiple trees = critical
        severity = "CRITICAL"
    
    return {
        "severity": severity.lower(),
        "risk_score": 0.8 if severity == "HIGH" else 0.9,
        "num_detections": len(dets),
        "confidence": round(avg_conf, 2)
    }


def streetlight_logic(dets, img_h, img_w):
    """Analyze streetlight malfunction severity"""
    avg_conf = sum(d["conf"] for d in dets) / len(dets) if dets else 0
    
    # Streetlight issues are medium priority
    severity = "MEDIUM"
    if len(dets) > 3:  # Multiple lights out = higher priority
        severity = "HIGH"
    
    return {
        "severity": severity.lower(),
        "risk_score": 0.5 if severity == "MEDIUM" else 0.7,
        "num_detections": len(dets),
        "confidence": round(avg_conf, 2)
    }


def compute_severity(detections, image_shape, incident_type="pothole"):
    """
    Main function to compute severity for any incident type.
    
    Args:
        detections: List of detection dicts with bbox, area, conf
        image_shape: Tuple of (height, width)
        incident_type: One of: pothole, garbage, water_leak, fallen_tree, streetlight
    
    Returns:
        Dict with severity metrics
    """
    if not detections:
        return {
            "severity": "low",
            "risk_score": 0.0,
            "num_detections": 0,
            "coverage_ratio": 0.0,
            "confidence": 0.0
        }
    
    img_h, img_w = image_shape
    
    # Route to appropriate logic based on incident type
    if incident_type == "pothole":
        return pothole_logic(detections, img_h, img_w)
    elif incident_type == "garbage":
        return garbage_logic(detections, img_h, img_w)
    elif incident_type == "water_leak":
        return water_leak_logic(detections, img_h, img_w)
    elif incident_type == "fallen_tree":
        return fallen_tree_logic(detections, img_h, img_w)
    elif incident_type == "streetlight":
        return streetlight_logic(detections, img_h, img_w)
    else:
        # Generic fallback
        avg_conf = sum(d["conf"] for d in detections) / len(detections)
        return {
            "severity": "medium",
            "risk_score": 0.5,
            "num_detections": len(detections),
            "confidence": round(avg_conf, 2)
        }
