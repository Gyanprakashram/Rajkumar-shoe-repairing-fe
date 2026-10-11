import {useState,useEffect,useRef} from 'react';

import {api,clearSession,isSessionIdle} from './api';
import {DEFAULT_OTP_LENGTH,OTP_REQUIRED} from './utils/constants';

const SV={REPAIR:[["Polish & clean",80],["Stitching",150],["Sticking / glue",200],["Sole replacement",350],["Leather jacket polish",450],["Leather belt (made to order)",250]],
CUSTOM:[["Wedding shoes",2500],["Orthopedic / handicapped shoes",1800],["Animal-design shoes",2000],["Own design",1500]]};

const ST=["IN_PROGRESS","READY","OUT_FOR_DELIVERY","DELIVERED"];
const ORDER_STEPS=[["PLACED","Order received"],["CONFIRMED","Confirmed"],["IN_PROGRESS","In progress"],["READY","Ready"],["OUT_FOR_DELIVERY","Out for delivery"],["DELIVERED","Delivered"]];

const disc=p=>Math.round((1-p.price/p.mrp)*100),tot=(b,pk)=>b+(pk&&b<500?50:0);
const fillCurrentLocation=(onLocated,toast)=>{
 if(!navigator.geolocation)return toast('This browser does not support location access.');
 navigator.geolocation.getCurrentPosition(position=>onLocated(
  `GPS coordinates ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
 ),error=>toast(error.code===1?'Location permission was denied. You can still enter the address manually.':'Could not read your location. Check location services and try again.'),{
  enableHighAccuracy:true,timeout:10000,maximumAge:60000
 });
};

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

function Opts({base,v,set,onGo,label,placingOrder,cfg,onLocate}){const threshold=Number(cfg?.['delivery.free_threshold']??500),fee=Number(cfg?.['delivery.fee']??50),t=base+(v.pickup&&base<threshold?fee:0),address=[v.addressHouse,v.addressArea,v.addressLandmark,v.addressCity,v.addressPincode].filter(Boolean).join(', '),razorpayReady=cfg?.razorpay_enabled==='true';
 return <div><label style={{color:'inherit'}}><input type="checkbox" style={{width:'auto'}} checked={v.pickup} onChange={e=>set({...v,pickup:e.target.checked})}/> Pickup &amp; delivery (free above ₹{threshold}, else ₹{fee})</label>
 <fieldset className="address-fields"><legend>{v.pickup?'Pickup / delivery address':'Drop-off address'}</legend>
 <button type="button" className="chip" onClick={onLocate}>📍 Use my current location</button><small className="mut">Your browser will ask permission. Coordinates are placed in the editable landmark field and shared with the shop only if you submit this order.</small>
 <label>Flat / house / building<input required maxLength={180} value={v.addressHouse} onChange={e=>set({...v,addressHouse:e.target.value})} placeholder="House or building name"/></label>
 <label>Area / street<input required maxLength={180} value={v.addressArea} onChange={e=>set({...v,addressArea:e.target.value})} placeholder="Street and area"/></label>
 <label>Landmark (optional)<input maxLength={180} value={v.addressLandmark} onChange={e=>set({...v,addressLandmark:e.target.value})} placeholder="Nearby landmark"/></label>
 <div className="address-city"><label>City<input required maxLength={120} value={v.addressCity} onChange={e=>set({...v,addressCity:e.target.value})}/></label><label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={v.addressPincode} onChange={e=>set({...v,addressPincode:e.target.value.replace(/\D/g,'')})}/></label></div>
 <label>Recipient name<input required minLength={2} maxLength={100} value={v.deliveryName} onChange={e=>set({...v,deliveryName:e.target.value})}/></label>
 <label>Delivery phone (separate from account phone)<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={v.deliveryPhone} onChange={e=>set({...v,deliveryPhone:e.target.value.replace(/\D/g,'')})}/></label>
 </fieldset>
 <div className="pm"><label className={v.mode==='ONLINE'?'on':''}><input type="radio" disabled={!razorpayReady} checked={v.mode==='ONLINE'} onChange={()=>set({...v,mode:'ONLINE'})}/>{razorpayReady?`Pay securely now · ₹${t} (UPI / cards)`:'Online payment unavailable · contact the shop'}</label>
 <label className={v.mode==='PAY_ON_DELIVERY'?'on':''}><input type="radio" checked={v.mode==='PAY_ON_DELIVERY'} onChange={()=>set({...v,mode:'PAY_ON_DELIVERY'})}/>Pay on delivery · ₹{t}</label></div>
 <small className="mut">100% secure checkout. Your delivery phone number does not change your account phone.</small>
 <button className="btn d" style={{width:'100%'}} disabled={!base||!v.addressHouse.trim()||!v.addressArea.trim()||!v.addressCity.trim()||!/^\d{6}$/.test(v.addressPincode)||!v.deliveryName.trim()||!/^\d{10}$/.test(v.deliveryPhone)||(!razorpayReady&&v.mode==='ONLINE')||placingOrder} onClick={()=>onGo(address)}>{placingOrder?'Placing order…':`${label} · ₹${t}`}</button></div>}

function Book({kind,place,placingOrder,toast,user}){const L=SV[kind],[s,setS]=useState(L[0][0]),[d,setD]=useState(''),[images,setImages]=useState([]),[v,setV]=useState({pickup:true,address:user?.address||''});
 useEffect(()=>{if(user?.address)setV(current=>({...current,address:user.address}))},[user]);
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
 {!admin&&<button className="btn" disabled={product.stock<1} onClick={()=>product.variants?.length?onDetail(product):add(product.id,null,1)}>{product.variants?.length?'Choose options':'Add to cart'}</button>}</div></article>}

function Shop({prods,add,admin,search,category,setCategory,onDetail,cfg}){const[minPrice,setMinPrice]=useState(''),[maxPrice,setMaxPrice]=useState(''),[sort,setSort]=useState('p'),[inStockOnly,setInStockOnly]=useState(false),[filtersOpen,setFiltersOpen]=useState(false),[brand,setBrand]=useState(''),[size,setSize]=useState('');
 const freeThreshold=Number(cfg?.['delivery.free_threshold']??500),deliveryFee=Number(cfg?.['delivery.fee']??50);
 const cats=['All',...new Set(prods.map(p=>p.category).filter(Boolean))],variants=prods.flatMap(product=>product.variants||[]);
 const brands=[...new Set(variants.flatMap(variant=>Object.entries(variant.options||{}).filter(([key])=>/brand|company|maker/i.test(key)).map(([,value])=>value)))].sort();
 const sizes=[...new Set(variants.flatMap(variant=>Object.entries(variant.options||{}).filter(([key])=>/size/i.test(key)).map(([,value])=>value)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const query=search.trim().toLowerCase();
 const matchesSearch=product=>[product.name,product.category,...(product.variants||[]).flatMap(variant=>Object.values(variant.options||{}))].join(' ').toLowerCase().includes(query);
 const list=prods.filter(product=>(category==='All'||product.category===category)&&(!minPrice||product.price>=Number(minPrice))&&(!maxPrice||product.price<=Number(maxPrice))&&(!inStockOnly||product.stock>0)&&(!query||matchesSearch(product))&&(!brand&&!size||product.variants?.some(variant=>(!brand||Object.entries(variant.options||{}).some(([key,value])=>/brand|company|maker/i.test(key)&&value===brand))&&(!size||Object.entries(variant.options||{}).some(([key,value])=>/size/i.test(key)&&value===size)))));
 const clearFilters=()=>{setMinPrice('');setMaxPrice('');setSort('p');setInStockOnly(false);setBrand('');setSize('');setCategory('All')};
 list.sort((a,b)=>sort==='l'?a.price-b.price:sort==='h'?b.price-a.price:sort==='d'?disc(b)-disc(a):sort==='n'?a.name.localeCompare(b.name):b.stock-a.stock);
 return <div className={`shop${query&&filtersOpen?' has-filters':''}`}>{query&&filtersOpen&&<aside className="sec fl"><h3>Filters</h3>
 {brands.length>0&&<><label htmlFor="filter-brand">Brand / company</label><select id="filter-brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">All brands</option>{brands.map(value=><option key={value}>{value}</option>)}</select></>}
 {sizes.length>0&&<><label htmlFor="filter-size">Size</label><select id="filter-size" value={size} onChange={e=>setSize(e.target.value)}><option value="">All sizes</option>{sizes.map(value=><option key={value}>{value}</option>)}</select></>}
 <label htmlFor="filter-category">Section</label><select id="filter-category" value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(value=><option key={value}>{value}</option>)}</select>
 <label htmlFor="filter-min-price">Minimum price (₹)</label><input id="filter-min-price" type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Any"/>
 <label htmlFor="filter-max-price">Maximum price (₹)</label><input id="filter-max-price" type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any"/>
 <label>Sort by</label><select value={sort} onChange={e=>setSort(e.target.value)}><option value="p">In-stock first</option><option value="l">Price: low to high</option><option value="h">Price: high to low</option><option value="d">Discount</option><option value="n">Name</option></select>
 <label className="stock-filter"><input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)}/> Show in-stock only</label><button className="chip" onClick={clearFilters}>Clear filters</button>
 <p className="mut">Pickup and delivery are free above ₹{freeThreshold}; otherwise ₹{deliveryFee}.</p></aside>}
 <div className="shop-results">{query&&<div className="search-filter-row"><button className="chip" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(value=>!value)}>☷ Filters{brand||size||minPrice||maxPrice?' · Applied':''}</button></div>}
 <div className="chips">{cats.map(value=><button key={value} className={'chip'+(value===category?' on':'')} onClick={()=>setCategory(value)}>{value}</button>)}</div>
 <section className="sec results"><h2>{list.length} {category==='All'?'materials':category}</h2>
 <div className="g">{list.map(product=><ProductCard key={product.id} product={product} admin={admin} add={add} onDetail={onDetail}/>)}</div>
 {!list.length&&<p className="mut">No materials found. Try another category or search.</p>}</section></div></div>}

function ProductDetailModal({product,admin,onAdd,onClose}){const variants=product.variants||[],[selection,setSelection]=useState(variants[0]?.options||{}),[quantity,setQuantity]=useState(1);
 const keys=[...new Set(variants.flatMap(variant=>Object.keys(variant.options||{})))],active=variants.find(variant=>keys.every(key=>selection[key]===variant.options?.[key]));
 const valuesFor=key=>[...new Set(variants.filter(variant=>keys.filter(other=>other!==key).every(other=>!selection[other]||selection[other]===variant.options?.[other])).map(variant=>variant.options?.[key]).filter(Boolean))];
 return <div className="ov on" onClick={onClose}><section className="md on product-detail" onClick={event=>event.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Close product details">×</button>
 <div className="detail-icon">{product.imageUrl?<img src={productImageUrl(product)} alt={product.name}/>:product.emoji||'📦'}</div><h2>{product.name}</h2><span className="rt">{product.category}</span><p className="mut">{product.description}</p>
 {keys.map(key=><label key={key}>{key}<select value={selection[key]||''} onChange={event=>setSelection(current=>({...current,[key]:event.target.value}))}><option value="">Choose {key.toLowerCase()}</option>{valuesFor(key).map(value=><option key={value}>{value}</option>)}</select></label>)}
 {active?<p className="pr"><b>₹{active.price}</b>{active.mrp>active.price&&<s>₹{active.mrp}</s>} · {active.stock>0?`${active.stock} in stock`:'Out of stock'}</p>
  :keys.length>0?<p className="mut">Choose an available combination of options.</p>:<p className="pr"><b>₹{product.price}</b>{product.mrp>product.price&&<s>₹{product.mrp}</s>}</p>}
 {!admin&&<><label>Quantity</label><input type="number" min="1" max={active?.stock||product.stock} value={quantity} onChange={event=>setQuantity(Math.max(1,Number(event.target.value)||1))}/>
 <button className="btn d full" disabled={(keys.length>0&&!active)||((active?.stock??product.stock)<quantity)} onClick={()=>{onAdd(product.id,active?.id||null,quantity);onClose()}}>Add to cart</button></>}</section></div>}

function Cart({prods,cart,setQty,place,close,placingOrder,cfg,user}){const[v,setV]=useState({pickup:true,addressHouse:user?.addressHouse||'',addressArea:user?.addressArea||(!user?.addressHouse?user?.address||'':''),addressLandmark:user?.addressLandmark||'',addressCity:user?.addressCity||'',addressPincode:user?.addressPincode||'',deliveryName:user?.addressName||user?.name||'',deliveryPhone:user?.addressPhone||user?.phone||'',mode:cfg?.razorpay_enabled==='true'?'ONLINE':'PAY_ON_DELIVERY'});
 const L=Object.entries(cart).map(([key,q])=>{const [productId,variantId]=key.split('::'),p=prods.find(item=>item.id===Number(productId)),variant=p?.variants?.find(item=>item.id===variantId);return {p,variant,key,q,price:variant?.price??p?.price,options:variant?.options||{}}}).filter(item=>item.p),base=L.reduce((total,item)=>total+item.price*item.q,0);
 return <div className="ov" onClick={close}><div className="dr" onClick={event=>event.stopPropagation()}><h2>🛒 Your cart</h2>
 {L.length?L.map(({p,q,key,variant,price,options})=><div className="row cart-line" key={key}><span>{p.emoji} {p.name}<small className="mut">{Object.entries(options).map(([name,value])=>`${name}: ${value}`).join(' · ')}</small></span><span><button className="chip" onClick={()=>setQty(key,q-1)}>−</button> {q} <button className="chip" disabled={q>=(variant?.stock??p.stock)} onClick={()=>setQty(key,q+1)}>+</button> ₹{price*q}</span></div>):<p className="mut">Cart is empty</p>}
 {L.length>0&&<Opts base={base} v={v} set={setV} cfg={cfg} label="Place order" placingOrder={placingOrder} onLocate={()=>fillCurrentLocation(value=>setV(current=>({...current,addressLandmark:value})),toast)} onGo={address=>place({type:'MATERIAL',items:L.map(item=>({productId:item.p.id,variantId:item.variant?.id||null,qty:item.q})),paymentMode:v.mode,pickup:v.pickup,address,deliveryName:v.deliveryName,deliveryPhone:v.deliveryPhone})}/>}</div></div>}

function Pay({o,done,close}){const[checkout,setCheckout]=useState(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[seconds,setSeconds]=useState(600),finished=useRef(false),deadline=useRef(Date.now()+600000);
 const fail=async message=>{if(finished.current)return;finished.current=true;setBusy(true);try{await api(`/orders/${o.id}/payment-failed`,'POST');done(false,message)}catch(error){done(false,error.message||message)}};
 useEffect(()=>{let active=true;api(`/orders/${o.id}/razorpay-order`,'POST').then(async result=>{
   if(!active)return;
   deadline.current=new Date(result.expiresAt).getTime();
   setSeconds(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));
   if(!window.Razorpay){
    const existing=document.querySelector('script[data-razorpay-checkout]');
    const script=existing||document.createElement('script');
    script.src='https://checkout.razorpay.com/v1/checkout.js';script.dataset.razorpayCheckout='true';
    const loaded=()=>active&&setCheckout(result),failed=()=>active&&setErr('Razorpay checkout could not load. Check your connection and retry.');
    script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});
    if(!existing)document.body.appendChild(script);
   }else setCheckout(result);
  }).catch(error=>setErr(error.message)).finally(()=>active&&setLoading(false));
  return()=>{active=false}},[o.id]);
 useEffect(()=>{const timer=window.setInterval(()=>setSeconds(Math.max(0,Math.ceil((deadline.current-Date.now())/1000))),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(seconds<=0&&!finished.current)void fail('The 10-minute payment window expired. If your account was debited, contact the shop for a refund.');},[seconds]);
 const launch=()=>{if(!checkout||!window.Razorpay||busy)return;setErr('');
  const instance=new window.Razorpay({key:checkout.keyId,amount:checkout.amount,currency:checkout.currency,order_id:checkout.razorpayOrderId,
   name:'Raj Kumar Shoe Repairing',description:`Order ${o.orderNo}`,prefill:{name:checkout.customerName,contact:checkout.customerPhone},
   notes:{orderNo:o.orderNo},theme:{color:'#5a2d0c'},handler:async response=>{
    setBusy(true);try{await api(`/orders/${o.id}/razorpay-verify`,'POST',{razorpayOrderId:response.razorpay_order_id,razorpayPaymentId:response.razorpay_payment_id,razorpaySignature:response.razorpay_signature});finished.current=true;done(true,'Payment received. Your order is confirmed.')}
    catch(error){setErr(error.message);setBusy(false)}
   }});
  instance.on('payment.failed',response=>{const reason=response?.error?.description||'Payment was declined.';void fail(`${reason} If your account was debited, contact the shop for a refund.`)});
  instance.open();
 };
 const minutes=Math.floor(seconds/60),remaining=String(seconds%60).padStart(2,'0');
 return <div className="ov" onClick={close}><div className="md payment-dialog" onClick={event=>event.stopPropagation()}><h2>Secure payment · ₹{o.total}</h2>
 <p className="payment-timer" role="timer">Complete payment within <strong>{minutes}:{remaining}</strong></p>
 <p className="mut">Order {o.orderNo}. Pay by UPI / Google Pay, card, or another method available in the secure Razorpay checkout.</p>
 {loading&&<p className="mut">Preparing secure checkout…</p>}{err&&<p className="er" role="alert">{err}</p>}
 <button className="btn d full" disabled={!checkout||busy||seconds<=0} onClick={launch}>{busy?'Verifying payment…':seconds<=0?'Payment window expired':'Continue to secure payment'}</button>
 <p className="mut">Your payment is verified securely before the order is confirmed. Pay on delivery is also available during checkout.</p>
 <button className="btn o full" disabled={busy} onClick={close}>Close and check order status</button></div></div>}

function OrderProgress({status}){
 if(status==='CANCELLED')return <div className="order-progress declined-progress" role="status"><strong>Order cancelled</strong><span>Contact the shop if you need help.</span></div>;
 if(status==='DECLINED')return <div className="order-progress declined-progress" role="status"><strong>Request declined</strong><span>Please contact the shop if you need help.</span></div>;
 const index=Math.max(0,ORDER_STEPS.findIndex(([step])=>step===status));
 return <section className="order-progress" aria-label="Order tracking"><strong>📍 Track order</strong><ol>{ORDER_STEPS.map(([step,label],position)=><li key={step} className={position<index?'complete':position===index?'current':''} aria-current={position===index?'step':undefined}><span className="progress-dot">{position<index?'✓':position+1}</span><span>{label}</span></li>)}</ol></section>;
}

function ReasonDialog({order,title,confirmLabel,onConfirm,onClose,busy}){const[reason,setReason]=useState(''),[error,setError]=useState('');
 if(!order)return null;
 return <div className="ov" role="presentation" onClick={onClose}><form className="md reason-dialog" role="dialog" aria-modal="true" aria-labelledby="reason-title" onSubmit={event=>{event.preventDefault();if(reason.trim().length>300){setError('Please keep the reason under 300 characters.');return}onConfirm(reason.trim())}} onClick={event=>event.stopPropagation()}>
  <h2 id="reason-title">{title}</h2><p className="mut">Order {order.orderNo}{order.userName?` · ${order.userName}`:''}</p>
  <label htmlFor="order-reason">Reason (optional)</label><textarea id="order-reason" rows={4} maxLength={300} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Tell us why you are cancelling or declining this order."/>
  <small className="mut">{reason.length}/300</small>{error&&<p className="er">{error}</p>}
  <div className="acts"><button className="btn o" type="button" disabled={busy} onClick={onClose}>Keep order</button><button className="btn d" type="submit" disabled={busy}>{busy?'Submitting…':confirmLabel}</button></div>
 </form></div>}

function MyOrders({pay,toast,openFeedback}){const[L,setL]=useState([]),[cancelTarget,setCancelTarget]=useState(null),[cancelling,setCancelling]=useState(false);const reload=()=>api('/orders').then(setL).catch(e=>toast(e.message));useEffect(()=>{reload();const t=setInterval(reload,10000);return()=>clearInterval(t)},[]);
 const cancelOrder=async reason=>{if(!cancelTarget)return;setCancelling(true);try{await api(`/orders/${cancelTarget.id}/cancel`,'POST',{reason});setCancelTarget(null);await reload();toast(`Order ${cancelTarget.orderNo} cancelled.`)}catch(e){toast(e.message)}finally{setCancelling(false)}};
 const quoteResponse=async(o,accepted)=>{try{await api(`/orders/${o.id}/quote-response`,'POST',{accepted});await reload();toast(accepted?'Quote accepted. Amount is due on delivery.':'Quote declined.')}catch(e){toast(e.message)}};
 return <div className="sec customer-orders"><h2>📦 My orders</h2><p className="mut">Follow each request, review owner quotes, and see your payment and delivery progress here.</p>{L.map(o=><article className="customer-order-card" key={o.id}>
  <div className="booking-head"><div><small className="booking-kind">{o.type.replace('_',' ')}</small><h3>{o.orderNo}</h3></div><span className="bd2">{o.status.replaceAll('_',' ')}</span></div>
  <p>{o.description}</p>{o.address&&<p><b>{o.type==='BULK_REPAIR'?'Showroom address':'Service address'}:</b> {o.address}</p>}{o.footwearType&&<p><b>Bulk request:</b> {o.footwearType} · about {o.estimatedQuantity} pairs</p>}
  <div className="customer-order-meta"><span>Payment: {o.paymentStatus==='PAY_ON_DELIVERY'?'Due on delivery':o.paymentStatus.replaceAll('_',' ')}</span>{o.total>0&&<span>Total ₹{o.total}</span>}</div>
  <OrderProgress status={o.status}/>
  {o.status==='DELIVERED'&&<button className="btn o" onClick={()=>openFeedback?.(o.id)}>⭐ Leave a rating &amp; review</button>}
  {o.adminNote&&<p className="quote-note">{o.adminNote}</p>}
  {o.paymentStatus==='AWAITING_CUSTOMER_ACCEPTANCE'&&<div className="quote-panel"><div><small>Owner’s quote</small><strong>₹{o.total}</strong><p className="mut">Accept to confirm the work. Payment is due on delivery.</p></div><div className="acts"><button className="btn d" onClick={()=>quoteResponse(o,true)}>Accept quote</button><button className="btn o" onClick={()=>quoteResponse(o,false)}>Decline</button></div></div>}
  {o.paymentMode==='ONLINE'&&o.paymentStatus==='PENDING'&&o.status==='PLACED'&&<button className="btn" onClick={()=>pay(o)}>Pay ₹{o.total} · UPI / Razorpay</button>}
  {['PLACED','CONFIRMED'].includes(o.status)&&<button className="btn o" onClick={()=>setCancelTarget(o)}>Cancel order</button>}
 </article>)}{!L.length&&<p className="mut">No orders yet.</p>}
 {cancelTarget&&<ReasonDialog order={cancelTarget} title="Cancel this order?" confirmLabel="Cancel order" busy={cancelling} onClose={()=>setCancelTarget(null)} onConfirm={cancelOrder}/>}</div>}

function Account({user,onUserUpdate,openCart,cartCount,pay,toast,openFeedback}){
 const[section,setSection]=useState('profile'),[form,setForm]=useState({name:'',email:'',addressName:'',addressPhone:'',addressHouse:'',addressArea:'',addressLandmark:'',addressCity:'',addressPincode:''}),[saving,setSaving]=useState(false);
 useEffect(()=>setForm({name:user?.name||'',email:user?.email||'',addressName:user?.addressName||'',addressPhone:user?.addressPhone||'',addressHouse:user?.addressHouse||'',addressArea:user?.addressArea||'',addressLandmark:user?.addressLandmark||'',addressCity:user?.addressCity||'',addressPincode:user?.addressPincode||''}),[user]);
 const update=k=>event=>setForm(current=>({...current,[k]:event.target.value}));
 const save=async event=>{event.preventDefault();setSaving(true);try{const saved=await api('/account','PUT',form);sessionStorage.setItem('u',JSON.stringify(saved));onUserUpdate(saved);toast(section==='address'?'Delivery address saved.':'Profile updated.')}catch(error){toast(error.message)}finally{setSaving(false)}};
 return <section className="sec account-page"><h1 className="page-title">👤 Your account</h1>
  <div className="chips account-tabs">{[['profile','Profile'],['orders','My orders'],['address','Addresses'],['cart','Cart']].map(([key,label])=><button key={key} className={'chip'+(section===key?' on':'')} onClick={()=>key==='cart'?openCart():setSection(key)}>{label}{key==='cart'?` (${cartCount})`:''}</button>)}</div>
  {section==='orders'&&<MyOrders pay={pay} toast={toast} openFeedback={openFeedback}/>}
  {section==='cart'&&<p>Your cart has {cartCount} item{cartCount===1?'':'s'}. <button className="btn" onClick={openCart}>Open cart</button></p>}
  {['profile','address'].includes(section)&&<form className="account-form" onSubmit={save}>
   {section==='profile'?<><h2>Personal details</h2><label>Full name<input required minLength={2} maxLength={100} value={form.name} onChange={update('name')}/></label><label>Account phone<input value={user?.phone||''} disabled readOnly/><small className="mut">Your sign-in phone number stays separate from delivery contact details.</small></label><label>Email<input type="email" maxLength={255} value={form.email} onChange={update('email')}/></label></>
   :<><h2>Delivery address</h2><p className="mut">Save a default address to prefill checkout. The delivery phone here does not change your account phone.</p>
    <button className="chip" type="button" onClick={()=>fillCurrentLocation(value=>setForm(current=>({...current,addressLandmark:value})),toast)}>📍 Use my current location</button><small className="mut">Your browser will ask permission. Coordinates will appear in the editable landmark field.</small>
    <label>Recipient name<input minLength={2} maxLength={100} value={form.addressName} onChange={update('addressName')}/></label><label>Delivery phone<input inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.addressPhone} onChange={event=>setForm(current=>({...current,addressPhone:event.target.value.replace(/\D/g,'')}))}/></label>
    <label>Flat / house / building<input maxLength={180} value={form.addressHouse} onChange={update('addressHouse')}/></label><label>Area / street<input maxLength={180} value={form.addressArea} onChange={update('addressArea')}/></label><label>Landmark (optional)<input maxLength={180} value={form.addressLandmark} onChange={update('addressLandmark')}/></label>
    <div className="address-city"><label>City<input maxLength={120} value={form.addressCity} onChange={update('addressCity')}/></label><label>PIN code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.addressPincode} onChange={event=>setForm(current=>({...current,addressPincode:event.target.value.replace(/\D/g,'')}))}/></label></div>
    </>}
   <div className="acts"><button className="btn d" type="submit" disabled={saving}>{saving?'Saving…':section==='address'?'Save address':'Save profile'}</button>{section==='address'&&user?.address&&<button className="btn o" type="button" onClick={()=>setForm(current=>({...current,addressName:'',addressPhone:'',addressHouse:'',addressArea:'',addressLandmark:'',addressCity:'',addressPincode:''}))}>Clear address</button>}</div>
  </form>}
 </section>}

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
 [orderQuery,setOrderQuery]=useState(''),[orderType,setOrderType]=useState(''),[orderDate,setOrderDate]=useState('all'),[orderStatus,setOrderStatus]=useState(''),[minAmount,setMinAmount]=useState(''),[maxAmount,setMaxAmount]=useState(''),
 [productQuery,setProductQuery]=useState(''),[productCategory,setProductCategory]=useState(''),[productAvailability,setProductAvailability]=useState(''),[reasonTarget,setReasonTarget]=useState(null),[reasonBusy,setReasonBusy]=useState(false),
 [f,setF]=useState({name:'',category:'Soles',price:'',mrp:'',emoji:'📦',description:'',stock:10,active:true,variants:[]}),[editingProductId,setEditingProductId]=useState(null),[removeProductImage,setRemoveProductImage]=useState(false),[productImage,setProductImage]=useState(null),[imagePreview,setImagePreview]=useState(''),[savingProduct,setSavingProduct]=useState(false);
 const lo=()=>{api('/admin/orders').then(setO).catch(()=>{});api('/admin/products').then(setP).catch(()=>{})};
 useEffect(()=>{lo();const i=setInterval(lo,10000);return()=>clearInterval(i)},[]);useEffect(()=>setC(cfg),[cfg]);
 useEffect(()=>{if(t==='reviews')api('/admin/feedback').then(setReviews).catch(e=>toast(e.message))},[t]);
 useEffect(()=>{if(!productImage){setImagePreview('');return}const url=URL.createObjectURL(productImage);setImagePreview(url);return()=>URL.revokeObjectURL(url)},[productImage]);
 const act=async(p,b,m='POST')=>{try{await api(p,m,b);lo();reload()}catch(e){toast(e.message)}};
 const decide=(o,a)=>a?act(`/admin/orders/${o.id}/decision`,{approve:true,note:''}):setReasonTarget({order:o,kind:'decline'});
 const cancelOrder=o=>setReasonTarget({order:o,kind:'cancel'});
 const submitReason=async reason=>{if(!reasonTarget)return;setReasonBusy(true);try{
  if(reasonTarget.kind==='cancel')await api(`/admin/orders/${reasonTarget.order.id}/cancel`,'POST',{reason});
  else await api(`/admin/orders/${reasonTarget.order.id}/decision`,'POST',{approve:false,note:reason});
  const action=reasonTarget.kind;setReasonTarget(null);lo();reload();toast(action==='cancel'?'Order cancelled.':'Order declined.');
 }catch(error){toast(error.message)}finally{setReasonBusy(false)}};
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
 const resetProduct=()=>{setF({name:'',category:'Soles',price:'',mrp:'',emoji:'📦',description:'',stock:10,active:true,variants:[]});setEditingProductId(null);setRemoveProductImage(false);setProductImage(null)};
 const editProduct=p=>{setEditingProductId(p.id);setF({name:p.name,category:p.category,price:String(p.price),mrp:String(p.mrp),emoji:p.emoji||'📦',description:p.description||'',stock:p.stock,active:p.active,variants:(p.variants||[]).map(variant=>({...variant,optionsText:Object.entries(variant.options||{}).map(([key,value])=>`${key}: ${value}`).join(', '),price:String(variant.price),mrp:String(variant.mrp),stock:String(variant.stock)}))});setProductImage(null);setRemoveProductImage(false);requestAnimationFrame(()=>productFormRef.current?.scrollIntoView({behavior:'smooth',block:'start'}))};
 const saveProduct=async()=>{const price=Number(f.price),mrp=Number(f.mrp||f.price),stock=Number(f.stock);
  if(f.name.trim().length<2||f.name.trim().length>255)return toast('Product name must be 2–255 characters.');
  let variantError='';
  const variants=f.variants.map((variant,index)=>{
   const options={};
   for(const raw of variant.optionsText.split(',')){const separator=raw.indexOf(':');if(separator<1){variantError=`Variant ${index+1}: enter options as Brand: Bata, Size: 7.`;return null}const key=raw.slice(0,separator).trim(),value=raw.slice(separator+1).trim();if(!key||!value||options[key]){variantError=`Variant ${index+1}: option names and values must be unique and non-empty.`;return null}options[key]=value}
   const variantPrice=Number(variant.price),variantMrp=Number(variant.mrp||variant.price),variantStock=Number(variant.stock);
   if(!Object.keys(options).length||!Number.isSafeInteger(variantPrice)||variantPrice<0||!Number.isSafeInteger(variantMrp)||variantMrp<variantPrice||!Number.isSafeInteger(variantStock)||variantStock<0){variantError=`Variant ${index+1}: enter valid options, price, MRP, and stock.`;return null}
   return {id:variant.id,options,price:variantPrice,mrp:variantMrp,stock:variantStock};
  });
  if(variantError)return toast(variantError);
  if(!variants.length&&(!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(mrp)||mrp<price||!Number.isSafeInteger(stock)||stock<0))return toast('Enter a valid price, MRP (at least the price), and non-negative whole-number stock.');
  if(variants.length&&new Set(variants.map(variant=>JSON.stringify(Object.entries(variant.options).sort()))).size!==variants.length)return toast('Variant option combinations must be unique.');
  if(f.description.length>500)return toast('Description must be 500 characters or fewer.');
  const body={...f,name:f.name.trim(),price:variants.length?Math.min(...variants.map(variant=>variant.price)):price,mrp:variants.length?Math.max(...variants.map(variant=>variant.mrp)):mrp,stock:variants.length?variants.reduce((total,variant)=>total+variant.stock,0):stock,variants};const form=new FormData();form.append('product',new Blob([JSON.stringify(body)],{type:'application/json'}));if(productImage)form.append('image',productImage);if(removeProductImage)form.append('removeImage','true');
  setSavingProduct(true);try{await api(editingProductId?`/admin/products/${editingProductId}`:'/admin/products',editingProductId?'PUT':'POST',form);resetProduct();lo();reload();toast(editingProductId?'Product updated':'Product added')}catch(e){toast(e.message)}finally{setSavingProduct(false)}};
 const previewProduct=P.find(product=>product.id===editingProductId);
 const previewUrl=productImage?imagePreview:(previewProduct?.imageUrl&&!removeProductImage?productImageUrl(previewProduct):'');
 const orderText=orderQuery.trim().toLowerCase(),today=new Date().toDateString(),thirtyDaysAgo=Date.now()-30*24*60*60*1000;
 const filteredOrders=O.filter(order=>(!orderText||`${order.orderNo} ${order.description} ${order.userName} ${order.userPhone}`.toLowerCase().includes(orderText))
  &&(!orderType||order.type===orderType)&&(!orderStatus||order.status===orderStatus||order.paymentStatus===orderStatus)
  &&(!minAmount||order.total>=Number(minAmount))&&(!maxAmount||order.total<=Number(maxAmount))
  &&(orderDate==='all'||(orderDate==='today'&&new Date(order.createdAt).toDateString()===today)||(orderDate==='30days'&&new Date(order.createdAt).getTime()>=thirtyDaysAgo)));
 const filteredProducts=P.filter(product=>(!productQuery||`${product.name} ${product.category} ${(product.variants||[]).flatMap(variant=>Object.values(variant.options||{})).join(' ')}`.toLowerCase().includes(productQuery.trim().toLowerCase()))
  &&(!productCategory||product.category===productCategory)
  &&(!productAvailability||(productAvailability==='in'&&product.stock>0)||(productAvailability==='out'&&product.stock===0)||(productAvailability==='hidden'&&!product.active)));
 return <div className="sec"><h2>⚙️ Owner dashboard</h2><div className="chips">{[['orders','Orders & payments'],['products','Products'],['reviews','Ratings & reviews'],['settings','Settings']].map(([k,l])=><button key={k} className={'chip'+(t===k?' on':'')} onClick={()=>setT(k)}>{l}</button>)}</div>
 {t==='reviews'&&<section className="owner-reviews"><h3>Customer ratings &amp; reviews</h3>{reviews.length>0&&<p className="review-summary">⭐ {(reviews.reduce((total,item)=>total+item.rating,0)/reviews.length).toFixed(1)} average · {reviews.length} review{reviews.length===1?'':'s'}</p>}
 {reviews.map(item=><article className="owner-review-card" key={item.id}><div className="booking-head"><div><b>{item.customerName}</b><small className="booking-kind">{item.orderNo}</small></div><strong className="review-stars-readonly" aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</strong></div><p>{item.review}</p><small className="mut">{new Date(item.createdAt).toLocaleString()}</small></article>)}
 {!reviews.length&&<p className="mut">No customer reviews yet.</p>}</section>}
 {t==='orders'&&<div className="admin-filters"><label>Search order, RK ID, product or customer<input value={orderQuery} onChange={e=>setOrderQuery(e.target.value)} placeholder="e.g. RK-101 or polish"/></label>
  <label>Order type<select value={orderType} onChange={e=>setOrderType(e.target.value)}><option value="">All types</option>{['MATERIAL','REPAIR','CUSTOM','BULK_REPAIR'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
  <label>Status / payment<select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)}><option value="">All statuses</option>{['PLACED','CONFIRMED','IN_PROGRESS','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','DECLINED','PENDING','PAID','PAY_ON_DELIVERY','REFUND_PENDING','REFUNDED'].map(value=><option key={value}>{value}</option>)}</select></label>
  <label>Date range<select value={orderDate} onChange={e=>setOrderDate(e.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="30days">Last 30 days</option></select></label>
  <label>Amount from ₹<input type="number" min="0" value={minAmount} onChange={e=>setMinAmount(e.target.value)}/></label><label>Amount to ₹<input type="number" min="0" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)}/></label>
  <p className="mut">{filteredOrders.length} of {O.length} orders</p></div>}
 {t==='orders'&&filteredOrders.map(o=><article className="booking-card" key={o.id}>
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
 {t==='orders'&&!filteredOrders.length&&<p className="mut">{O.length?'No orders match these filters.':'No orders yet.'}</p>}
 {t==='products'&&<><div className="product-edit-form" ref={productFormRef}><h3>{editingProductId?'Edit material':'Add material'}</h3><div className="g"><div><label>Name (required)</label><input required minLength={2} maxLength={255} value={f.name} onChange={sf('name')}/><label>Store section (required)</label><select required value={f.category} onChange={sf('category')}>{CATEGORIES.filter(([name])=>name!=='All').map(([name])=><option key={name} value={name}>{name}</option>)}<option value="Other">Other</option></select><label>Emoji fallback</label><input maxLength={16} value={f.emoji} onChange={sf('emoji')}/></div>
 <div><label>Price ₹ (required)</label><input required type="number" min="0" step="1" value={f.price} onChange={sf('price')}/><label>MRP ₹ (required)</label><input required type="number" min={f.price||0} step="1" value={f.mrp} onChange={sf('mrp')}/><label>Stock quantity (required)</label><input required type="number" min="0" step="1" value={f.stock} onChange={sf('stock')}/><label className="stock-filter"><input type="checkbox" checked={Number(f.stock)===0} onChange={e=>setF({...f,stock:e.target.checked?'0':'10'})}/> Mark out of stock</label></div></div>
 <label className="stock-filter"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Visible in storefront</label>
 <label>Description (optional)</label><input maxLength={500} value={f.description} onChange={sf('description')}/>
 <section className="variant-editor"><div className="booking-head"><div><h4>Options / variants</h4><p className="mut">Add each sellable combination separately, for example Brand: Bata, Size: 7 or Brand: Kiwi, Colour: Black, Volume: 50 ml. Price and stock are per combination.</p></div><button className="chip" type="button" onClick={()=>setF(current=>({...current,variants:[...current.variants,{optionsText:'Brand: , Size: ',price:'',mrp:'',stock:'0'}]}))}>＋ Add variant</button></div>
 {f.variants.map((variant,index)=><div className="variant-row" key={variant.id||index}><label>Options<input maxLength={300} value={variant.optionsText} onChange={event=>setF(current=>({...current,variants:current.variants.map((item,position)=>position===index?{...item,optionsText:event.target.value}:item)}))} placeholder="Brand: Bata, Size: 7"/></label>
  <label>Price ₹<input type="number" min="0" step="1" value={variant.price} onChange={event=>setF(current=>({...current,variants:current.variants.map((item,position)=>position===index?{...item,price:event.target.value}:item)}))}/></label>
  <label>MRP ₹<input type="number" min="0" step="1" value={variant.mrp} onChange={event=>setF(current=>({...current,variants:current.variants.map((item,position)=>position===index?{...item,mrp:event.target.value}:item)}))}/></label>
  <label>Stock<input type="number" min="0" step="1" value={variant.stock} onChange={event=>setF(current=>({...current,variants:current.variants.map((item,position)=>position===index?{...item,stock:event.target.value}:item)}))}/></label>
  <button className="chip" type="button" onClick={()=>setF(current=>({...current,variants:current.variants.filter((_,position)=>position!==index)}))}>Remove</button></div>)}
 </section>
 <label>Product photo (JPG, PNG, or WebP; up to 5 MB)</label><input key={editingProductId||'new-product'} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file&&(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){toast('Choose a JPG, PNG, or WebP image no larger than 5 MB.');e.target.value='';setProductImage(null);return}setProductImage(file||null);if(file)setRemoveProductImage(false)}}/>
 {previewUrl&&<img className="product-upload-preview" src={previewUrl} alt="Product photo preview"/>}
 {editingProductId&&previewProduct?.imageUrl&&!productImage&&<label className="stock-filter"><input type="checkbox" checked={removeProductImage} onChange={e=>setRemoveProductImage(e.target.checked)}/> Remove current photo</label>}
 <div className="acts"><button className="btn d" disabled={savingProduct} onClick={saveProduct}>{savingProduct?'Saving…':editingProductId?'Save material':'Add material'}</button>{editingProductId&&<button className="btn o" disabled={savingProduct} onClick={resetProduct}>Cancel edit</button>}</div></div>
 <div className="admin-filters"><label>Search products / brands<input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Name, brand, colour, size"/></label><label>Section<select value={productCategory} onChange={e=>setProductCategory(e.target.value)}><option value="">All sections</option>{CATEGORIES.filter(([name])=>name!=='All').map(([name])=><option key={name}>{name}</option>)}<option>Other</option></select></label><label>Availability<select value={productAvailability} onChange={e=>setProductAvailability(e.target.value)}><option value="">All products</option><option value="in">In stock</option><option value="out">Out of stock</option><option value="hidden">Hidden</option></select></label><p className="mut">{filteredProducts.length} of {P.length} products</p></div>
 {filteredProducts.map(p=><div className="row admin-product-row" key={p.id}><span className="admin-product"><span className="admin-product-image">{p.imageUrl?<img src={productImageUrl(p)} alt=""/>:p.emoji}</span><span><b>{p.name}</b><small className="mut admin-product-meta">{p.category} · ₹{p.price} · {p.variants?.length?`${p.variants.length} variants · `:''}{p.stock>0?`${p.stock} in stock`:'Out of stock'} · {p.active?'Visible':'Hidden'}</small></span></span><span className="acts stock-actions">
 <button className="chip" onClick={()=>editProduct(p)}>Edit all details</button>
 <button className="chip" onClick={()=>confirm('Hide this material from the storefront?')&&act('/admin/products/'+p.id,undefined,'DELETE')}>Hide</button></span></div>)}</>}
 {t==='settings'&&<><h3>Store configuration · Oracle rk_staticdata</h3><p className="mut">Update shop details, delivery charges, service constants, and per-minute API rate limits. Limits apply per client IP and take effect immediately.</p>
 <div className="static-data-fields">{staticEntries.map(([key,value])=><label key={key}>{key}<input value={value} maxLength={1000} onChange={e=>setC({...c,[key]:e.target.value})}/></label>)}</div>
 <div className="static-data-add"><input aria-label="New configuration key" placeholder="e.g. shop.tagline" value={staticKey} onChange={e=>setStaticKey(e.target.value)}/><input aria-label="New configuration value" placeholder="Value" value={staticValue} onChange={e=>setStaticValue(e.target.value)}/><button className="chip" onClick={()=>{if(!/^(shop|delivery|rate-limit|service)\.[a-z0-9._-]{1,80}$/.test(staticKey)||!staticValue.trim())return toast('Enter a valid configuration key and value.');setC({...c,[staticKey]:staticValue});setStaticKey('');setStaticValue('')}}>Add setting</button></div>
 <button className="btn d" onClick={saveStaticData}>Save store configuration</button>
 <h3>Google Pay / UPI settings</h3><label>UPI ID used for Google Pay payments</label><input maxLength={131} value={c.upi_id||''} onChange={e=>setC({...c,upi_id:e.target.value})}/><label>Payee name</label><input maxLength={100} value={c.payee_name||''} onChange={e=>setC({...c,payee_name:e.target.value})}/><button className="btn d" onClick={savePaymentSettings}>Save UPI settings</button><p className="mut">Razorpay keys are configured securely through backend environment variables; do not enter payment secrets in the storefront.</p><h3>Order notifications</h3><p className="mut">Configure SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, ORDER_NOTIFICATION_EMAIL and WhatsApp Cloud API credentials on the backend for optional email and WhatsApp alerts.</p></>}
 {reasonTarget&&<ReasonDialog order={reasonTarget.order} title={reasonTarget.kind==='cancel'?'Cancel this order?':'Decline this order?'} confirmLabel={reasonTarget.kind==='cancel'?'Cancel order':'Decline order'} busy={reasonBusy} onClose={()=>setReasonTarget(null)} onConfirm={submitReason}/>}</div>}

export {SV,ST,disc,tot,SHOP_MAPS_URL,SHOP_MAP_EMBED,storedUser,Login,Opts,Book,BulkRepair,CATEGORIES,categoryIcon,ProductCard,ProductDetailModal,Shop,Cart,Pay,MyOrders,Account,Admin};



export function PageContent({tab,slides,slide,setSlide,setTab,goShop,prods,admin,addProduct,setDetail,category,setCategory,search,place,placingOrder,user,onUserUpdate,setPay,toast,setLogin,openCart,cartCount,cfg,reload,feedbackOrderId,onOpenFeedback,onFeedbackBack}) {
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
 {tab==='repair'&&<div className="view on"><div className="two"><Book kind="REPAIR" place={place} placingOrder={placingOrder} toast={toast} user={user}/><section className="sec"><h2>Track your order</h2>
 {user&&!admin?<MyOrders pay={setPay} toast={toast} openFeedback={onOpenFeedback}/>:<><p>Sign in to view your live repair and delivery updates.</p><button className="btn" onClick={()=>user?setTab('orders'):setLogin(true)}>View my orders</button></>}
 <h3>Typical pricing</h3><p className="mut">Polish ₹80 · Stitching ₹150 · Sticking ₹200 · Sole replacement ₹350 · Jacket polish ₹450</p>
 <p className="mut">Free pickup and delivery on orders above ₹{freeThreshold} in {cfg?.['shop.address']||'Jamshedpur'}.</p></section></div></div>}
 {tab==='custom'&&<div className="view on"><section className="sec"><h1>Custom-made footwear</h1><div className="g custom-types">{[['💍','Wedding shoes','Handcrafted for your big day'],['♿','Orthopedic footwear','Made for your fit and comfort'],['🐾','Special designs','Tell us your idea'],['✏️','Your own design','Share colour and materials']].map(([icon,title,description])=><div className="sv" key={title}><span>{icon}</span><h3>{title}</h3><p>{description}</p></div>)}</div></section><Book kind="CUSTOM" place={place} placingOrder={placingOrder} toast={toast} user={user}/></div>}
 {tab==='bulk'&&<div className="view on"><BulkRepair place={place} placingOrder={placingOrder} cfg={cfg} toast={toast}/></div>}
 {tab==='orders'&&(user&&!admin?<MyOrders pay={setPay} toast={toast} openFeedback={onOpenFeedback}/>:<div className="sec">Please login as a customer to see orders. <button className="btn" onClick={()=>setLogin(true)}>Login</button></div>)}
 {tab==='account'&&(user&&!admin?<Account user={user} onUserUpdate={onUserUpdate} openCart={openCart} cartCount={cartCount} pay={setPay} toast={toast} openFeedback={onOpenFeedback}/>:<div className="sec">Please login as a customer to manage your account. <button className="btn" onClick={()=>setLogin(true)}>Login</button></div>)}
 {tab==='feedback'&&(user&&!admin&&feedbackOrderId?<FeedbackForm orderId={feedbackOrderId} onBack={onFeedbackBack} toast={toast}/>:<div className="sec"><p>Please sign in as the customer who placed the delivered order to leave feedback.</p><button className="btn" onClick={()=>setLogin(true)}>Login</button></div>)}
 {tab==='admin'&&admin&&<div className="view on"><Admin cfg={cfg} reload={reload} toast={toast}/></div>}
 </main>;
}
