import {useState,useEffect,useRef} from 'react';
import {api,setSession,clearSession,logoutSession,refreshSession,markActivity,isSessionIdle} from './api';
import logo from './assets/images/rajkumar-logo-onecolor.png';
import {storedUser,Login,Cart,Pay,Admin,CATEGORIES,disc,PageContent} from './pages.jsx';

const feedbackLinkParams=new URLSearchParams(window.location.search);
const feedbackLinkValue=feedbackLinkParams.get('orderId');
const emailFeedbackOrderId=feedbackLinkParams.get('tab')==='feedback'&&feedbackLinkValue&&/^\d+$/.test(feedbackLinkValue)&&Number.isSafeInteger(Number(feedbackLinkValue))&&Number(feedbackLinkValue)>0
 ?Number(feedbackLinkValue):null;

function NotificationBody({message}){
 const normalized=message.replace(/\s+(Customer|Phone|Email|Request|Pickup requested|Drop-off address|Delivery address|Showroom address|Order total|Attached customer photos|Contact the customer on WhatsApp):/g,'\n$1:');
 const linkify=text=>text.split(/(https:\/\/wa\.me\/\d+(?:\?text=[^\s]*)?)/g).map((part,index)=>part.startsWith('https://wa.me/')
   ?<a key={index} href={part} target="_blank" rel="noreferrer">Open WhatsApp chat</a>:part);
 return <div className="notification-body">{normalized.split(/\r?\n/).filter(Boolean).map((line,index)=>{
  const colon=line.indexOf(':');
  return colon>0&&colon<36
   ?<div className="notification-line" key={index}><strong>{line.slice(0,colon)}:</strong> {linkify(line.slice(colon+1).trim())}</div>
   :<div className="notification-line" key={index}>{linkify(line)}</div>;
 })}</div>;
}

