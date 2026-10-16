// Line icons from the Laly design (24x24, stroke-based). Static markup only.
const ICONS = {
  "pin": "<path d=\"M12 21s-6.8-5.6-6.8-10.2a6.8 6.8 0 1 1 13.6 0C18.8 15.4 12 21 12 21z\"/><circle cx=\"12\" cy=\"10.5\" r=\"2.4\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.2v5l3.1 1.9\"/>",
  "truck": "<path d=\"M2.5 6.5h11v10h-11z\"/><path d=\"M13.5 9.5h4.2l3 3.2v3.8h-7.2\"/><circle cx=\"7\" cy=\"17.8\" r=\"1.7\"/><circle cx=\"16.7\" cy=\"17.8\" r=\"1.7\"/>",
  "headset": "<path d=\"M4.5 13.5v-1a7.5 7.5 0 0 1 15 0v1\"/><rect x=\"4\" y=\"12.8\" width=\"3.8\" height=\"6\" rx=\"1.9\"/><rect x=\"16.2\" y=\"12.8\" width=\"3.8\" height=\"6\" rx=\"1.9\"/><path d=\"M19.5 18.8v.7a2.5 2.5 0 0 1-2.5 2.5h-3\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20.5 20.5l-4.3-4.3\"/>",
  "cart": "<path d=\"M3 4h2.2l2.3 11.2h10.3l2.2-8.2H6.4\"/><circle cx=\"9.3\" cy=\"19.5\" r=\"1.5\"/><circle cx=\"16.8\" cy=\"19.5\" r=\"1.5\"/>",
  "user": "<circle cx=\"12\" cy=\"8.2\" r=\"3.7\"/><path d=\"M4.8 20c1.5-3.4 4.1-4.8 7.2-4.8s5.7 1.4 7.2 4.8\"/>",
  "arrowr": "<path d=\"M4 12h15M13.5 6.5L19 12l-5.5 5.5\"/>",
  "chevr": "<path d=\"M9 5.5l6.5 6.5L9 18.5\"/>",
  "shield": "<path d=\"M12 2.8l7.2 2.7v5.6c0 4.6-3 8.1-7.2 9.9-4.2-1.8-7.2-5.3-7.2-9.9V5.5z\"/><path d=\"M8.8 12l2.3 2.3 4.4-4.6\"/>",
  "ret": "<path d=\"M3.8 4.5v5.2H9\"/><path d=\"M5.2 14.6a7.6 7.6 0 1 0 1.8-7.9L3.8 9.7\"/>",
  "wallet": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2.2\"/><path d=\"M3 10h18M6.5 14.5h4\"/>",
  "check": "<path d=\"M4.5 12.5l4.8 4.8L19.5 6.5\"/>",
  "tag": "<path d=\"M3.5 10.5v-6a1 1 0 0 1 1-1h6l10 10-7 7-10-10z\"/><circle cx=\"8\" cy=\"8\" r=\"1.3\"/>",
  "bolt": "<path d=\"M12.8 2.5L4.8 13.2h5.4L11 21.5l8.2-11h-5.6z\"/>",
  "wrench": "<path d=\"M14.7 6.3a4.6 4.6 0 0 0-6 6L3.4 17.6l3 3 5.3-5.3a4.6 4.6 0 0 0 6-6l-2.8 2.8-3-3z\"/>",
  "chat": "<path d=\"M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z\"/>",
  "call": "<path d=\"M6.2 3.5h2.7l1.7 4.1-2.1 1.7a12.5 12.5 0 0 0 6.2 6.2l1.7-2.1 4.1 1.7v2.7a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z\"/>",
  "mail": "<rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M4 7.5l8 5.6 8-5.6\"/>",
  "cctv": "<path d=\"M4 5.5h16\"/><path d=\"M6.5 5.5v2.4a5.5 5.5 0 0 0 11 0V5.5\"/><circle cx=\"12\" cy=\"8.8\" r=\"2\"/><path d=\"M8.6 16a5 5 0 0 0 6.8 0\"/>",
  "router": "<rect x=\"3\" y=\"12.5\" width=\"18\" height=\"7\" rx=\"2.2\"/><path d=\"M7.5 12.5v-6M16.5 12.5v-6\"/><circle cx=\"7.5\" cy=\"16\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"11\" cy=\"16\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/>",
  "smarthome": "<path d=\"M4.5 10.5L12 4.5l7.5 6v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8z\"/><path d=\"M9.5 13.4a3.6 3.6 0 0 1 5 0\"/><circle cx=\"12\" cy=\"15.8\" r=\".7\" fill=\"currentColor\"/>",
  "storage": "<rect x=\"6\" y=\"3.5\" width=\"12\" height=\"17\" rx=\"2.2\"/><path d=\"M9 7.5h6M9 10.8h6\"/><circle cx=\"12\" cy=\"16.5\" r=\"1.2\"/>",
  "laptop": "<rect x=\"5\" y=\"4.5\" width=\"14\" height=\"9.5\" rx=\"1.6\"/><path d=\"M2.8 18.5h18.4L19 15H5z\"/>",
  "headphones": "<path d=\"M4.5 14.5v-1a7.5 7.5 0 0 1 15 0v1\"/><rect x=\"4\" y=\"13.8\" width=\"3.8\" height=\"6.2\" rx=\"1.9\"/><rect x=\"16.2\" y=\"13.8\" width=\"3.8\" height=\"6.2\" rx=\"1.9\"/>",
  "projector": "<rect x=\"3\" y=\"8.5\" width=\"18\" height=\"8.5\" rx=\"2.2\"/><circle cx=\"15.5\" cy=\"12.7\" r=\"2.5\"/><path d=\"M6.5 12.7h4M7.5 17v2M16.5 17v2\"/>",
  "grid": "<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.8\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.8\"/><rect x=\"3.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.8\"/><rect x=\"13.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.8\"/>",
} as const

export type IconName = keyof typeof ICONS

export const isIconName = (name: string): name is IconName => name in ICONS

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
