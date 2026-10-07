import Svg, { Path, Circle, Rect } from "react-native-svg";
export type IconName =
  | "home"
  | "calendar"
  | "payments"
  | "insights"
  | "accounts"
  | "eye"
  | "shield"
  | "arrow"
  | "plus"
  | "check"
  | "income";
const paths: Record<IconName, string> = {
  home: "M3 10L12 3l9 7v10H7v-7h10v7",
  calendar: "M7 3v4m10-4v4M4 10h16M8 14h2m4 0h2m-8 4h2",
  payments: "M4 7h15l-4-4m5 14H5l4 4M20 7v4M4 17v-4",
  insights: "M4 19V9m5 10V5m6 14v-7m5 7V3",
  accounts: "M3 8l9-5 9 5M4 21h16M6 10v8m6-8v8m6-8v8",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3m-4 9 3 3 5-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l4 4L19 6",
  income: "M12 19V5m-6 6 6-6 6 6",
};
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <Svg aria-hidden={true} width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {name === "calendar" && (
        <Rect
          x={3}
          y={5}
          width={18}
          height={16}
          rx={3}
          stroke={color}
          strokeWidth={1.7}
          fill="none"
        />
      )}
    </Svg>
  );
}
export function OnePayMark({
  color,
  size = 36,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg aria-hidden={true} width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M11 28C1 20 9 5 20 7c12 2 14 17 4 23M29 12C39 20 31 35 20 33 8 31 6 16 16 10"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={20} cy={20} r={3} fill={color} />
    </Svg>
  );
}