export default function App(){
 const[user,setUser]=useState(storedUser),admin=user?.role==='ADMIN';
 const[tab,setTab]=useState(()=>emailFeedbackOrderId&&user?.role!=='ADMIN'?'feedback':admin?'admin':'home'),[feedbackOrderId,setFeedbackOrderId]=useState(emailFeedbackOrderId),[prods,setProds]=useState([]),[cfg,setCfg]=useState({}),[cart,setCart]=useState({}),[notes,setNotes]=useState([]),
 [pay,setPay]=useState(null),[msg,setMsg]=useState(''),[login,setLogin]=useState(false),[bell,setBell]=useState(false),[showCart,setShowCart]=useState(false),
 [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[slide,setSlide]=useState(0),[detail,setDetail]=useState(null),
 [theme,setTheme]=useState(()=>localStorage.getItem('rk_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')),[chatOpen,setChatOpen]=useState(false),[chatText,setChatText]=useState(''),
 [messages,setMessages]=useState([{from:'shop',text:'Hi! Ask me about prices, pickup, custom shoes or your order.'}]);
 const[placingOrder,setPlacingOrder]=useState(false),orderSubmissionInFlight=useRef(false);
 const emailFeedbackHandled=useRef(false);
 const toast=m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)};
 useEffect(()=>{if(!emailFeedbackOrderId||emailFeedbackHandled.current)return;emailFeedbackHandled.current=true;if(!user)setLogin(true);else if(!admin){setFeedbackOrderId(emailFeedbackOrderId);setTab('feedback')}},[user,admin]);
 const shopName=cfg['shop.name']||'Raj Kumar Shoe Repairing',shopAddress=cfg['shop.address']||'Bistupur, Jamshedpur, Jharkhand',shopYear=cfg['shop.established_year']||'1984',shopHours=cfg['shop.hours']||'Mon-Sun 10am-8pm';
 const freeThreshold=Number(cfg['delivery.free_threshold']??500),deliveryFee=Number(cfg['delivery.fee']??50);
 const reload=()=>{api('/products').then(setProds).catch(()=>{});api('/settings/public').then(settings=>setCfg(current=>({...current,...settings}))).catch(()=>{});api('/staticdata').then(data=>setCfg(current=>({...current,...data}))).catch(()=>{})};
 useEffect(reload,[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('rk_theme',theme)},[theme]);
 useEffect(()=>{const timer=setInterval(()=>setSlide(value=>(value+1)%3),4000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!user)return;let lastRefresh=Date.now();let expired=false;
  const activity=()=>markActivity();
  const checkSession=async()=>{if(isSessionIdle()){expired=true;clearInterval(timer);await logoutSession();setUser(null);setNotes([]);setTab('home');toast('You were signed out after 5 minutes of inactivity.');return}
   if(Date.now()-lastRefresh>=60*1000){try{await refreshSession();lastRefresh=Date.now()}catch{expired=true;clearInterval(timer);clearSession();setUser(null);setNotes([]);setTab('home');toast('Your session expired. Please sign in again.')}}
  };
  for(const event of ['pointerdown','pointermove','keydown','touchstart','scroll'])window.addEventListener(event,activity,{passive:true});
  const timer=window.setInterval(()=>{if(!expired)void checkSession()},15000);
  return()=>{clearInterval(timer);for(const event of ['pointerdown','pointermove','keydown','touchstart','scroll'])window.removeEventListener(event,activity)}
 },[user]);
 useEffect(()=>{if(!user)return;let last=-1;const f=()=>api('/notifications').then(n=>{const u=n.filter(x=>!x.seen).length;
  if(last>=0&&u>last&&window.Notification?.permission==='granted')new window.Notification(shopName,{body:n[0].message});last=u;setNotes(n)}).catch(()=>{});
  if(window.Notification?.permission==='default')window.Notification.requestPermission();f();const t=setInterval(f,10000);return()=>clearInterval(t)},[user]);
 const onAuth=r=>{setSession(r);sessionStorage.setItem('u',JSON.stringify(r.user));setUser(r.user);setLogin(false);setTab(r.user.role==='ADMIN'?'admin':feedbackOrderId?'feedback':'home')};
 const openFeedback=id=>{setFeedbackOrderId(id);const url=new URL(window.location.href);url.searchParams.set('tab','feedback');url.searchParams.set('orderId',String(id));window.history.replaceState({},'',url);if(!user){setLogin(true);return}setTab('feedback')};
 const backToOrders=()=>{setFeedbackOrderId(null);const url=new URL(window.location.href);url.searchParams.delete('tab');url.searchParams.delete('orderId');window.history.replaceState({},'',url);setTab('orders')};
 const logout=()=>{void logoutSession();setUser(null);setNotes([]);setTab('home')};
