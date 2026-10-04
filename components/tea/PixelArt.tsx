import type { CSSProperties } from "react";
import { drinkSprite, toppingSprite, type Sprite } from "@/lib/tea-art";

export function PixelSprite({ sprite, size = 48, className = "", style }: { sprite: Sprite; size?: number; className?: string; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${sprite.w} ${sprite.h}`} className={`pixel-art inline-block shrink-0 align-middle ${className}`} style={style} overflow="hidden">
    <svg width={sprite.w} height={sprite.h} viewBox={`${sprite.x} ${sprite.y} ${sprite.w} ${sprite.h}`} overflow="hidden">
      <image href={sprite.src} width="1536" height="1024" />
    </svg>
  </svg>;
}

export function DrinkIcon({ id, size = 48, className = "" }: { id: string; size?: number; className?: string }) {
  if (id === "strawberry" || id === "cocoa") return <PixelSprite sprite={drinkSprite(id === "strawberry" ? "taro" : "classic")} size={size} className={className} style={{ filter: id === "strawberry" ? "hue-rotate(50deg)" : "brightness(.8)" }}/>;
  return <PixelSprite sprite={drinkSprite(id)} size={size} className={className} />;
}

export function ToppingIcon({ name, size = 40, className = "" }: { name: string; size?: number; className?: string }) {
  const extra: Record<string,string> = { "Trân châu hoàng kim": "#d9b15c", "Thạch cà phê": "#75503b", "Nha đam": "#d6e8ba", "Oreo": "#514139" };
  if (extra[name]) return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40" className={className}><ellipse cx="20" cy="30" rx="15" ry="5" fill="#ba9b8520"/><path d="M5 19 Q7 34 20 34 Q33 34 35 19" fill="#f5ddbc" stroke="#c4a27c"/><ellipse cx="20" cy="19" rx="15" ry="6" fill="#fff5df" stroke="#c4a27c"/>{Array.from({length:7},(_,i)=> name.includes("Trân châu") ? <circle key={i} cx={10+i%4*6} cy={14+Math.floor(i/4)*6} r="3.5" fill={extra[name]} stroke="#fff8"/> : <rect key={i} x={7+i%4*7} y={10+Math.floor(i/4)*7} width="6" height="6" rx="1.5" fill={extra[name]} stroke="#fff7"/>)}</svg>;
  return <PixelSprite sprite={toppingSprite(name)} size={size} className={className} />;
}
