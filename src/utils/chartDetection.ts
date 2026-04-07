// ============================================================
// chartDetection.ts — Smart chart data detection for slides
// Transforms bullet points into chart-ready data structures
// ============================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  color?: string;
}

export interface TimeSeriesPoint {
  name: string;
  value: number;
  date?: string;
}

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'pie' 
  | 'area' 
  | 'stats' // fallback to stat cards
  | 'none';

export interface DetectedChart {
  type: ChartType;
  data: ChartDataPoint[] | TimeSeriesPoint[];
  title?: string;
  subtitle?: string;
  isPercentage?: boolean;
  totalValue?: number;
}

/**
 * Analyzes slide content to detect chartable data patterns
 * Returns chart configuration or null if no pattern detected
 */
export function detectChartData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  if (!content || content.length === 0) return null;

  // Try different detection patterns in order of sophistication
  const patterns = [
    detectTimeSeriesData,
    detectPercentageData, 
    detectComparisonData,
    detectNumericData,
    detectStatsData
  ];

  for (const detector of patterns) {
    const result = detector(content, title, subtitle);
    if (result && result.type !== 'none') {
      return result;
    }
  }

  return null;
}

/**
 * Detect time series data (years, months, quarters)
 * Example: "2020: 45M users", "Q1: $120K revenue"
 */
function detectTimeSeriesData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  const timePatterns = [
    /^(20\d{2}|19\d{2})\s*[:,-]?\s*([^:]+)$/i, // Years: "2021: 45M users"
    /^(Q[1-4]|Quarter [1-4])\s*[:,-]?\s*([^:]+)$/i, // Quarters: "Q1: $120K"
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[:,-]?\s*([^:]+)$/i, // Months
    /^(Week \d+|Day \d+)\s*[:,-]?\s*([^:]+)$/i, // Weeks/Days
  ];

  const matches = content.map(bullet => {
    for (const pattern of timePatterns) {
      const match = bullet.match(pattern);
      if (match) {
        const timeName = match[1];
        const valueStr = match[2];
        const value = extractNumber(valueStr);
        
        if (value !== null) {
          return {
            name: timeName,
            value,
            date: timeName
          };
        }
      }
    }
    return null;
  }).filter(Boolean);

  if (matches.length >= 2) {
    return {
      type: 'line',
      data: matches as TimeSeriesPoint[],
      title,
      subtitle,
      isPercentage: content.some(c => c.includes('%'))
    };
  }

  return null;
}

/**
 * Detect percentage breakdowns (parts of a whole)
 * Example: "Mobile: 65%", "Desktop: 35%"
 */
function detectPercentageData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  const percentMatches = content.map(bullet => {
    const match = bullet.match(/^([^:]+):\s*(\d+(?:\.\d+)?)%/i);
    if (match) {
      const name = match[1].trim();
      const value = parseFloat(match[2]);
      return { name, value };
    }
    return null;
  }).filter(Boolean);

  if (percentMatches.length >= 2) {
    // Check if percentages add up to ~100%
    const total = percentMatches.reduce((sum, item) => sum + item.value, 0);
    const isPieChart = Math.abs(total - 100) < 5; // Allow 5% variance

    return {
      type: isPieChart ? 'pie' : 'bar',
      data: percentMatches as ChartDataPoint[],
      title,
      subtitle,
      isPercentage: true,
      totalValue: total
    };
  }

  return null;
}

/**
 * Detect comparison data with explicit values
 * Example: "Company A: 120K users", "Company B: 85K users"
 */
function detectComparisonData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  const comparisonPatterns = [
    /^([^:]+):\s*([^:]+)$/i, // "Category: Value"
    /^([^-]+)-\s*([^-]+)$/i, // "Category - Value"
  ];

  const matches = content.map(bullet => {
    for (const pattern of comparisonPatterns) {
      const match = bullet.match(pattern);
      if (match) {
        const name = match[1].trim();
        const valueStr = match[2].trim();
        const value = extractNumber(valueStr);
        
        if (value !== null) {
          return { name, value };
        }
      }
    }
    return null;
  }).filter(Boolean);

  if (matches.length >= 2) {
    // Use area chart for larger datasets, bar for smaller
    return {
      type: matches.length >= 4 ? 'area' : 'bar',
      data: matches as ChartDataPoint[],
      title,
      subtitle,
      isPercentage: content.some(c => c.includes('%'))
    };
  }

  return null;
}

/**
 * Detect simple numeric data at start of bullets
 * Example: "45M users worldwide", "12K downloads daily"
 */
function detectNumericData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  const matches = content.map((bullet, index) => {
    const value = extractLeadingNumber(bullet);
    if (value !== null) {
      const description = bullet.replace(/^[\d.,kKmMbB%+×x\-]+\s*/, '').trim();
      return {
        name: description || `Item ${index + 1}`,
        value
      };
    }
    return null;
  }).filter(Boolean);

  if (matches.length >= 2) {
    return {
      type: 'bar',
      data: matches as ChartDataPoint[],
      title,
      subtitle,
      isPercentage: content.some(c => c.includes('%'))
    };
  }

  return null;
}

/**
 * Fallback to stats cards for any numeric content
 */
function detectStatsData(
  content: string[], 
  title?: string, 
  subtitle?: string
): DetectedChart | null {
  const hasNumbers = content.some(bullet => extractLeadingNumber(bullet) !== null);
  
  if (hasNumbers) {
    return {
      type: 'stats',
      data: content.map((bullet, i) => ({
        name: bullet,
        value: extractLeadingNumber(bullet) || i + 1
      })),
      title,
      subtitle
    };
  }

  return { type: 'none', data: [] };
}

/**
 * Extract number from start of text (e.g., "45M", "12.5K", "99%")
 */
function extractLeadingNumber(text: string): number | null {
  const match = text.match(/^(\d[\d.,kKmMbB%+×x\-]*)/i);
  if (match) {
    return extractNumber(match[1]);
  }
  return null;
}

/**
 * Parse number string with suffixes (K, M, B) and percentages
 */
export function extractNumber(str: string): number | null {
  // Remove commas and spaces
  let clean = str.replace(/[,\s]/g, '');
  
  // Handle percentages
  if (clean.includes('%')) {
    const num = parseFloat(clean.replace('%', ''));
    return isNaN(num) ? null : num;
  }

  // Handle suffixes
  const suffixMap = {
    'k': 1000,
    'm': 1000000, 
    'b': 1000000000,
    't': 1000000000000
  };

  let multiplier = 1;
  const lastChar = clean.slice(-1).toLowerCase();
  
  if (lastChar in suffixMap) {
    multiplier = suffixMap[lastChar as keyof typeof suffixMap];
    clean = clean.slice(0, -1);
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num * multiplier;
}

/**
 * Generate chart colors based on theme
 */
export function getChartColors(theme: 'modern' | 'minimal' | 'corporate', count: number): string[] {
  const palettes = {
    modern: [
      '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F3F0FF'
    ],
    minimal: [
      '#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE', '#F0F9FF'
    ],
    corporate: [
      '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE', '#EFF6FF'
    ]
  };

  const colors = palettes[theme] || palettes.modern;
  
  // If we need more colors than available, generate variations
  if (count <= colors.length) {
    return colors.slice(0, count);
  }

  // For more items, interpolate the palette
  const result = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor((i / count) * colors.length);
    result.push(colors[index] || colors[0]);
  }
  
  return result;
}