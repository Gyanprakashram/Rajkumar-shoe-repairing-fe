import {useState,useEffect,useRef} from 'react';

import {QRCodeSVG} from 'qrcode.react';

import {api,clearSession,isSessionIdle} from './api';
import {DEFAULT_OTP_LENGTH,OTP_REQUIRED} from './utils/constants';

const SV={REPAIR:[["Polish & clean",80],["Stitching",150],["Sticking / glue",200],["Sole replacement",350],["Leather jacket polish",450],["Leather belt (made to order)",250]],
CUSTOM:[["Wedding shoes",2500],["Orthopedic / handicapped shoes",1800],["Animal-design shoes",2000],["Own design",1500]]};

const ST=["IN_PROGRESS","READY","OUT_FOR_DELIVERY","DELIVERED"];
const ORDER_STEPS=[["PLACED","Order received"],["CONFIRMED","Confirmed"],["IN_PROGRESS","In progress"],["READY","Ready"],["OUT_FOR_DELIVERY","Out for delivery"],["DELIVERED","Delivered"]];

const disc=p=>Math.round((1-p.price/p.mrp)*100),tot=(b,pk)=>b+(pk&&b<500?50:0);

const SHOP_MAPS_URL=import.meta.env.VITE_SHOP_MAPS_URL||'https://www.google.com/maps/search/?api=1&query=Raj+Kumar+Shoe+Repairing+Bistupur+Jamshedpur';
const SHOP_MAP_EMBED='https://maps.google.com/maps?q=Raj%20Kumar%20Shoe%20Repairing%2C%20Bistupur%2C%20Jamshedpur&output=embed';
const API_BASE=import.meta.env.VITE_API||'http://localhost:8080/api';
const productImageUrl=product=>product.imageUrl?new URL(product.imageUrl,`${API_BASE}/`).href:null;

function storedUser(){
 try{
  const user=JSON.parse(sessionStorage.getItem('u'));
  if(user&&sessionStorage.getItem('r')&&!isSessionIdle())return user;
 }catch{}
 clearSession();return null;
}

function Login({onAuth,close,onLocked}){const[reg,setReg]=useState(false),[forgot,setForgot]=useState(false),[otpSent,setOtpSent]=useState(false),[busy,setBusy]=useState(false),[f,setF]=useState({name:'',phone:'',password:'',email:'',otp:''}),[err,setErr]=useState(''),[notice,setNotice]=useState('');
 const s=k=>e=>setF({...f,[k]:e.target.value});
 const validIdentifier=value=>/^\d{10}$/.test(value.trim())||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
 const requestOtp=async purpose=>{setErr('');setNotice('');
  if(forgot?!validIdentifier(f.phone):!/^\d{10}$/.test(f.phone.trim()))return setErr(forgot?'Enter a valid registered 10-digit phone number or email address.':'Enter a valid 10-digit mobile number first.');
  setBusy(true);
  try{const response=await api('/auth/request-otp','POST',forgot?{identifier:f.phone.trim(),purpose}:{phone:f.phone.trim(),email:f.email.trim(),purpose});setOtpSent(true);setNotice(response.message||'OTP sent. Check your phone or email.')}
  catch(e){if(e.status===423){window.alert(e.message);onLocked()}else setErr(e.message)}finally{setBusy(false)}};
 const go=async event=>{event.preventDefault();setErr('');setNotice('');
  if(forgot){
   if(!validIdentifier(f.phone))return setErr('Enter a valid registered 10-digit phone number or email address.');
   if(!f.otp.trim())return setErr('Enter the OTP sent to your registered phone or email.');
   if(f.password.length<6)return setErr('Password must be at least 6 characters.');
   setBusy(true);
   try{const response=await api('/auth/forgot-password','POST',{identifier:f.phone.trim(),otp:f.otp.trim(),password:f.password});onAuth(response)}
   catch(e){if(e.status===423){window.alert(e.message);onLocked()}else if(f.otp.trim())window.alert(e.message);else setErr(e.message)}finally{setBusy(false)}
   return;
  }
  if(reg&&f.name.trim().length<2)return setErr('Enter your name (at least 2 characters).');
  if(reg?!/^\d{10}$/.test(f.phone.trim()):!validIdentifier(f.phone))return setErr(reg?'Enter a valid 10-digit mobile number.':'Enter a valid 10-digit phone number or email address.');
  if(f.password.length<6)return setErr('Password must be at least 6 characters.');
  if(reg&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))return setErr('Enter a valid Gmail or email address.');
  if(reg&&OTP_REQUIRED&&!f.otp.trim())return setErr('Request and enter the OTP to register.');
  setBusy(true);
  try{const payload=reg?{...f,name:f.name.trim(),phone:f.phone.trim(),email:f.email.trim()}:{identifier:f.phone.trim(),password:f.password};onAuth(await api(reg?'/auth/register':'/auth/login','POST',payload))}
  catch(e){if(e.status===423){window.alert(e.message);onLocked()}else if(reg&&f.otp.trim())window.alert(e.message);else setErr(e.message)}finally{setBusy(false)}};
 const switchMode=nextReg=>{setReg(nextReg);setForgot(false);setOtpSent(false);setF({...f,otp:''});setErr('');setNotice('')};
 return <div className="ov" onClick={close}><form className="md" onSubmit={go} onClick={e=>e.stopPropagation()}><h2>{forgot?'Reset password':reg?'Create account':'Login'}</h2>
 {reg&&<><input required minLength={2} maxLength={100} placeholder="Full name" value={f.name} onChange={s('name')}/><input required type="email" maxLength={255} placeholder="Gmail or email address (required)" value={f.email} onChange={s('email')}/></>}
 <input required type={reg?'tel':'text'} inputMode={reg?'numeric':'email'} pattern={reg?'[0-9]{10}':undefined} placeholder={forgot?'Registered phone or email':reg?'Mobile (10 digits)':'Phone or email'} maxLength={reg?10:255} value={f.phone} onChange={s('phone')}/>
 {forgot?<>{OTP_REQUIRED&&<><button className="btn" type="button" disabled={busy} onClick={()=>requestOtp('FORGOT_PASSWORD')}>{otpSent?'Resend OTP':'Send OTP'}</button><input required inputMode="numeric" maxLength={DEFAULT_OTP_LENGTH} autoComplete="one-time-code" placeholder="OTP" value={f.otp} onChange={s('otp')}/></>}<input required type="password" minLength={6} maxLength={72} placeholder="New password" value={f.password} onChange={s('password')}/></>
 :<><input required type="password" minLength={6} maxLength={72} placeholder="Password" value={f.password} onChange={s('password')}/>{reg&&OTP_REQUIRED&&<><button className="btn" type="button" disabled={busy} onClick={()=>requestOtp('REGISTER')}>{otpSent?'Resend OTP':'Send OTP'}</button><input required inputMode="numeric" maxLength={DEFAULT_OTP_LENGTH} autoComplete="one-time-code" placeholder="OTP" value={f.otp} onChange={s('otp')}/></>}</>}
 {err&&<p className="er">{err}</p>}{notice&&<p className="mut">{notice}</p>}
 <button className="btn d" style={{width:'100%'}} type="submit" disabled={busy}>{busy?'Please wait…':forgot?'Reset password':reg?'Sign up':'Login'}</button>
 {!reg&&!forgot&&<a onClick={()=>{setForgot(true);setOtpSent(false);setF({...f,password:'',otp:''});setErr('')}}>Forgot password?</a>}
 {!forgot&&<><p className="mut">Owner and customers use this same login – your role is detected automatically.</p><a onClick={()=>switchMode(!reg)}>{reg?'Have an account? Login':'New here? Create account'}</a></>}
 {forgot&&<a onClick={()=>switchMode(false)}>Back to login</a>}</form></div>}

