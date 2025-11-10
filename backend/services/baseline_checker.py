"""
Baseline Checker Service

This service analyzes code (HTML, CSS, JavaScript) and checks for web features
against the Baseline data to determine browser compatibility and safety.
"""

import re
import json
import requests
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import cssutils
import logging
import asyncio
from backend.services.ai_service import AIService

# Suppress cssutils warnings
cssutils.log.setLevel(logging.ERROR)

# Initialize AI service
ai_service = AIService()

class BaselineStatus(Enum):
    BASELINE_HIGH = "baseline_high"  # Widely supported
    BASELINE_LOW = "baseline_low"   # Limited support
    NOT_BASELINE = "not_baseline"   # Not in Baseline

@dataclass
class FeatureCheck:
    feature_name: str
    status: BaselineStatus
    line_number: int
    column_start: int
    column_end: int
    description: str
    browser_support: Dict[str, str]
    suggestion: Optional[str] = None

class BaselineChecker:
    def __init__(self):
        self.baseline_data = None
        self.load_baseline_data()
        # Predefined suggestions for common features
        self.suggestion_map = {
            # APIs and JavaScript features
            "navigator.bluetooth": "Use the Web Serial API or WebUSB API for device communication, which have better browser support.",
            "navigator.usb": "Consider using a server-side proxy for USB communication or progressive enhancement.",
            "WebGPU": "Use WebGL as a more widely supported alternative for 3D graphics.",
            "navigator.mediaDevices": "Use feature detection and provide fallbacks for audio/video capture.",
            "navigator.share": "Implement custom share buttons for social platforms as a fallback.",
            "AbortController": "Use timeout patterns or custom cancellation tokens as alternatives.",
            "BigInt": "Use a library like big.js or bignumber.js for large number operations.",
            "optional chaining": "Use conditional checks with && operator instead (obj && obj.prop && obj.prop.method).",
            "nullish coalescing": "Use logical OR with explicit checks (value !== null && value !== undefined ? value : default).",
            "dynamic import": "Use bundlers like Webpack or Rollup with code splitting for older browsers.",
            "Proxy": "Use Object.defineProperty() or design patterns that don't require direct property interception.",
            "ResizeObserver": "Use window resize event listeners with debouncing as a fallback.",
            "IntersectionObserver": "Use scroll event listeners with element position calculations.",
            
            # CSS features
            ":has()": "Use JavaScript to apply styles conditionally or restructure your HTML to avoid parent selectors.",
            "backdrop-filter": "Use a semi-transparent PNG background or position a blurred element behind your target.",
            "container-queries": "Use media queries with JavaScript to detect parent container sizes.",
            "aspect-ratio": "Use the padding-top percentage technique to maintain aspect ratios.",
            "gap": "Use margins on child elements instead of gap property for flexbox/grid layouts.",
            "color-mix": "Pre-compute your color values or use CSS custom properties with fallback colors.",
            "accent-color": "Apply specific styling to form elements directly rather than using accent-color.",
            
            # HTML features
            "dialog": "Create custom modal dialogs using divs with proper accessibility attributes.",
            "lazy loading": "Implement JavaScript-based lazy loading with Intersection Observer or scroll events."
        }
    
    def load_baseline_data(self):
        """Load Baseline data from web-features or fallback to Web Platform Dashboard API"""
        try:
            # Try to load from local web-features data (if available)
            # For now, we'll use a simplified approach with known features
            self.baseline_data = self._get_baseline_features()
        except Exception as e:
            print(f"Error loading baseline data: {e}")
            self.baseline_data = {}
            
    async def generate_suggestion(self, feature_name: str, code_snippet: str = "", language: str = "") -> str:
        """Generate AI-powered suggestion for baseline-unsafe features"""
        # First check if we have a predefined suggestion
        if feature_name in self.suggestion_map:
            return self.suggestion_map[feature_name]
            
        # Otherwise, generate a suggestion using AI
        prompt = f"""
        Provide a concise, practical alternative for the following web feature that has limited browser support: 
        
        Feature: {feature_name}
        Language: {language}
        Code snippet: 
        ```{language}
        {code_snippet}
        ```
        
        Analyze the code context and suggest a specific, production-ready alternative that:
        1. Maintains similar functionality
        2. Has wide browser support (Baseline-safe)
        3. Requires minimal changes to the surrounding code
        4. Includes any necessary polyfills or fallback mechanisms
        5. Follows modern web development best practices
        
        Format your response as a direct code replacement with brief explanation.
        Keep your response under 150 characters and focus only on the technical solution.
        """
        
        try:
            suggestion = ""
            async for chunk in ai_service.generate_response(prompt, stream=False):
                suggestion += chunk
            return suggestion.strip()
        except Exception as e:
            print(f"Error generating suggestion: {e}")
            return "Consider using a more widely supported alternative or polyfill."
    
    def _get_baseline_features(self) -> Dict[str, Any]:
        """Get baseline features data - simplified version for demo"""
        return {
            # CSS Features
            ":has()": {
                "status": "baseline_low",
                "description": "CSS :has() pseudo-class",
                "support": {"chrome": "105", "firefox": "121", "safari": "15.4"},
                "baseline_date": "2024-03-01"
            },
            "container-queries": {
                "status": "baseline_high", 
                "description": "CSS Container Queries",
                "support": {"chrome": "105", "firefox": "110", "safari": "16.0"},
                "baseline_date": "2023-09-01"
            },
            "grid": {
                "status": "baseline_high",
                "description": "CSS Grid Layout",
                "support": {"chrome": "57", "firefox": "52", "safari": "10.1"},
                "baseline_date": "2020-01-01"
            },
            "flexbox": {
                "status": "baseline_high",
                "description": "CSS Flexbox",
                "support": {"chrome": "29", "firefox": "28", "safari": "9"},
                "baseline_date": "2019-01-01"
            },
            
            # JavaScript APIs
            "navigator.bluetooth": {
                "status": "not_baseline",
                "description": "Web Bluetooth API",
                "support": {"chrome": "56", "firefox": "no", "safari": "no"},
                "baseline_date": None
            },
            "navigator.geolocation": {
                "status": "baseline_high",
                "description": "Geolocation API",
                "support": {"chrome": "5", "firefox": "3.5", "safari": "5"},
                "baseline_date": "2015-01-01"
            },
            "fetch": {
                "status": "baseline_high",
                "description": "Fetch API",
                "support": {"chrome": "42", "firefox": "39", "safari": "10.1"},
                "baseline_date": "2020-01-01"
            },
            "async/await": {
                "status": "baseline_high",
                "description": "Async/Await syntax",
                "support": {"chrome": "55", "firefox": "52", "safari": "10.1"},
                "baseline_date": "2020-01-01"
            },
            
            # HTML Features
            "dialog": {
                "status": "baseline_low",
                "description": "HTML Dialog Element",
                "support": {"chrome": "37", "firefox": "98", "safari": "15.4"},
                "baseline_date": "2024-01-01"
            },
            "details": {
                "status": "baseline_high",
                "description": "HTML Details Element",
                "support": {"chrome": "12", "firefox": "49", "safari": "6"},
                "baseline_date": "2019-01-01"
            }
        }
    
    def check_code(self, code: str, language: str, file_path: str = "") -> List[FeatureCheck]:
        """Main method to check code for Baseline features"""
        features = []
        if language.lower() in ['css', 'scss', 'sass', 'less']:
            features = self._check_css_features(code)
        elif language.lower() in ['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx']:
            features = self._check_js_features(code)
        elif language.lower() in ['html', 'htm']:
            features = self._check_html_features(code)
        
        # Add AI suggestions for unsafe features
        loop = asyncio.get_event_loop()
        for feature in features:
            if feature.status == BaselineStatus.NOT_BASELINE or feature.status == BaselineStatus.BASELINE_LOW:
                # Extract code snippet for context
                lines = code.split('\n')
                line_index = feature.line_number - 1
                start_line = max(0, line_index - 1)
                end_line = min(len(lines), line_index + 2)
                code_snippet = '\n'.join(lines[start_line:end_line])
                
                # Generate suggestion if not already present
                if not feature.suggestion:
                    suggestion = loop.run_until_complete(
                        self.generate_suggestion(feature.feature_name, code_snippet, language)
                    )
                    feature.suggestion = suggestion
        
        return features
    
    def _check_css_features(self, css_code: str) -> List[FeatureCheck]:
        """Check CSS code for Baseline features"""
        features = []
        lines = css_code.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check for :has() pseudo-class
            if ':has(' in line:
                col_start = line.find(':has(')
                features.append(FeatureCheck(
                    feature_name=":has()",
                    status=BaselineStatus.BASELINE_LOW,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 5,
                    description="CSS :has() pseudo-class - Limited browser support",
                    browser_support=self.baseline_data[":has()"]["support"],
                    suggestion="Consider using JavaScript workaround for older browsers"
                ))
            
            # Check for container queries
            if '@container' in line:
                col_start = line.find('@container')
                features.append(FeatureCheck(
                    feature_name="container-queries",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 10,
                    description="CSS Container Queries - Good browser support",
                    browser_support=self.baseline_data["container-queries"]["support"]
                ))
            
            # Check for Grid
            if 'display: grid' in line or 'display:grid' in line:
                col_start = line.find('grid')
                features.append(FeatureCheck(
                    feature_name="grid",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 4,
                    description="CSS Grid Layout - Excellent browser support",
                    browser_support=self.baseline_data["grid"]["support"]
                ))
        
        return features
    
    def _check_js_features(self, js_code: str) -> List[FeatureCheck]:
        """Check JavaScript code for Baseline features"""
        features = []
        lines = js_code.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check for Web Bluetooth API
            if 'navigator.bluetooth' in line:
                col_start = line.find('navigator.bluetooth')
                features.append(FeatureCheck(
                    feature_name="navigator.bluetooth",
                    status=BaselineStatus.NOT_BASELINE,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 19,
                    description="Web Bluetooth API - Very limited browser support",
                    browser_support=self.baseline_data["navigator.bluetooth"]["support"],
                    suggestion="Consider feature detection and fallback for unsupported browsers"
                ))
            
            # Check for Geolocation API
            if 'navigator.geolocation' in line:
                col_start = line.find('navigator.geolocation')
                features.append(FeatureCheck(
                    feature_name="navigator.geolocation",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 21,
                    description="Geolocation API - Excellent browser support",
                    browser_support=self.baseline_data["navigator.geolocation"]["support"]
                ))
            
            # Check for Fetch API
            if re.search(r'\bfetch\s*\(', line):
                col_start = line.find('fetch')
                features.append(FeatureCheck(
                    feature_name="fetch",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 5,
                    description="Fetch API - Excellent browser support",
                    browser_support=self.baseline_data["fetch"]["support"]
                ))
            
            # Check for async/await
            if 'async ' in line or 'await ' in line:
                keyword = 'async' if 'async ' in line else 'await'
                col_start = line.find(keyword)
                features.append(FeatureCheck(
                    feature_name="async/await",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + len(keyword),
                    description="Async/Await syntax - Excellent browser support",
                    browser_support=self.baseline_data["async/await"]["support"]
                ))
        
        return features
    
    def _check_html_features(self, html_code: str) -> List[FeatureCheck]:
        """Check HTML code for Baseline features"""
        features = []
        lines = html_code.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check for dialog element
            if '<dialog' in line.lower():
                col_start = line.lower().find('<dialog')
                features.append(FeatureCheck(
                    feature_name="dialog",
                    status=BaselineStatus.BASELINE_LOW,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 7,
                    description="HTML Dialog Element - Limited browser support",
                    browser_support=self.baseline_data["dialog"]["support"],
                    suggestion="Consider using a polyfill or modal library for better compatibility"
                ))
            
            # Check for details element
            if '<details' in line.lower():
                col_start = line.lower().find('<details')
                features.append(FeatureCheck(
                    feature_name="details",
                    status=BaselineStatus.BASELINE_HIGH,
                    line_number=line_num,
                    column_start=col_start,
                    column_end=col_start + 8,
                    description="HTML Details Element - Good browser support",
                    browser_support=self.baseline_data["details"]["support"]
                ))
        
        return features
    
    def get_feature_suggestions(self, feature_name: str) -> str:
        """Get AI-powered suggestions for non-baseline features"""
        suggestions = {
            ":has()": "Use JavaScript querySelector with manual traversal, or wait for broader support",
            "navigator.bluetooth": "Implement feature detection: if ('bluetooth' in navigator) { ... }",
            "dialog": "Use a modal library like React Modal or implement custom modal component",
        }
        return suggestions.get(feature_name, "Consider using a polyfill or alternative approach")

# Global instance
baseline_checker = BaselineChecker()