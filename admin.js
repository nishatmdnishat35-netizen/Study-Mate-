import {auth,db,$,esc,by,rows,fmt,collection,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,query,where,writeBatch,Timestamp,serverTimestamp,onAuthStateChanged,signInWithEmailAndPassword,signOut,getCountFromServer,updatePassword} from "./firebase.js";
const A=$("#a"),T=[["dash","🏠 ড্যাশবোর্ড"],["content","📚 কন্টেন্ট"],["payments","💳 পেমেন্ট"],["users","👥 ইউজার"],["settings","⚙️ সেটিংস"]],V={};let S={},cur="";
const go=h=>{const v=$("#v");v.onclick=null;v.innerHTML=h};
onAuthStateChanged(auth,async u=>{
 if(!u){A.innerHTML=`<h2>অ্যাডমিন লগইন</h2><form id=f><input id=e type=email placeholder=ইমেইল required><input id=p type=password placeholder=পাসওয়ার্ড required><button>লগইন</button><p id=er class=err></p></form>`;
  return $("#f").onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("#e").value,$("#p").value)}catch{$("#er").textContent="লগইন ব্যর্থ"}}}
 let ok=0;try{ok=(await getDoc(doc(db,"admins",u.uid))).exists()}catch{}
 if(!ok){A.innerHTML=`<p class=err>এই অ্যাকাউন্ট অ্যাডমিন নয়।</p><button id=lo>লগআউট</button>`;return $("#lo").onclick=()=>signOut(auth)}
 S=(await getDoc(doc(db,"settings","site"))).data()||{};
 A.innerHTML=`<div class=shell><aside><b class=logo>${esc(S.siteName||"StudyMate")}</b><nav>${T.map(([k,t])=>`<button data-k=${k}>${t}</button>`).join("")}<button id=lo>🚪 লগআউট</button></nav></aside><section id=v></section></div>`;
 const tabs=[...A.querySelectorAll("[data-k]")],on=k=>tabs.forEach(x=>x.classList.toggle("on",x.dataset.k==k));
 tabs.forEach(b=>b.onclick=()=>{on(b.dataset.k);V[b.dataset.k]()});$("#lo").onclick=()=>signOut(auth);on("dash");V.dash()});
V.dash=async()=>{go("<p class=m>লোড হচ্ছে…</p>");
 const q=(n,w)=>getCountFromServer(w?query(collection(db,n),where(...w)):collection(db,n)).then(s=>s.data().count);
 const[u,c,s,p,pp]=await Promise.all([q("users"),q("contents"),q("customSections"),q("payments"),q("payments",["status","==","Pending"])]);
 go(`<h2>ড্যাশবোর্ড</h2><div class=stats>${[["👥","মোট ইউজার",u],["📄","মোট কন্টেন্ট",c],["📁","মোট সেকশন",s],["💳","মোট পেমেন্ট",p]].map(([i,l,n])=>`<div class=stat><span>${i}</span><b>${n}</b><small>${l}</small></div>`).join("")}</div>${pp?`<p class=box>⏳ ${pp}টি পেমেন্ট যাচাইয়ের অপেক্ষায়। <a href=# id=gp>দেখো →</a></p>`:""}`);
 if(pp)$("#gp").onclick=e=>{e.preventDefault();V.payments()}};
const save=(box,col)=>{const b=writeBatch(db);[...box.children].forEach((x,i)=>b.update(doc(db,col,x.dataset.id),{order:i}));return b.commit()};
function dnd(box,col){let d;[...box.children].forEach(li=>{li.draggable=true;li.ondragstart=()=>d=li;
 li.ondragover=e=>{e.preventDefault();const r=li.getBoundingClientRect();if(d&&d!=li)box.insertBefore(d,e.clientY>r.top+r.height/2?li.nextSibling:li)};li.ondragend=()=>save(box,col);
 li.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{const dn=b.dataset.mv==1,s=dn?li.nextSibling:li.previousSibling;if(s){box.insertBefore(li,dn?s.nextSibling:s);save(box,col)}})})}