function Opts({base,v,set,onGo,label,placingOrder,cfg}){const threshold=Number(cfg?.['delivery.free_threshold']??500),fee=Number(cfg?.['delivery.fee']??50),t=base+(v.pickup&&base<threshold?fee:0);
 return <div><label style={{color:'inherit'}}><input type="checkbox" style={{width:'auto'}} checked={v.pickup} onChange={e=>set({...v,pickup:e.target.checked})}/> Pickup &amp; delivery (free above ₹{threshold}, else ₹{fee})</label>
 <label htmlFor="order-address">{v.pickup?'Pickup / delivery address':'Drop-off address'} (required)</label>
 <textarea id="order-address" rows={2} required minLength={5} maxLength={500} placeholder="House / shop, street, area, city and PIN code" value={v.address} onChange={e=>set({...v,address:e.target.value})}/>
 <div className="pm"><label className={v.mode==='ONLINE'?'on':''}><input type="radio" checked={v.mode==='ONLINE'} onChange={()=>set({...v,mode:'ONLINE'})}/>Pay now · ₹{t} (Google Pay / UPI)</label>
 <label className={v.mode==='PAY_ON_DELIVERY'?'on':''}><input type="radio" checked={v.mode==='PAY_ON_DELIVERY'} onChange={()=>set({...v,mode:'PAY_ON_DELIVERY'})}/>Pay on delivery · ₹{t}</label></div>
 {v.address.trim().length<5&&<small className="er">Enter an address of at least 5 characters.</small>}
 <button className="btn d" style={{width:'100%'}} disabled={!base||v.address.trim().length<5||placingOrder} onClick={onGo}>{placingOrder?'Placing order…':`${label} · ₹${t}`}</button></div>}

function Book({kind,place,placingOrder,toast}){const L=SV[kind],[s,setS]=useState(L[0][0]),[d,setD]=useState(''),[images,setImages]=useState([]),[v,setV]=useState({pickup:true,address:''});
 const chooseImages=event=>{const files=Array.from(event.target.files||[]),max=kind==='REPAIR'?3:5;
  if(files.length>max||files.some(file=>file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){toast(`Choose up to ${max} JPG, PNG, or WebP images, no larger than 5 MB each.`);event.target.value='';setImages([]);return}
  setImages(files)};
 return <div className="sec"><h2>{kind==='REPAIR'?'🔧 Shoe repair & leather care':'👞 Custom footwear'}</h2><label>Service</label>
 <select value={s} onChange={e=>setS(e.target.value)}>{L.map(([n,p])=><option key={n} value={n}>{n} – from ₹{p}</option>)}</select><label>Details</label>
 <textarea rows={3} value={d} onChange={e=>setD(e.target.value)} placeholder={kind==='REPAIR'?'Describe the damage':'Colour, size, design idea'}/>
 {(kind==='CUSTOM'||kind==='REPAIR')&&<><label>{kind==='REPAIR'?'Repair photos (up to 3 JPG, PNG, or WebP images, 5 MB each)':'Reference photos (up to 5 JPG, PNG, or WebP images, 5 MB each)'}</label><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages}/>{images.length>0&&<p className="mut">{images.length} image(s) will be saved with your order{kind==='REPAIR'?' and attached to the owner’s email':''}.</p>}</>}
 <label style={{color:'inherit'}}><input type="checkbox" style={{width:'auto'}} checked={v.pickup} onChange={e=>setV({...v,pickup:e.target.checked})}/> Pickup &amp; delivery</label>
 <label htmlFor="service-address">{v.pickup?'Pickup / delivery address':'Drop-off address'} (required)</label>
 <textarea id="service-address" rows={2} required minLength={5} maxLength={500} placeholder="House / shop, street, area, city and PIN code" value={v.address} onChange={e=>setV({...v,address:e.target.value})}/>
 {v.address.trim().length<5&&<small className="er">Enter an address of at least 5 characters to request a quote.</small>}
 <button className="btn d" style={{width:'100%'}} disabled={v.address.trim().length<5||placingOrder} onClick={()=>place({type:kind,service:s,description:d,pickup:v.pickup,address:v.address},images)}>{placingOrder?'Submitting request…':'Request owner quote'}</button>
 <p className="mut">No payment is taken when requesting repair or custom work. The owner will inspect your request and send a price for you to accept or decline.</p></div>}

