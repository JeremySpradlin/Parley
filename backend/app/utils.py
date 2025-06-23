import asyncio
import logging

logger = logging.getLogger(__name__)

def handle_task_exception(task: asyncio.Task) -> None:
    """
    A callback function to handle exceptions from asyncio tasks.
    This prevents unhandled exceptions in background tasks from
    crashing the application.
    """
    try:
        task.result()
    except asyncio.CancelledError:
        # Don't log cancellation as an error
        pass
    except Exception:
        logger.exception("Exception raised by background task") 