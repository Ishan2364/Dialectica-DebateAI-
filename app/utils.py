import json
import logging
import time
from pathlib import Path
from app.config import settings

def setup_logger(session_id: str):
    logger = logging.getLogger("DebateLogger")
    logger.setLevel(logging.INFO)
    
    log_file = Path(settings.LOG_DIR) / f"debate_log_{session_id}.json"
    
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter('%(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    return logger, log_file

def log_transition(logger, step: str, state: dict):
    serializable_state = {
        "timestamp": time.time(),
        "step": step,
        "round": state.get("round_count", 0),
        "last_message": state["messages"][-1].content if state.get("messages") else None
    }
    logger.info(json.dumps(serializable_state))