function BulkRepair({place,placingOrder,cfg,toast}){
 const shopName=cfg?.['shop.name']||'Raj Kumar Shoe Repairing',shopAddress=cfg?.['shop.address']||'Bistupur, Jamshedpur';
 const mapQuery=encodeURIComponent(`${shopName}, ${shopAddress}`),mapEmbed=`https://maps.google.com/maps?q=${mapQuery}&output=embed`;
 const mapUrl=import.meta.env.VITE_SHOP_MAPS_URL||`https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
 const[footwearType,setFootwearType]=useState(''),[quantity,setQuantity]=useState(''),[location,setLocation]=useState(''),[details,setDetails]=useState(''),[images,setImages]=useState([]);
 const chooseImages=event=>{const files=Array.from(event.target.files||[]);
  if(files.length>5||files.some(file=>file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){toast('Choose up to 5 JPG, PNG, or WebP images, no larger than 5 MB each.');event.target.value='';setImages([]);return}
  setImages(files)};
 return <div className="bulk-layout"><section className="sec"><h1>🏬 Bulk showroom repairs</h1><p>Request an estimate for repairing a batch of showroom footwear. The owner will review the details and photos, then send a quote for your approval.</p>
 <label>Footwear type / material</label><input required minLength={2} maxLength={255} value={footwearType} onChange={e=>setFootwearType(e.target.value)} placeholder="e.g. men’s leather formal shoes"/>
 <label>Estimated quantity (pairs)</label><input required type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="e.g. 120"/>
 <label>Showroom / pickup address (required)</label><textarea rows={2} minLength={5} maxLength={500} required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Shop name, street, area, city and PIN code"/>
 <label>Repair requirements</label><textarea rows={3} maxLength={700} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Describe the damage and repair requested"/>
 <label>Footwear photos (up to 5 JPG, PNG, or WebP images, 5 MB each)</label><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages}/>
 {images.length>0&&<p className="mut">{images.length} photo(s) will be sent with the request.</p>}
 <button className="btn d" disabled={footwearType.trim().length<2||!Number.isInteger(+quantity)||+quantity<1||+quantity>100000||location.trim().length<5||details.length>700||placingOrder} onClick={()=>place({type:'BULK_REPAIR',footwearType:footwearType.trim(),estimatedQuantity:+quantity,showroomLocation:location,description:details,pickup:true,address:location},images)}>{placingOrder?'Submitting request…':'Request bulk quote'}</button></section>
 <section className="sec"><h2>Shop location &amp; customer reviews</h2><p className="mut">Find {shopName} at {shopAddress}. Open the Google Maps listing to view its location and customer reviews.</p>
 <iframe className="shop-map" title={`${shopName} map`} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
 <a className="btn o" href={mapUrl} target="_blank" rel="noreferrer">📍 View shop and reviews on Google Maps</a>
 <p className="mut">Google Maps listing link can be customized with VITE_SHOP_MAPS_URL once the exact Business Profile is provided.</p></section></div>}

const CATEGORIES=[['All','🛍️'],['Soles','👟'],['Adhesives','🧴'],['Heels','👠'],['Insoles','🦶'],['Polish','✨'],['Leather','🟫'],['Tools','🧵']];

const categoryIcon=name=>CATEGORIES.find(([category])=>category===name)?.[1]||'🧰';

function ProductCard({product,admin,add,onDetail}){return <article className="pc">
 <button className="pi" onClick={()=>onDetail(product)} aria-label={`View ${product.name}`}>
 {product.imageUrl?<img src={productImageUrl(product)} alt={product.name}/>:<span>{product.emoji||'📦'}</span>}{disc(product)>0&&<em>{disc(product)}% off</em>}
 </button><div className="pb"><h3>{product.name}</h3><span className="rt">{product.category}</span>
 <div className="pr"><b>₹{product.price}</b>{product.mrp>product.price&&<s>₹{product.mrp}</s>}
 {disc(product)>0&&<span>{disc(product)}% off</span>}</div>
 <small className="mut">{product.stock>0?`${product.stock} in stock`:'Out of stock'}</small>
 {!admin&&<button className="btn" disabled={product.stock<1} onClick={()=>add(product.id)}>Add to cart</button>}</div></article>}

function Shop({prods,add,admin,search,category,setCategory,onDetail,cfg}){const[minPrice,setMinPrice]=useState(''),[maxPrice,setMaxPrice]=useState(''),[sort,setSort]=useState('p'),[inStockOnly,setInStockOnly]=useState(false);
 const freeThreshold=Number(cfg?.['delivery.free_threshold']??500),deliveryFee=Number(cfg?.['delivery.fee']??50);
 const cats=['All',...new Set(prods.map(p=>p.category).filter(Boolean))];
 const list=prods.filter(p=>(category==='All'||p.category===category)&&(!minPrice||p.price>=Number(minPrice))&&(!maxPrice||p.price<=Number(maxPrice))&&(!inStockOnly||p.stock>0)&&p.name.toLowerCase().includes(search.toLowerCase()));
 list.sort((a,b)=>sort==='l'?a.price-b.price:sort==='h'?b.price-a.price:sort==='d'?disc(b)-disc(a):sort==='n'?a.name.localeCompare(b.name):b.stock-a.stock);
 return <div className="shop"><aside className="sec fl"><h3>Filters</h3>
 <label htmlFor="filter-min-price">Minimum price (₹)</label><input id="filter-min-price" type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Any"/>
 <label htmlFor="filter-max-price">Maximum price (₹)</label><input id="filter-max-price" type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any"/>
 <label>Sort by</label><select value={sort} onChange={e=>setSort(e.target.value)}><option value="p">In-stock first</option><option value="l">Price: low to high</option><option value="h">Price: high to low</option><option value="d">Discount</option><option value="n">Name</option></select>
 <label className="stock-filter"><input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)}/> Show in-stock only</label>
 <button className="chip" onClick={()=>{setMinPrice('');setMaxPrice('');setSort('p');setInStockOnly(false);setCategory('All')}}>Clear filters</button>
 <p className="mut">Pickup and delivery are free above ₹{freeThreshold}; otherwise ₹{deliveryFee}.</p></aside>
 <div className="shop-results"><div className="chips">{cats.map(x=><button key={x} className={'chip'+(x===category?' on':'')} onClick={()=>setCategory(x)}>{x}</button>)}</div>
 <section className="sec results"><h2>{list.length} {category==='All'?'materials':category}</h2>
 <div className="g">{list.map(p=><ProductCard key={p.id} product={p} admin={admin} add={add} onDetail={onDetail}/>)}</div>
 {!list.length&&<p className="mut">No materials found. Try another category or search.</p>}</section></div></div>}

function Cart({prods,cart,setQty,place,close,placingOrder,cfg}){const[v,setV]=useState({pickup:true,address:'',mode:'ONLINE'});
 const L=Object.entries(cart).map(([id,q])=>({p:prods.find(x=>x.id==id),q})).filter(x=>x.p),base=L.reduce((a,x)=>a+x.p.price*x.q,0);
 return <div className="ov" onClick={close}><div className="dr" onClick={e=>e.stopPropagation()}><h2>🛒 Your cart</h2>
 {L.length?L.map(({p,q})=><div className="row" key={p.id}><span>{p.emoji} {p.name}</span><span><button className="chip" onClick={()=>setQty(p.id,q-1)}>−</button> {q} <button className="chip" onClick={()=>setQty(p.id,q+1)}>+</button> ₹{p.price*q}</span></div>):<p className="mut">Cart is empty</p>}
 {L.length>0&&<Opts base={base} v={v} set={setV} cfg={cfg} label="Place order" placingOrder={placingOrder} onGo={()=>place({type:'MATERIAL',items:L.map(x=>({productId:x.p.id,qty:x.q})),paymentMode:v.mode,pickup:v.pickup,address:v.address})}/>}</div></div>}

function Pay({o,cfg,done,close}){const[utr,setUtr]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const params=new URLSearchParams({pa:cfg.upi_id||'',pn:cfg.payee_name||'Raj Kumar Shoe Repairing',am:(o.total/1).toFixed(2),cu:'INR',tn:o.orderNo});
 const upiLink=`upi://pay?${params.toString()}`,gpayLink=`tez://upi/pay?${params.toString()}`;
 const submit=async()=>{setBusy(true);setErr('');try{await api(`/orders/${o.id}/payment`,'POST',{utr});done()}catch(e){setErr(e.message);setBusy(false)}};
 return <div className="ov" onClick={close}><div className="md" onClick={e=>e.stopPropagation()}><h2>Pay ₹{o.total} with Google Pay</h2>
 <p className="mut">Order {o.orderNo} · Pay the full amount. The owner will verify the UPI reference before confirming your order.</p>
 {!cfg.upi_id&&<p className="er">The shop’s UPI ID is not configured yet. Please contact the owner.</p>}
 {cfg.upi_id&&<><div className="qr"><QRCodeSVG value={upiLink} size={200}/></div><a className="btn d" href={gpayLink}>Open Google Pay</a> <a className="btn o" href={upiLink}>Open another UPI app</a>
 <p className="mut">After paying ₹{o.total}, enter the UPI transaction reference (UTR) from Google Pay below.</p>
 <input placeholder="UPI transaction reference (UTR)" value={utr} onChange={e=>setUtr(e.target.value)} maxLength={22}/></>}
 {err&&<p className="er">{err}</p>}
 <button className="btn d" style={{width:'100%'}} disabled={!cfg.upi_id||busy||utr.trim().length<8} onClick={submit}>{busy?'Submitting…':'I have paid · Submit UTR'}</button>
 <p className="mut">Never submit payment details until your UPI app shows the payment as successful.</p><a onClick={close}>Close</a></div></div>}

