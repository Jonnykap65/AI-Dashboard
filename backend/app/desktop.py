import socket
import os
import sys
from pathlib import Path

import uvicorn
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .main import app


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    return Path(__file__).resolve().parents[2]


def frontend_dist_dir() -> Path:
    return app_root() / "frontend" / "dist"


def find_port(start: int = 8765) -> int:
    for port in range(start, start + 25):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("Could not find an available local port for AI Home Dashboard.")


dist_dir = frontend_dist_dir()
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(dist_dir / "index.html")


def main() -> None:
    if not dist_dir.exists():
        raise RuntimeError(f"Frontend build not found: {dist_dir}. Run the Windows executable build first.")
    configured_port = os.environ.get("AI_DASHBOARD_PORT")
    port = int(configured_port) if configured_port else find_port()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
