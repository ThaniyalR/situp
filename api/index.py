import sys
import os

# Add root directory to path to import app and data modules
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from app import app

# Vercel serverless entrypoint
app = app
