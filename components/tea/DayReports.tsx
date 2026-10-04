import { useEffect, useRef, type ReactNode } from "react";
import { formatVnd } from "@/lib/tea-shop";
import type { DayReport } from "@/lib/tea-finance";
import { DrinkIcon, ToppingIcon } from "./PixelArt";

export function ReportDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }} className="pixel-report"><div className="pixel-report-header"><DrinkIcon id="classic" size={30} /><h2>{title}</h2><button autoFocus onClick={onClose} aria-label="Đóng popup" className="pixel-report-close">×</button></div><div className="pixel-report-body">{children}</div></dialog>;
}

export function ReportDetails({ report }: { report: DayReport }) {
  return <><p className="pixel-report-guests">Phục vụ <b>{report.served}</b> · Khách rời đi <b>{report.missed}</b></p><div className={`pixel-report-result ${report.profit >= 0 ? "is-profit" : "is-loss"}`}><span className="pixel-report-coin" aria-hidden="true" /><div><p>{report.profit >= 0 ? "LÃI HÔM NAY" : "LỖ HÔM NAY"}</p><b>{formatVnd(Math.abs(report.profit))}</b></div></div><dl className="pixel-report-stats"><div><dt><DrinkIcon id="classic" size={24} />Doanh thu</dt><dd>{formatVnd(report.revenue)}</dd></div><div><dt><ToppingIcon name="Trân châu đen" size={24} />Nguyên liệu · 38%</dt><dd>−{formatVnd(report.ingredientCost)}</dd></div><div><dt>Chi phí tiệm</dt><dd>−{formatVnd(report.fixedCost)}</dd></div><div><dt>Thuê mặt bằng</dt><dd>−{formatVnd(report.rent ?? 0)}</dd></div><div><dt>Thuế tháng · 5%</dt><dd>−{formatVnd(report.tax ?? 0)}</dd></div><div><dt>Vốn trước doanh thu</dt><dd>{formatVnd(report.openingCash)}</dd></div><div className="pixel-report-balance"><dt>Vốn còn lại</dt><dd>{formatVnd(report.closingCash)}</dd></div></dl><p className="pixel-report-note">{Boolean(report.recoveredDebt) && <>Mở ngày mới thu hồi nợ: +{formatVnd(report.recoveredDebt!)}. </>}{Boolean(report.defaultedDebt) && <>Khoản đến hạn bị quịt: {formatVnd(report.defaultedDebt!)} (đã xuất tiền trước đó). </>}</p><p className="pixel-report-note">Lời/lỗ = tiền thu − nguyên liệu − vận hành − thuê − thuế.</p></>;
}