const place=async (b,images=[])=>{if(orderSubmissionInFlight.current)return;if(!user)return setLogin(true);if(admin)return toast('Please use a customer account to place orders');
  orderSubmissionInFlight.current=true;setPlacingOrder(true);
  try{const form=new FormData();form.append('order',new Blob([JSON.stringify(b)],{type:'application/json'}));images.forEach(image=>form.append('images',image));const o=await api('/orders','POST',form);setCart({});setShowCart(false);reload();if(o.paymentMode==='ONLINE')setPay(o);else{setTab('orders');toast(o.paymentMode==='QUOTE'?`Request ${o.orderNo} sent. The owner will send a quote after review.`:`Order ${o.orderNo} placed. Pay ₹${o.total} on delivery.`)}}catch(e){toast(e.message)}finally{orderSubmissionInFlight.current=false;setPlacingOrder(false)}}; const setQty=(id,q)=>{const c={...cart};q<1?delete c[id]:c[id]=q;setCart(c)};
 const openBell=()=>{setBell(!bell);if(!bell&&notes.some(n=>!n.seen))api('/notifications/read','POST').then(()=>setNotes(notes.map(n=>({...n,seen:true})))).catch(()=>{})};
 const tabs=admin?[['admin','⚙️ Admin'],['materials','🧰 Materials']]:[['home','🏠 Home'],['materials','🧰 Materials'],['repair','🔧 Repair'],['custom','👞 Custom'],['bulk','🏬 Bulk repair'],['orders','📦 Orders']];
 const goShop=(nextCategory='All')=>{setCategory(nextCategory);setTab('materials');window.scrollTo({top:0,behavior:'smooth'})};
 const submitChat=event=>{event.preventDefault();const text=chatText.trim();if(!text)return;
  const lower=text.toLowerCase(),reply=/price|cost|rate/.test(lower)?'Sole replacement starts at ₹350, stitching ₹150, sticking ₹200 and polish ₹80.':
   /pick|deliver/.test(lower)?`Pickup and delivery are free above ₹${freeThreshold}; otherwise the fee is ₹${deliveryFee}.`:
   /wedding|custom|orthopedic/.test(lower)?'We make wedding and custom footwear. Open Custom to share your design and requirements.':
   /order|track/.test(lower)?'Sign in and open My orders to see your order status and payment updates.':
   'Please use the Repair, Custom or Materials sections to place an order. You can also call us during shop hours.';
  setMessages(items=>[...items,{from:'you',text},{from:'shop',text:reply}]);setChatText('')};
 const unseen=notes.filter(n=>!n.seen).length,cn=Object.values(cart).reduce((a,b)=>a+b,0);
 const slides=[
  {title:'Mega sale on soles & glue',text:'Save on the shoe materials you use every day.',action:'Shop materials',tab:'materials',icon:'🧰',background:'linear-gradient(110deg,#5a2d0c,#b5651d)'},
  {title:'Free pickup & delivery',text:`On repair orders above ₹${freeThreshold} in ${shopAddress}.`,action:'Book repair',tab:'repair',icon:'🚚',background:'linear-gradient(110deg,#14532d,#2e8b57)'},
  {title:'Custom wedding shoes',text:'Handcrafted footwear, made for your big day.',action:'Design yours',tab:'custom',icon:'💍',background:'linear-gradient(110deg,#4a1d5c,#a24b9b)'}
 ];
 const addProduct=id=>{setQty(id,(cart[id]||0)+1);toast('Added to cart')};
 return <>
 <header><div className="hd">
 <button className="brand" onClick={()=>setTab('home')} aria-label={`${shopName} home`}><img src={logo} alt="" width="64" height="64"/><b>{shopName}<small>SHOE REPAIRING · ESTD {shopYear} · {shopAddress}</small></b></button>
 <form className="srch" onSubmit={e=>{e.preventDefault();goShop()}}><input aria-label="Search materials" placeholder="Search soles, glue, heels, polish…" value={search} onChange={e=>setSearch(e.target.value)}/><button type="submit" aria-label="Search">🔍</button></form>
 <nav className="dn"> <button className="text-link t" onClick={()=>setTab('repair')}>Repair</button><button className="text-link t" onClick={()=>setTab('custom')}>Custom</button><button className="text-link t" onClick={()=>setTab('bulk')}>Showroom bulk</button><button className="text-link t" onClick={()=>goShop()}>Materials</button>
 {user&&<button className="text-link" onClick={()=>setTab(admin?'admin':'orders')}>{admin?'⚙️ Admin':'My orders'}</button>}
 <button className="text-link notification" onClick={openBell} aria-label="Notifications">🔔{unseen>0&&<i>{unseen}</i>}</button>
 <button className="lg" onClick={()=>user?logout():setLogin(true)}>{user?`${user.name.split(' ')[0]} · Logout`:'Login'}</button>
 <button className="text-link cb" onClick={()=>setShowCart(true)} aria-label={`Cart, ${cn} items`}>🛒<i>{cn}</i></button>
 <button className="theme-toggle" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`}>{theme==='dark'?'☀️':'🌙'}</button></nav></div></header>
 <div className="cats"><div>{CATEGORIES.map(([name,icon])=><button key={name} className={category===name&&tab==='materials'?'selected':''} onClick={()=>goShop(name)}><span>{icon}</span>{name}</button>)}</div></div>
 {bell&&<div className="notes"><div className="notes-head"><b>Notifications</b>{notes.length>0&&<button className="text-link" onClick={async()=>{if(!confirm('Clear all notifications?'))return;try{await api('/notifications','DELETE');setNotes([]);toast('Notifications cleared')}catch(e){toast(e.message)}}}>Clear</button>}</div>{notes.length?notes.map(n=><article key={n.id} className={`notification-card${n.seen?'':' n'}`}><NotificationBody message={n.message}/>{n.createdAt&&<small className="mut">{new Date(n.createdAt).toLocaleString()}</small>}</article>):<p>No notifications</p>}</div>}
 <PageContent tab={tab} slides={slides} slide={slide} setSlide={setSlide} setTab={setTab} goShop={goShop} prods={prods} admin={admin} addProduct={addProduct} setDetail={setDetail} category={category} setCategory={setCategory} search={search} place={place} placingOrder={placingOrder} user={user} setPay={setPay} toast={toast} setLogin={setLogin} cfg={cfg} reload={reload} feedbackOrderId={feedbackOrderId} onOpenFeedback={openFeedback} onFeedbackBack={backToOrders}/>
 <footer>© {shopName} · {shopAddress} · {shopHours} · ESTD {shopYear}</footer>
 <nav className="bn">{[['home','🏠','Home'],['materials','🧰','Materials'],['repair','🔧','Repair'],['bulk','🏬','Bulk'],['cart','🛒','Cart']].map(([key,icon,label])=><button key={key} className={tab===key?'on':''} onClick={()=>key==='cart'?setShowCart(true):setTab(key)}><span>{icon}</span>{label}</button>)}</nav>
 {login&&<Login onAuth={onAuth} close={()=>setLogin(false)} onLocked={()=>{setLogin(false);setTab('home')}}/>}
 {showCart&&<Cart prods={prods} cart={cart} setQty={setQty} place={place} cfg={cfg} placingOrder={placingOrder} close={()=>setShowCart(false)}/>}
 {placingOrder&&<div className="order-submission-overlay" role="status" aria-live="polite"><div className="order-submission-card"><span className="submission-spinner" aria-hidden="true"/><strong>Placing your order…</strong><span>Saving your booking securely. This should only take a moment.</span></div></div>}
 {pay&&<Pay o={pay} cfg={cfg} close={()=>setPay(null)} done={()=>{setPay(null);setTab('orders');toast('Payment submitted. Waiting for owner verification.')}}/>}
 {detail&&<div className="ov on" onClick={()=>setDetail(null)}><section className="md on product-detail" onClick={e=>e.stopPropagation()}><button className="close-button" onClick={()=>setDetail(null)} aria-label="Close product details">×</button>
 <div className="detail-icon">{detail.imageUrl?<img src={new URL(detail.imageUrl,`${import.meta.env.VITE_API||'http://localhost:8080/api'}/`).href} alt={detail.name}/>:detail.emoji||'📦'}</div><h2>{detail.name}</h2><span className="rt">{detail.category}</span><p className="mut">{detail.description}</p>
 <p className="pr"><b>₹{detail.price}</b>{detail.mrp>detail.price&&<s>₹{detail.mrp}</s>}{disc(detail)>0&&<span>{disc(detail)}% off</span>}</p>
 <p className="ok">✓ Quality materials · ✓ Order updates available</p>{!admin&&<button className="btn d full" disabled={detail.stock<1} onClick={()=>{addProduct(detail.id);setDetail(null)}}>Add to cart</button>}</section></div>}
 <button id="cbtn" onClick={()=>setChatOpen(!chatOpen)} aria-label="Open shop assistant">🤖</button>
 <section id="chat" className={chatOpen?'on':''} aria-label="Shop assistant">
 <div className="chat-head"><b>🤖 Shop assistant</b><button onClick={()=>setChatOpen(false)} aria-label="Close assistant">×</button></div>
 <div id="ms">{messages.map((message,index)=><p key={index} className={`m ${message.from==='you'?'u':''}`}>{message.text}</p>)}</div>
 <form className="chat-form" onSubmit={submitChat}><input placeholder="Ask about services or prices" value={chatText} onChange={e=>setChatText(e.target.value)}/><button className="btn" type="submit">Send</button></form>
 </section>
 {bell&&<button className="dismiss-notes" onClick={()=>setBell(false)} aria-label="Close notifications"/>}
 {msg&&<div className="toast">{msg}</div>}</>}
