"use strict";
let TOKEN=localStorage.getItem("rw_token")||"", MONACO_OK=false, editor=null, modelMap={};
let openTabs=[], activePath=null, treeCache={};
const $=id=>document.getElementById(id);
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* ---------- i18n: EN default, ID optional, pilihan tersimpan di browser ---------- */
const STR={
en:{explorer:"Explorer",tip_newFile:"New file",tip_newDir:"New folder",tip_upload:"Upload",tip_refresh:"Refresh",welcome_sub:"lightweight remote editor — click a file in the Explorer to open",welcome_keys:"<kbd>Ctrl+S</kbd> save &nbsp; <kbd>Ctrl+P</kbd> quick open",ready:"ready",searchPh:"type a file name…",mvHint:"Click a folder to enter it",mvDestL:"Destination:",mvNameL:"Name:",mvCancel:"Cancel",mvNewDir:"📁 New folder",mvOk:"Move",tokenPrompt:"Write token:",errRead:"failed to read ",errOpen:"failed to open ",unsavedClose:" has unsaved changes. Close?",saving:"saving…",saved:"saved ✓",saveFail:"save failed",destFolder:"Destination folder (empty = root):",fileName:"File name:",created:"created ✓",failed:"failed: ",newFolderPath:"New folder path (e.g. Python/exercise):",folderCreated:"folder created ✓",delConfirm:"Delete",deleted:"deleted ✓",renameTo:"Rename",moved:"moved ✓",moveTitle:"Move",loading:"loading…",up:"⬆️ <i>.. (up)</i>",noFolders:"(no folders yet)",newFolderIn:"New folder name in /",nameEmpty:"name cannot be empty",copyTo:"Copy",copied:"copied ✓",mNewFile:"📄 New file",mNewFolder:"📁 New folder",mRename:"✏️ Rename",mMove:"📂 Move to…",mCopy:"📋 Copy / Duplicate",mDelFolder:"🗑️ Delete folder",mOpen:"✏️ Open",mDelFile:"🗑️ Delete file",folderName:"Folder name:",uploadTo:"Upload to folder (empty = root):",uploadFail:" failed",uploadN:"Upload",uploadDone:"upload complete ✓",loadingList:"loading file list…",filesN:"file(s)",readyBar:"ready — Ctrl+P quick open, Ctrl+S save",topSearch:"Search files (Ctrl+P)",mFile:"File",mView:"View",mHelp:"Help",miNewFile:"New File",miNewFolder:"New Folder",miUpload:"Upload Files…",miSave:"Save",miRefresh:"Refresh Explorer",miPalette:"Quick Open…",miSidebar:"Toggle Sidebar",miAbout:"About jetdrop",miHelp:"Help & Shortcuts",helpTitle:"Help",aboutTitle:"About",helpClose:"Close",hAbout:"About",hGuide:"Getting started",hKeys:"Keyboard shortcuts",aboutBody:"<b>jetdrop</b> v1.0 — lightweight remote editor. Edit files on a remote server from the browser or via API. Python 3.8+, stdlib only.",guide1:"Click a file in the Explorer to open it.",guide2:"Edit, then press Ctrl+S to save.",guide3:"Right-click a file or folder for rename, move, copy, delete.",guide4:"Drag & drop files anywhere to upload to root.",keySave:"Save current file",keyOpen:"Quick-open file",keyEsc:"Close dialogs / palette",confirmTitle:"Confirm",promptTitle:"Enter value",cancelBtn:"Cancel",okBtn:"OK",alertTitle:"Notice"},
id:{explorer:"Explorer",tip_newFile:"File baru",tip_newDir:"Folder baru",tip_upload:"Unggah",tip_refresh:"Segarkan",welcome_sub:"lightweight remote editor, klik file di Explorer untuk membuka",welcome_keys:"<kbd>Ctrl+S</kbd> simpan &nbsp; <kbd>Ctrl+P</kbd> buka cepat",ready:"siap",searchPh:"ketik nama file…",mvHint:"Klik folder untuk masuk ke dalamnya",mvDestL:"Tujuan:",mvNameL:"Nama:",mvCancel:"Batal",mvNewDir:"📁 Folder baru",mvOk:"Pindahkan",tokenPrompt:"Token tulis:",errRead:"gagal baca ",errOpen:"gagal buka ",unsavedClose:" belum disimpan. Tutup?",saving:"menyimpan…",saved:"tersimpan ✓",saveFail:"gagal simpan",destFolder:"Folder tujuan (kosongkan = root):",fileName:"Nama file:",created:"dibuat ✓",failed:"gagal: ",newFolderPath:"Path folder baru (mis. Python/latihan):",folderCreated:"folder dibuat ✓",delConfirm:"Hapus",deleted:"dihapus ✓",renameTo:"Rename",moved:"dipindah ✓",moveTitle:"Pindah",loading:"memuat…",up:"⬆️ <i>.. (naik)</i>",noFolders:"(belum ada folder)",newFolderIn:"Nama folder baru di /",nameEmpty:"nama tidak boleh kosong",copyTo:"Copy",copied:"tercopy ✓",mNewFile:"📄 File baru",mNewFolder:"📁 Folder baru",mRename:"✏️ Rename",mMove:"📂 Pindah ke…",mCopy:"📋 Copy / Duplikat",mDelFolder:"🗑️ Hapus folder",mOpen:"✏️ Buka",mDelFile:"🗑️ Hapus file",folderName:"Nama folder:",uploadTo:"Upload ke folder (kosongkan = root):",uploadFail:" gagal",uploadN:"Upload",uploadDone:"upload selesai ✓",loadingList:"memuat daftar file…",filesN:"file",readyBar:"siap — Ctrl+P buka cepat, Ctrl+S simpan",topSearch:"Cari file (Ctrl+P)",mFile:"File",mView:"Tampilan",mHelp:"Bantuan",miNewFile:"File Baru",miNewFolder:"Folder Baru",miUpload:"Unggah File…",miSave:"Simpan",miRefresh:"Segarkan Explorer",miPalette:"Buka Cepat…",miSidebar:"Tampilkan/Sembunyikan Sidebar",miAbout:"Tentang jetdrop",miHelp:"Bantuan & Shortcut",helpTitle:"Bantuan",aboutTitle:"Tentang",helpClose:"Tutup",hAbout:"Tentang",hGuide:"Mulai cepat",hKeys:"Shortcut keyboard",aboutBody:"<b>jetdrop</b> v1.0 — remote editor ringan. Edit file di server dari browser atau via API. Python 3.8+, stdlib saja.",guide1:"Klik file di Explorer untuk membuka.",guide2:"Edit, lalu tekan Ctrl+S untuk menyimpan.",guide3:"Klik kanan file/folder untuk rename, pindah, copy, hapus.",guide4:"Drag & drop file ke mana saja untuk upload ke root.",keySave:"Simpan file aktif",keyOpen:"Buka cepat file",keyEsc:"Tutup dialog / palette",confirmTitle:"Konfirmasi",promptTitle:"Masukkan nilai",cancelBtn:"Batal",okBtn:"OK",alertTitle:"Pemberitahuan"}};
let LANG=localStorage.getItem("rw_lang")||"en";
const t=k=>STR[LANG][k]??STR.en[k]??k;
function setLang(l){LANG=l;localStorage.setItem("rw_lang",l);document.documentElement.lang=l;
document.querySelectorAll("[data-i18n]").forEach(el=>{const v=STR[l][el.dataset.i18n];if(typeof v==="string")el.textContent=v;});
document.querySelectorAll("[data-i18n-html]").forEach(el=>{const v=STR[l][el.dataset.i18nHtml];if(typeof v==="string")el.innerHTML=v;});
document.querySelectorAll("[data-i18n-title]").forEach(el=>{const v=STR[l][el.dataset.i18nTitle];if(typeof v==="string")el.title=v;});
document.querySelectorAll("[data-i18n-ph]").forEach(el=>{const v=STR[l][el.dataset.i18nPh];if(typeof v==="string")el.placeholder=v;});
$("langEn").classList.toggle("on",l==="en");$("langId").classList.toggle("on",l==="id");
if(typeof renderMenu==="function")renderMenu();}
function toast(m,ok=true){const t=$("toast");t.textContent=m;
t.style.borderColor=ok?"#4caf50":"#f44336";t.style.display="block";
clearTimeout(t._h);t._h=setTimeout(()=>t.style.display="none",2600);}
function setStatus(m){$("stL").textContent=m;}
async function needToken(){TOKEN=await customPrompt(t("tokenPrompt"))||"";localStorage.setItem("rw_token",TOKEN);}
const urlFor=p=>"/"+String(p||"").replace(/^\/+/g,"").split("/").map(encodeURIComponent).join("/");
async function api(path,opt={}){
  opt.headers=Object.assign({},opt.headers||{});
  if(TOKEN)opt.headers["Authorization"]="Bearer "+TOKEN;
  const r=await fetch(path,opt);
  if(r.status===401&&!opt._retry){await needToken();opt._retry=1;return api(path,opt);}
  return r;
}
const LANGS={py:"python",js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",
html:"html",htm:"html",css:"css",scss:"scss",json:"json",md:"markdown",yml:"yaml",yaml:"yaml",
xml:"xml",go:"go",php:"php",cs:"csharp",c:"c",cpp:"cpp",h:"cpp",hpp:"cpp",java:"java",
rb:"ruby",rs:"rust",sh:"shell",bash:"shell",sql:"sql",txt:"plaintext",vue:"html"};
const langOf=p=>LANGS[(p.split(".").pop()||"").toLowerCase()]||"plaintext";
/* ---------- tree ---------- */
async function loadDir(path){
  const r=await api(urlFor(path)+"?format=json");
  if(!r.ok)throw new Error(t("errRead")+path);
  return r.json();
}
function renderTree(){
  const t=$("tree");t.innerHTML="";
  buildLevel(t,"",0);
}
async function buildLevel(el,path,depth){
  let items;
  try{items=await loadDir(path);}catch(e){toast(e.message,false);return;}
  treeCache[path]=items;
  for(const it of items){
    const full=path?path+"/"+it.name:it.name;
    const d=document.createElement("div");
    d.className="nd";d.style.paddingLeft=(8+depth*16)+"px";
    d.dataset.path=full;d.dataset.type=it.type;
    d.innerHTML=`<span class="tw">${it.type==="dir"?"▶":""}</span>
      <span>${it.type==="dir"?"📁":"📄"}</span><span class="nm">${esc(it.name)}</span>`;
    if(it.type==="dir"){
      d.onclick=e=>{e.stopPropagation();toggleDir(d,full);};
      d.oncontextmenu=e=>ctxMenu(e,full,"dir");
    }else{
      d.onclick=()=>openFile(full);
      d.oncontextmenu=e=>ctxMenu(e,full,"file");
    }
    el.appendChild(d);
  }
}
function toggleDir(d,full){
  const tw=d.querySelector(".tw");
  const open=d.classList.toggle("open");
  tw.textContent=open?"▼":"▶";
  let sub=d.nextSibling;
  if(open){
    const wrap=document.createElement("div");
    const depth=(parseInt(d.style.paddingLeft)-8)/16+1;
    d.parentNode.insertBefore(wrap,d.nextSibling);
    d._sub=wrap;buildLevel(wrap,full,depth);
  }else if(d._sub){d._sub.remove();d._sub=null;}
}
/* ---------- tabs & editor ---------- */
function ensureEditor(cb){
  if(editor){cb&&cb();return;}
  const done=()=>{cb&&cb();};
  if(typeof require==="undefined"){makeTextarea();done();return;}
  require.config({paths:{vs:"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"}});
  require(["vs/editor/editor.main"],()=>{
    MONACO_OK=true;
    editor=monaco.editor.create($("editor"),{theme:"vs-dark",automaticLayout:true,
      fontSize:14,minimap:{enabled:true}});
    editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,()=>saveFile());
    done();
  },()=>{makeTextarea();done();});
}
function makeTextarea(){
  const ta=document.createElement("textarea");
  $("editor").innerHTML="";$("editor").appendChild(ta);
  ta.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="s"){e.preventDefault();saveFile();}});
  ta.addEventListener("input",()=>{if(activePath){const m=modelMap[activePath];
    m.content=ta.value;m.dirty=true;renderTabs();}});
  editor={_ta:ta,getValue:()=>ta.value,setValue:v=>{ta.value=v;}};
}
async function openFile(path){
  ensureEditor(async()=>{
    if(!openTabs.includes(path)){
      const r=await api(urlFor(path));
      if(!r.ok){toast(t("errOpen")+path,false);return;}
      const txt=await r.text();
      modelMap[path]={content:txt,dirty:false};
      openTabs.push(path);
    }
    activePath=path;renderTabs();showInEditor();
  });
}
function showInEditor(){
  const w=$("welcome");if(w)w.style.display="none";
  const m=modelMap[activePath];
  if(!m)return;
  if(MONACO_OK&&window.monaco){
    const uri=monaco.Uri.parse("inmemory://"+activePath.replace(/[^a-zA-Z0-9/_.-]/g,"_"));
    let model=monaco.editor.getModel(uri);
    if(!model){
      model=monaco.editor.createModel(m.content,langOf(activePath),uri);
      model._musePath=activePath;
      model.onDidChangeContent(()=>{
        const mm=modelMap[model._musePath];
        if(mm&&!mm._suppress){mm.content=model.getValue();mm.dirty=true;renderTabs();}
      });
    }
    m._suppress=true;
    if(model.getValue()!==m.content)model.setValue(m.content);
    m._suppress=false;m.dirty=false;
    editor.setModel(model);
  }else if(editor){
    editor.setValue(m.content);m.dirty=false;
  }
  $("crumb").textContent=activePath;
  $("stR").textContent=langOf(activePath);
  document.querySelectorAll(".nd").forEach(n=>n.classList.toggle("sel",n.dataset.path===activePath));
  renderTabs();
}
function renderTabs(){
  const t=$("tabs");t.innerHTML="";
  for(const p of openTabs){
    const d=document.createElement("div");
    d.className="tab"+(p===activePath?" on":"");
    const m=modelMap[p];
    d.innerHTML=`<span>${esc(p.split("/").pop())}</span>${m.dirty?'<i class="dt">●</i>':""}<span class="x">×</span>`;
    d.onclick=e=>{if(e.target.classList.contains("x"))closeTab(p);else{activePath=p;showInEditor();renderTabs();}};
    t.appendChild(d);
  }
}
async function closeTab(p){
  const m=modelMap[p];
  if(m.dirty&&!(await customConfirm(p.split("/").pop()+t("unsavedClose"))))return;
  openTabs=openTabs.filter(x=>x!==p);delete modelMap[p];
  if(activePath===p){activePath=openTabs[openTabs.length-1]||null;
    if(activePath)showInEditor();else location.reload();}
  renderTabs();
}
async function saveFile(){
  if(!activePath)return;
  const m=modelMap[activePath];
  if(MONACO_OK&&window.monaco&&editor.getModel)m.content=editor.getModel().getValue();
  else m.content=editor.getValue();
  setStatus(t("saving"));
  const r=await api(urlFor(activePath),{method:"PUT",body:m.content});
  if(r.ok){m.dirty=false;renderTabs();setStatus(t("saved"));toast(t("saved"));}
  else{setStatus(t("saveFail"));toast(t("saveFail")+": "+r.status,false);}
}
/* ---------- actions ---------- */
async function newFile(){
  const dir=await customPrompt(t("destFolder"),"");if(dir===null)return;
  const name=await customPrompt(t("fileName"));if(!name||!name.trim())return;
  const cleanDir=dir.trim().replace(/^\/|\/$/g,"");
  const cleanName=name.trim().replace(/^\/+/g,"");
  const p=(cleanDir?cleanDir+"/":"")+cleanName;
  const r=await api(urlFor(p),{method:"PUT",body:""});
  if(r.ok){toast(t("created"));treeCache={};renderTree();openFile(p);}else toast(t("failed")+r.status,false);
}
async function newDir(){
  const p=await customPrompt(t("newFolderPath"));if(!p||!p.trim())return;
  const clean=p.trim().replace(/^\/|\/$/g,"");
  const r=await api("/api/mkdir",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({path:clean})});
  if(r.ok){toast(t("folderCreated"));treeCache={};renderTree();}else toast(t("failed")+r.status,false);
}
async function delPath(path,type){
  if(!(await customConfirm(`${t("delConfirm")} ${type} "${path}"?`)))return;
  const r=await api(urlFor(path),{method:"DELETE"});
  if(r.ok){toast(t("deleted"));if(openTabs.includes(path))closeTab(path);treeCache={};renderTree();}
  else toast(t("failed")+r.status,false);
}
async function renamePath(path,type){
  const old=path.split("/").pop();
  const n=await customPrompt(`${t("renameTo")} ${type} "${old}":`,old);
  if(!n||n===old)return;
  const dir=path.split("/").slice(0,-1).join("/");
  await doMove(path,dir?dir+"/"+n:n);
}
async function doMove(from,to){
  const r=await api("/api/move",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({from:"/"+from,to:"/"+to})});
  if(r.ok){
    toast(t("moved"));
    const i=openTabs.indexOf(from);
    if(i>=0){
      openTabs[i]=to;modelMap[to]=modelMap[from];delete modelMap[from];
      if(activePath===from)activePath=to;
    }
    treeCache={};renderTree();renderTabs();
    if(activePath)showInEditor();
  }else toast(t("failed")+r.status,false);
  return r.ok;
}
/* ---- dialog pindah dengan pemilih folder ---- */
let mvSrc="",mvCur="";
async function openMoveDialog(path,type){
  mvSrc=path;mvCur="";
  const name=path.split("/").pop();
  $("mvTitle").textContent=`📂 ${t("moveTitle")} ${type}: ${name}`;
  $("mvName").value=name;
  $("mvm").style.display="flex";
  await mvRender();
}
async function mvRender(){
  $("mvDest").textContent="/"+(mvCur||"");
  const list=$("mvList");list.innerHTML=`<div class='mvrow'>${esc(t("loading"))}</div>`;
  const items=await loadDir(mvCur).catch(()=>[]);
  treeCache[mvCur]=items;
  list.innerHTML="";
  if(mvCur){
    const up=document.createElement("div");up.className="mvrow";
    up.innerHTML=t("up");
    up.onclick=()=>{mvCur=mvCur.split("/").slice(0,-1).join("/");mvRender();};
    list.appendChild(up);
  }
  let any=false;
  for(const it of items){
    if(it.type!=="dir")continue;any=true;
    const full=mvCur?mvCur+"/"+it.name:it.name;
    // jangan tampilkan folder asal beserta isinya (mencegah pindah ke dalam diri sendiri)
    if(mvSrc===full||mvSrc.startsWith(full+"/"))continue;
    const r=document.createElement("div");r.className="mvrow";
    r.innerHTML=`📁 ${esc(it.name)}`;
    r.ondblclick=()=>{mvCur=full;mvRender();};
    r.onclick=()=>{mvCur=full;mvRender();};
    list.appendChild(r);
  }
  if(!any&&!mvCur)list.innerHTML=`<div class='mvrow' style='color:var(--dim)'>${esc(t("noFolders"))}</div>`;
}
$("mvCancel").onclick=()=>$("mvm").style.display="none";
$("mvm").addEventListener("click",e=>{if(e.target.id==="mvm")$("mvm").style.display="none";});
$("mvNewDir").onclick=async()=>{
  const n=await customPrompt(`${t("newFolderIn")}${mvCur||""} :`);
  if(!n)return;
  const p=mvCur?mvCur+"/"+n:n;
  const r=await api("/api/mkdir",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({path:"/"+p})});
  if(r.ok){toast(t("folderCreated"));await mvRender();}else toast(t("failed")+r.status,false);
};
$("mvOk").onclick=async()=>{
  const name=$("mvName").value.trim();
  if(!name){toast(t("nameEmpty"),false);return;}
  const to=mvCur?mvCur+"/"+name:name;
  if(to===mvSrc){$("mvm").style.display="none";return;}
  $("mvm").style.display="none";
  await doMove(mvSrc,to);
};
async function copyPath(path,type){
  const suggest=path.replace(/(\.[^./]+)?$/,"-copy$1");
  const to=await customPrompt(`${t("copyTo")} ${type}:`,suggest);
  if(!to||to===path)return;
  const clean=to.replace(/^\/+/,"");
  const r=await api("/api/copy",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({from:"/"+path,to:"/"+clean})});
  if(r.ok){toast(t("copied"));treeCache={};renderTree();}
  else toast(t("failed")+r.status,false);
}
function ctxMenu(e,path,type){
  e.preventDefault();
  const c=$("ctx");c.innerHTML="";
  const items=type==="dir"?
    [[t("mNewFile"),async()=>{const n=await customPrompt(t("fileName"));if(n&&n.trim()){const f=(path?path+"/":"")+n.trim().replace(/^\/+/g,"");const r=await api(urlFor(f),{method:"PUT",body:""});if(r.ok){toast(t("created"));treeCache={};renderTree();openFile(f);}else toast(t("failed")+r.status,false);}}],
     [t("mNewFolder"),async()=>{const n=await customPrompt(t("folderName"));if(n&&n.trim()){const f=(path?path+"/":"")+n.trim().replace(/^\/+/g,"");const r=await api("/api/mkdir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:f})});if(r.ok){toast(t("folderCreated"));treeCache={};renderTree();}else toast(t("failed")+r.status,false);}}],
     [t("mRename"),()=>renamePath(path,"folder")],
     [t("mMove"),()=>openMoveDialog(path,"folder")],
     [t("mCopy"),()=>copyPath(path,"folder")],
     [t("mDelFolder"),()=>delPath(path,"folder")]]
    :[[t("mOpen"),()=>openFile(path)],
     [t("mRename"),()=>renamePath(path,"file")],
     [t("mMove"),()=>openMoveDialog(path,"file")],
     [t("mCopy"),()=>copyPath(path,"file")],
     [t("mDelFile"),()=>delPath(path,"file")]];
  for(const [label,fn] of items){const d=document.createElement("div");d.textContent=label;
    d.onclick=()=>{c.style.display="none";fn();};c.appendChild(d);}
  c.style.display="block";c.style.left=e.clientX+"px";c.style.top=e.clientY+"px";
}
document.addEventListener("click",()=>$("ctx").style.display="none");
/* upload */
$("bUp").onclick=()=>$("upfile").click();
$("upfile").onchange=async e=>{
  const files=e.target.files;if(!files.length)return;
  const dest=await customPrompt(t("uploadTo"),"");if(dest===null)return;
  for(const f of files){
    const fd=new FormData();fd.append("f",f);
    const r=await api(`/upload?path=${encodeURIComponent("/"+dest)}`,{method:"POST",body:fd});
    toast(f.name+(r.ok?" ✓":t("uploadFail")),r.ok);
  }
  renderTree();e.target.value="";
};
/* drag & drop */
["dragover","dragenter"].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();}));
document.addEventListener("drop",async e=>{
  e.preventDefault();
  if(!e.dataTransfer.files.length)return;
  if(!(await customConfirm(`${t("uploadN")} ${e.dataTransfer.files.length} file(s)?`)))return;
  for(const f of e.dataTransfer.files){
    const fd=new FormData();fd.append("f",f);
    await api("/upload?path=/",{method:"POST",body:fd});
  }
  toast(t("uploadDone"));renderTree();
});
/* quick open */
let palIdx=0,palItems=[];
async function collectFiles(path,acc){
  const items=treeCache[path]||await loadDir(path).catch(()=>[]);
  treeCache[path]=items;
  for(const it of items){
    const full=path?path+"/"+it.name:it.name;
    if(it.type==="file")acc.push(full);else await collectFiles(full,acc);
  }
}
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="p"){e.preventDefault();openPalette();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveFile();}
  if(e.key==="Escape"){$("palette").style.display="none";hideHelp();}
});
async function openPalette(){
  $("palette").style.display="block";$("pin").value="";$("pin").focus();
  setStatus(t("loadingList"));
  const all=[];await collectFiles("",all);
  palItems=all;setStatus(all.length+" "+t("filesN"));renderPal("");
  $("pin").oninput=e=>renderPal(e.target.value.toLowerCase());
  $("pin").onkeydown=e=>{
    if(e.key==="ArrowDown"){palIdx=Math.min(palIdx+1,palItems.length-1);renderPalActive();}
    if(e.key==="ArrowUp"){palIdx=Math.max(palIdx-1,0);renderPalActive();}
    if(e.key==="Enter"&&palItems[palIdx]){$("palette").style.display="none";openFile(palItems[palIdx]);}
  };
}
function renderPal(q){
  palIdx=0;
  palItems=(palItems).filter(p=>p.toLowerCase().includes(q)).slice(0,50);
  const pl=$("plist");pl.innerHTML="";
  palItems.forEach((p,i)=>{
    const d=document.createElement("div");d.className="pi"+(i===0?" on":"");d.textContent=p;
    d.onclick=()=>{$("palette").style.display="none";openFile(p);};
    pl.appendChild(d);
  });
}
function renderPalActive(){
  document.querySelectorAll("#plist .pi").forEach((d,i)=>d.classList.toggle("on",i===palIdx));
  document.querySelector("#plist .pi.on")?.scrollIntoView({block:"nearest"});
}
/* ---------- VS Code-style menubar ---------- */
let menuOpen=null;
function toggleSide(){$("side").style.display=$("side").style.display==="none"?"":"none";}
function showHelp(){$("helpTitleEl").textContent=t("helpTitle");const b=$("helpBody");
b.innerHTML=`<h4>${esc(t("hGuide"))}</h4><div>1. ${esc(t("guide1"))}<br>2. ${esc(t("guide2"))}<br>3. ${esc(t("guide3"))}<br>4. ${esc(t("guide4"))}</div>`+
`<h4>${esc(t("hKeys"))}</h4><table>`+
`<tr><td><kbd>Ctrl+S</kbd></td><td>${esc(t("keySave"))}</td></tr>`+
`<tr><td><kbd>Ctrl+P</kbd></td><td>${esc(t("keyOpen"))}</td></tr>`+
`<tr><td><kbd>Esc</kbd></td><td>${esc(t("keyEsc"))}</td></tr></table>`;
$("help").style.display="flex";}
function showAbout(){$("helpTitleEl").textContent=t("aboutTitle");const b=$("helpBody");
b.innerHTML=`<div style="text-align:center;padding:8px 0"><img src="/static/assets/images/logo.webp" alt="logo" style="height:64px;width:64px;border-radius:12px">`+
`<div style="font-size:16px;margin-top:8px"><b>jetdrop</b> v1.0</div></div>`+
`<div>${t("aboutBody")}</div>`;
$("help").style.display="flex";}
function hideHelp(){$("help").style.display="none";}
function menus(){return[
 {id:"file",label:t("mFile"),items:[
  {label:t("miNewFile"),fn:newFile},
  {label:t("miNewFolder"),fn:newDir},
  {sep:1},
  {label:t("miUpload"),fn:()=>$( "upfile").click()},
  {sep:1},
  {label:t("miSave"),key:"Ctrl+S",fn:saveFile},
  {label:t("miRefresh"),fn:()=>{treeCache={};renderTree();}}]},
 {id:"view",label:t("mView"),items:[
  {label:t("miPalette"),key:"Ctrl+P",fn:openPalette},
  {label:t("miSidebar"),fn:toggleSide}]},
 {id:"help",label:t("mHelp"),items:[{label:t("miHelp"),fn:showHelp},{label:t("miAbout"),fn:showAbout}]}];}