V.content=async()=>{
 const[a,c]=await Promise.all([getDocs(collection(db,"customSections")),getDocs(collection(db,"contents"))]);const secs=rows(a),cons=rows(c);
 const path=[];for(let s=secs.find(x=>x.id==cur);s;s=secs.find(x=>x.id==s.parentId))path.unshift(s);
 const li=(o,col)=>{const sec=col=="customSections";return `<li data-id="${o.id}"><span>${sec?"📁":"📄"} ${esc(o.title)}${o.premium?" 🔒":""}${(o.published===false||o.hidden||(!sec&&!o.published))?" <i>(লুকানো/ড্রাফট)</i>":""}</span><span><button data-mv="-1">▲</button> <button data-mv="1">▼</button> <button data-a=e data-c=${col} data-id="${o.id}">✏️</button> <button data-a=d data-c=${col} data-id="${o.id}">🗑</button>${sec?` <button data-a=o data-id="${o.id}">▶</button> <button data-a=h data-id="${o.id}">👁</button>`:""}</span></li>`};
 go(`<p><a href=# data-a=o data-id="">🏠 মূল</a>${path.map(s=>` / <a href=# data-a=o data-id="${s.id}">${esc(s.title)}</a>`).join("")}</p><p><button id=ns>＋ সেকশন</button> <button id=nc>＋ কন্টেন্ট</button></p><ul id=ls>${secs.filter(x=>(x.parentId||"")==cur).sort(by).map(x=>li(x,"customSections")).join("")}</ul><ul id=lc>${cons.filter(x=>(x.sectionId||"")==cur).sort(by).map(x=>li(x,"contents")).join("")}</ul>`);
 dnd($("#ls"),"customSections");dnd($("#lc"),"contents");
 $("#ns").onclick=async()=>{const t=prompt("সেকশনের নাম");if(t){await setDoc(doc(collection(db,"customSections")),{title:t,parentId:cur,hidden:false,order:secs.length});V.content()}};
 $("#nc").onclick=()=>edit(null,cons);
 $("#v").onclick=async e=>{const b=e.target.closest("[data-a]");if(!b)return;e.preventDefault();const id=b.dataset.id,k=b.dataset.a,col=b.dataset.c,sec=col=="customSections";
  if(k=="o"){cur=id}
  else if(k=="h"){const s=secs.find(x=>x.id==id);await updateDoc(doc(db,col||"customSections",id),{hidden:!s.hidden})}
  else if(k=="e"){if(sec){const t=prompt("নতুন নাম",secs.find(x=>x.id==id).title);if(t)await updateDoc(doc(db,col,id),{title:t})}else return edit(id,cons)}
  else if(k=="d"){if(!confirm("ডিলিট করবে?"))return;
   if(sec){if(secs.some(x=>x.parentId==id)||cons.some(x=>x.sectionId==id))return alert("আগে ভেতরের সবকিছু সরাও বা ডিলিট করো।");await deleteDoc(doc(db,col,id))}
   else{const w=writeBatch(db);w.delete(doc(db,"contents",id));w.delete(doc(db,"contentBodies",id));await w.commit()}}
  V.content()}};
async function edit(id,cons){
 const m=cons.find(x=>x.id==id)||{title:"",type:"",premium:false,published:false};let body="";
 if(id)try{body=(await getDoc(doc(db,"contentBodies",id))).data().body}catch{}
 const d=$("#dlg");d.innerHTML=`<form id=ef><input id=t value="${esc(m.title)}" placeholder=শিরোনাম required><input id=ty list=tl value="${esc(m.type||"")}" placeholder="ধরন (নোট, MCQ, সূত্র…)"><datalist id=tl>${[...new Set(cons.map(x=>x.type).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist><div class=tb>${[["B","bold"],["H","h3"],["•","ul"],["🔗","link"]].map(([l,c])=>`<button type=button data-c=${c}>${l}</button>`).join(" ")} <button type=button id=pv>👁 প্রিভিউ/এডিট</button></div><div id=ed contenteditable=true class=ed>${body}</div><label><input type=checkbox id=pr ${m.premium?"checked":""}> প্রিমিয়াম</label><label><input type=checkbox id=pb ${m.published?"checked":""}> পাবলিশ (টিক না দিলে ড্রাফট)</label><p><button>সেভ</button> <button type=button id=cl>বাতিল</button></p></form>`;
 d.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{const c=b.dataset.c,x=document.execCommand.bind(document);c=="bold"?x("bold"):c=="h3"?x("formatBlock",false,"h3"):c=="ul"?x("insertUnorderedList"):(u=>u&&x("createLink",false,u))(prompt("লিংক"))});
 $("#pv").onclick=()=>{const e=$("#ed");e.contentEditable=e.isContentEditable?"false":"true"};$("#cl").onclick=()=>d.close();
 $("#ef").onsubmit=async e=>{e.preventDefault();const r=id?doc(db,"contents",id):doc(collection(db,"contents")),f={premium:$("#pr").checked,published:$("#pb").checked},b=writeBatch(db);
  b.set(r,{title:$("#t").value,type:$("#ty").value,sectionId:m.sectionId??cur,order:m.order??cons.length,...f,updatedAt:serverTimestamp()});
  b.set(doc(db,"contentBodies",r.id),{body:$("#ed").innerHTML,...f});await b.commit();d.close();V.content()};
 d.showModal()}
