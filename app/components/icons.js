// Minimal hand-drawn SVG icon set (flat, console-glyph style) — no external icon deps.
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function TrendingUpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

export function NetworkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="7.4" />
      <line x1="8.6" y1="13.4" x2="15.4" y2="16.6" />
    </svg>
  );
}

export function ServerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="2" y="3" width="20" height="8" rx="2" />
      <rect x="2" y="13" width="20" height="8" rx="2" />
      <circle cx="6.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BarChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

export function BriefcaseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="2" y1="13" x2="22" y2="13" />
    </svg>
  );
}

export function GraduationCapIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
      <path d="M22 10v6" />
    </svg>
  );
}

export function GridIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M15 22v-4a4.4 4.4 0 0 0-1.2-3.3c4 0 7.4-2.1 7.4-7A5.4 5.4 0 0 0 20 4.3a5 5 0 0 0-.2-4S18.7 0 16 1.7a13.4 13.4 0 0 0-7 0C6.3 0 5 .3 5 .3a5 5 0 0 0-.2 4A5.4 5.4 0 0 0 3.5 7.7c0 4.9 3.4 7 7.4 7a4.4 4.4 0 0 0-1 1.5v4" />
      <path d="M9 20c-3 1-5-1.5-5-3.5" />
    </svg>
  );
}

export function StarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M12 2.5l2.9 6.2 6.7.8-5 4.6 1.4 6.6-6-3.4-6 3.4 1.4-6.6-5-4.6 6.7-.8L12 2.5Z" />
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M8 10h1M12 10h1M16 10h1" />
      <path d="M7 15l-1.5 4M8 15l2-4M11 15l0 4M16 15l-2-4" />
    </svg>
  );
}

export function ResumeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function AlbumIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function ControllerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="8" width="18" height="10" rx="5" />
      <line x1="7" y1="13" x2="11" y2="13" />
      <line x1="9" y1="11" x2="9" y2="15" />
      <circle cx="16" cy="11" r="1" />
      <circle cx="18" cy="13" r="1" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" strokeDasharray="2.4 3.4" />
    </svg>
  );
}

export function PowerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

export function WifiIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BatteryIcon({ pct = 86, ...props }) {
  const fillWidth = Math.max(0, Math.min(100, pct)) * 0.166;
  return (
    <svg viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <rect x="1" y="1" width="21" height="12" rx="2.5" />
      <rect x="3.2" y="3.2" width={fillWidth} height="7.6" rx="1.2" fill="currentColor" stroke="none" style={{ transition: "width .4s ease" }} />
      <path d="M24 5.5v3" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function TerminalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="6 9 10 12 6 15" />
      <line x1="12" y1="15" x2="17" y2="15" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

export function CartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <path d="M3 4h2l1 3m0 0 2 8h9l3-7H6" />
    </svg>
  );
}

export function CloudIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="9" cy="13" r="4" />
      <circle cx="14" cy="10" r="5" />
      <circle cx="18" cy="14" r="3.5" />
      <rect x="6" y="14" width="14" height="5" rx="2.5" />
    </svg>
  );
}

export function ActivityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polyline points="3 12 8 12 10 6 14 18 16 12 21 12" />
    </svg>
  );
}

export function GraphIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <line x1="6.8" y1="7.3" x2="10.3" y2="10.7" />
      <line x1="17.2" y1="7.3" x2="13.7" y2="10.7" />
      <line x1="10.3" y1="13.3" x2="6.8" y2="16.7" />
      <line x1="13.7" y1="13.3" x2="17.2" y2="16.7" />
    </svg>
  );
}

export function SpeakerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polygon points="4 9 8 9 13 4 13 20 8 15 4 15 4 9" />
      <path d="M17 8a5 5 0 0 1 0 8" />
      <path d="M19.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function SpeakerMuteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polygon points="4 9 8 9 13 4 13 20 8 15 4 15 4 9" />
      <line x1="17" y1="9" x2="22" y2="14" />
      <line x1="22" y1="9" x2="17" y2="14" />
    </svg>
  );
}

export function ZapIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export const TILE_ICONS = {
  trendingUp: TrendingUpIcon,
  network: NetworkIcon,
  server: ServerIcon,
  barChart: BarChartIcon,
  briefcase: BriefcaseIcon,
  graduationCap: GraduationCapIcon,
  grid: GridIcon,
  cloud: CloudIcon,
  activity: ActivityIcon,
  graph: GraphIcon,
  user: UserIcon,
  terminal: TerminalIcon,
  send: SendIcon,
  cart: CartIcon,
  zap: ZapIcon,
};