function OrderProgress({status}){
 if(status==='CANCELLED')return <div className="order-progress declined-progress" role="status"><strong>Order cancelled</strong><span>Contact the shop if you need help.</span></div>;
 if(status==='DECLINED')return <div className="order-progress declined-progress" role="status"><strong>Request declined</strong><span>Please contact the shop if you need help.</span></div>;
 const index=Math.max(0,ORDER_STEPS.findIndex(([step])=>step===status));
 return <section className="order-progress" aria-label="Order tracking"><strong>📍 Track order</strong><ol>{ORDER_STEPS.map(([step,label],position)=><li key={step} className={position<index?'complete':position===index?'current':''} aria-current={position===index?'step':undefined}><span className="progress-dot">{position<index?'✓':position+1}</span><span>{label}</span></li>)}</ol></section>;
}

function MyOrders({pay,toast,openFeedback}){const[L,setL]=useState([]);const reload=()=>api('/orders').then(setL).catch(e=>toast(e.message));useEffect(()=>{reload();const t=setInterval(reload,10000);return()=>clearInterval(t)},[]);
 const cancelOrder=async order=>{if(!window.confirm(`Cancel order ${order.orderNo}?`))return;const reason=window.prompt('Optional cancellation reason (300 characters max):')||'';if(reason.length>300)return toast('Cancellation reason must be 300 characters or fewer.');try{await api(`/orders/${order.id}/cancel`,'POST',{reason});await reload();toast(`Order ${order.orderNo} cancelled.`)}catch(e){toast(e.message)}};
 const quoteResponse=async(o,accepted)=>{try{await api(`/orders/${o.id}/quote-response`,'POST',{accepted});await reload();toast(accepted?'Quote accepted. Amount is due on delivery.':'Quote declined.')}catch(e){toast(e.message)}};
 return <div className="sec customer-orders"><h2>📦 My orders</h2><p className="mut">Follow each request, review owner quotes, and see your payment and delivery progress here.</p>{L.map(o=><article className="customer-order-card" key={o.id}>
  <div className="booking-head"><div><small className="booking-kind">{o.type.replace('_',' ')}</small><h3>{o.orderNo}</h3></div><span className="bd2">{o.status.replaceAll('_',' ')}</span></div>
  <p>{o.description}</p>{o.address&&<p><b>{o.type==='BULK_REPAIR'?'Showroom address':'Service address'}:</b> {o.address}</p>}{o.footwearType&&<p><b>Bulk request:</b> {o.footwearType} · about {o.estimatedQuantity} pairs</p>}
  <div className="customer-order-meta"><span>Payment: {o.paymentStatus==='PAY_ON_DELIVERY'?'Due on delivery':o.paymentStatus.replaceAll('_',' ')}</span>{o.total>0&&<span>Total ₹{o.total}</span>}</div>
  <OrderProgress status={o.status}/>
  {o.status==='DELIVERED'&&<button className="btn o" onClick={()=>openFeedback?.(o.id)}>⭐ Leave a rating &amp; review</button>}
  {o.adminNote&&<p className="quote-note">{o.adminNote}</p>}
  {o.paymentStatus==='AWAITING_CUSTOMER_ACCEPTANCE'&&<div className="quote-panel"><div><small>Owner’s quote</small><strong>₹{o.total}</strong><p className="mut">Accept to confirm the work. Payment is due on delivery.</p></div><div className="acts"><button className="btn d" onClick={()=>quoteResponse(o,true)}>Accept quote</button><button className="btn o" onClick={()=>quoteResponse(o,false)}>Decline</button></div></div>}
  {o.paymentMode==='ONLINE'&&o.paymentStatus==='PENDING'&&o.status==='PLACED'&&<button className="btn" onClick={()=>pay(o)}>Pay ₹{o.total} · Google Pay</button>}
  {['PLACED','CONFIRMED'].includes(o.status)&&<button className="btn o" onClick={()=>cancelOrder(o)}>Cancel order</button>}
 </article>)}{!L.length&&<p className="mut">No orders yet.</p>}</div>}