async function grant(uid,days,pid){const r=doc(db,"users",uid),u=(await getDoc(r)).data()||{},b=writeBatch(db);
 b.update(r,{premiumUntil:Timestamp.fromMillis(Math.max(Date.now(),u.premiumUntil?.toMillis()||0)+days*864e5)});
 if(pid)b.update(doc(db,"payments",pid),{status:"Approved",reviewedAt:serverTimestamp()});await b.commit()}
V.payments=async()=>{const p=rows(await getDocs(collection(db,"payments"))).sort((a,b)=>(a.status=="Pending"?0:1)-(b.status=="Pending"?0:1)||(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
 go(p.map(x=>`<div class=box><b>${esc(x.method)}</b> · ${esc(x.trxId)} · ${esc(x.amount)}৳<br>${esc(x.email)} · <b class=${x.status}>${x.status}</b>${x.status=="Pending"?`<br><button data-p=A data-id="${x.id}">✅ Approve</button> <button data-p=R data-id="${x.id}">❌ Reject</button>`:""}</div>`).join("")||"<p>কোনো রিকোয়েস্ট নেই</p>");
 $("#v").onclick=async e=>{const b=e.target.closest("[data-p]");if(!b)return;const x=p.find(y=>y.id==b.dataset.id);
  if(b.dataset.p=="A"){if(!confirm("ট্রানজেকশন আইডি যাচাই করেছ? মেয়াদ হবে সেটিংসের "+(S.days||30)+" দিন।"))return;await grant(x.uid,S.days||30,x.id)}
  else await updateDoc(doc(db,"payments",x.id),{status:"Rejected",reviewedAt:serverTimestamp()});V.payments()}};
V.users=async()=>{const u=rows(await getDocs(collection(db,"users")));
 const draw=t=>u.filter(x=>((x.name||"")+" "+(x.email||"")).toLowerCase().includes(t)).map(x=>`<div class=box><b>${esc(x.name)}</b> ${x.status=="blocked"?"<span class=Rejected>🚫 ব্লক</span>":""}<br><small>${esc(x.email)} · যোগ দিয়েছে: ${fmt(x.createdAt)}</small><br>${x.premiumUntil?.toMillis()>Date.now()?"⭐ "+fmt(x.premiumUntil)+" পর্যন্ত":"ফ্রি"}<br><button data-u=g data-id="${x.id}">＋দিন দাও</button> <button data-u=r data-id="${x.id}">প্রিমিয়াম বাতিল</button> <button data-u=b data-id="${x.id}">${x.status=="blocked"?"আনব্লক":"ব্লক"}</button> <button data-u=h data-id="${x.id}">পেমেন্ট হিস্ট্রি</button></div>`).join("")||"<p class=m>কেউ নেই</p>";
 go(`<h2>ইউজার (${u.length})</h2><input id=s placeholder="🔍 নাম বা ইমেইল দিয়ে খুঁজুন"><div id=ul>${draw("")}</div>`);
 $("#s").oninput=e=>$("#ul").innerHTML=draw(e.target.value.trim().toLowerCase());
 $("#v").onclick=async e=>{const b=e.target.closest("[data-u]");if(!b)return;const id=b.dataset.id,k=b.dataset.u;
  if(k=="g"){const n=+prompt("কত দিন?",S.days||30);if(n)await grant(id,n)}
  if(k=="r"&&confirm("প্রিমিয়াম বাতিল?"))await updateDoc(doc(db,"users",id),{premiumUntil:null});
  if(k=="b"){const x=u.find(y=>y.id==id),bl=x.status=="blocked";if(confirm(bl?"আনব্লক করবে?":"ব্লক করবে?"))await updateDoc(doc(db,"users",id),{status:bl?"active":"blocked"})}
  if(k=="h"){const p=rows(await getDocs(query(collection(db,"payments"),where("uid","==",id))));return alert(p.map(x=>`${x.method} ${x.trxId} ${x.status}`).join("\n")||"কিছু নেই")}
  V.users()}};
const PM=[["bkash","bKash"],["nagad","Nagad"],["rocket","Rocket"]],okNum=n=>/^01[3-9]\d{8}$/.test(n),say=(id,t,bad)=>{const e=$("#"+id);e.className=bad?"err":"Approved";e.textContent=t};
V.settings=async()=>{const P=S.pay||{},an=(await getDoc(doc(db,"users",auth.currentUser.uid))).data()?.name||"";
 go(`<h2>সেটিংস</h2>
<form id=g class=box><h3>🌐 ওয়েবসাইট</h3><label>নাম<input id=siteName value="${esc(S.siteName)}"></label><label>লোগোর লিংক (URL)<input id=logoUrl value="${esc(S.logoUrl)}"></label><label>বিবরণ<input id=about value="${esc(S.about)}"></label><label>প্যাকেজের দাম (টাকা)<input id=price type=number min=0 value="${esc(S.price)}"></label><label>মেয়াদ (দিন)<input id=days type=number min=1 value="${esc(S.days)}"></label><label><input type=checkbox id=mt ${S.maintenance?"checked":""}> 🛠 মেইনটেন্যান্স মোড চালু</label><label>মেইনটেন্যান্স বার্তা<input id=mm value="${esc(S.maintenanceMsg)}"></label><button>সেভ</button><p id=gm></p></form>
<form id=pf class=box><h3>💳 পেমেন্ট ম্যানেজমেন্ট</h3>${PM.map(([k,n])=>{const p=P[k]||{enabled:!!S[k],number:S[k]||"",type:"Personal"};return `<fieldset><legend>${n}</legend><label><input type=checkbox id=${k}_e ${p.enabled?"checked":""}> চালু</label><input id=${k}_n inputmode=numeric placeholder="01XXXXXXXXX" value="${esc(p.number)}"><select id=${k}_t><option ${p.type!="Merchant"?"selected":""}>Personal<option ${p.type=="Merchant"?"selected":""}>Merchant</select><input id=${k}_i placeholder="নির্দেশনা (যেমন: Send Money করুন)" value="${esc(p.note)}"></fieldset>`}).join("")}<button>পেমেন্ট সেটিংস সেভ</button><p id=pm></p></form>
<form id=ap class=box><h3>👤 অ্যাডমিন প্রোফাইল</h3><p>${esc(auth.currentUser.email)}</p><label>নাম<input id=an value="${esc(an)}"></label><label>নতুন পাসওয়ার্ড (না বদলাতে চাইলে ফাঁকা)<input id=np type=password minlength=6></label><button>সেভ</button><p id=am></p></form>`);
 const sv=async(id,o)=>{try{await setDoc(doc(db,"settings","site"),o,{merge:true});Object.assign(S,o);say(id,"✅ সেভ হয়েছে")}catch(e){say(id,"❌ সেভ হয়নি: "+e.code,1)}};
 $("#g").onsubmit=e=>{e.preventDefault();sv("gm",{siteName:$("#siteName").value.trim(),logoUrl:$("#logoUrl").value.trim(),about:$("#about").value.trim(),price:+$("#price").value||0,days:+$("#days").value||0,maintenance:$("#mt").checked,maintenanceMsg:$("#mm").value.trim()})};
 $("#pf").onsubmit=e=>{e.preventDefault();const pay={};for(const[k,n]of PM){const num=$("#"+k+"_n").value.trim(),en=$("#"+k+"_e").checked;if(en&&!okNum(num))return say("pm",n+": সঠিক নম্বর দাও (১১ ডিজিট, 01XXXXXXXXX)",1);pay[k]={enabled:en,number:num,type:$("#"+k+"_t").value,note:$("#"+k+"_i").value.trim()}}sv("pm",{pay})};
 $("#ap").onsubmit=async e=>{e.preventDefault();try{await updateDoc(doc(db,"users",auth.currentUser.uid),{name:$("#an").value.trim()});const np=$("#np").value;if(np)await updatePassword(auth.currentUser,np);say("am","✅ সেভ হয়েছে")}catch(x){say("am",x.code=="auth/requires-recent-login"?"❌ নিরাপত্তার জন্য লগআউট করে আবার লগইন করে চেষ্টা করো":"❌ সেভ হয়নি: "+x.code,1)}}};
