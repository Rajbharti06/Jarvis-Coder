import os
import importlib.util
import sys
import logging
from typing import List, Dict, Any, Callable

logger = logging.getLogger(__name__)

class PluginService:
    """Service for managing and executing plugins/extensions."""
    
    def __init__(self):
        self.plugins_dir = "./plugins"
        self.plugins: Dict[str, Any] = {}
        if not os.path.exists(self.plugins_dir):
            os.makedirs(self.plugins_dir)
        self.load_plugins()

    def load_plugins(self):
        """Dynamically load all .py files in the plugins directory."""
        logger.info("Loading plugins...")
        for file in os.listdir(self.plugins_dir):
            if file.endswith(".py") and not file.startswith("__"):
                plugin_name = file[:-3]
                file_path = os.path.join(self.plugins_dir, file)
                try:
                    spec = importlib.util.spec_from_file_location(plugin_name, file_path)
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        self.plugins[plugin_name] = module
                        logger.info(f"Loaded plugin: {plugin_name}")
                except Exception as e:
                    logger.error(f"Failed to load plugin {plugin_name}: {e}")

    def execute_hook(self, hook_name: str, *args, **kwargs) -> List[Any]:
        """Execute a specific hook in all plugins that implement it."""
        results = []
        for name, plugin in self.plugins.items():
            if hasattr(plugin, hook_name):
                hook_func = getattr(plugin, hook_name)
                if callable(hook_func):
                    try:
                        res = hook_func(*args, **kwargs)
                        results.append(res)
                    except Exception as e:
                        logger.error(f"Error in plugin {name} hook {hook_name}: {e}")
        return results

plugin_manager = PluginService()