function renderMenu(){
  const bar=$("menubar");bar.innerHTML="";menuOpen=null;$("menudrop").style.display="none";
  for(const m of menus()){
    const w=document.createElement("div");w.className="mb";
    const b=document.createElement("button");b.textContent=m.label;
    b.onclick=e=>{e.stopPropagation();openDropdown(m,w);};
    b.onmouseenter=()=>{if(menuOpen&&menuOpen!==m.id)openDropdown(m,w);};
    w.appendChild(b);bar.appendChild(w);
  }
}
function openDropdown(m,wrap){
  menuOpen=m.id;
  document.querySelectorAll(".mb").forEach(x=>x.classList.remove("open"));
  wrap.classList.add("open");
  const d=$("menudrop");d.innerHTML="";
  const r=wrap.getBoundingClientRect();d.style.left=r.left+"px";d.style.top=(r.bottom+4)+"px";
  for(const it of m.items){
    if(it.sep){const s=document.createElement("div");s.className="sep";d.appendChild(s);continue;}
    const row=document.createElement("div");row.className="mi";
    row.innerHTML=`<span>${esc(it.label)}</span>${it.key?`<span class="k">${esc(it.key)}</span>`:""}`;
    row.onclick=()=>{d.style.display="none";menuOpen=null;wrap.classList.remove("open");it.fn();};
    d.appendChild(row);
  }
  d.style.display="block";
}
document.addEventListener("click",e=>{if(!e.target.closest("#menudrop")&&!e.target.closest(".mb")){$("menudrop").style.display="none";menuOpen=null;document.querySelectorAll(".mb").forEach(x=>x.classList.remove("open"));}});
/* init */
$("bNewFile").onclick=newFile;$("bNewDir").onclick=newDir;$("bRef").onclick=()=>{treeCache={};renderTree();};
$("topsearch").onclick=openPalette;
$("helpClose").onclick=hideHelp;$("helpX").onclick=hideHelp;
$("help").addEventListener("click",e=>{if(e.target.id==="help")hideHelp();});
$("srvinfo").textContent="· "+location.host;
$("langEn").onclick=()=>{setLang("en");setStatus(t("readyBar"));};
$("langId").onclick=()=>{setLang("id");setStatus(t("readyBar"));};
setLang(LANG);
renderMenu();
(async()=>{
  if(!TOKEN)await needToken();
  renderTree();
  setStatus(t("readyBar"));
})();
