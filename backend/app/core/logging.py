import sys
from loguru import logger
from app.core.config import settings


def setup_logging():
    logger.remove()
    logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
    )
    logger.add(
        "logs/querypilot.log",
        level="DEBUG",
        rotation="10 MB",
        retention="30 days",
        compression="zip",
    )
    return logger
