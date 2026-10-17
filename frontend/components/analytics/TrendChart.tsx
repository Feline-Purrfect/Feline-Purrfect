import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { Bar } from '@/lib/analytics';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

const HEIGHT = 156;
const TOP = 8; // room above the highest gridline label
const X_AXIS = 22; // room below the plot for X labels
const LABEL_SIZE = 11;
const CHAR_W = 6.4; // approx. width of one digit at 11pt, to size the Y gutter

/** 1, 2, 5 × 10ⁿ: readable gridline steps (no 2.5, which a 1-decimal axis can't show cleanly). */
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

/**
 * Round tick values covering [min, max]: tries 2–4 intervals and keeps the tightest fit, so the
 * data fills the chart (0–220 ml → 0, 100, 200, 300 rather than 0, 200, 400).
 */
export function ticksFor(min: number, max: number, decimals = 0) {
  // A step finer than the label precision would print duplicate labels (5.05 and 5.1 both as "5.1").
  const minStep = 10 ** -decimals;
  if (max === min) {
    const pad = Math.abs(max) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  let best: { lo: number; hi: number; step: number } | null = null;
  for (const intervals of [2, 3, 4]) {
    const step = Math.max(minStep, niceStep((max - min) / intervals));
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    if (!best || hi - lo < best.hi - best.lo - 1e-9) best = { lo, hi, step };
  }
  const { lo, hi, step } = best!;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) {
    out.push(Math.round(v * 1e6) / 1e6);
  }
  return out;
}

interface TrendChartProps {
  data: Bar[];
  /** `bar` for daily totals (food, water); `line` for measurements (weight). Same frame either way. */
  variant: 'bar' | 'line';
  /** Decimals on the Y-axis labels. */
  decimals?: number;
  /** Bars start at 0; a line fits its own range so small changes are visible. */
  fromZero?: boolean;
  accessibilityLabel: string;
}

/**
 * The one chart used on Analytics: Y-axis with round gridlines on the left, X-axis labels below,
 * highlighted points in brand blue. Missing days are left empty (bars) or bridged (line).
 */
export function TrendChart({
  data,
  variant,
  decimals = 0,
  fromZero = variant === 'bar',
  accessibilityLabel,
}: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const values = data.map((d) => d.value).filter((v): v is number => v != null);

  const ticks = values.length
    ? ticksFor(
        fromZero ? 0 : Math.min(...values),
        Math.max(...values),
        decimals,
      )
    : [0, 1];
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const tickText = (v: number) => v.toFixed(decimals);
  const gutter =
    Math.ceil(Math.max(...ticks.map((t) => tickText(t).length)) * CHAR_W) + 10;

  const plotW = Math.max(0, width - gutter);
  const plotH = HEIGHT - TOP - X_AXIS;
  const slotW = data.length ? plotW / data.length : 0;
  const x = (i: number) => gutter + slotW * (i + 0.5);
  const y = (v: number) => TOP + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const baseY = TOP + plotH;

  const linePoints = data
    .map((d, i) => (d.value == null ? null : ([x(i), y(d.value)] as const)))
    .filter((p): p is readonly [number, number] => p != null);
  const last = linePoints[linePoints.length - 1];
  const barW = Math.max(2, Math.min(28, slotW * 0.62));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ height: HEIGHT }}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {/* Y axis: gridlines + labels */}
          {ticks.map((t) => (
            <Line
              key={`g${t}`}
              x1={gutter}
              y1={y(t)}
              x2={width}
              y2={y(t)}
              stroke={Colors.line.soft}
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <SvgText
              key={`y${t}`}
              x={gutter - 8}
              y={y(t) + 4}
              fontSize={LABEL_SIZE}
              fontFamily={Fonts.bodyMedium}
              fill={Colors.ink.muted}
              textAnchor="end"
            >
              {tickText(t)}
            </SvgText>
          ))}

          {/* Marks */}
          {variant === 'bar'
            ? data.map((d, i) =>
                d.value == null ? null : (
                  <Rect
                    key={d.key}
                    x={x(i) - barW / 2}
                    y={y(d.value)}
                    width={barW}
                    height={Math.max(2, baseY - y(d.value))}
                    rx={Math.min(3, barW / 2)}
                    fill={
                      d.highlight ? Colors.primary.DEFAULT : Colors.primary[200]
                    }
                  />
                ),
              )
            : linePoints.length > 0 && (
                <>
                  {linePoints.length > 1 && (
                    <Polyline
                      points={linePoints
                        .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
                        .join(' ')}
                      fill="none"
                      stroke={Colors.primary.DEFAULT}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  {linePoints.length <= 31 &&
                    linePoints
                      .slice(0, -1)
                      .map(([px, py]) => (
                        <Circle
                          key={`${px}`}
                          cx={px}
                          cy={py}
                          r={3}
                          fill={Colors.surface}
                          stroke={Colors.primary.DEFAULT}
                          strokeWidth={2}
                        />
                      ))}
                  {last && (
                    <Circle
                      cx={last[0]}
                      cy={last[1]}
                      r={4.5}
                      fill={Colors.primary.DEFAULT}
                      stroke={Colors.surface}
                      strokeWidth={2}
                    />
                  )}
                </>
              )}

          {/* X axis: baseline + labels (the newest is bold) */}
          <Line
            x1={gutter}
            y1={baseY}
            x2={width}
            y2={baseY}
            stroke={Colors.line.DEFAULT}
            strokeWidth={1}
          />
          {data.map((d, i) =>
            d.tick ? (
              <SvgText
                key={`x${d.key}`}
                x={Math.min(Math.max(x(i), gutter + 14), width - 14)}
                y={HEIGHT - 5}
                fontSize={LABEL_SIZE}
                fontFamily={
                  i === data.length - 1 ? Fonts.bodyBold : Fonts.bodyMedium
                }
                fill={
                  i === data.length - 1 ? Colors.ink.DEFAULT : Colors.ink.muted
                }
                textAnchor="middle"
              >
                {d.tick}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}
