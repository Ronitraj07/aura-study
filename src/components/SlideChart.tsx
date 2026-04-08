// ============================================================
// SlideChart.tsx — Professional chart rendering for slides  
// Gamma/Chronicle level data visualization using Recharts
// ============================================================

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { detectChartData, getChartColors, type ChartDataPoint, type TimeSeriesPoint, type ChartType } from '@/utils/chartDetection';

interface SlideChartProps {
  content: string[];
  title?: string;
  subtitle?: string;
  theme: 'modern' | 'minimal' | 'corporate';
  width: number;
  height: number;
}

interface ChartContainerProps {
  children: React.ReactNode;
  width: number;
  height: number;
  theme: 'modern' | 'minimal' | 'corporate';
}

/**
 * Main chart component that auto-detects data patterns and renders appropriate charts
 */
export function SlideChart({ content, title, subtitle, theme, width, height }: SlideChartProps) {
  const chartConfig = detectChartData(content, title, subtitle);
  
  if (!chartConfig || chartConfig.type === 'none') {
    return null;
  }

  // If detection returns 'stats', fall back to existing stat cards
  if (chartConfig.type === 'stats') {
    return null;
  }

  const colors = getChartColors(theme, chartConfig.data.length);
  const containerProps = { width, height, theme };

  switch (chartConfig.type) {
    case 'bar':
      return (
        <ChartContainer {...containerProps}>
          <BarChartComponent 
            data={chartConfig.data as ChartDataPoint[]}
            colors={colors}
            theme={theme}
            isPercentage={chartConfig.isPercentage}
          />
        </ChartContainer>
      );

    case 'line':
      return (
        <ChartContainer {...containerProps}>
          <LineChartComponent 
            data={chartConfig.data as TimeSeriesPoint[]}
            colors={colors}
            theme={theme}
            isPercentage={chartConfig.isPercentage}
          />
        </ChartContainer>
      );

    case 'pie':
      return (
        <ChartContainer {...containerProps}>
          <PieChartComponent 
            data={chartConfig.data as ChartDataPoint[]}
            colors={colors}
            theme={theme}
          />
        </ChartContainer>
      );

    case 'area':
      return (
        <ChartContainer {...containerProps}>
          <AreaChartComponent 
            data={chartConfig.data as ChartDataPoint[]}
            colors={colors}
            theme={theme}
            isPercentage={chartConfig.isPercentage}
          />
        </ChartContainer>
      );

    default:
      return null;
  }
}

/**
 * Chart container with theme-aware styling
 */
function ChartContainer({ children, width, height, theme }: ChartContainerProps) {
  const themeStyles = {
    modern: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(139,92,246,0.25)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
    },
    minimal: {
      background: 'rgba(0,0,0,0.03)',
      border: '1px solid rgba(14,165,233,0.20)',
      borderRadius: '16px',
      backdropFilter: 'blur(8px)',
    },
    corporate: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(59,130,246,0.28)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
    }
  };

  return (
    <div style={{
      ...themeStyles[theme],
      width,
      height,
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement<any>}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Bar chart component
 */
function BarChartComponent({ 
  data, 
  colors, 
  theme, 
  isPercentage 
}: {
  data: ChartDataPoint[];
  colors: string[];
  theme: 'modern' | 'minimal' | 'corporate';
  isPercentage?: boolean;
}) {
  const textColors = {
    modern: '#CBD5E1',
    minimal: '#27272A', 
    corporate: '#BFCFE0'
  };

  const gridColors = {
    modern: 'rgba(139,92,246,0.15)',
    minimal: 'rgba(14,165,233,0.15)',
    corporate: 'rgba(59,130,246,0.20)'
  };

  return (
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke={gridColors[theme]}
        strokeOpacity={0.3}
      />
      <XAxis 
        dataKey="name"
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis 
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(value) => isPercentage ? `${value}%` : formatNumber(value)}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: theme === 'minimal' ? '#F4F4F5' : '#1F2937',
          border: `1px solid ${colors[0]}`,
          borderRadius: '12px',
          color: textColors[theme],
          fontSize: '12px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
        }}
        formatter={(value: number) => [
          isPercentage ? `${value}%` : formatNumber(value),
          'Value'
        ]}
        labelStyle={{ color: textColors[theme] }}
      />
      <Bar 
        dataKey="value" 
        fill={colors[0]}
        radius={[4, 4, 0, 0]}
        fillOpacity={0.85}
      />
    </BarChart>
  );
}

/**
 * Line chart component
 */
