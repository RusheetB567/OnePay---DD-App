import { iso } from './finance.js';
export function seed() {
  const today = new Date();
  const date = offset => { const d=new Date(today);d.setDate(d.getDate()+offset);return iso(d); };
  const payments = [
    ['rent','Rent',145000,'fortnightly',1,'Housing','bills'],
    ['netflix','Netflix',2599,'monthly',3,'Subscription','everyday'],
    ['insurance','Car insurance',14200,'monthly',5,'Insurance','bills'],
    ['energy','Origin Energy',18500,'quarterly',8,'Utilities','bills'],
    ['phone','Telstra',8900,'monthly',10,'Utilities','everyday'],
    ['spotify','Spotify',1399,'monthly',12,'Subscription','everyday'],
    ['gym','Goodlife',3200,'fortnightly',4,'Health','everyday'],
    ['internet','Aussie Broadband',7900,'monthly',15,'Utilities','bills']
  ].map(([id,merchant,amount,frequency,offset,category,accountId])=>({id,merchant,amount,frequency,nextDate:date(offset),category,accountId,status:'active',kind:'expense',notes:'',confidence:100}));
  const transactions=[];
  for(let i=3;i>=1;i--) { const d=new Date(today);d.setDate(1);d.setMonth(d.getMonth()-i);d.setDate(8); transactions.push({id:`adobe-${i}`,merchant:'Adobe Creative Cloud',amount:i===1?-3299:-2999,date:iso(d),accountId:'everyday'}); }
  return {version:1,profile:{name:'Alex'},buffer:50000,accounts:[{id:'everyday',name:'Everyday',bank:'Up',mask:'7821',balance:263000,role:'spending',connected:true},{id:'bills',name:'Bills account',bank:'ING',mask:'4098',balance:125000,role:'bills',connected:true},{id:'savings',name:'Rainy day',bank:'ING',mask:'6120',balance:840000,role:'savings',connected:true}],payments,income:[{id:'salary',merchant:'Salary',amount:310000,frequency:'fortnightly',nextDate:date(6),accountId:'everyday',status:'active',kind:'income',category:'Salary'}],transactions,audit:[],reminders:true};
}
