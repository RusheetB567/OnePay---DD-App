export const money = cents => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
export const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const parse = value => new Date(`${value}T12:00:00`);
export function advance(value, frequency, anchor = parse(value).getDate()) {
  const date = parse(value);
  const days = { weekly: 7, fortnightly: 14 }[frequency];
  if (days) date.setDate(date.getDate() + days);
  else { const months = { monthly: 1, quarterly: 3, annually: 12 }[frequency]; if (!months) throw new Error('Invalid frequency'); date.setDate(1); date.setMonth(date.getMonth() + months); date.setDate(Math.min(anchor, new Date(date.getFullYear(), date.getMonth()+1, 0).getDate())); }
  return iso(date);
}
export function events(state, start, days = 30) {
  const end = parse(start); end.setDate(end.getDate() + days);
  const result = [];
  for (const item of [...state.payments, ...state.income]) {
    if (item.status !== 'active' || !state.accounts.some(a => a.id === item.accountId && a.connected)) continue;
    let date = item.nextDate; const anchor = parse(date).getDate(); let guard = 0;
    while (date <= iso(end) && guard++ < 10000) {
      if (date >= start) result.push({ ...item, date, amount: item.kind === 'income' ? item.amount : -item.amount });
      date = advance(date, item.frequency, anchor);
    }
  }
  return result.sort((a,b) => a.date.localeCompare(b.date) || a.amount-b.amount);
}
export function forecast(state, start, days = 30) {
  const accounts = state.accounts.filter(a => a.connected && a.role !== 'savings');
  const balance = accounts.reduce((sum,a) => sum+a.balance,0);
  const scheduled = events(state,start,days).filter(e => accounts.some(a=>a.id===e.accountId));
  const points = []; let running = balance;
  for (let day=0;day<=days;day++) { const date = parse(start); date.setDate(date.getDate()+day); const key=iso(date); running += scheduled.filter(e=>e.date===key).reduce((sum,e)=>sum+e.amount,0); points.push({date:key,balance:running}); }
  const committed = -scheduled.filter(e=>e.amount<0).reduce((sum,e)=>sum+e.amount,0);
  const incoming = scheduled.filter(e=>e.amount>0).reduce((sum,e)=>sum+e.amount,0);
  const minimum = Math.min(balance,...points.map(p=>p.balance));
  return { balance, committed, incoming, points, minimum, safe:Math.max(0,minimum-state.buffer), final:running };
}
export function detectRecurring(transactions) {
  const groups = new Map();
  for (const t of transactions) { const key = `${t.accountId}:${t.merchant.trim().toLowerCase()}:${t.amount>0?'income':'expense'}`; groups.set(key,[...(groups.get(key)||[]),t]); }
  return [...groups.values()].flatMap(group=> {
    if(group.length<3) return [];
    const sorted=group.sort((a,b)=>a.date.localeCompare(b.date));
    const intervals=sorted.slice(1).map((t,i)=>Math.round((parse(t.date)-parse(sorted[i].date))/86400000));
    const average=intervals.reduce((a,b)=>a+b,0)/intervals.length;
    const frequency = average>=6&&average<=8?'weekly':average>=13&&average<=15?'fortnightly':average>=27&&average<=32?'monthly':null;
    if(!frequency || intervals.some(d=>Math.abs(d-average)>4)) return [];
    const last=sorted.at(-1); const previous=sorted.at(-2);
    return [{ id:`detected-${last.id}`, merchant:last.merchant, amount:Math.abs(last.amount), previousAmount:Math.abs(previous.amount), accountId:last.accountId, nextDate:advance(last.date,frequency), frequency, kind:last.amount>0?'income':'expense', category:last.amount>0?'Salary':'Subscription', status:'active', confidence:intervals.length>=3?98:90 }];
  });
}
