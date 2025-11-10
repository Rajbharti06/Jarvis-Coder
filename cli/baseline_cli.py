#!/usr/bin/env python
"""
Baseline CLI - Command line tool for checking web code against Baseline compatibility
"""
import os
import sys
import argparse
import json
from typing import List, Dict, Any, Optional
import glob

# Add the parent directory to sys.path to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.services.baseline_checker import BaselineChecker, BaselineStatus, FeatureCheck

class BaselineCLI:
    """CLI tool for checking web code against Baseline compatibility"""
    
    def __init__(self):
        self.baseline_checker = BaselineChecker()
        self.file_extensions = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'html': 'html',
            'htm': 'html'
        }
    
    def get_language_from_extension(self, file_path: str) -> Optional[str]:
        """Determine language based on file extension"""
        ext = file_path.split('.')[-1].lower()
        return self.file_extensions.get(ext)
    
    def scan_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Scan a single file for Baseline compatibility"""
        language = self.get_language_from_extension(file_path)
        if not language:
            return []
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
                
            features = self.baseline_checker.check_code(code, language, file_path)
            return [self._feature_to_dict(feature, file_path) for feature in features]
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
            return []
    
    def scan_directory(self, directory: str, pattern: str = "**/*") -> List[Dict[str, Any]]:
        """Scan a directory for Baseline compatibility"""
        results = []
        search_pattern = os.path.join(directory, pattern)
        
        for file_path in glob.glob(search_pattern, recursive=True):
            if os.path.isfile(file_path):
                language = self.get_language_from_extension(file_path)
                if language:
                    results.extend(self.scan_file(file_path))
        
        return results
    
    def _feature_to_dict(self, feature: FeatureCheck, file_path: str) -> Dict[str, Any]:
        """Convert FeatureCheck to dictionary for output"""
        return {
            "file": file_path,
            "feature": feature.feature_name,
            "status": feature.status.name,
            "line": feature.line_number,
            "column": feature.column_start,
            "description": feature.description,
            "browser_support": feature.browser_support,
            "suggestion": feature.suggestion
        }
    
    def generate_report(self, results: List[Dict[str, Any]], output_format: str = "text") -> str:
        """Generate a report of the scan results"""
        if not results:
            return "No Baseline compatibility issues found."
            
        if output_format == "json":
            return json.dumps(results, indent=2)
            
        # Text format
        report = []
        report.append("Baseline Compatibility Report")
        report.append("============================")
        report.append(f"Total issues found: {len(results)}")
        report.append("")
        
        # Group by file
        files = {}
        for result in results:
            file_path = result["file"]
            if file_path not in files:
                files[file_path] = []
            files[file_path].append(result)
        
        # Generate report for each file
        for file_path, issues in files.items():
            report.append(f"File: {file_path}")
            report.append("-" * (len(file_path) + 6))
            
            for issue in issues:
                status = issue["status"]
                status_icon = "❌" if status == "NOT_BASELINE" else "⚠️" if status == "BASELINE_LOW" else "✅"
                report.append(f"{status_icon} Line {issue['line']}: {issue['feature']} - {issue['description']}")
                if issue.get("suggestion"):
                    report.append(f"   💡 Suggestion: {issue['suggestion']}")
                report.append("")
            
        return "\n".join(report)

def main():
    """Main entry point for the CLI"""
    parser = argparse.ArgumentParser(description="Check web code against Baseline compatibility")
    parser.add_argument("path", help="File or directory to scan")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")
    parser.add_argument("--pattern", default="**/*.{js,ts,jsx,tsx,css,scss,sass,less,html,htm}", help="Glob pattern for files to scan")
    parser.add_argument("--output", help="Output file (default: stdout)")
    
    args = parser.parse_args()
    
    cli = BaselineCLI()
    
    if os.path.isfile(args.path):
        results = cli.scan_file(args.path)
    else:
        results = cli.scan_directory(args.path, args.pattern)
    
    report = cli.generate_report(results, args.format)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(report)
    else:
        print(report)
    
    # Return non-zero exit code if issues found
    if results:
        not_baseline_count = sum(1 for r in results if r["status"] == "NOT_BASELINE")
        if not_baseline_count > 0:
            sys.exit(1)
    
    sys.exit(0)

if __name__ == "__main__":
    main()