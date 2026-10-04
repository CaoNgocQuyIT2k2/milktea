import { GUEST_FRAMES, guestVariant } from "@/lib/tea-art";
import type { QueueCustomer } from "@/lib/tea-game";
import { PixelSprite } from "./PixelArt";

export default function CounterGuests({ customers, activeId, paused }: { customers: QueueCustomer[]; activeId?: string; paused: boolean }) {
  return <div className="walking-guests" aria-label="Khách đi tới quầy và rời tiệm" data-paused={paused}>
    {customers.map(c => {
      const anchor = 20 + (c.targetX - 640) / 65 * 24;
      const arriving = c.state === "arriving";
      const departing = c.state === "served" || c.state === "leaving" || c.state === "angry";
      const distance = Math.hypot(c.x - c.targetX, c.y - c.targetY);
      const progress = Math.min(1, distance / 230);
      const left = arriving ? anchor + progress * (120 - anchor) : departing ? anchor - progress * (anchor + 35) : anchor;
      const walking = arriving || departing;
      const sprite = GUEST_FRAMES[guestVariant(c.name)];
      return <div key={c.id} className={`walking-guest ${walking ? "is-walking" : "is-standing"} ${departing ? "is-departing" : ""} ${c.id === activeId ? "is-active" : ""}`} style={{ left: `${left}%`, zIndex: c.id === activeId ? 4 : 2 }}>
        <div className="guest-shadow"/>
        <div className="guest-body"><PixelSprite sprite={sprite} size={200}/><div className="guest-leg leg-left"><PixelSprite sprite={sprite} size={200}/></div><div className="guest-leg leg-right"><PixelSprite sprite={sprite} size={200}/></div></div>
        <span className="guest-name">{c.name}{c.state === "served" ? " ♡" : ""}</span>
      </div>;
    })}
  </div>;
}
