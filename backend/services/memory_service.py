import psutil
import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MemoryService:
    """Service for monitoring system resources and enforcing low-RAM constraints."""
    
    @staticmethod
    def get_stats() -> Dict[str, Any]:
        """Returns current CPU and RAM usage stats."""
        mem = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=None)
        
        return {
            "ram_total_gb": round(mem.total / (1024**3), 2),
            "ram_available_gb": round(mem.available / (1024**3), 2),
            "ram_used_gb": round(mem.used / (1024**3), 2),
            "ram_percent": mem.percent,
            "cpu_percent": cpu,
            "is_low_resource": mem.percent > 80 or cpu > 80
        }

    @staticmethod
    def check_resource_limit():
        """Logs a warning if resources are critically low."""
        stats = MemoryService.get_stats()
        if stats["is_low_resource"]:
            logger.warning(f"Critical resource usage detected: RAM {stats['ram_percent']}%, CPU {stats['cpu_percent']}%")
            return True
        return False

memory_service = MemoryService()
