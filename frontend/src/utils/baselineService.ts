/**
 * Baseline Service
 * 
 * Handles communication with the backend Baseline API and provides
 * utilities for checking web features against Baseline data.
 */

export interface BaselineFeature {
  feature_name: string;
  status: 'baseline_high' | 'baseline_low' | 'not_baseline';
  line_number: number;
  column_start: number;
  column_end: number;
  description: string;
  browser_support: Record<string, string>;
  suggestion?: string;
}

export interface BaselineSummary {
  total_features: number;
  baseline_high: number;
  baseline_low: number;
  not_baseline: number;
  overall_status: 'safe' | 'caution' | 'risky';
  recommendations: string[];
}

export interface BaselineCheckResponse {
  features: BaselineFeature[];
  summary: BaselineSummary;
}

export interface BaselineCheckRequest {
  code: string;
  language: string;
  file_path?: string;
}

class BaselineService {
  private baseUrl = 'http://127.0.0.1:8000/baseline';

  /**
   * Check code for Baseline features
   */
  async checkCode(request: BaselineCheckRequest): Promise<BaselineCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking baseline features:', error);
      throw error;
    }
  }

  /**
   * Get list of available Baseline features
   */
  async getAvailableFeatures(): Promise<{ features: string[]; total_count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/features`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching available features:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific feature
   */
  async getFeatureInfo(featureName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/feature/${encodeURIComponent(featureName)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching feature info:', error);
      throw error;
    }
  }

  /**
   * Get status color for Monaco Editor decorations
   */
  getStatusColor(status: BaselineFeature['status']): string {
    switch (status) {
      case 'baseline_high':
        return '#22c55e'; // Green
      case 'baseline_low':
        return '#f59e0b'; // Orange/Yellow
      case 'not_baseline':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Get status icon for UI display
   */
  getStatusIcon(status: BaselineFeature['status']): string {
    switch (status) {
      case 'baseline_high':
        return '✅';
      case 'baseline_low':
        return '⚠️';
      case 'not_baseline':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get human-readable status text
   */
  getStatusText(status: BaselineFeature['status']): string {
    switch (status) {
      case 'baseline_high':
        return 'Baseline Safe';
      case 'baseline_low':
        return 'Limited Support';
      case 'not_baseline':
        return 'Not Baseline Safe';
      default:
        return 'Unknown';
    }
  }

  /**
   * Debounce function for API calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Create Monaco Editor decorations from Baseline features
   */
  createMonacoDecorations(features: BaselineFeature[]) {
    return features.map(feature => ({
      range: {
        startLineNumber: feature.line_number,
        startColumn: feature.column_start + 1, // Monaco uses 1-based indexing
        endLineNumber: feature.line_number,
        endColumn: feature.column_end + 1,
      },
      options: {
        className: `baseline-${feature.status}`,
        hoverMessage: {
          value: `**${this.getStatusIcon(feature.status)} ${this.getStatusText(feature.status)}**\n\n${feature.description}\n\n**Browser Support:**\n${Object.entries(feature.browser_support)
            .map(([browser, version]) => `- ${browser}: ${version}`)
            .join('\n')}${feature.suggestion ? `\n\n**💡 AI Suggestion:** ${feature.suggestion}` : ''}`,
        },
        inlineClassName: `baseline-inline-${feature.status}`,
        minimap: {
          color: this.getStatusColor(feature.status),
          position: 2, // Inline
        },
      },
    }));
  }
}

// Export singleton instance
export const baselineService = new BaselineService();