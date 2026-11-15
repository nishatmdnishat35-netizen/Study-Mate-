import {auth,db,$,esc,by,rows,fmt,collection,doc,getDoc,getDocs,setDoc,addDoc,query,where,serverTimestamp,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "./firebase.js";
let S={},secs=[],cons=[],user,ud;
const app=$("#app"),prem=()=>ud?.premiumUntil?.toMillis()>Date.now();
const card=(h,t,s,l)=>`<a class=card href="#${h}"><b>${esc(t)}</b><small>${esc(s||"")}${l?" 🔒 প্রিমিয়াম":""}</small></a>`;
const sc=x=>card("s/"+x.id,"📁 "+x.title),cc=x=>card("c/"+x.id,x.title,x.type,x.premium);
const items=p=>secs.filter(x=>(x.parentId||"")==p).map(sc).join("")+cons.filter(x=>(x.sectionId||"")==p).map(cc).join("")||"<p class=m>এখনো কিছু নেই।</p>";
async function pays(sel){const r=rows(await getDocs(query(collection(db,"payments"),where("uid","==",user.uid)))).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
 $(sel).innerHTML="<h3>আমার পেমেন্ট</h3>"+(r.map(p=>`<p class=box>${esc(p.method)} · ${esc(p.trxId)} · <b class=${p.status}>${{Pending:"অপেক্ষমান",Approved:"অনুমোদিত",Rejected:"বাতিল"}[p.status]}</b></p>`).join("")||"<p class=m>কোনো পেমেন্ট নেই</p>")}
const R={
"":()=>{app.innerHTML=`<p>${esc(S.about||"")}</p><input id=q placeholder="🔍 খুঁজুন…"><div id=l class=grid>${items("")}</div>`;
 $("#q").oninput=e=>{const t=e.target.value.trim().toLowerCase();$("#l").innerHTML=t?(secs.filter(x=>x.title.toLowerCase().includes(t)).map(sc).join("")+cons.filter(x=>(x.title+(x.type||"")).toLowerCase().includes(t)).map(cc).join("")||"<p class=m>কিছু পাওয়া যায়নি।</p>"):items("")}},
s:id=>{const s=secs.find(x=>x.id==id);app.innerHTML=s?`<a href="#${s.parentId?"s/"+s.parentId:""}">← ফিরে যাও</a><h2>${esc(s.title)}</h2><div class=grid>${items(id)}</div>`:"<p>পাওয়া যায়নি</p>"},
c:async id=>{const m=cons.find(x=>x.id==id);if(!m)return app.innerHTML="<p>পাওয়া যায়নি</p>";
 const back=`<a href="#${m.sectionId?"s/"+m.sectionId:""}">← ফিরে যাও</a><h2>${esc(m.title)}</h2>`;app.innerHTML=back+"<p>লোড হচ্ছে…</p>";
 try{const d=await getDoc(doc(db,"contentBodies",id));app.innerHTML=back+`<article>${d.data().body}</article>`}
 catch{app.innerHTML=back+`<div class=box>🔒 এটি প্রিমিয়াম কন্টেন্ট।<br><a class=btn href="#${user?"premium":"login"}">${user?"প্রিমিয়াম নাও":"লগইন করো"}</a></div>`}},
login:()=>{let reg=0;const f=()=>{app.innerHTML=`<h2>${reg?"রেজিস্টার":"লগইন"}</h2><form id=f>${reg?"<input id=n placeholder=নাম required>":""}<input id=e type=email placeholder=ইমেইল required><input id=p type=password minlength=6 placeholder=পাসওয়ার্ড required><button>${reg?"অ্যাকাউন্ট খোলো":"লগইন"}</button><p id=er class=err></p></form><a href=# id=t>${reg?"আগে থেকেই অ্যাকাউন্ট আছে?":"নতুন অ্যাকাউন্ট খুলুন"}</a>`;
 $("#t").onclick=e=>{e.preventDefault();reg=!reg;f()};
 $("#f").onsubmit=async e=>{e.preventDefault();try{if(reg){const c=await createUserWithEmailAndPassword(auth,$("#e").value,$("#p").value);await setDoc(doc(db,"users",c.user.uid),{name:$("#n").value,email:$("#e").value,createdAt:serverTimestamp()});ud=(await getDoc(doc(db,"users",c.user.uid))).data()}else await signInWithEmailAndPassword(auth,$("#e").value,$("#p").value);location.hash=""}catch(x){$("#er").textContent="ব্যর্থ: ইমেইল/পাসওয়ার্ড চেক করো ("+x.code+")"}}};f()},
profile:()=>{if(!user)return location.hash="login";app.innerHTML=`<h2>${esc(ud?.name||"")}</h2><p>${esc(user.email)}</p>${ud?.status=="blocked"?"<p class=err>🚫 তোমার অ্যাকাউন্ট ব্লক করা আছে।</p>":""}<p>${prem()?"⭐ প্রিমিয়াম: "+fmt(ud.premiumUntil)+" পর্যন্ত":"ফ্রি অ্যাকাউন্ট"}</p><div id=h></div><button id=lo>লগআউট</button>`;$("#lo").onclick=()=>signOut(auth);pays("#h")},
premium:()=>{if(!user)return location.hash="login";const P=S.pay||{};
 const ms=[["bkash","bKash"],["nagad","Nagad"],["rocket","Rocket"]].map(([k,n])=>({n,...(P[k]||{enabled:!!S[k],number:S[k]})})).filter(m=>m.enabled&&m.number);
 app.innerHTML=`<h2>⭐ প্রিমিয়াম</h2><p>${S.price||"?"} টাকা · ${S.days||"?"} দিন</p>${prem()?"<p>✅ তোমার প্রিমিয়াম চালু আছে।</p>":""}${ms.length?`<p>নিচের যেকোনো নম্বরে টাকা পাঠাও, তারপর ট্রানজেকশন আইডি জমা দাও:</p>${ms.map(m=>`<p class=box><b>${m.n}</b> (${esc(m.type||"Personal")}): ${esc(m.number)}${m.note?`<br><small>${esc(m.note)}</small>`:""}</p>`).join("")}<form id=f><select id=m>${ms.map(m=>`<option>${m.n}</option>`).join("")}</select><input id=t placeholder="ট্রানজেকশন আইডি" required><button>জমা দাও</button></form>`:"<p class=box>এই মুহূর্তে পেমেন্ট নেওয়া বন্ধ আছে।</p>"}<div id=h></div>`;
 if(ms.length)$("#f").onsubmit=async e=>{e.preventDefault();await addDoc(collection(db,"payments"),{uid:user.uid,email:user.email,method:$("#m").value,trxId:$("#t").value.trim(),amount:S.price||0,status:"Pending",createdAt:serverTimestamp()});R.premium()};pays("#h")}};
let adm=false;
const render=()=>{const[r,id]=location.hash.slice(1).split("/");if(S.maintenance&&!adm&&r!="login")return app.innerHTML=`<div class=box>🛠 ${esc(S.maintenanceMsg||"সাইটের কাজ চলছে, একটু পরে আবার আসো।")}</div>`;(R[r]||R[""])(id)};
addEventListener("hashchange",render);
try{
 const[s,a,c]=await Promise.all([getDoc(doc(db,"settings","site")),getDocs(query(collection(db,"customSections"),where("hidden","==",false))),getDocs(query(collection(db,"contents"),where("published","==",true)))]);
 S=s.data()||{};secs=rows(a).sort(by);cons=rows(c).sort(by);
}catch(e){app.innerHTML="<p class=err>ডেটা লোড হয়নি। Firestore রুলস/কনফিগ চেক করো।</p>"}
document.title=$("#name").textContent=S.siteName||"StudyMate";if(S.logoUrl){$("#logo").src=S.logoUrl;$("#logo").hidden=false}
onAuthStateChanged(auth,async u=>{user=u;adm=false;if(!u)ud=null;else{const d=await getDoc(doc(db,"users",u.uid));ud=d.exists()?d.data():ud;if(S.maintenance)try{adm=(await getDoc(doc(db,"admins",u.uid))).exists()}catch{}}
 $("#me").textContent=u?"👤 প্রোফাইল":"লগইন";$("#me").href=u?"#profile":"#login";render()});
