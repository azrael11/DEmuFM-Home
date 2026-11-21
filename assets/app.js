'use strict';
/**
 * DEmuFM Next v0.4.1 — dependency-free bilingual static frontend.
 * Only Arcade is advertised. Current playable status is owner-confirmed; earlier notes, if supplied, are archival.
 * No secrets, GitHub tokens, account data, analytics or authentication in the browser.
 */
(() => {
  const ROOT = 'https://azrael11.github.io/DEmuFM-Home/';
  const LEGACY_DATA_URL = 'https://raw.githubusercontent.com/azrael11/DEmuFM-Home/main/compatibility/arcade.json';
  const RELEASE_API = 'https://api.github.com/repos/azrael11/DEmuFM/releases?per_page=20';
  const PAGE_SIZE = 24;
  // 1942 GR is an unfinished OpenGL experiment: never display it as supported.
  const EXCLUDED_ROMS = new Set(['1942', '1942gr']);
  const $ = (id) => document.getElementById(id);
  const el = (tag, classes, text) => {
    const node = document.createElement(tag);
    if (classes) node.className = classes;
    if (text !== undefined) node.textContent = String(text ?? '');
    return node;
  };
  const state = {lang:'en', games:[], source:'', search:'', status:'all', maker:'all', sort:'name', layout:'grid', limit:PAGE_SIZE, releases:[], releaseSource:'', releaseState:'loading', media:{}, gameDetails:{}};
  const pages = [...document.querySelectorAll('[data-page]')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const staticEnglish = {};
  for (const node of document.querySelectorAll('[data-i18n]')) {
    if (!(node.dataset.i18n in staticEnglish)) staticEnglish[node.dataset.i18n] = node.textContent;
  }
  const placeholdersEnglish = {};
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    placeholdersEnglish[node.dataset.i18nPlaceholder] = node.placeholder;
  }
  const messages = window.DEMUFM_I18N || {en:{},el:{}};
  function t(key, params = {}) {
    const source = messages[state.lang] || messages.en;
    const template = source[key] ?? messages.en[key] ?? staticEnglish[key] ?? placeholdersEnglish[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_,k) => String(params[k] ?? ''));
  }
  function applyLanguage(lang) {
    state.lang = lang === 'el' ? 'el' : 'en';
    document.documentElement.lang = state.lang;
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
    for (const button of document.querySelectorAll('[data-lang]')) {
      const selected = button.dataset.lang === state.lang;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    $('dialog-close').setAttribute('aria-label',t('modalClose'));
    $('back-to-top').setAttribute('aria-label',t('backToTop'));
    $('back-to-top').title=t('backToTop');
    $('game-search').setAttribute('aria-label',t('searchPlaceholder'));
    $('dataset-indicator').textContent = state.source ? t('datasetIndicator',{source:t(state.source),count:state.games.length}) : t('loadingRecords');
    $('release-source').textContent = state.releaseSource ? t(state.releaseSource) : t('releaseChecking');
    renderCounts(); renderGames(); renderPreview(); renderSystems(); renderReleases(); route(false);
  }
  // The project owner has confirmed the displayed catalogue is playable.
  // Do not infer current status from the obsolete original 'status' text field.
  function statusOf(_game) { return 'playable'; }
  const statusLabel = {playable:'statusPlayable'};
  const allowedArt = /^https:\/\/azrael11\.github\.io\/DEmuFM-Home\/compatibility\/arcade\/imgs\/[a-z0-9_ -]+\.(?:jpg|jpeg|png)$/i;
  function approvedImage(value) {
    const source=String(value||'');
    if (/^assets\/game-media\/[a-z0-9_-]+\/[a-z0-9_.-]+\.(?:png|jpg|jpeg|webp)$/i.test(source)) return source;
    if (/^https:\/\/azrael11\.github\.io\/DEmuFM-Home\/(?:compatibility\/arcade\/imgs|img\/gallery)\/[a-z0-9_ .-]+\.(?:png|jpg|jpeg|webp)$/i.test(source)) return source;
    return '';
  }
  function pictureFor(game) {
    const custom=approvedImage(state.media[game.rom]?.cover);
    if (custom) return custom;
    const original=String(game.image||'');
    if (allowedArt.test(original)) return original;
    if (!/^[a-z0-9_-]+$/i.test(game.rom)) return '';
    return `${ROOT}compatibility/arcade/imgs/${game.rom}.jpg`;
  }
  function addImageFallback(img, source) {
    let triedAlternate=false;
    img.addEventListener('error', () => {
      if(!triedAlternate && /\.(png|jpe?g)$/i.test(source)) {
        triedAlternate=true;
        const alt=/\.png$/i.test(source)?source.replace(/\.png$/i,'.jpg'):source.replace(/\.jpe?g$/i,'.png');
        img.src=alt;
      } else img.remove();
    });
  }
  function makeArt(game) {
    const art=el('div','game-art');
    const fallback=el('span','art-fallback',(game.name || '?').slice(0,1).toUpperCase());fallback.setAttribute('aria-hidden','true');art.append(fallback);
    const image=pictureFor(game);
    if (image) {const img=el('img');img.loading='lazy';img.decoding='async';img.alt='';img.src=image;addImageFallback(img,image);art.append(img);}
    art.append(el('span',`game-status ${statusOf(game)}`,t(statusLabel[statusOf(game)])));
    return art;
  }
  function makeCard(game, quick=false) {
    const item=el(quick?'button':'a','game-card');
    if(quick){item.type='button';item.addEventListener('click',()=>openGame(game));}
    else item.href=`#game/${encodeURIComponent(game.rom)}`;
    item.setAttribute('aria-label',t(quick?'modalView':'detailOpen',{name:game.name}));
    const info=el('div','game-details');
    info.append(el('div','maker',game.manufactor || t('unknownMaker')),el('h3','',game.name),el('p','',`ROM / ${game.rom}`));
    item.append(makeArt(game),info);return item;
  }
  function validGame(g) {return g && typeof g.name==='string' && typeof g.rom==='string' && /^[a-z0-9_-]{1,60}$/i.test(g.rom);}
  async function fetchJson(url, timeoutMs=6000) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try {const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}
    finally {clearTimeout(timeout);}
  }
  async function loadGames() {
    const sources=[['data/arcade.json','dataLocal',1800],[LEGACY_DATA_URL,'dataOnline',5000],['data/demo.json','dataDemo',1800]];
    for (const [url,label,timeout] of sources) {
      try {
        const data=await fetchJson(url,timeout);
        if (!Array.isArray(data)||!data.length||!data.every(validGame))throw new Error('Invalid arcade catalogue');
        const supported = data.filter(g=>!EXCLUDED_ROMS.has(g.rom.toLowerCase()));
        state.games=supported.map(g=>({
          ...g, status:'Playable',
          legacyStatus:typeof g.legacyStatus==='string' ? g.legacyStatus : (g.status && !/^playable$/i.test(g.status.trim()) ? g.status : '')
        }));state.source=label;
        $('dataset-indicator').textContent=t('datasetIndicator',{source:t(label),count:supported.length});
        $('home-record-count').textContent=String(supported.length);
        renderCounts();renderGames();renderPreview();route(false);
        if(label==='dataDemo')notify(t('demoNotice'));
        return;
      } catch(error) {console.info(`Arcade catalogue source not loaded: ${url}`,error.message);}
    }
    $('dataset-indicator').textContent=t('dataUnavailable');
    $('results-count').textContent=t('dataLoadFail');
    $('game-grid').replaceChildren();$('home-game-preview').replaceChildren();
  }
  function renderCounts() {
    const totals={all:state.games.length,playable:state.games.length};
    Object.entries(totals).forEach(([status,count])=>{const elem=$(`count-${status}`);if(elem)elem.textContent=String(count);});
    const select=$('maker-filter');const previous=state.maker;
    const makers=[...new Set(state.games.map(g=>g.manufactor || t('unknownMaker')))];makers.sort((a,b)=>a.localeCompare(b));
    select.replaceChildren();const all=el('option','',t('allMakers'));all.value='all';select.append(all);
    for(const maker of makers){const o=el('option','',maker);o.value=maker;select.append(o);}
    select.value=previous;
  }
  function filteredGames() {
    const search=state.search.toLocaleLowerCase();
    const games=state.games.filter(g=>{
      if(state.status!=='all'&&statusOf(g)!==state.status)return false;
      if(state.maker!=='all'&&(g.manufactor||t('unknownMaker'))!==state.maker)return false;
      return `${g.name} ${g.rom} ${g.manufactor||''}`.toLocaleLowerCase().includes(search);
    });
    const sorter={name:(a,b)=>a.name.localeCompare(b.name), 'name-desc':(a,b)=>b.name.localeCompare(a.name), manufacturer:(a,b)=>(a.manufactor||'').localeCompare(b.manufactor||'')||a.name.localeCompare(b.name)};
    return games.sort(sorter[state.sort]||sorter.name);
  }
  function renderGames() {
    const matches=filteredGames(),visible=matches.slice(0,state.limit),grid=$('game-grid');
    grid.classList.toggle('list-view',state.layout==='list');grid.replaceChildren(...visible.map(makeCard));
    $('results-count').textContent=state.games.length ? t('recordCount',{visible:visible.length,total:matches.length}) : t('loadingRecords');
    $('empty-state').hidden=!!matches.length || !state.games.length;
    $('load-actions').hidden=!matches.length;$('load-more').hidden=visible.length>=matches.length;
    $('pagination-label').textContent=`${visible.length} / ${matches.length}`;
  }
  function renderPreview() {
    const picks=['pacman','arkanoid','outrun','goldnaxe'];const games=picks.map(rom=>state.games.find(g=>g.rom===rom)).filter(Boolean);
    if(games.length<4)games.push(...state.games.filter(g=>!games.includes(g)).slice(0,4-games.length));
    $('home-game-preview').replaceChildren(...games.map(g=>makeCard(g,true)));
  }
  function resetFilters() {
    Object.assign(state,{search:'',status:'all',maker:'all',sort:'name',limit:PAGE_SIZE});
    $('game-search').value='';$('maker-filter').value='all';$('game-sort').value='name';
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));renderGames();
  }
  function metaPair(label,value) {
    const box=el('div','detail-meta-item');
    box.append(el('small','',label),el('strong','',value||t('unknown')));return box;
  }
  function gameArtImage(game,className='') {
    const frame=el('div',className);
    frame.append(el('span','detail-image-fallback',game.name.slice(0,1).toUpperCase()));
    const src=pictureFor(game);
    if(src){const img=el('img');img.src=src;img.alt=game.name;img.loading='lazy';img.decoding='async';addImageFallback(img,src);frame.append(img);}
    return frame;
  }
  function appendArchivedNotes(parent,game) {
    const notes=String(game.legacyStatus||'').trim();
    if (!notes || /^(Everything seems ok\.?|As it is)$/i.test(notes)) return;
    const details=el('details','detail-archive'),summary=el('summary','',t('detailLegacy'));
    details.append(summary,el('p','',t('detailLegacyNote')),el('pre','',notes));parent.append(details);
  }
  function openGame(game) {
    const modal=$('game-dialog'),content=$('dialog-content');content.replaceChildren();
    const top=el('div','dialog-hero'),title=el('div');
    title.append(el('div','dialog-kicker',`${(game.manufactor||t('unknownMaker')).toUpperCase()} / ARCADE`),el('h2','',game.name),el('span','game-status playable',t('statusPlayable')));
    top.append(title);const image=pictureFor(game);
    if(image){const img=el('img');img.src=image;img.alt='';addImageFallback(img,image);top.append(img);}
    const body=el('div','dialog-body'),meta=el('div','dialog-meta');
    for(const [name,value] of [[t('detailROM'),game.rom],[t('detailMaker'),game.manufactor||t('unknown')],[t('detailFPS'),t('detailFPSValue')]]) meta.append(el('span','',`${name}: ${value}`));
    body.append(meta,el('p','dialog-current-note',t('detailPlayabilityNote')),el('p','dialog-info',t('detailFPSNote')));
    appendArchivedNotes(body,game);
    const actions=el('div','dialog-foot'),internal=el('a','btn btn-primary',t('modalOriginalLink'));
    internal.href=`#game/${encodeURIComponent(game.rom)}`;
    internal.addEventListener('click',()=>modal.close());actions.append(internal);body.append(actions);content.append(top,body);
    if(typeof modal.showModal==='function')modal.showModal();
  }
  function gameMedia(game) {
    const owner=state.media[game.rom]?.screenshots||[];
    const archived=state.gameDetails[game.rom]?.screenshots||[];
    return [...new Set([...owner,...archived])].filter(src=>approvedImage(src)).slice(0,12);
  }
  function renderGamePage(rom) {
    const root=$('game-page-content');root.replaceChildren();
    const game=state.games.find(g=>g.rom.toLowerCase()===String(rom).toLowerCase());
    if(!game) {
      const missing=el('div','detail-not-found');
      missing.append(el('div','eyebrow','DEmuFM / ARCADE'),el('h1','',t('detailMissingTitle')),el('p','',state.games.length?t('detailMissingBody'):t('loadingRecords')));
      const back=el('a','btn btn-outline',t('detailBack'));back.href='#compatibility';missing.append(back);root.append(missing);return;
    }
    const back=el('a','subpage-back',`←  ${t('detailBack')}`);back.href='#compatibility';root.append(back);
    const hero=el('div','detail-game-hero');
    const intro=el('div','detail-game-copy');
    intro.append(el('div','eyebrow',t('detailSupported')+'  /  '+game.rom.toUpperCase()));
    intro.append(el('h1','',game.name));
    intro.append(el('p','',t('detailHeroSub')));
    const score=el('div','detail-score-row');
    const played=el('div','detail-score-block');played.append(el('small','',t('detailStatus')),el('strong','detail-score-playable',t('statusPlayable')));
    const frame=el('div','detail-score-block');frame.append(el('small','',t('detailFPS')),el('strong','',t('detailFPSValue')),el('span','',t('detailFPSNote')));
    score.append(played,frame);intro.append(score);hero.append(intro,gameArtImage(game,'detail-primary-art'));root.append(hero);
    const content=el('div','detail-panels');
    const properties=el('article','detail-info-panel');properties.append(el('div','eyebrow','/ 01 — ARCADE'),el('h2','',t('detailProperties')));
    const list=el('div','detail-properties-list');
    const extra=state.gameDetails[game.rom]||{};
    list.append(metaPair(t('detailROM'),game.rom),metaPair(t('detailMaker'),game.manufactor));
    for(const [key,label] of [['year','detailYear'],['developer','detailDeveloper'],['publisher','detailPublisher'],['genre','detailGenre'],['players','detailPlayers'],['coop','detailCoop']]) {
      if(typeof extra[key]==='string' && extra[key].trim()) list.append(metaPair(t(label),extra[key]));
    }
    list.append(metaPair(t('detailHiscore'),game.hiscore||t('unknown')));
    properties.append(list,el('p','detail-panel-note',t('detailPlayabilityNote')));
    const gallery=el('article','detail-gallery-panel');gallery.append(el('div','eyebrow','/ 02 — MEDIA'),el('h2','',t('detailScreenshots')));
    const photos=gameMedia(game);
    const galleryGrid=el('div','detail-screenshot-grid');
    if(photos.length) {
      for (const [i,src] of photos.entries()) {
        const frame=el('figure','detail-screenshot');const image=el('img');image.loading='lazy';image.src=src;image.alt=`${game.name} ${t('detailScreenshots')} ${i+1}`;
        addImageFallback(image,src);frame.append(image);galleryGrid.append(frame);
      }
    } else {
      const preview=gameArtImage(game,'detail-gallery-placeholder');galleryGrid.append(preview);
      galleryGrid.append(el('div','detail-screenshot-empty',t('detailNoScreenshots')));
    }
    gallery.append(galleryGrid,el('p','detail-panel-note',t('detailImagesFrom')));
    content.append(properties,gallery);root.append(content);
    if(typeof extra.description==='string' && extra.description.trim()) {
      const desc=el('article','detail-description-panel');
      desc.append(el('div','eyebrow','/ 03 — HISTORY'),el('h2','',t('detailDescription')),el('p','',extra.description));
      root.append(desc);
    }
    appendArchivedNotes(root,game);
    const all=[...state.games].sort((a,b)=>a.name.localeCompare(b.name)),index=all.findIndex(g=>g.rom===game.rom);
    const nav=el('nav','detail-game-navigation');nav.setAttribute('aria-label',t('detailExplore'));
    const prev=all[(index-1+all.length)%all.length],next=all[(index+1)%all.length];
    for (const [target,label,cls] of [[prev,t('detailPrev'),'prev'],[next,t('detailNext'),'next']]) {
      const a=el('a',`detail-game-neighbor ${cls}`);a.href=`#game/${encodeURIComponent(target.rom)}`;
      a.append(el('small','',label),el('strong','',target.name));nav.append(a);
    }
    root.append(nav);
    document.title=`${game.name} — DEmuFM`;
  }
  async function loadGameDetails() {
    try {
      const data=await fetchJson('data/game-details.json',2200);
      if(data && typeof data==='object' && !Array.isArray(data)) state.gameDetails=data;
    } catch(e) {console.info('Optional game descriptions are not installed:',e.message);}
    route(false);
  }
  async function loadGameMedia() {
    try {
      const data=await fetchJson('data/game-media.json',1800);
      if(data && typeof data==='object' && !Array.isArray(data)) state.media=data;
    } catch(e) {console.info('No optional local game-media manifest:',e.message);}
    renderGames();renderPreview();route(false);
  }
  function renderSystems() {
    const grid=$('system-grid'),card=el('article','system-card system-card--arcade');
    card.append(el('span','system-number',t('systemNumber')),el('span','system-symbol','A'),el('h2','',t('systemArcade')),el('p','',t('systemArcadeDescription')));
    const a=el('a','system-card-link',t('systemLink'));a.href='#arcade';card.append(a);grid.replaceChildren(card);
  }
  function route(shouldScroll=true) {
    const segments=location.hash.replace(/^#\/?/,'').split(/[/?]/).filter(Boolean);
    let name=segments[0]||'home';
    if(!pages.some(p=>p.dataset.page===name))name='home';
    pages.forEach(p=>{p.hidden=p.dataset.page!==name;});
    navLinks.forEach(a=>{
      const active=a.dataset.nav===(name==='arcade'?'systems':name==='game'?'compatibility':name);
      a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    document.title=`${t('page'+name[0].toUpperCase()+name.slice(1))} — DEmuFM`;
    if(name==='game') renderGamePage(segments[1]||'');
    $('primary-nav').classList.remove('open');$('nav-toggle').setAttribute('aria-expanded','false');
    if(shouldScroll)window.scrollTo({top:0,behavior:'instant'});
  }
  function notify(message) {const toast=$('toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('visible'),3500);}
  function switchLayout(layout) {
    state.layout=layout;
    for(const [name,id] of [['grid','view-grid'],['list','view-list']]){const active=layout===name;$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
    renderGames();
  }

  // Real preview footage may be added privately at assets/media/arcade-showcase.mp4.
  // Until then, the reel cycles through screenshots / box artwork from the original site.
  function setupShowcase() {
    const slides=[...document.querySelectorAll('.showcase-slide')],video=$('showcase-video');let index=0;
    function show(next) {
      if(!video.hidden)return;
      slides[index].classList.remove('active');index=(next+slides.length)%slides.length;slides[index].classList.add('active');
      const bar=$('showcase-progress-bar');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='showcase-timer 4.8s linear forwards';
    }
    $('showcase-next').addEventListener('click',()=>show(index+1));$('showcase-prev').addEventListener('click',()=>show(index-1));
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const reel=setInterval(()=>{if(!document.hidden)show(index+1);},4800);
      window.addEventListener('pagehide',()=>clearInterval(reel),{once:true});
    }
    fetch('assets/media/arcade-showcase.mp4',{method:'HEAD',cache:'no-store'}).then(r=>{
      if(!r.ok) return;
      video.src='assets/media/arcade-showcase.mp4';video.load();
      video.addEventListener('canplay',()=>{video.hidden=false;$('showcase-slides').hidden=true;document.querySelector('.showcase-corner').firstChild.textContent='VIDEO ';}, {once:true});
      video.addEventListener('error',()=>{video.hidden=true;$('showcase-slides').hidden=false;});
    }).catch(()=>{});
  }

  function windowsAsset(name) {return /(?:windows|win64|win32|win[-_]?x64|win[-_]?x86|amd64|x64|x86)/i.test(String(name||'')) && /\.(zip|7z|exe|msi)$/i.test(name);}
  function validLocalRelease(release) {
    if(!release||typeof release.tag_name!=='string'||!Array.isArray(release.assets))return false;
    return release.assets.every(a=>a&&typeof a.name==='string'&&windowsAsset(a.name)&&typeof a.url==='string'&&/^downloads\/[A-Za-z0-9._-]+$/.test(a.url));
  }
  async function loadReleases() {
    // A locally synced manifest can safely expose selected binaries from a private code repo.
    try {
      const data=await fetchJson('data/releases.json',1800);
      if(data&&Array.isArray(data.releases)&&data.releases.every(validLocalRelease)) {
        state.releases=data.releases;state.releaseSource='releasesLocal';state.releaseState='ready';renderReleases();
        if(data.releases.length)return;
      }
    } catch(e) {console.info('Local Windows release manifest not found:',e.message);}
    // Public GitHub API works only when the repository itself is public. No credentials are sent.
    try {
      const data=await fetchJson(RELEASE_API,4200);
      if(!Array.isArray(data))throw new Error('Invalid releases payload');
      state.releases=data.filter(r=>!r.draft&&!r.prerelease).map(r=>({
        tag_name:String(r.tag_name||''),name:String(r.name||r.tag_name||''),published_at:String(r.published_at||''),
        assets:(Array.isArray(r.assets)?r.assets:[]).filter(a=>windowsAsset(a.name)&&typeof a.browser_download_url==='string'&&/^https:\/\/github\.com\/azrael11\/DEmuFM\/releases\/download\//i.test(a.browser_download_url)).map(a=>({name:a.name,size:a.size,url:a.browser_download_url}))
      })).filter(r=>r.assets.length);
      state.releaseSource='releasesPublic';state.releaseState='ready';renderReleases();
    } catch(error) {
      console.info('GitHub public release feed unavailable (expected for a private repository).',error.message);
      state.releaseSource='releasesPrivate';state.releaseState=state.releases.length?'ready':'private';renderReleases();
    }
  }
  function readableSize(bytes) {return Number.isFinite(Number(bytes))&&bytes>0?`${(Number(bytes)/1048576).toFixed(1)} MB`:'—';}
  function readableDate(value) {
    if(!value)return t('releaseDateUnknown');const date=new Date(value);if(Number.isNaN(date.getTime()))return t('releaseDateUnknown');
    return new Intl.DateTimeFormat(state.lang==='el'?'el-GR':'en-US',{year:'numeric',month:'short',day:'numeric'}).format(date);
  }
  function renderReleases() {
    const list=$('release-list');list.replaceChildren();
    $('release-source').textContent=t(state.releaseSource||'releaseChecking');
    if(!state.releases.length) {
      const title=state.releaseState==='loading'?'releaseLoading':state.releaseState==='private'?'releasesNone': 'releasesNone';
      const text=state.releaseState==='private'?'releasesPrivateSub':'releasesNoneSub';
      const empty=el('div','release-empty');empty.append(el('strong','',t(title)));
      if(state.releaseState!=='loading')empty.append(el('p','',t(text)));
      list.append(empty);return;
    }
    for(const release of state.releases) {
      const card=el('article','release-card'),header=el('div','release-card-heading');
      const heading=el('div');heading.append(el('div','release-kicker',t('releaseReady')),el('h3','',release.name||release.tag_name));
      const date=el('span','release-date',readableDate(release.published_at));header.append(heading,date);card.append(header);
      for(const asset of release.assets) {
        const line=el('div','release-asset'),info=el('div');
        info.append(el('strong','',asset.name),el('small','',`${t('releaseMetaSize')}: ${readableSize(asset.size)}`));
        const button=el('a','btn btn-primary',t('releaseDownload'));
        button.href=asset.url;button.setAttribute('download',asset.name);
        if(asset.url.startsWith('https://')){button.target='_blank';button.rel='noopener noreferrer';}
        line.append(info,button);card.append(line);
      }
      list.append(card);
    }
  }
  function bindEvents() {
    window.addEventListener('hashchange',()=>route());
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>applyLanguage(b.dataset.lang)));
    $('back-to-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
    window.addEventListener('scroll',()=>{$('back-to-top').classList.toggle('shown',window.scrollY>460);},{passive:true});
    $('nav-toggle').addEventListener('click',()=>{const open=$('primary-nav').classList.toggle('open');$('nav-toggle').setAttribute('aria-expanded',String(open));});
    $('game-search').addEventListener('input',e=>{state.search=e.target.value.trim();state.limit=PAGE_SIZE;renderGames();});
    document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.filter;state.limit=PAGE_SIZE;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderGames();}));
    $('maker-filter').addEventListener('change',e=>{state.maker=e.target.value;state.limit=PAGE_SIZE;renderGames();});
    $('game-sort').addEventListener('change',e=>{state.sort=e.target.value;state.limit=PAGE_SIZE;renderGames();});
    $('view-grid').addEventListener('click',()=>switchLayout('grid'));$('view-list').addEventListener('click',()=>switchLayout('list'));
    $('clear-filters').addEventListener('click',resetFilters);$('empty-reset').addEventListener('click',resetFilters);
    $('load-more').addEventListener('click',()=>{state.limit+=PAGE_SIZE;renderGames();});
    $('dialog-close').addEventListener('click',()=>$('game-dialog').close());
    $('game-dialog').addEventListener('click',e=>{if(e.target===$('game-dialog'))$('game-dialog').close();});
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {e.preventDefault();location.hash='#compatibility';$('game-search').focus();}});
  }
  function init() {$('year').textContent=new Date().getFullYear();bindEvents();applyLanguage('en');setupShowcase();loadGames();loadGameMedia();loadGameDetails();loadReleases();}
  document.addEventListener('DOMContentLoaded',init);
})();
