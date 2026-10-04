import { TEA_INGREDIENTS } from "@/lib/tea-art";
import { ToppingIcon } from "./PixelArt";

type Props = { size: string; tea: string; sweetness: string; toppings: string[]; sealed: boolean; effect: { kind: string; value: string; sequence: number } };
const colors: Record<string,string> = Object.fromEntries(TEA_INGREDIENTS.map(item => [item.name,item.color]));
const toppingColors: Record<string, string> = { "Trân châu đen": "#70513f", "Trân châu trắng": "#fff2d9", "Thạch trái cây": "#f49b8d", "Pudding": "#edc16e", "Kem cheese": "#fff4dc", "Thạch dừa": "#fffaf1", "Đậu đỏ": "#aa5558", "Hạt thủy tinh": "#e2acbb", "Trân châu hoàng kim": "#dcb765", "Thạch cà phê": "#79513d", "Nha đam": "#e6edc9", "Oreo": "#514139" };

export default function BrewingCup({ size, tea, sweetness, toppings, sealed, effect }: Props) {
  const scale = ["Nhỏ", "Vừa", "Lớn"].indexOf(size);
  return <div className="tray-cup live-cup-stage" role="img" aria-label={size ? `Ly ${size}: ${tea || "chưa có trà"}${sweetness ? `, đường ${sweetness}` : ""}${toppings.length ? `, ${toppings.join(", ")}` : ""}${sealed ? ", đã đóng nắp" : ""}` : "Khay chưa có ly"}>
    {size ? <>
      <div className={`live-cup ${sealed ? "is-sealed" : ""}`} style={{ width: 92 + scale * 16, height: 126 + scale * 18 }}>
        <div className="cup-rim" aria-hidden="true"/>
        <div className="live-cup-glass">
          <div className="live-cup-tea" style={{ height: tea ? `${sweetness ? 78 : 62}%` : "0%", background: `linear-gradient(90deg, #00000020, transparent 28%, #ffffff30 48%, transparent 70%, #00000024), ${colors[tea] ?? "#c99668"}` }}><div className="tea-surface" style={{ background: colors[tea] ?? "#c99668" }}/></div>
          {sweetness && sweetness !== "0%" && <div className="sugar-swirl" key={`sugar-${effect.sequence}`}/>}
          {toppings.filter(item => item !== "Kem cheese").map((item,index) => <div key={item} className={`cup-topping-pieces ${item.includes("Thạch") || item === "Pudding" ? "is-jelly" : ""}`} style={{ bottom: 6 + index * 14 }} aria-hidden="true">{Array.from({ length: 6 }, (_,i) => <i key={i} style={{ background: toppingColors[item], transform: `translateY(${i % 2 * -4}px) rotate(${i % 2 ? 15 : -12}deg)` }}/>)}</div>)}
          {toppings.includes("Kem cheese") && <div className="cream-cap"/>}
          <div className="cup-heart" aria-hidden="true">♡</div>
        </div>
        <div className="cup-base" aria-hidden="true"/>
        {sealed && <div className="live-lid"/>}
      </div>
      {!sealed && effect.sequence > 0 && <div key={effect.sequence} className={`ingredient-add-effect add-${effect.kind}`} aria-hidden="true">{effect.kind === "topping" ? <ToppingIcon name={effect.value} size={38}/> : effect.kind === "sugar" ? "✦" : "💧"}</div>}
      {sealed && <span className="cup-ready">Đã sẵn sàng ♡</span>}
    </> : <span className="tray-placeholder">Đặt một chiếc ly vào đây</span>}
  </div>;
}