function FeedbackForm({orderId,onBack,toast,onSubmitted}){
 const[order,setOrder]=useState(null),[rating,setRating]=useState(5),[review,setReview]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;setLoading(true);api(`/feedback/status/${orderId}`).then(result=>{if(active)setOrder(result)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false}},[orderId]);
 const submit=async event=>{event.preventDefault();setError('');if(review.trim().length<5||review.trim().length>1000)return setError('Please write between 5 and 1000 characters.');
  setSaving(true);try{await api(`/feedback/${orderId}`,'POST',{rating,review:review.trim()});onSubmitted?.();setOrder(current=>({...current,submitted:true}));setReview('');toast('Thank you for sharing your feedback!')}catch(e){setError(e.message)}finally{setSaving(false)}};
 if(loading)return <section className="sec"><p className="mut">Checking delivered order…</p></section>;
 if(error&&!order)return <section className="sec"><h2>⭐ Your feedback</h2><p className="er">{error}</p><button className="btn o" onClick={onBack}>Back to orders</button></section>;
 return <section className="sec feedback-form"><h2>⭐ How did we do?</h2><p className="mut">Your feedback helps us keep improving. Reviews are visible to the shop owner.</p>
  {order?.orderNo&&<p><b>Delivered order:</b> {order.orderNo}</p>}
  {order?.orderStatus!=='DELIVERED'?<p className="er">Feedback is available after this order has been delivered.</p>
   :order.submitted?<div className="feedback-thanks" role="status"><strong>Thank you for your feedback!</strong><p>Your rating has been received. You can’t submit another review for this order.</p></div>
   :<form onSubmit={submit}><fieldset className="rating-field"><legend>Your rating</legend><div className="rating-stars">{[1,2,3,4,5].map(value=><label key={value} aria-label={`${value} star${value===1?'':'s'}`}><input type="radio" name="feedback-rating" value={value} checked={rating===value} onChange={()=>setRating(value)}/><span aria-hidden="true">{value<=rating?'★':'☆'}</span></label>)}</div></fieldset>
    <label htmlFor="customer-review">Your review</label><textarea id="customer-review" required minLength={5} maxLength={1000} rows={5} value={review} onChange={e=>setReview(e.target.value)} placeholder="Tell us about your experience…"/>
    <small className="mut">{review.trim().length}/1000 characters</small>{error&&<p className="er">{error}</p>}
    <div className="acts"><button className="btn d" type="submit" disabled={saving||review.trim().length<5}>{saving?'Submitting…':'Submit feedback'}</button><button className="btn o" type="button" onClick={onBack}>Back to orders</button></div>
   </form>}
 </section>;
}

