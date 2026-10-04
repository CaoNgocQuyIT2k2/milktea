export type Friend = { name: string; visits: number; affinity: number; blockedUntil: number };
export type Debt = { id: string; name: string; amount: number; kind: "credit" | "loan"; dueDay: number; repays: boolean; status: "approved" | "pending" | "paid" | "lost" };
export type Request = { id: string; name: string; amount: number; kind: "credit" | "loan"; risk: number; day: number };
export type Campaign = { friends: Record<string,Friend>; debts: Debt[]; log: string[]; monthlyRevenue: number; seenDay: number; requestsToday: number };
export const newCampaign = (): Campaign => ({ friends: {}, debts: [], log: [], monthlyRevenue: 0, seenDay: 0, requestsToday: 0 });
export function visit(c: Campaign, name: string): Campaign {
  const old = c.friends[name] ?? { name, visits: 0, affinity: 50, blockedUntil: 0 };
  return { ...c, friends: { ...c.friends, [name]: { ...old, visits: old.visits + 1, affinity: Math.min(100, old.affinity + 2) } } };
}
export function makeRequest(c: Campaign, name: string, day: number, price: number, random = Math.random): Request | null {
  if (c.requestsToday >= 3 || c.debts.some(d => d.name === name && (d.status === "pending" || d.status === "approved")) || random() > .2) return null;
  const kind = random() < .65 ? "credit" : "loan";
  const affinity = c.friends[name]?.affinity ?? 50;
  return { id: `${day}-${name}-${c.requestsToday}`, name, day, kind, amount: kind === "credit" ? price : 30_000 + Math.floor(random() * 4) * 10_000, risk: Math.round(Math.max(.12, .45 - affinity * .003) * 100) };
}
export function decide(c: Campaign, request: Request, allow: boolean, random = Math.random): Campaign {
  const friend = c.friends[request.name] ?? { name: request.name, visits: 0, affinity: 50, blockedUntil: 0 };
  const offended = !allow && random() < .35;
  const nextFriend = { ...friend, affinity: Math.max(0, Math.min(100, friend.affinity + (allow ? 8 : offended ? -15 : 0))), blockedUntil: offended ? request.day + 3 : friend.blockedUntil };
  const debt: Debt = { id: request.id, name: request.name, amount: request.amount, kind: request.kind, dueDay: request.day + (request.kind === "loan" ? 3 : 2), repays: random() * 100 >= request.risk, status: request.kind === "credit" ? "approved" : "pending" };
  return { ...c, requestsToday: c.requestsToday + 1, friends: { ...c.friends, [request.name]: nextFriend }, debts: allow ? [...c.debts, debt] : c.debts, log: [`Ngày ${request.day}: ${allow ? `Cho ${request.name} ${request.kind === "loan" ? "vay" : "nợ ly"} ${request.amount.toLocaleString("vi-VN")}đ` : `Từ chối ${request.name}${offended ? " · giảm thân thiện, nghỉ mua 3 ngày" : " · khách thông cảm"}`}.`, ...c.log].slice(0,100) };
}
export function settle(c: Campaign, day: number): { campaign: Campaign; cash: number; revenue: number } {
  let cash = 0, revenue = 0; const log: string[] = [];
  const debts = c.debts.filter(debt => debt.status !== "approved").map(debt => {
    if (debt.status !== "pending" || debt.dueDay > day) return debt;
    if (debt.repays) { cash += debt.amount; if (debt.kind === "credit") revenue += debt.amount; }
    log.push(`Ngày ${day}: ${debt.name} ${debt.repays ? "trả" : "quịt"} ${debt.amount.toLocaleString("vi-VN")}đ.`);
    return { ...debt, status: debt.repays ? "paid" as const : "lost" as const };
  });
  return { cash, revenue, campaign: { ...c, debts, log: [...log,...c.log].slice(0,100), requestsToday: 0 } };
}
export function chapter(day: number) {
  if (day === 1) return { title: "Ngày đầu của Mây", text: "Bạn mở một quầy trà nhỏ với 150.000đ. Pha đúng món, làm quen khách và giữ đủ vốn để đi hết tháng đầu tiên." };
  if (day % 30 === 0) return { title: "Ngày thanh toán cuối tháng", text: "Hôm nay tiệm trả 300.000đ tiền thuê và thuế bằng 5% doanh thu đã thu trong tháng. Hãy giữ một khoản dự phòng!" };
  if (day === 31) return { title: "Mây đã qua tháng đầu tiên!", text: "Bạn đã giữ được tiệm sau kỳ thanh toán đầu. Khu phố biết tới Mây nhiều hơn. Tháng mới bắt đầu: giữ khách quen, thu hồi nợ và chuẩn bị cho đợt khách đông hơn." };
  if (day === 7) return { title: "Một tuần ở khu phố", text: "Mùi trà đã khiến hàng xóm tìm đến. Mây bắt đầu có khách quen; sự thân thiện giúp họ quay lại, nhưng lòng tốt cũng cần một giới hạn." };
  if (day === 14) return { title: "Giữa tháng · tin tưởng và lựa chọn", text: "Khách ghé đông hơn, có người xin ghi nợ vì quên ví, có người cần vay gấp. Bạn muốn Mây là một tiệm ấm áp, nhưng vẫn phải bảo vệ vốn." };
  if (day % 30 >= 25) return { title: "Sắp đến ngày trả tiền mặt bằng", text: `Còn ${30 - day % 30} ngày đến cuối tháng. Khách quen giúp tiệm đông hơn, nhưng các khoản nợ có thể không quay về.` };
  return { title: `Chương ${Math.ceil(day / 7)} · Quầy trà của khu phố`, text: "Mỗi ca có 10 phút. Phục vụ đúng món để tăng thân thiện. Đôi lúc khách xin ghi nợ hoặc mượn tiền: hãy cân nhắc vốn và rủi ro trước khi chọn." };
}
