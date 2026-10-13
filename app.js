/* BizzNNovate Team Poll: vanilla JavaScript + optional Supabase persistence */
const companies = window.COMPANY_DATA || [];
const directory = new Map(companies.map(c => [c.id, c]));
const knownNames = ['Shreyas','Shantanu','Paranjay','Jeet','Govind','Rahul','Ruaplee','Srishti','Moksha','Arya','Rajnandini','Jalaj'];
const state = {
  selected: [], ballots: [], db: null, userId: null,
  loaded: false, busy: false, view: 'vote',
  search: '', sector: 'all', heat: 'all'
};
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function voterName() {
  const selected = $('voterSelect').value;
  return (selected === '__other' ? $('customName').value : selected).trim().replace(/\s+/g,' ');
}
function voterKey() { return voterName().toLocaleLowerCase('en-US'); }
function draftKey() { return `bizznnvote-draft:${voterKey() || 'anonymous'}`; }
function notice(message, isError = false) {
  $('notice').textContent = message;
  $('notice').className = isError ? 'notice error' : 'notice';
  $('notice').hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => $('notice').hidden = true, 6500);
}
function persistDraft() {
  try { localStorage.setItem(draftKey(),JSON.stringify(state.selected)); } catch (_) {}
}
function loadDraft() {
  try {
    const arr = JSON.parse(localStorage.getItem(draftKey()) || '[]');
    return Array.isArray(arr) ? [...new Set(arr.filter(id => Number.isInteger(id) && directory.has(id)))].slice(0,10) : [];
  } catch (_) { return []; }
}
function switchView(view) {
  state.view=view;
  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id===`view-${view}`));
  document.querySelectorAll('.tab-btn').forEach(e=>e.classList.toggle('active',e.dataset.view===view));
  if (view==='results') renderResults();
  window.scrollTo({top:0,behavior:'smooth'});
}
function addCompany(id) {
  if(state.selected.includes(id)) state.selected=state.selected.filter(v=>v!==id);
  else if(state.selected.length>=10){ notice('You can select up to 10. Remove one from your ballot to add another.',true);return; }
  else state.selected.push(id);
  persistDraft();renderGrid();renderBallot();
}
function moveCompany(id, delta) {
  const n=state.selected.indexOf(id); const other=n+delta;
  if(n<0||other<0||other>=state.selected.length)return;
  [state.selected[n],state.selected[other]]=[state.selected[other],state.selected[n]];
  persistDraft();renderBallot();
}
function renderGrid() {
  const match=companies.filter(c=>
    (state.sector==='all'||c.sector===state.sector)&&
    (state.heat==='all'||c.interest===state.heat)&&
    (!state.search||`${c.name} ${c.description} ${c.tech} ${c.management}`.toLowerCase().includes(state.search))
  );
  $('shownCount').textContent=`${match.length} of ${companies.length} companies`;
  $('companyGrid').innerHTML=match.map(c=>{
    const on=state.selected.includes(c.id);const label=c.interest==='High'?'Likely popular':c.interest==='Low'?'May be overlooked':'Mid interest';
    return `<article class="company-card ${on?'selected':''}">
      <div class="company-banner"><img src="${c.image}" alt="${escapeHTML(c.name)} branding from official event dossier" loading="lazy"></div>
      <div class="company-body"><div class="company-labels"><span class="number-label">COMPANY ${String(c.id).padStart(2,'0')} · ${escapeHTML(c.sector)}</span><span class="interest-label ${c.interest}" title="Estimated attention, not confirmed bidding activity">${label}</span></div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.description)}</p><div class="company-actions"><button class="card-add" data-add="${c.id}" aria-pressed="${on}">${on?'✓ In my list':'+ Add to my list'}</button><button class="card-detail" data-detail="${c.id}">Quick info ↗</button></div></div>
    </article>`;
  }).join('') || '<p class="loading">No companies match these filters.</p>';
}
function renderBallot() {
  $('selectedCount').textContent=state.selected.length;
  $('progressBar').style.width=`${state.selected.length*10}%`;
  $('rankedList').innerHTML=state.selected.length ? state.selected.map((id,n)=>{
    const c=directory.get(id);
    return `<li class="rank-row"><span class="rank-number">${n+1}</span><span class="rank-name">${escapeHTML(c.name)}<small>${escapeHTML(c.sector)}</small></span><button data-move="${id}" data-delta="-1" ${n===0?'disabled':''} title="Move up" aria-label="Move ${escapeHTML(c.name)} higher">↑</button><button data-move="${id}" data-delta="1" ${n===state.selected.length-1?'disabled':''} title="Move down" aria-label="Move ${escapeHTML(c.name)} lower">↓</button><button class="remove" data-add="${id}" title="Remove" aria-label="Remove ${escapeHTML(c.name)}">×</button></li>`;
  }).join('') : '<li class="empty-list">No companies selected yet.<br>Choose your favourites from the catalogue.</li>';
  $('submitVote').disabled=state.selected.length===0||state.busy||!state.db||!validName();
  const own=state.ballots.find(v=>v.voter_key===voterKey()&&v.owner_id===state.userId);
  $('submitVote').innerHTML=(state.busy?'Saving…':own?'Update my vote':'Submit my vote')+' <span aria-hidden="true">↗</span>';
}
function validName() {return voterName().length>=2 && voterName().length<=40;}
function syncName() {
  const name=voterName(), key=voterKey();
  const match=state.ballots.find(b=>b.voter_key===key);
  if(match && match.owner_id===state.userId) {
    state.selected=Array.isArray(match.company_ids)?match.company_ids.slice():[];
  } else state.selected=loadDraft();
  if(match && match.owner_id!==state.userId) {
    notice(`The name “${name}” has already been used. If this was you on another phone, ask the team lead to reset that ballot.`,true);
  }
  renderBallot();renderGrid();
}
function renderResults() {
  if(!state.db) {
    $('ballotsReceived').textContent='—';$('companiesVoted').textContent='—';$('topCompany').textContent='Not connected';
    $('leaderboardRows').innerHTML='<p class="loading">Shared results will appear here once Supabase is connected.</p>';
  } else {
    const totals=new Map(companies.map(c=>[c.id,{points:0,count:0,first:0}]));
    for(const ballot of state.ballots){
      (ballot.company_ids||[]).forEach((id,rank)=>{
        const entry=totals.get(id);if(!entry || rank>9)return;
        entry.points+=10-rank;entry.count++;if(rank===0)entry.first++;
      });
    }
    const ranked=[...totals].sort((a,b)=>b[1].points-a[1].points||b[1].count-a[1].count||a[0]-b[0]).filter(v=>v[1].points>0);
    const max=ranked.length?ranked[0][1].points:1;
    $('ballotsReceived').textContent=state.ballots.length;
    $('voteCountPill').textContent=state.ballots.length;
    $('companiesVoted').textContent=ranked.length;
    $('topCompany').textContent=ranked.length?directory.get(ranked[0][0]).name:'No votes yet';
    $('leaderboardRows').innerHTML=ranked.length?ranked.slice(0,15).map(([id,stat],idx)=>{
      return `<div class="leader-row"><span class="leader-rank">${idx+1}</span><div><div class="leader-name">${escapeHTML(directory.get(id).name)} <small>${stat.count} ${stat.count===1?'ballot':'ballots'} · #1 by ${stat.first}</small></div><div class="leader-track"><span style="width:${(stat.points/max)*100}%"></span></div></div><div class="leader-points">${stat.points}<small>points</small></div></div>`;
    }).join(''):'<p class="loading">No votes yet. Be the first to submit your ranking.</p>';
  }
  const used=new Set(state.ballots.map(v=>v.voter_key));
  const nameTags=knownNames.map(name=>`<span class="person-tag ${used.has(name.toLowerCase())?'done':''}">${escapeHTML(name)} ${used.has(name.toLowerCase())?'✓':'·'}</span>`);
  const extra=state.ballots.filter(v=>!knownNames.map(n=>n.toLowerCase()).includes(v.voter_key)).map(v=>`<span class="person-tag done">${escapeHTML(v.display_name)} ✓</span>`);
  $('participationList').innerHTML=[...nameTags,...extra].join('');
}
function showDetails(id) {
  const c=directory.get(id);if(!c)return;
  const sections=[['The product launch',c.launch],['Technology idea (MCA)',c.tech],['Business idea (MBA)',c.management],['Team rally idea',c.rally],['Possible partner',c.partner],['What to watch out for',c.risk]];
  $('detailContents').innerHTML=`<div class="dialog-inner"><img src="${c.image}" alt="${escapeHTML(c.name)} dossier logo and wordmark"><h2>${escapeHTML(c.name)}</h2><p class="desc">${escapeHTML(c.description)}</p>${sections.map(([t,v])=>`<div class="idea"><strong>${escapeHTML(t)}</strong><p>${escapeHTML(v)}</p></div>`).join('')}<div class="dialog-actions"><button data-add="${c.id}">${state.selected.includes(c.id)?'Remove from my list':'+ Add to my list'}</button></div></div>`;
  if (!$('detailDialog').open) $('detailDialog').showModal();
}
async function refreshBallots(quiet=false) {
  if(!state.db)return;
  const {data,error}=await state.db.from('company_ballots').select('voter_key,display_name,owner_id,company_ids,updated_at').order('updated_at',{ascending:false}).limit(500);
  if(error){if(!quiet)notice('Unable to load live results: '+error.message,true);return;}
  state.ballots=data||[];state.loaded=true;
  renderResults();renderBallot();
  if(!quiet) notice('Team results refreshed.');
}
async function submitVote() {
  if(state.busy||!state.db){notice('Shared voting is not configured yet.',true);return;}
  const name=voterName(),key=voterKey();
  if(!validName()||!state.selected.length||state.selected.length>10){notice('Choose a name and between 1 and 10 companies.',true);return;}
  const existing=state.ballots.find(b=>b.voter_key===key);
  if(existing&&existing.owner_id!==state.userId){notice('This name already has a ballot. Choose your own name or contact the team leader.',true);return;}
  state.busy=true;renderBallot();
  try {
    const update={display_name:name,company_ids:state.selected,updated_at:new Date().toISOString()};
    const query=existing? state.db.from('company_ballots').update(update).eq('voter_key',key).eq('owner_id',state.userId)
      : state.db.from('company_ballots').insert({voter_key:key,owner_id:state.userId,...update});
    const {error}=await query;
    if(error) throw new Error(error.code==='23505'?'Someone already submitted using this name. Please check with your team lead.':error.message);
    await refreshBallots(true);
    notice(existing?'Your updated ranking was saved!':'Your vote was submitted successfully!');
    switchView('results');
  } catch(err){notice('Vote could not be saved: '+(err.message||'Unknown error'),true);}
  finally{state.busy=false;renderBallot();}
}
async function bootDatabase() {
  const cfg=window.POLL_CONFIG||{};
  const configured=/^https:\/\//.test(cfg.supabaseUrl||'') && !!cfg.supabaseAnonKey && !/PASTE_/i.test(cfg.supabaseAnonKey);
  if(!configured) {
    $('setupNotice').hidden=false;$('connectionBadge').className='connection offline';$('connectionBadge').innerHTML='<span class="status-dot"></span>Preview mode';
    renderBallot();renderResults();return;
  }
  try {
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    state.db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data:sessionData,error:sessionError}=await state.db.auth.getSession();
    if(sessionError)throw sessionError;
    let session=sessionData.session;
    if(!session) {
      const r=await state.db.auth.signInAnonymously();
      if(r.error)throw new Error(r.error.message+' (Enable anonymous sign-ins in Supabase Authentication settings.)');
      session=r.data.session;
    }
    state.userId=session?.user?.id || sessionData.session?.user?.id;
    if(!state.userId)throw new Error('Could not create a voter session.');
    $('connectionBadge').className='connection online';$('connectionBadge').innerHTML='<span class="status-dot"></span>Live voting';
    $('setupNotice').hidden=true;
    await refreshBallots(true);
    syncName();
    setInterval(()=>refreshBallots(true),30000);
  } catch(e){
    state.db=null;
    $('connectionBadge').className='connection offline';$('connectionBadge').innerHTML='<span class="status-dot"></span>Connection error';
    $('setupNotice').hidden=false;
    $('setupNotice').querySelector('p').textContent='Could not connect to voting database: '+e.message;
    renderBallot();
  }
}
function init() {
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  $('resultsShortcut').addEventListener('click',()=>switchView('results'));
  $('searchInput').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();renderGrid();});
  $('sectorFilter').addEventListener('change',e=>{state.sector=e.target.value;renderGrid();});
  $('heatFilter').addEventListener('change',e=>{state.heat=e.target.value;renderGrid();});
  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-add]');if(add){addCompany(Number(add.dataset.add));if($('detailDialog').open)showDetails(Number(add.dataset.add));return;}
    const detail=e.target.closest('[data-detail]');if(detail){showDetails(Number(detail.dataset.detail));return;}
    const move=e.target.closest('[data-move]');if(move){moveCompany(Number(move.dataset.move),Number(move.dataset.delta));return;}
  });
  $('voterSelect').addEventListener('change',()=>{
    $('customName').hidden=$('voterSelect').value!=='__other';
    if(!$('customName').hidden)$('customName').focus();
    syncName();
  });
  $('customName').addEventListener('input',()=>renderBallot());
  $('customName').addEventListener('change',syncName);
  $('submitVote').addEventListener('click',submitVote);
  $('clearDraft').addEventListener('click',()=>{state.selected=[];persistDraft();renderGrid();renderBallot();});
  $('refreshResults').addEventListener('click',()=>refreshBallots());
  $('closeDetails').addEventListener('click',()=>$('detailDialog').close());
  $('detailDialog').addEventListener('click',e=>{if(e.target===$('detailDialog'))$('detailDialog').close();});
  renderGrid();renderBallot();renderResults();
  bootDatabase();
}
document.addEventListener('DOMContentLoaded',init);
