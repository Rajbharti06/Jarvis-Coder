import { BaselineFeature } from '../utils/baselineService';

/**
 * Service for handling Baseline compatibility visual indicators in the editor
 */
export class BaselineEditorService {
  /**
   * Creates Monaco editor decorations for Baseline features
   */
  createMonacoDecorations(features: BaselineFeature[]) {
    return features.map(feature => {
      const startPosition = { lineNumber: feature.line, column: feature.column };
      const endPosition = { 
        lineNumber: feature.line, 
        column: feature.column + feature.length 
      };

      // Create different decoration styles based on status
      return {
        range: { startLineNumber: startPosition.lineNumber, startColumn: startPosition.column, 
                endLineNumber: endPosition.lineNumber, endColumn: endPosition.column },
        options: {
          // Apply underline style
          className: `baseline-${feature.status}`,
          // Apply background highlight
          inlineClassName: `baseline-inline-${feature.status}`,
          // Add margin indicator in the editor gutter
          marginClassName: `baseline-margin-${feature.status}`,
          // Add hover message
          hoverMessage: { value: this.createHoverMessage(feature) },
          // Add glyph in the margin
          glyphMarginClassName: `baseline-glyph-${feature.status}`,
          glyphMarginHoverMessage: { value: this.getStatusDescription(feature.status) },
          // Ensure decoration is visible when scrolling
          stickiness: 1,
          // Add minimap decoration
          minimap: {
            color: this.getMinimapColor(feature.status),
            position: 1
          }
        }
      };
    });
  }

  /**
   * Creates a rich hover message for a Baseline feature
   */
  private createHoverMessage(feature: BaselineFeature): string {
    const statusText = this.getStatusText(feature.status);
    const statusDescription = this.getStatusDescription(feature.status);
    const browserSupport = feature.browser_support ? 
      `<div class="baseline-tooltip-support">
        <div class="baseline-tooltip-support-item">Browser Support: ${feature.browser_support}</div>
      </div>` : '';
    
    return `<div class="baseline-tooltip">
      <div class="baseline-tooltip-header">
        <span class="baseline-status-${this.getStatusClass(feature.status)}">${this.getStatusIcon(feature.status)}</span>
        ${feature.name}: ${statusText}
      </div>
      <div class="baseline-tooltip-description">${statusDescription}</div>
      ${browserSupport}
      ${feature.suggestion ? 
        `<div class="baseline-tooltip-suggestion">
          <strong>Suggestion:</strong> ${feature.suggestion}
        </div>` : ''}
    </div>`;
  }

  /**
   * Gets the status text for a Baseline status
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'baseline_high':
        return 'Safe to use';
      case 'baseline_low':
        return 'Use with caution';
      case 'not_baseline':
        return 'Not Baseline compatible';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Gets the status description for a Baseline status
   */
  private getStatusDescription(status: string): string {
    switch (status) {
      case 'baseline_high':
        return 'This feature is widely supported across browsers and is safe to use in production.';
      case 'baseline_low':
        return 'This feature has limited browser support. Consider providing fallbacks.';
      case 'not_baseline':
        return 'This feature is not part of the Baseline and may cause compatibility issues.';
      default:
        return 'Unknown feature status.';
    }
  }

  /**
   * Gets the status class for styling
   */
  private getStatusClass(status: string): string {
    switch (status) {
      case 'baseline_high':
        return 'safe';
      case 'baseline_low':
        return 'caution';
      case 'not_baseline':
        return 'risky';
      default:
        return '';
    }
  }

  /**
   * Gets the status icon for a Baseline status
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'baseline_high':
        return '✓';
      case 'baseline_low':
        return '⚠️';
      case 'not_baseline':
        return '✗';
      default:
        return '?';
    }
  }

  /**
   * Gets the minimap color for a Baseline status
   */
  private getMinimapColor(status: string): string {
    switch (status) {
      case 'baseline_high':
        return '#22c55e';
      case 'baseline_low':
        return '#f59e0b';
      case 'not_baseline':
        return '#ef4444';
      default:
        return '#888888';
    }
  }
}

export const baselineEditorService = new BaselineEditorService();