function LineChartComponent({ 
  data, 
  colors, 
  theme, 
  isPercentage 
}: {
  data: TimeSeriesPoint[];
  colors: string[];
  theme: 'modern' | 'minimal' | 'corporate';
  isPercentage?: boolean;
}) {
  const textColors = {
    modern: '#CBD5E1',
    minimal: '#27272A',
    corporate: '#BFCFE0'
  };

  const gridColors = {
    modern: 'rgba(139,92,246,0.15)',
    minimal: 'rgba(14,165,233,0.15)',
    corporate: 'rgba(59,130,246,0.20)'
  };

  return (
    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke={gridColors[theme]}
        strokeOpacity={0.3}
      />
      <XAxis 
        dataKey="name"
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis 
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(value) => isPercentage ? `${value}%` : formatNumber(value)}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: theme === 'minimal' ? '#F4F4F5' : '#1F2937',
          border: `1px solid ${colors[0]}`,
          borderRadius: '12px',
          color: textColors[theme],
          fontSize: '12px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
        }}
        formatter={(value: number) => [
          isPercentage ? `${value}%` : formatNumber(value),
          'Value'
        ]}
        labelStyle={{ color: textColors[theme] }}
      />
      <Line 
        type="monotone" 
        dataKey="value" 
        stroke={colors[0]}
        strokeWidth={3}
        dot={{ 
          fill: colors[0], 
          strokeWidth: 2, 
          stroke: theme === 'minimal' ? '#FAFAFA' : '#1F2937',
          r: 5
        }}
        activeDot={{ 
          r: 7, 
          stroke: colors[0], 
          strokeWidth: 3,
          fill: theme === 'minimal' ? '#FAFAFA' : '#1F2937'
        }}
      />
    </LineChart>
  );
}

/**
 * Pie chart component
 */
function PieChartComponent({ 
  data, 
  colors, 
  theme 
}: {
  data: ChartDataPoint[];
  colors: string[];
  theme: 'modern' | 'minimal' | 'corporate';
}) {
  const textColors = {
    modern: '#CBD5E1',
    minimal: '#27272A',
    corporate: '#BFCFE0'
  };

  return (
    <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={80}
        innerRadius={35}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((_, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={colors[index % colors.length]}
            opacity={0.9}
          />
        ))}
      </Pie>
      <Tooltip 
        contentStyle={{
          backgroundColor: theme === 'minimal' ? '#F4F4F5' : '#1F2937',
          border: `1px solid ${colors[0]}`,
          borderRadius: '12px',
          color: textColors[theme],
          fontSize: '12px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
        }}
        formatter={(value: number) => [`${value}%`, 'Percentage']}
        labelStyle={{ color: textColors[theme] }}
      />
      <Legend 
        wrapperStyle={{
          fontSize: '11px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: textColors[theme],
          paddingTop: '10px'
        }}
      />
    </PieChart>
  );
}

/**
 * Area chart component  
 */
function AreaChartComponent({ 
  data, 
  colors, 
  theme, 
  isPercentage 
}: {
  data: ChartDataPoint[];
  colors: string[];
  theme: 'modern' | 'minimal' | 'corporate';
  isPercentage?: boolean;
}) {
  const textColors = {
    modern: '#CBD5E1',
    minimal: '#27272A',
    corporate: '#BFCFE0'
  };

  const gridColors = {
    modern: 'rgba(139,92,246,0.15)',
    minimal: 'rgba(14,165,233,0.15)',
    corporate: 'rgba(59,130,246,0.20)'
  };

  return (
    <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <defs>
        <linearGradient id={`area-gradient-${theme}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={colors[0]} stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke={gridColors[theme]}
        strokeOpacity={0.3}
      />
      <XAxis 
        dataKey="name"
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis 
        tick={{ 
          fill: textColors[theme], 
          fontSize: 11,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(value) => isPercentage ? `${value}%` : formatNumber(value)}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: theme === 'minimal' ? '#F4F4F5' : '#1F2937',
          border: `1px solid ${colors[0]}`,
          borderRadius: '12px',
          color: textColors[theme],
          fontSize: '12px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
        }}
        formatter={(value: number) => [
          isPercentage ? `${value}%` : formatNumber(value),
          'Value'
        ]}
        labelStyle={{ color: textColors[theme] }}
      />
      <Area 
        type="monotone" 
        dataKey="value" 
        stroke={colors[0]}
        strokeWidth={2}
        fill={`url(#area-gradient-${theme})`}
      />
    </AreaChart>
  );
}

/**
 * Format large numbers with K, M, B suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}