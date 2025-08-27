from typing import Dict, List, Optional, Tuple, Union, Any
from string import Template
from dataclasses import dataclass
from enum import Enum, auto
from datetime import datetime
from pathlib import Path
import json
from backend.config import settings

class TemplateType(Enum):
    CODE = auto()
    TEXT = auto()
    COMMAND = auto()
    SYSTEM = auto()
    TEST = auto()
    EXPLANATION = auto()

@dataclass
class TemplateMetadata:
    version: str
    description: str
    required_vars: List[str]
    optional_vars: List[str]
    template_type: TemplateType
    author: str
    created_at: datetime
    updated_at: datetime
    parent: Optional[str] = None
    deprecated: bool = False
    tags: List[str] = None

default_template_version = "1.0"

class PromptService:
    def __init__(self, templates: Dict[str, Dict[str, Any]]):
        self.templates = templates
        self.template_cache = {}
        self.template_metadata: Dict[str, TemplateMetadata] = {}
        self._initialize_metadata()

    def _initialize_metadata(self):
        """Initialize template metadata from configuration with timestamps."""
        now = datetime.now()
        for name, config in self.templates.items():
            self.template_metadata[name] = TemplateMetadata(
                version=config.get('version', default_template_version),
                description=config.get('description', ''),
                required_vars=config.get('required_vars', []),
                optional_vars=config.get('optional_vars', []),
                template_type=TemplateType[config.get('type', 'TEXT').upper()],
                author=config.get('author', 'system'),
                created_at=config.get('created_at', now),
                updated_at=config.get('updated_at', now),
                parent=config.get('parent'),
                deprecated=config.get('deprecated', False),
                tags=config.get('tags', [])
            )

    def get_template_names(self, 
                         group: Optional[str] = None, 
                         include_deprecated: bool = False,
                         template_type: Optional[TemplateType] = None) -> List[str]:
        """Get template names with multiple filtering options."""
        names = sorted(self.templates.keys())
        
        if group:
            names = [name for name in names if name.startswith(f"{group}.")]
            
        if not include_deprecated:
            names = [name for name in names if not self.template_metadata[name].deprecated]
            
        if template_type:
            names = [name for name in names 
                    if self.template_metadata[name].template_type == template_type]
                    
        return names

    def get_template_info(self, template_name: str) -> TemplateMetadata:
        """Get complete metadata for a specific template."""
        if template_name not in self.template_metadata:
            raise ValueError(f"Template '{template_name}' not found.")
        return self.template_metadata[template_name]

    def get_template(self, template_name: str) -> Tuple[Template, TemplateMetadata]:
        """Get template with caching, metadata, and inheritance resolution."""
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' not found.")
            
        if template_name not in self.template_cache:
            # Handle template inheritance chain
            content_parts = []
            current = template_name
            
            while current:
                content_parts.insert(0, self.templates[current]['content'])
                current = self.template_metadata[current].parent
                
            full_content = "\n".join(content_parts)
            self.template_cache[template_name] = Template(full_content)
            
        return self.template_cache[template_name], self.template_metadata[template_name]

    def format_prompt(self, template_name: str, context: Dict[str, str]) -> str:
        """Format prompt with comprehensive validation."""
        template, metadata = self.get_template(template_name)
        
        # Check required variables
        missing_vars = [var for var in metadata.required_vars if var not in context]
        if missing_vars:
            raise ValueError(f"Missing required variables: {', '.join(missing_vars)}")
        
        # Check for undefined variables
        template_str = template.template
        defined_vars = set(metadata.required_vars + metadata.optional_vars)
        used_vars = {var for _, var, _, _ in Template.pattern.findall(template_str)}
        undefined_vars = used_vars - defined_vars
        
        if undefined_vars:
            raise ValueError(f"Template uses undefined variables: {', '.join(undefined_vars)}")
        
        try:
            return template.safe_substitute(**context)
        except ValueError as e:
            raise ValueError(f"Error formatting prompt: {str(e)}")

    def get_templates_by_type(self, template_type: TemplateType) -> List[str]:
        """Get all templates of a specific type."""
        return [name for name, meta in self.template_metadata.items() 
                if meta.template_type == template_type and not meta.deprecated]

    def get_template_family(self, template_name: str) -> List[str]:
        """Get complete inheritance chain for a template."""
        family = []
        current = template_name
        
        while current:
            family.append(current)
            current = self.template_metadata[current].parent
            
        return family

    def save_template(self, 
                     name: str, 
                     content: str, 
                     template_type: TemplateType,
                     description: str = "",
                     required_vars: List[str] = None,
                     optional_vars: List[str] = None,
                     parent: Optional[str] = None,
                     tags: List[str] = None) -> None:
        """Create or update a template with full metadata."""
        now = datetime.now()
        
        if name in self.templates:
            # Update existing template
            self.templates[name]['content'] = content
            self.templates[name]['type'] = template_type.name
            self.templates[name]['description'] = description
            self.templates[name]['required_vars'] = required_vars or []
            self.templates[name]['optional_vars'] = optional_vars or []
            self.templates[name]['parent'] = parent
            self.templates[name]['tags'] = tags or []
            self.templates[name]['updated_at'] = now
            
            # Update metadata
            metadata = self.template_metadata[name]
            metadata.description = description
            metadata.template_type = template_type
            metadata.required_vars = required_vars or []
            metadata.optional_vars = optional_vars or []
            metadata.parent = parent
            metadata.tags = tags or []
            metadata.updated_at = now
        else:
            # Create new template
            self.templates[name] = {
                'content': content,
                'type': template_type.name,
                'description': description,
                'required_vars': required_vars or [],
                'optional_vars': optional_vars or [],
                'parent': parent,
                'tags': tags or [],
                'created_at': now,
                'updated_at': now,
                'version': default_template_version
            }
            
            # Initialize metadata
            self.template_metadata[name] = TemplateMetadata(
                version=default_template_version,
                description=description,
                required_vars=required_vars or [],
                optional_vars=optional_vars or [],
                template_type=template_type,
                author="system",
                created_at=now,
                updated_at=now,
                parent=parent,
                tags=tags or []
            )
        
        # Clear cache for this template and any children
        self._clear_template_cache(name)

    def _clear_template_cache(self, template_name: str) -> None:
        """Clear cache for a template and its descendants."""
        if template_name in self.template_cache:
            del self.template_cache[template_name]
            
        # Clear cache for all templates that inherit from this one
        for name in self.templates:
            if self.template_metadata[name].parent == template_name:
                self._clear_template_cache(name)

    def export_templates(self, file_path: Union[str, Path]) -> None:
        """Export all templates to a JSON file."""
        data = {
            "templates": self.templates,
            "metadata": {
                name: {
                    "version": meta.version,
                    "description": meta.description,
                    "required_vars": meta.required_vars,
                    "optional_vars": meta.optional_vars,
                    "template_type": meta.template_type.name,
                    "author": meta.author,
                    "created_at": meta.created_at.isoformat(),
                    "updated_at": meta.updated_at.isoformat(),
                    "parent": meta.parent,
                    "deprecated": meta.deprecated,
                    "tags": meta.tags
                }
                for name, meta in self.template_metadata.items()
            }
        }
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

    def import_templates(self, file_path: Union[str, Path]) -> None:
        """Import templates from a JSON file."""
        with open(file_path) as f:
            data = json.load(f)
            
        self.templates.update(data.get("templates", {}))
        
        # Reinitialize metadata
        self.template_cache = {}
        self._initialize_metadata()

# Global instance
prompt_service = PromptService(settings.app_config.prompt_templates)
