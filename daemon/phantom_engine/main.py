"""Entry point for the Phantom daemon."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import uvicorn

from .config import PhantomConfig
from .server import create_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def run() -> None:
    parser = argparse.ArgumentParser(description="Phantom privacy daemon")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("config.yaml"),
        help="Path to config file",
    )
    parser.add_argument("--host", default=None)
    parser.add_argument("--port", type=int, default=None)
    args = parser.parse_args()

    config = PhantomConfig.from_file(args.config)
    if args.host:
        config.server.host = args.host
    if args.port:
        config.server.port = args.port

    app = create_app(config)
    uvicorn.run(app, host=config.server.host, port=config.server.port)


if __name__ == "__main__":
    run()
