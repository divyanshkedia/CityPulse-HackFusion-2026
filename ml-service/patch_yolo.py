# patch_yolo.py - Run this before main.py
import torch
from ultralytics.nn.tasks import DetectionModel
from torch.nn.modules.container import Sequential

# Add all necessary safe globals for PyTorch 2.6
torch.serialization.add_safe_globals([
    DetectionModel,
    Sequential,
    # Add other classes that might be needed
])

print("✅ Added safe globals for PyTorch 2.6 compatibility")