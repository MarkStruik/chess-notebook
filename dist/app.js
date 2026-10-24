import { Chess } from './vendor/chess.js';
import { coachComment, showCoachBubble } from './coach.js';
import { readEngineInfo, gradeMove, latestTrails, boardBadge } from './analysis.js';
const spriteOffsets={"wk": [-13.122, -2.072], "wq": [-6.492, -5.11], "wr": [-0.138, -10.773], "wb": [2.762, -7.32], "wn": [3.453, -10.497], "wp": [14.641, -14.917], "bk": [-12.983, 1.105], "bq": [-6.492, -1.934], "br": [-0.691, -6.077], "bb": [2.762, -2.486], "bn": [3.453, -5.525], "bp": [13.398, -10.773]};
const $=id=>document.getElementById(id), glyph={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
let game=new Chess(), settings={opponent:'bot',color:'w',skill:6,time:'0,0',hintSide:'both',hints:3,feedback:true}, ended=false,result='*',reason='',selected=null,legal=[],hintSquares=[],hintMove=null,flipped=false,remaining={w:0,b:0},used={w:0,b:0},lastTick=Date.now(),clockLog=[],review=null,epoch=0,pending=false,evaluation=0,history=[],positions=[game.fen()],feedbackText=null;let annotations=[];
let worker,ready=false,engineError=false,queue=Promise.resolve(),activeSearch=null;
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500)}
function engine(){
worker=new Worker('./vendor/stockfish-19-lite-single.js');
worker.onmessage=ev=>{
 const line=String(ev.data);
 if(line==='uciok')worker.postMessage('isready');
 if(line==='readyok'){ready=true;$('engine-status').textContent='Stockfish 19 · on-device engine';resolveReady();render();maybeBot()}
 if(!activeSearch)return;
 const info=readEngineInfo(line);
 if(info){
  if(info.rank===1)activeSearch.score=info.score;
  if(!activeSearch.depths.has(info.depth))activeSearch.depths.set(info.depth,new Map());
  activeSearch.depths.get(info.depth).set(info.rank,info);
 }
 if(line.startsWith('bestmove ')){
  const move=line.split(' ')[1];
  const complete=[...activeSearch.depths.entries()].sort((a,b)=>b[0]-a[0]).find(([,lines])=>lines.size>=activeSearch.lines&&lines.get(1)?.move===move&&[...lines.values()].every(v=>!v.bounded));
  const variations=complete?[...complete[1].values()].sort((a,b)=>a.rank-b.rank):[];
  clearTimeout(activeSearch.timer);activeSearch.resolve({move,score:variations[0]?.score??activeSearch.score,variations});activeSearch=null;
 }
};
worker.onerror=()=>{engineError=true;ready=false;$('engine-status').textContent='Engine unavailable. Reload to retry.';$('engine-status').classList.add('error');if(activeSearch){clearTimeout(activeSearch.timer);activeSearch.reject(new Error('Engine unavailable'));activeSearch=null}render()};worker.postMessage('uci');
}
let resolveReady;const readyPromise=new Promise(resolve=>resolveReady=resolve);
function analyze(fen,skill=20,ms=350,lines=1){const task=queue.then(async()=>{await Promise.race([readyPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Engine did not start')),20000))]);if(engineError)throw Error('Engine unavailable');return new Promise((resolve,reject)=>{activeSearch={resolve,reject,score:0,lines,depths:new Map(),timer:setTimeout(()=>{worker.postMessage('stop');reject(Error('Analysis timed out'));activeSearch=null},15000)};worker.postMessage('setoption name Skill Level value '+skill);worker.postMessage('setoption name MultiPV value '+lines);worker.postMessage('position fen '+fen);worker.postMessage('go movetime '+ms)})});queue=task.catch(()=>{});return task}
function isBotTurn(){return settings.opponent==='bot'&&game.turn()!==settings.color}
function label(color){return settings.opponent==='bot'?(color===settings.color?'You':'Stockfish'):(color==='w'?'White':'Black')}
function hintAllowed(){return settings.hintSide==='both'||settings.hintSide===game.turn()}
function settleClock(){const now=Date.now();if(!ended&&Number(settings.time.split(',')[0])>0){const c=game.turn();remaining[c]=Math.max(0,remaining[c]-(now-lastTick)/1000);lastTick=now;if(remaining[c]===0){const opponent=c==='w'?'b':'w';const pieces=game.board().flat().filter(p=>p?.color===opponent);const cannotMate=pieces.length===1||game.isInsufficientMaterial();finish(cannotMate?'1/2-1/2':c==='w'?'0-1':'1-0',cannotMate?'Time expired · insufficient mating material':'Time expired');return false}}else lastTick=now;return !ended}
function clock(s){if(!Number(settings.time.split(',')[0]))return '∞';return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function renderClocks(){for(const c of ['w','b']){const el=$(c==='w'?'white-clock':'black-clock');el.textContent=clock(remaining[c]);el.classList.toggle('active',!ended&&game.turn()===c)}}
function render(){renderClocks();renderAvatars();$('white-name').textContent=label('w');$('black-name').textContent=label('b');for(const [c,id] of [['w','white-detail'],['b','black-detail']])$(id).textContent=(c==='w'?'White':'Black')+' · '+(settings.opponent==='bot'&&settings.color!==c?'Local opponent':Number(settings.hints)===99?'Unlimited hints':Math.max(0,Number(settings.hints)-used[c])+' hints left');$('turn').textContent=ended?reason:(isBotTurn()?'Stockfish is thinking…':(game.turn()==='w'?'White':'Black')+' to move')+(game.isCheck()&&!ended?' · Check':'');$('feedback').checked=settings.feedback;const cap=Number(settings.hints);$('hint-count').textContent=hintMove?.fen===game.fen()?'Active':cap===99?'Unlimited':Math.max(0,cap-used[game.turn()])+' left';$('hint').disabled=!ready||pending||ended||isBotTurn()||!hintAllowed()||(cap!==99&&used[game.turn()]>=cap)||hintMove?.fen===game.fen();
syncFocusControls();$('resign').disabled=ended;const viewed=review===null?game: new Chess(positions[review]);const squares=[];for(let r=0;r<8;r++)for(let f=0;f<8;f++)squares.push('abcdefgh'[f]+(8-r));if(flipped)squares.reverse();$('board').replaceChildren();const lastIndex=review===null?history.length:review;const trails=latestTrails(history,lastIndex);for(const [i,sq] of squares.entries()){const p=viewed.get(sq),b=document.createElement('button');b.type='button';b.className='sq'+((Number(sq[1])+sq.charCodeAt(0))%2===0?' dark':'')+(p?.color==='w'?' white-piece':'')+(sq===selected?' selected':'')+(legal.some(m=>m.to===sq)?' legal':'')+(p?' capture':'')+(trails.some(m=>m.from===sq||m.to===sq)?' last-move':'')+(hintMove?.fen===game.fen()&&selected===hintMove.from&&sq===hintMove.to?' best-move':'');b.dataset.square=sq;const squareTrails=trails.filter(m=>m.from===sq||m.to===sq);b.dataset.lastMove=squareTrails.map(m=>m.color).join(' ');if(squareTrails.length){const newest=squareTrails[0];b.dataset.trailSide=newest.color===(settings.opponent==='bot'?settings.color:'w')?'player':'opponent';b.dataset.trailRole=newest.to===sq?'to':'from';}if(squareTrails.length)b.title=squareTrails.map(m=>(m.color==='w'?'White':'Black')+': '+m.from+' → '+m.to).join(' · ');b.setAttribute('aria-label',sq+(p?' '+(p.color==='w'?'white':'black')+' '+({k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'}[p.type]):' empty'));if(p){const sprite=document.createElement('span');sprite.className='piece-sprite';sprite.style.backgroundPosition=(['k','q','r','b','n','p'].indexOf(p.type)*20)+'% '+(p.color==='w'?'0%':'100%');const offset=spriteOffsets[p.color+p.type]||[0,0];sprite.style.transform='translate('+offset[0]+'%,'+offset[1]+'%)';b.append(sprite)}if(i>=56){let s=document.createElement('span');s.className='coord';s.textContent=sq[0];b.append(s)}if(i%8===0){let s=document.createElement('span');s.className='coord rank';s.textContent=sq[1];b.append(s)}if(settings.feedback){const indices=review===null?[lastIndex-1,lastIndex-2]:[lastIndex-1];for(const n of indices){const annotation=annotations[n],move=history[n],visual=boardBadge(annotation);if(visual&&move?.to===sq&&p?.color===move.color){const badge=document.createElement('span');badge.className='move-badge '+visual.tone;badge.textContent=visual.symbol;badge.title=annotation.label;badge.setAttribute('aria-label',annotation.label);b.append(badge)}}}b.onclick=()=>clickSquare(sq);$('board').append(b)}
$('moves').replaceChildren();if(!history.length){$('moves').innerHTML='<p class="empty">No moves yet</p>'}for(let i=0;i<history.length;i+=2){let row=document.createElement('div');row.className='move-row';let num=document.createElement('span');num.textContent=(i/2+1)+'.';row.append(num);for(let j=i;j<i+2;j++){const b=document.createElement('button');b.textContent=(history[j]?.san||'')+(settings.feedback&&annotations[j]?.symbol?' '+annotations[j].symbol:'');b.disabled=!ended||!history[j];b.className=(lastIndex===j+1?'current':'');b.onclick=()=>{review=j+1;render()};row.append(b)}$('moves').append(row)}for(const id of ['first','prev','next','last'])$(id).disabled=!ended; if(ended){$('first').disabled=lastIndex===0;$('prev').disabled=lastIndex===0;$('next').disabled=lastIndex===history.length;$('last').disabled=lastIndex===history.length}$('review-label').textContent=ended?'Position '+lastIndex+' / '+history.length:'Review after the game';const ownIndex=settings.opponent==='bot'?history.map(m=>m.color).lastIndexOf(settings.color):-1;
const ownAnnotation=annotations[ownIndex],ownComment=settings.feedback?ownAnnotation?.comment:null;
const explicitHint=hintMove?.fen===game.fen();
$('coach-title').textContent=ended?reason:explicitHint?'Hint active':ownComment?ownAnnotation.label:feedbackText?.title||'Your move';
$('coach-text').textContent=explicitHint?feedbackText?.text||'':ownComment?history[ownIndex].san+' · '+ownComment:ended?'Review unlocked':feedbackText?.text||'';
renderCoachBubble();const ve=review===null?evaluation:annotations[lastIndex-1]?.evaluation;$('eval-label').textContent=!settings.feedback?'Feedback is off':ve===undefined?'Not analyzed':Math.abs(ve)<.3?'Even position':ve>0?'White has the edge':'Black has the edge';$('eval').textContent=settings.feedback&&ve!==undefined?(Math.abs(ve)>=100?(ve>0?'White':'Black')+' mates':(ve>=0?'+':'')+ve.toFixed(1)):'—';}
async function clickSquare(sq){if(ended||pending||isBotTurn()||!settleClock())return;const choices=legal.filter(m=>m.to===sq);if(choices.length){let promotion;if(choices.some(m=>m.promotion)){promotion=await choosePromotion(game.turn());if(!promotion||ended)return}await makeMove({from:selected,to:sq,...(promotion?{promotion}:{})});return}if(game.get(sq)?.color===game.turn()){selected=sq;legal=game.moves({square:sq,verbose:true})}else{selected=null;legal=[]}hintSquares=[];render()}
function choosePromotion(c){return new Promise(resolve=>{$('promotion-choices').replaceChildren();for(const p of ['q','r','b','n']){const b=document.createElement('button');const sprite=document.createElement('span');sprite.className='piece-sprite';sprite.style.backgroundPosition=(['k','q','r','b','n','p'].indexOf(p)*20)+'% '+(c==='w'?'0%':'100%');const offset=spriteOffsets[c+p]||[0,0];sprite.style.transform='translate('+offset[0]+'%,'+offset[1]+'%)';b.append(sprite);b.setAttribute('aria-label',({q:'Queen',r:'Rook',b:'Bishop',n:'Knight'})[p]);b.onclick=()=>{$('promotion').close();resolve(p)};$('promotion-choices').append(b)}$('promotion').oncancel=e=>{e.preventDefault();$('promotion').close();resolve(null)};$('promotion').showModal()})}
async function makeMove(move){
if(!settleClock())return;const before=game.fen(),c=game.turn(),myEpoch=epoch;if(settings.opponent==='bot'&&c===settings.color)hideCoachBubble();let m;try{m=game.move(move)}catch{toast('That move is not legal.');return}
selected=null;legal=[];hintSquares=[];hintMove=null;remaining[c]+=Number(settings.time.split(',')[1]);clockLog.push({...remaining});history=game.history({verbose:true});positions.push(game.fen());lastTick=Date.now();save();render();$('moves').scrollTop=$('moves').scrollHeight;
if(game.isGameOver()){if(game.isCheckmate()&&settings.feedback)annotations[history.length-1]={symbol:'#',label:'Checkmate',tone:'good',evaluation:c==='w'?100:-100,...(settings.opponent==='bot'&&c===settings.color?{comment:coachComment(m,{label:'Checkmate'},history.length-1)}:{})};finish(game.isCheckmate()?(game.turn()==='w'?'0-1':'1-0'):'1/2-1/2',game.isCheckmate()?'Checkmate':game.isStalemate()?'Draw · stalemate':game.isThreefoldRepetition()?'Draw · repetition':game.isInsufficientMaterial()?'Draw · insufficient material':'Draw · fifty-move rule');return}
const after=game.fen(),moveIndex=history.length-1;if(settings.feedback&&ready){const baselineTask=analyze(before,20,600,2),afterTask=analyze(after);Promise.all([baselineTask,afterTask]).then(([baseline,out])=>{if(epoch!==myEpoch||!settings.feedback)return;const moveEval=out.score*(c==='w'?-1:1);const grade=gradeMove(m,baseline,out,new Chess(after));annotations[moveIndex]={...grade,evaluation:moveEval};if(settings.opponent==='bot'&&c===settings.color){annotations[moveIndex].comment=coachComment(m,grade,Math.floor(moveIndex/2));if(history.map(move=>move.color).lastIndexOf(settings.color)===moveIndex)presentCoachBubble(m,annotations[moveIndex]);}if(ended||after!==game.fen()){save();render();return}evaluation=moveEval;feedbackText={title:grade.label,text:label(c)+' · '+m.san};save();render()}).catch(e=>toast(e.message))}maybeBot();
}
async function maybeBot(){if(!ready||pending||ended||!isBotTurn())return;pending=true;const myEpoch=epoch,fen=game.fen();render();try{const out=await analyze(fen,Number(settings.skill),500);if(myEpoch!==epoch||ended||fen!==game.fen())return;pending=false;if(out.move&&out.move!=='(none)')await makeMove({from:out.move.slice(0,2),to:out.move.slice(2,4),promotion:out.move[4]})}catch(e){toast(e.message)}finally{if(epoch===myEpoch){pending=false;render()}}}
function save(){try{localStorage.setItem('chess-notebook-current',JSON.stringify({pgn:game.pgn(),settings,ended,result,reason,remaining,used,clockLog,evaluation,feedbackText,hintMove,annotations,lastTick}));$('save-status').textContent='Saved on this device'}catch{$('save-status').textContent='Device storage unavailable'}}
function rebuild(){history=game.history({verbose:true});const replay=new Chess(game.getHeaders().FEN);positions=[replay.fen()];for(const m of history){replay.move(m);positions.push(replay.fen())}}
function finish(res,why){if(ended)return;ended=true;setFocusMode(false);epoch++;pending=false;selected=null;legal=[];result=res;reason=why;game.setHeader('Result',res);game.setHeader('White',label('w'));game.setHeader('Black',label('b'));game.setHeader('TimeControl',settings.time.split(',')[0]==='0'?'-':settings.time.replace(',','+'));review=history.length;save();try{const games=JSON.parse(localStorage.getItem('chess-notebook-games')||'[]');games.unshift({date:new Date().toISOString(),pgn:exportPGN(),title:label('w')+' – '+label('b')+' · '+res});localStorage.setItem('chess-notebook-games',JSON.stringify(games.slice(0,30)))}catch{}render()}
function exportPGN(){
const copy=new Chess(game.getHeaders().FEN);
for(let i=0;i<history.length;i++){
 copy.move(history[i]);const t=clockLog[i],annotation=annotations[i],comments=[];
 if(annotation?.symbol)comments.push(annotation.symbol+' '+annotation.label);if(annotation?.comment)comments.push(annotation.comment);
 if(annotation&&Math.abs(annotation.evaluation)<100)comments.push('[%eval '+annotation.evaluation.toFixed(2)+']');
 if(t&&Number(settings.time.split(',')[0])){const seconds=t[history[i].color];comments.push('[%clk '+Math.floor(seconds/3600)+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+':'+(seconds%60).toFixed(1).padStart(4,'0')+']')}
 if(comments.length)copy.setComment(comments.join(' '));
}
for(const [key,value] of Object.entries(game.getHeaders()))copy.setHeader(key,value);
copy.setHeader('Event',game.getHeaders().Event||'Chess Notebook');copy.setHeader('White',game.getHeaders().White||label('w'));copy.setHeader('Black',game.getHeaders().Black||label('b'));copy.setHeader('Result',result);copy.setHeader('TimeControl',settings.time.split(',')[0]==='0'?'-':settings.time.replace(',','+'));return copy.pgn();
}
$('setup-form').onsubmit=e=>{e.preventDefault();settings=Object.fromEntries(new FormData(e.target));settings.feedback=e.target.elements.feedback.checked;game=new Chess();ended=false;reason='';result='*';used={w:0,b:0};const seconds=Number(settings.time.split(',')[0]);remaining={w:seconds,b:seconds};clockLog=[];review=null;epoch++;pending=false;history=[];annotations=[];positions=[game.fen()];selected=null;legal=[];hintSquares=[];hintMove=null;evaluation=0;feedbackText=null;flipped=settings.opponent==='bot'&&settings.color==='b';lastTick=Date.now();$('setup').close();save();render();maybeBot()};
$('new').onclick=()=>$('setup').showModal();$('cancel-setup').onclick=()=>$('setup').close();$('flip').onclick=()=>{flipped=!flipped;render()};$('feedback').onchange=e=>{settings.feedback=e.target.checked;feedbackText=null;if(!settings.feedback)hideCoachBubble();save();render()};$('resign').onclick=()=>{if(confirm('Finish this game? Review will become available.'))finish(game.turn()==='w'?'0-1':'1-0',(game.turn()==='w'?'White':'Black')+' resigned')};
$('hint').onclick=async()=>{if($('hint').disabled)return;const fen=game.fen(),c=game.turn(),myEpoch=epoch;pending=true;render();try{const out=await analyze(fen,20,650);if(epoch!==myEpoch||ended||fen!==game.fen()||!settleClock())return;const move=game.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===out.move);if(!move)throw Error('No hint available');used[c]++;hintMove={fen,from:move.from,to:move.to,promotion:move.promotion};feedbackText={title:'Hint active',text:'Find the piece. Blue marks its best move.'};save()}catch(e){toast(e.message)}finally{if(epoch===myEpoch){pending=false;render()}}};
for(const [id,fn] of [['first',()=>0],['prev',n=>Math.max(0,n-1)],['next',n=>Math.min(history.length,n+1)],['last',()=>history.length]])$(id).onclick=()=>{if(!ended)return;review=fn(review??history.length);render()};
function pgnDialog(importing){$('text-title').textContent=importing?'Import a game':'Your game, in PGN';$('pgn').value=importing?'':exportPGN();$('pgn').readOnly=!importing;$('text-error').textContent='';$('text-action').textContent=importing?'Open for review':'Download PGN';$('text-action').onclick=()=>{if(importing){try{const imported=new Chess();imported.loadPgn($('pgn').value);if(!imported.history().length)throw Error('Add a PGN containing moves.');loadReview(imported);$('text-dialog').close()}catch(e){$('text-error').textContent='Could not read PGN: '+e.message}}else{const blob=new Blob([exportPGN()],{type:'application/x-chess-pgn'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='chess-notebook.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}};$('text-dialog').showModal()}
function loadReview(imported){setFocusMode(false);game=imported;ended=true;result=game.getHeaders().Result||'*';reason='Imported game · review';epoch++;pending=false;review=null;selected=null;legal=[];clockLog=[];hintSquares=[];hintMove=null;annotations=[];rebuild();review=history.length;save();render()}
$('export').onclick=()=>pgnDialog(false);$('import').onclick=()=>{if(!ended&&history.length&&!confirm('Open another game? Your current game will be replaced.'))return;pgnDialog(true)};$('text-close').onclick=()=>$('text-dialog').close();$('library').onclick=()=>{const games=JSON.parse(localStorage.getItem('chess-notebook-games')||'[]');$('games-list').replaceChildren();if(!games.length)$('games-list').textContent='Finished games will appear here.';for(const g of games){const b=document.createElement('button');b.textContent=g.title+' · '+new Date(g.date).toLocaleDateString();b.onclick=()=>{if(!ended&&history.length&&!confirm('Replace the current game with this review?'))return;const c=new Chess();c.loadPgn(g.pgn);loadReview(c);$('games-dialog').close()};$('games-list').append(b)}$('games-dialog').showModal()};$('games-close').onclick=()=>$('games-dialog').close();
let coachBubble=null,coachBubbleTimer=null;
function hideCoachBubble(){clearTimeout(coachBubbleTimer);coachBubble=null;$('focus-comment').hidden=true}
function presentCoachBubble(move,annotation){
 if(!focusMode||!settings.feedback||settings.opponent!=='bot'||!showCoachBubble(move,annotation))return;
 coachBubble={...annotation,san:move.san};clearTimeout(coachBubbleTimer);
 coachBubbleTimer=setTimeout(()=>{coachBubble=null;renderCoachBubble()},8500);
 renderCoachBubble();
}
function renderCoachBubble(){
 const visible=focusMode&&settings.feedback&&settings.opponent==='bot'&&coachBubble;
 $('focus-comment').hidden=!visible;if(!visible)return;
 const visual=boardBadge(coachBubble);
 const title=(visual?.symbol?visual.symbol+' ':'')+coachBubble.san+' · '+coachBubble.label;
 if($('bubble-title').textContent!==title)$('bubble-title').textContent=title;
 if($('bubble-text').textContent!==coachBubble.comment)$('bubble-text').textContent=coachBubble.comment;
}
$('dismiss-comment').onclick=hideCoachBubble;
function renderAvatars(){
 for(const color of ['w','b']){
  const avatar=$(color==='w'?'white-avatar':'black-avatar');
  if(avatar.children.length)continue;
  const sprite=document.createElement('span');sprite.className='piece-sprite';
  sprite.style.backgroundPosition='0% '+(color==='w'?'0%':'100%');
  const offset=spriteOffsets[color+'k'];sprite.style.transform='translate('+offset[0]+'%,'+offset[1]+'%)';
  avatar.append(sprite);
 }
}
let focusMode=false;
function setFocusMode(enabled){
 focusMode=Boolean(enabled);if(!focusMode)hideCoachBubble();document.body.classList.toggle('focus-mode',focusMode);
 $('focus-controls').hidden=!focusMode;$('focus').setAttribute('aria-pressed',String(focusMode));
 try{localStorage.setItem('chess-notebook-focus',String(focusMode))}catch{}
 syncFocusControls();
}
function syncFocusControls(){
 document.body.classList.toggle('focus-with-coach',settings.opponent==='bot'&&Boolean(settings.feedback));const cap=Number(settings.hints),active=hintMove?.fen===game.fen();
 const available=!ended&&cap>0&&hintAllowed()&&(cap===99||used[game.turn()]<cap||active);
 $('focus-hint').hidden=!available;
 $('focus-hint').disabled=$('hint').disabled;
 $('focus-hint').textContent=active?'✧ ✓':cap===99?'✧':'✧ '+Math.max(0,cap-used[game.turn()]);
 $('focus-hint').setAttribute('aria-label',active?'Hint active':pending?'Preparing hint':'Request a hint');
 $('focus-hint').title=active?'Hint active: select a piece to explore':'Request a hint';
}
$('focus').onclick=()=>setFocusMode(true);
$('focus-exit').onclick=()=>setFocusMode(false);
$('focus-hint').onclick=()=>$('hint').onclick();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focusMode&&!document.querySelector('dialog[open]'))setFocusMode(false)});
try{setFocusMode(localStorage.getItem('chess-notebook-focus')==='true')}catch{}
let restored=false;try{const data=JSON.parse(localStorage.getItem('chess-notebook-current'));if(data){settings=data.settings;game.loadPgn(data.pgn);({ended,result,reason,remaining,used,clockLog,evaluation,feedbackText,hintMove}=data);annotations=data.annotations||[];lastTick=data.lastTick;flipped=settings.opponent==='bot'&&settings.color==='b';rebuild();review=ended?history.length:null;restored=true;settleClock()}}catch{toast('Could not restore the last game. Starting a fresh page.')}
$('theme').onclick=()=>{document.body.classList.toggle('light-theme');localStorage.setItem('chess-notebook-theme',document.body.classList.contains('light-theme')?'light':'dark')};if(localStorage.getItem('chess-notebook-theme')==='light')document.body.classList.add('light-theme');render();engine();if(!restored)$('setup').showModal();setInterval(()=>{if(!$('setup').open){settleClock();renderClocks();if(!save.last||Date.now()-save.last>2000){save();save.last=Date.now()}}},100);document.addEventListener('visibilitychange',()=>{if(!document.hidden){settleClock();render()}});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(async r=>{await navigator.serviceWorker.ready;function check(){const w=r.active;if(w)w.postMessage('status')}navigator.serviceWorker.addEventListener('message',e=>{if(e.data==='offline-ready'){$('offline').textContent='● Offline ready'}});check();navigator.serviceWorker.addEventListener('controllerchange',check)}).catch(()=>{$('offline').textContent='Offline cache unavailable'})}else $('offline').textContent='Offline cache unsupported';
