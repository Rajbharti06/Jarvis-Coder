from pathlib import Path
from typing import Dict, List, Optional
import json

class PluginService:
    def __init__(self, plugins_dir: Optional[Path] = None):
        base_dir = Path(__file__).resolve().parents[2]
        self.plugins_dir = plugins_dir or (base_dir / "plugins")
        self.plugins_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.plugins_dir / "plugins.json"
        if not self.registry_file.exists():
            self.registry_file.write_text(json.dumps({"plugins": []}, indent=2), encoding="utf-8")

    def _load_registry(self) -> Dict[str, List[Dict[str, object]]]:
        try:
            data = json.loads(self.registry_file.read_text(encoding="utf-8"))
            if "plugins" not in data:
                data["plugins"] = []
            return data
        except Exception:
            return {"plugins": []}

    def _save_registry(self, registry: Dict[str, List[Dict[str, object]]]) -> None:
        self.registry_file.write_text(json.dumps(registry, indent=2), encoding="utf-8")

    def list_plugins(self) -> List[Dict[str, object]]:
        registry = self._load_registry()
        return registry["plugins"]

    def register_plugin(self, manifest: Dict[str, object]) -> Dict[str, object]:
        required = {"id", "name", "version"}
        if not required.issubset(manifest.keys()):
            raise ValueError("Manifest must include id, name, version")
        registry = self._load_registry()
        plugins = registry["plugins"]
        for p in plugins:
            if p["id"] == manifest["id"]:
                p.update(manifest)
                self._save_registry(registry)
                return p
        manifest["enabled"] = False
        plugins.append(manifest)
        self._save_registry(registry)
        return manifest

    def set_enabled(self, plugin_id: str, enabled: bool) -> Dict[str, object]:
        registry = self._load_registry()
        for p in registry["plugins"]:
            if p["id"] == plugin_id:
                p["enabled"] = enabled
                self._save_registry(registry)
                return p
        raise ValueError("Plugin not found")