function Admin({cfg,reload,toast}){const productFormRef=useRef(null),[t,setT]=useState('orders'),[O,setO]=useState([]),[P,setP]=useState([]),[reviews,setReviews]=useState([]),[c,setC]=useState(cfg),[orderImages,setOrderImages]=useState({}),[quoteDrafts,setQuoteDrafts]=useState({}),[staticKey,setStaticKey]=useState(''),[staticValue,setStaticValue]=useState(''),
 [f,setF]=useState({name:'',category:'Soles',price:'',mrp:'',emoji:'📦',description:'',stock:10,active:true}),[editingProductId,setEditingProductId]=useState(null),[removeProductImage,setRemoveProductImage]=useState(false),[productImage,setProductImage]=useState(null),[imagePreview,setImagePreview]=useState(''),[savingProduct,setSavingProduct]=useState(false);
 const lo=()=>{api('/admin/orders').then(setO).catch(()=>{});api('/admin/products').then(setP).catch(()=>{})};
 useEffect(()=>{lo();const i=setInterval(lo,10000);return()=>clearInterval(i)},[]);useEffect(()=>setC(cfg),[cfg]);
 useEffect(()=>{if(t==='reviews')api('/admin/feedback').then(setReviews).catch(e=>toast(e.message))},[t]);
 useEffect(()=>{if(!productImage){setImagePreview('');return}const url=URL.createObjectURL(productImage);setImagePreview(url);return()=>URL.revokeObjectURL(url)},[productImage]);
 const act=async(p,b,m='POST')=>{try{await api(p,m,b);lo();reload()}catch(e){toast(e.message)}};
 const decide=(o,a)=>act(`/admin/orders/${o.id}/decision`,{approve:a,note:a?'':(prompt('Reason for declining (optional)')||'')});
 const cancelOrder=async o=>{if(!window.confirm(`Cancel order ${o.orderNo} for ${o.userName}?`))return;const reason=window.prompt('Reason for cancelling this customer order (optional):')||'';if(reason.length>300)return toast('Cancellation reason must be 300 characters or fewer.');await act(`/admin/orders/${o.id}/cancel`,{reason})};
 const customerWhatsApp=o=>{const digits=(o.userPhone||'').replace(/\D/g,'');const countryCode=(import.meta.env.VITE_WHATSAPP_COUNTRY_CODE||'91').replace(/\D/g,'');const phone=digits.length===10?countryCode+digits:digits;const text=`Hello ${o.userName}, we need to discuss an update to your ${o.type.replaceAll('_',' ')} order ${o.orderNo} for ${o.description}. Please reply here so we can help.`;return phone?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:''};
 const sendQuote=async o=>{const draft=quoteDrafts[o.id]||{},amount=Number(draft.amount);if(!Number.isSafeInteger(amount)||amount<1)return toast('Enter a valid whole-rupee quote.');if((draft.note||'').length>300)return toast('Quote note must be 300 characters or fewer.');try{await api(`/admin/orders/${o.id}/quote`,'POST',{amount,note:draft.note||''});lo();toast(`Quote sent to ${o.userName}.`)}catch(e){toast(e.message)}};
 const showImages=async id=>{try{if(orderImages[id]){setOrderImages({...orderImages,[id]:null});return}setOrderImages({...orderImages,[id]:await api(`/admin/orders/${id}/images`)})}catch(e){toast(e.message)}};
 const sf=k=>e=>setF({...f,[k]:e.target.value});
 const staticEntries=Object.entries(c).filter(([key])=>/^(shop|delivery|rate-limit|service)\./.test(key)).sort(([a],[b])=>a.localeCompare(b));
 const saveStaticData=async()=>{try{const saved=await api('/admin/staticdata','PUT',Object.fromEntries(staticEntries));setC(current=>({...current,...saved}));reload();toast('Store configuration saved')}catch(e){toast(e.message)}};
 const savePaymentSettings=async()=>{const upi=(c.upi_id||'').trim(),payee=(c.payee_name||'').trim();
  if(upi&&!/^[A-Za-z0-9._-]{2,100}@[A-Za-z0-9]{2,30}$/.test(upi))return toast('Enter a valid UPI ID, such as shopname@bank.');
  if(payee.length>100)return toast('Payee name must be 100 characters or fewer.');
  try{await api('/admin/settings','PUT',{...c,upi_id:upi,payee_name:payee});reload();toast('UPI settings saved')}catch(e){toast(e.message)}};
 const resetProduct=()=>{setF({name:'',category:'Soles',price:'',mrp:'',emoji:'📦',description:'',stock:10,active:true});setEditingProductId(null);setRemoveProductImage(false);setProductImage(null)};
 const editProduct=p=>{setEditingProductId(p.id);setF({name:p.name,category:p.category,price:String(p.price),mrp:String(p.mrp),emoji:p.emoji||'📦',description:p.description||'',stock:p.stock,active:p.active});setProductImage(null);setRemoveProductImage(false);requestAnimationFrame(()=>productFormRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))};
 const saveProduct=async()=>{const price=Number(f.price),mrp=Number(f.mrp||f.price),stock=Number(f.stock);
  if(f.name.trim().length<2||f.name.trim().length>255)return toast('Product name must be 2–255 characters.');
  if(!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(mrp)||mrp<price||!Number.isSafeInteger(stock)||stock<0)return toast('Enter a valid price, MRP (at least the price), and non-negative whole-number stock.');
  if(f.description.length>500)return toast('Description must be 500 characters or fewer.');
  const body={...f,name:f.name.trim(),price,mrp,stock};const form=new FormData();form.append('product',new Blob([JSON.stringify(body)],{type:'application/json'}));if(productImage)form.append('image',productImage);if(removeProductImage)form.append('removeImage','true');
  setSavingProduct(true);try{await api(editingProductId?`/admin/products/${editingProductId}`:'/admin/products',editingProductId?'PUT':'POST',form);resetProduct();lo();reload();toast(editingProductId?'Product updated':'Product added')}catch(e){toast(e.message)}finally{setSavingProduct(false)}};
 const previewProduct=P.find(product=>product.id===editingProductId);
 const previewUrl=productImage?imagePreview:(previewProduct?.imageUrl&&!removeProductImage?productImageUrl(previewProduct):'');
 return <div className="sec"><h2>⚙️ Owner dashboard</h2><div className="chips">{[['orders','Orders & payments'],['products','Products'],['reviews','Ratings & reviews'],['settings','Settings']].map(([k,l])=><button key={k} className={'chip'+(t===k?' on':'')} onClick={()=>setT(k)}>{l}</button>)}</div>
 {t==='reviews'&&<section className="owner-reviews"><h3>Customer ratings &amp; reviews</h3>{reviews.length>0&&<p className="review-summary">⭐ {(reviews.reduce((total,item)=>total+item.rating,0)/reviews.length).toFixed(1)} average · {reviews.length} review{reviews.length===1?'':'s'}</p>}
 {reviews.map(item=><article className="owner-review-card" key={item.id}><div className="booking-head"><div><b>{item.customerName}</b><small className="booking-kind">{item.orderNo}</small></div><strong className="review-stars-readonly" aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</strong></div><p>{item.review}</p><small className="mut">{new Date(item.createdAt).toLocaleString()}</small></article>)}
 {!reviews.length&&<p className="mut">No customer reviews yet.</p>}</section>}
 {t==='orders'&&O.map(o=><article className="booking-card" key={o.id}>
  <div className="booking-head"><div><span className="booking-kind">{o.type.replaceAll('_',' ')}</span><h3>{o.orderNo}</h3></div><span className="bd2">{o.status.replaceAll('_',' ')}</span></div>
  <div className="booking-contact"><b>{o.userName}</b><a href={`tel:${o.userPhone}`}>📞 {o.userPhone}</a>{o.userEmail&&<a href={`mailto:${o.userEmail}`}>✉️ {o.userEmail}</a>}{customerWhatsApp(o)&&<a href={customerWhatsApp(o)} target="_blank" rel="noreferrer">💬 Contact customer on WhatsApp</a>}</div>
  <p><b>Request:</b> {o.description}</p>
  {o.footwearType&&<p><b>Bulk details:</b> {o.footwearType} · approx. {o.estimatedQuantity} pairs<br/><b>Showroom:</b> {o.address}</p>}
  <div className="customer-order-meta"><span>{o.pickup?'Pickup requested':'Drop-off'}</span>{o.address&&<span>{o.type==='BULK_REPAIR'?'Showroom':'Service'} address: {o.address}</span>}<span>{o.paymentMode.replaceAll('_',' ')}</span>{o.total>0&&<span>Total ₹{o.total}</span>}</div>
  <div className="booking-status"><span className="bd2 g2">{o.paymentStatus.replaceAll('_',' ')}</span>{o.utr&&<small>UPI reference: {o.utr}</small>}</div>
  {['CUSTOM','REPAIR','BULK_REPAIR'].includes(o.type)&&<div className="booking-photos"><button className="chip" onClick={()=>showImages(o.id)}>📷 {orderImages[o.id]?'Hide':'View'} customer photos</button>{orderImages[o.id]&&<div className="order-images">{orderImages[o.id].map(image=><a key={image.id} href={image.data} target="_blank" rel="noreferrer"><img src={image.data} alt={image.fileName}/></a>)}{!orderImages[o.id].length&&<small>No photos were attached.</small>}</div>}</div>}
  {o.paymentStatus==='QUOTE_PENDING'&&<div className="quote-panel owner-quote"><div><label htmlFor={`quote-${o.id}`}>Your quote (₹)</label><input id={`quote-${o.id}`} type="number" min="1" max="10000000" value={quoteDrafts[o.id]?.amount||''} onChange={e=>setQuoteDrafts({...quoteDrafts,[o.id]:{...quoteDrafts[o.id],amount:e.target.value}})} placeholder="Enter reviewed price"/><label htmlFor={`note-${o.id}`}>Note for customer (optional)</label><input id={`note-${o.id}`} maxLength="300" value={quoteDrafts[o.id]?.note||''} onChange={e=>setQuoteDrafts({...quoteDrafts,[o.id]:{...quoteDrafts[o.id],note:e.target.value}})} placeholder="Explain the repair or quote"/></div><div className="acts"><button className="btn d" onClick={()=>sendQuote(o)}>Accept request &amp; send quote</button><button className="btn o" onClick={()=>decide(o,false)}>Decline request</button></div></div>}
  {o.status==='PLACED'&&o.paymentStatus!=='QUOTE_PENDING'&&o.paymentStatus!=='AWAITING_CUSTOMER_ACCEPTANCE'&&<div className="acts"><button className="btn" disabled={o.paymentMode==='ONLINE'&&o.paymentStatus!=='AWAITING_VERIFICATION'} onClick={()=>decide(o,true)}>✅ Approve booking</button><button className="btn o" onClick={()=>decide(o,false)}>Decline</button></div>}
  {o.paymentStatus==='AWAITING_CUSTOMER_ACCEPTANCE'&&<p className="quote-note">Quote sent: ₹{o.total}. Waiting for {o.userName} to accept or decline.</p>}
  {o.paymentStatus==='REFUND_PENDING'&&<button className="btn" onClick={()=>act(`/admin/orders/${o.id}/refunded`)}>Mark ₹{o.paidAmount} refunded</button>}
  {!['DELIVERED','DECLINED','CANCELLED'].includes(o.status)&&<button className="btn o" onClick={()=>cancelOrder(o)}>Cancel order</button>}
  {['CONFIRMED',...ST.slice(0,3)].includes(o.status)&&<select value="" onChange={e=>e.target.value&&act(`/admin/orders/${o.id}/status`,{status:e.target.value})}><option value="">Update status…</option>{ST.map(s=><option key={s}>{s}</option>)}</select>}
 </article>)}
 {t==='orders'&&!O.length&&<p className="mut">No orders yet.</p>}
 {t==='products'&&<><div className="product-edit-form" ref={productFormRef}><h3>{editingProductId?'Edit material':'Add material'}</h3><div className="g"><div><label>Name (required)</label><input required minLength={2} maxLength={255} value={f.name} onChange={sf('name')}/><label>Store section (required)</label><select required value={f.category} onChange={sf('category')}>{CATEGORIES.filter(([name])=>name!=='All').map(([name])=><option key={name} value={name}>{name}</option>)}<option value="Other">Other</option></select><label>Emoji fallback</label><input maxLength={16} value={f.emoji} onChange={sf('emoji')}/></div>
 <div><label>Price ₹ (required)</label><input required type="number" min="0" step="1" value={f.price} onChange={sf('price')}/><label>MRP ₹ (required)</label><input required type="number" min={f.price||0} step="1" value={f.mrp} onChange={sf('mrp')}/><label>Stock quantity (required)</label><input required type="number" min="0" step="1" value={f.stock} onChange={sf('stock')}/><label className="stock-filter"><input type="checkbox" checked={Number(f.stock)===0} onChange={e=>setF({...f,stock:e.target.checked?'0':'10'})}/> Mark out of stock</label></div></div>
 <label className="stock-filter"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Visible in storefront</label>
 <label>Description (optional)</label><input maxLength={500} value={f.description} onChange={sf('description')}/>
 <label>Product photo (JPG, PNG, or WebP; up to 5 MB)</label><input key={editingProductId||'new-product'} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file&&(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){toast('Choose a JPG, PNG, or WebP image no larger than 5 MB.');e.target.value='';setProductImage(null);return}setProductImage(file||null);if(file)setRemoveProductImage(false)}}/>
 {previewUrl&&<img className="product-upload-preview" src={previewUrl} alt="Product photo preview"/>}
 {editingProductId&&previewProduct?.imageUrl&&!productImage&&<label className="stock-filter"><input type="checkbox" checked={removeProductImage} onChange={e=>setRemoveProductImage(e.target.checked)}/> Remove current photo</label>}
 <div className="acts"><button className="btn d" disabled={savingProduct} onClick={saveProduct}>{savingProduct?'Saving…':editingProductId?'Save material':'Add material'}</button>{editingProductId&&<button className="btn o" disabled={savingProduct} onClick={resetProduct}>Cancel edit</button>}</div></div>
 {P.map(p=><div className="row admin-product-row" key={p.id}><span className="admin-product"><span className="admin-product-image">{p.imageUrl?<img src={productImageUrl(p)} alt=""/>:p.emoji}</span><span><b>{p.name}</b><small className="mut admin-product-meta">{p.category} · ₹{p.price} · {p.stock>0?`${p.stock} in stock`:'Out of stock'} · {p.active?'Visible':'Hidden'}</small></span></span><span className="acts stock-actions">
 <button className="chip" onClick={()=>editProduct(p)}>Edit all details</button>
 <button className="chip" onClick={()=>confirm('Hide this material from the storefront?')&&act('/admin/products/'+p.id,undefined,'DELETE')}>Hide</button></span></div>)}</>}
 {t==='settings'&&<><h3>Store configuration · Oracle rk_staticdata</h3><p className="mut">Update shop details, delivery charges, service constants, and per-minute API rate limits. Limits apply per client IP and take effect immediately.</p>
 <div className="static-data-fields">{staticEntries.map(([key,value])=><label key={key}>{key}<input value={value} maxLength={1000} onChange={e=>setC({...c,[key]:e.target.value})}/></label>)}</div>
 <div className="static-data-add"><input aria-label="New configuration key" placeholder="e.g. shop.tagline" value={staticKey} onChange={e=>setStaticKey(e.target.value)}/><input aria-label="New configuration value" placeholder="Value" value={staticValue} onChange={e=>setStaticValue(e.target.value)}/><button className="chip" onClick={()=>{if(!/^(shop|delivery|rate-limit|service)\.[a-z0-9._-]{1,80}$/.test(staticKey)||!staticValue.trim())return toast('Enter a valid configuration key and value.');setC({...c,[staticKey]:staticValue});setStaticKey('');setStaticValue('')}}>Add setting</button></div>
 <button className="btn d" onClick={saveStaticData}>Save store configuration</button>
 <h3>Google Pay / UPI settings</h3><label>UPI ID used for Google Pay payments</label><input maxLength={131} value={c.upi_id||''} onChange={e=>setC({...c,upi_id:e.target.value})}/><label>Payee name</label><input maxLength={100} value={c.payee_name||''} onChange={e=>setC({...c,payee_name:e.target.value})}/><button className="btn d" onClick={savePaymentSettings}>Save UPI settings</button><h3>Order notifications</h3><p className="mut">Configure SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, ORDER_NOTIFICATION_EMAIL and WhatsApp Cloud API credentials on the backend for optional email and WhatsApp alerts.</p></>}</div>}

export {SV,ST,disc,tot,SHOP_MAPS_URL,SHOP_MAP_EMBED,storedUser,Login,Opts,Book,BulkRepair,CATEGORIES,categoryIcon,ProductCard,Shop,Cart,Pay,MyOrders,Admin};



export function PageContent({tab,slides,slide,setSlide,setTab,goShop,prods,admin,addProduct,setDetail,category,setCategory,search,place,placingOrder,user,setPay,toast,setLogin,cfg,reload,feedbackOrderId,onOpenFeedback,onFeedbackBack}) {
 const freeThreshold=Number(cfg?.['delivery.free_threshold']??500),deliveryFee=Number(cfg?.['delivery.fee']??50);
 return <main>
 {tab==='home'&&<div className="view on">
 <section className="car" aria-label="Featured offers">{slides.map((item,index)=><div key={item.title} className={`sl${slide===index?' on':''}`} style={{background:item.background}}>
 <h1>{item.title}</h1><p>{item.text}</p><button className="btn" onClick={()=>setTab(item.tab)}>{item.action}</button><span className="slide-art" aria-hidden="true">{item.icon}</span></div>)}
 <div className="slide-dots">{slides.map((item,index)=><button key={item.title} className={slide===index?'on':''} onClick={()=>setSlide(index)} aria-label={`Show offer ${index+1}`}/>)}</div></section>
 <section className="sec"><h2>Our services</h2><div className="g services">
 {[['🔧','Shoe repair','Request an inspection and owner quote','repair'],['🧥','Leather care','Jackets, belts, bags','repair'],['👞','Custom shoes','Request a made-to-order quote','custom'],['🏬','Bulk for showrooms','Get a quote for batch footwear repairs','bulk'],['🧰','Shoe materials','Soles, glue, threads & more','materials'],['🚚','Free pickup',`On orders above ₹${freeThreshold}`,'repair']].map(([icon,title,description,destination])=><button className="sv" key={title} onClick={()=>destination==='materials'?goShop():setTab(destination)}><span>{icon}</span><h3>{title}</h3><p>{description}</p></button>)}</div></section>
 <section className="sec"><h2>Top deals on materials <button className="view-all" onClick={()=>goShop()}>View all ›</button></h2>
 <div className="g">{prods.slice(0,4).map(product=><ProductCard key={product.id} product={product} admin={admin} add={addProduct} onDetail={setDetail}/>)}</div>
 {!prods.length&&<p className="mut">Materials will appear here when they are available.</p>}</section>
 <section className="sec"><h2>Why customers trust us</h2><div className="trust-grid">{[['⭐','Craftsmanship','Careful shoe and leather repairs'],['🔒','Google Pay / UPI','Secure UPI payments for material orders'],['🔔','Order updates','See payment and repair progress'],['🤝','Local service','Serving Bistupur, Jamshedpur']].map(([icon,title,description])=><div className="trust-item" key={title}><b>{icon} {title}</b><p>{description}</p></div>)}</div></section>
 </div>}
 {tab==='materials'&&<div className="view on"><h1 className="page-title">Shoe materials</h1><Shop prods={prods} add={addProduct} admin={admin} search={search} category={category} setCategory={setCategory} onDetail={setDetail} cfg={cfg}/></div>}
 {tab==='repair'&&<div className="view on"><div className="two"><Book kind="REPAIR" place={place} placingOrder={placingOrder} toast={toast}/><section className="sec"><h2>Track your order</h2>
 {user&&!admin?<MyOrders pay={setPay} toast={toast} openFeedback={onOpenFeedback}/>:<><p>Sign in to view your live repair and delivery updates.</p><button className="btn" onClick={()=>user?setTab('orders'):setLogin(true)}>View my orders</button></>}
 <h3>Typical pricing</h3><p className="mut">Polish ₹80 · Stitching ₹150 · Sticking ₹200 · Sole replacement ₹350 · Jacket polish ₹450</p>
 <p className="mut">Free pickup and delivery on orders above ₹{freeThreshold} in {cfg?.['shop.address']||'Jamshedpur'}.</p></section></div></div>}
 {tab==='custom'&&<div className="view on"><section className="sec"><h1>Custom-made footwear</h1><div className="g custom-types">{[['💍','Wedding shoes','Handcrafted for your big day'],['♿','Orthopedic footwear','Made for your fit and comfort'],['🐾','Special designs','Tell us your idea'],['✏️','Your own design','Share colour and materials']].map(([icon,title,description])=><div className="sv" key={title}><span>{icon}</span><h3>{title}</h3><p>{description}</p></div>)}</div></section><Book kind="CUSTOM" place={place} placingOrder={placingOrder} toast={toast}/></div>}
 {tab==='bulk'&&<div className="view on"><BulkRepair place={place} placingOrder={placingOrder} cfg={cfg} toast={toast}/></div>}
 {tab==='orders'&&(user&&!admin?<MyOrders pay={setPay} toast={toast} openFeedback={onOpenFeedback}/>:<div className="sec">Please login as a customer to see orders. <button className="btn" onClick={()=>setLogin(true)}>Login</button></div>)}
 {tab==='feedback'&&(user&&!admin&&feedbackOrderId?<FeedbackForm orderId={feedbackOrderId} onBack={onFeedbackBack} toast={toast}/>:<div className="sec"><p>Please sign in as the customer who placed the delivered order to leave feedback.</p><button className="btn" onClick={()=>setLogin(true)}>Login</button></div>)}
 {tab==='admin'&&admin&&<div className="view on"><Admin cfg={cfg} reload={reload} toast={toast}/></div>}
 </main>;
}
