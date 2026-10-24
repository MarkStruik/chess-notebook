const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const {Chess}=require('./dist/vendor/chess.js');
const {readEngineInfo,gradeMove,latestTrails}=require('./dist/analysis.js');
const elements=new Map();function element(){return {textContent:'',style:{},dataset:{},checked:true,disabled:false,open:false,children:[],classList:{toggle(){},contains(){return false},add(){}},setAttribute(){},append(...els){this.children.push(...els)},replaceChildren(...els){this.children=els},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()}}}
const storage=new Map(),context=vm.createContext({Chess,readEngineInfo,gradeMove,latestTrails,console,Date,Error,JSON,Number,String,Math,Object,Promise,Blob,URL,setTimeout:()=>0,clearTimeout(){},setInterval(){},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,body:element(),addEventListener(){}},navigator:{},Worker:class{postMessage(){}}});
vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace(/^import .*?;\n/gm,''),context);const run=s=>vm.runInContext(s,context);
function reset(fen){run(`game=new Chess(${JSON.stringify(fen)});settings={opponent:'human',color:'w',skill:6,time:'180,2',hintSide:'both',hints:1,feedback:false};ended=false;pending=false;epoch++;result='*';reason='';remaining={w:180,b:180};used={w:0,b:0};lastTick=Date.now();history=[];annotations=[];positions=[game.fen()];clockLog=[];review=null;hintMove=null;selected=null;legal=[];`)}
(async()=>{reset();await run("makeMove({from:'e2',to:'e4'})");assert.equal(run('history[0].san'),'e4');assert.ok(run('remaining.w')>181.9);assert.match(run('exportPGN()'),/\[%clk 0:03:0/);assert.match(run('exportPGN()'),/\[TimeControl "180\+2"\]/);assert.ok(elements.get('prev').disabled);run("$('prev').onclick()");assert.equal(run('review'),null);
await run("makeMove({from:'e7',to:'e5'})");run("finish('1-0','Test finished')");assert.ok(!elements.get('prev').disabled);run("$('first').onclick()");assert.equal(run('review'),0);assert.equal(run('game.history().length'),2);
reset();run('remaining.w=0.01;lastTick=Date.now()-100;settleClock()');assert.ok(run('ended'));assert.equal(run('result'),'0-1');
reset('4k3/8/8/8/8/8/8/4K2R w K - 0 1');await run("makeMove({from:'e1',to:'g1'})");assert.equal(run("game.get('f1').type"),'r');
reset('7k/P7/8/8/8/8/8/7K w - - 0 1');await run("makeMove({from:'a7',to:'a8',promotion:'n'})");assert.equal(run("game.get('a8').type"),'n');assert.equal(run('result'),'1/2-1/2');
reset();for(const m of ['f3','e5','g4','Qh4#'])await run('makeMove('+JSON.stringify(m)+')');assert.ok(run('ended'));assert.equal(run('result'),'0-1');assert.ok(elements.get('hint').disabled);
reset();run("ready=true;analyze=async()=>({move:'e2e4',score:0.3});render()");await run("$('hint').onclick()");assert.equal(run('used.w'),1);assert.ok(elements.get('hint').disabled);assert.equal(run("hintMove.from+hintMove.to"),'e2e4');assert.ok(!elements.get('coach-text').textContent.includes('e4'));run("selected='d2';render()");assert.ok(!elements.get('board').children.some(e=>e.className.includes('best-move')));run("selected='e2';render()");assert.equal(elements.get('board').children.filter(e=>e.className.includes('best-move')).length,1);reset();run("settings.hintSide='b';render()");assert.ok(elements.get('hint').disabled);
const custom=new Chess('4k3/8/8/8/8/8/8/4K2R w K - 0 1');custom.move('O-O');context.imported=custom;run('loadReview(imported)');assert.match(run('exportPGN()'),/\[FEN /);assert.equal(run('positions.length'),2);console.log('PASS: moves, increment, clock PGN, review lock/unlock, timeout, castling, underpromotion, checkmate, hint cap/side restrictions, FEN review.');

reset();await run("makeMove('e4')");await run("makeMove('e5')");
const trailSquares=()=>elements.get('board').children.filter(b=>b.className.includes('last-move')).map(b=>b.dataset.square).sort();
assert.deepEqual(trailSquares(),['e2','e4','e5','e7']);
await run("makeMove('Nf3')");assert.deepEqual(trailSquares(),['e5','e7','f3','g1']);
run('flipped=true;render()');assert.deepEqual(trailSquares(),['e5','e7','f3','g1']);
run("finish('1/2-1/2','Test draw');review=2;render()");assert.deepEqual(trailSquares(),['e2','e4','e5','e7']);
run('review=0;render()');assert.deepEqual(trailSquares(),[]);
reset();for(const m of ['e4','d5','exd5','Qxd5'])await run('makeMove('+JSON.stringify(m)+')');
assert.deepEqual(trailSquares(),['d5','d8','e4']);assert.equal(elements.get('board').children.find(b=>b.dataset.square==='d5').dataset.lastMove.split(' ').length,2);
console.log('PASS: independent move trails, replacement, overlapping captures, flipped board and review.');

reset();run("ready=true;render();setFocusMode(true)");assert.equal(run('focusMode'),true);assert.equal(elements.get('focus-controls').hidden,false);assert.equal(storage.get('chess-notebook-focus'),'true');assert.equal(elements.get('focus-hint').hidden,false);
await run("$('focus-hint').onclick()");assert.equal(run('used.w'),1);assert.equal(elements.get('focus-hint').disabled,true);assert.equal(elements.get('focus-hint').hidden,false);
run("settings.hintSide='none';render()");assert.equal(elements.get('focus-hint').hidden,true);
run("settings.hintSide='both';settings.hints=99;used.w=110;hintMove=null;render()");assert.equal(elements.get('focus-hint').hidden,false);assert.equal(elements.get('focus-hint').disabled,false);
run("settings.hints=0;render()");assert.equal(elements.get('focus-hint').hidden,true);
run("finish('1-0','Test end')");assert.equal(run('focusMode'),false);assert.equal(elements.get('focus-controls').hidden,true);
console.log('PASS: focus preference, shared concealed hints, hint visibility, unlimited hints and automatic exit at game end.');

assert.deepEqual(readEngineInfo('info depth 12 multipv 2 score cp -43 nodes 200 pv e7e5 g1f3'),{depth:12,rank:2,score:-0.43,move:'e7e5',bounded:false});
assert.equal(readEngineInfo('info string NNUE loaded'),null);
assert.equal(readEngineInfo('info depth 9 score mate -3 pv e7e5').score,-100);
const position=new Chess(),move=position.move('e4');
const baseline={move:'e2e4',score:1.8,variations:[{rank:1,depth:12,score:1.8,move:'e2e4'},{rank:2,depth:12,score:0.1,move:'d2d4'}]};
assert.equal(gradeMove(move,baseline,{move:'e7e5',score:-1.7},position).symbol,'!!');
assert.equal(gradeMove(move,{...baseline,variations:[]},{score:-1.7},position).symbol,'!');
assert.equal(gradeMove(move,{...baseline,variations:[baseline.variations[0],{...baseline.variations[1],depth:11}]},{score:-1.7},position).symbol,'!');
assert.equal(gradeMove(move,{...baseline,variations:[baseline.variations[0],{...baseline.variations[1],bounded:true}]},{score:-1.7},position).symbol,'!');
for(const [replyScore,symbol] of [[-0.2,''],[0.1,'?!'],[0.8,'?'],[1.9,'??']])assert.equal(gradeMove(move,{move:'d2d4',score:0.4},{score:replyScore},position).symbol,symbol);
const sacrificePosition=new Chess('6k1/1p6/8/1B6/8/8/8/6K1 w - - 0 1'),sacrificeMove=sacrificePosition.move('Ba6');
assert.equal(gradeMove(sacrificeMove,{move:'b5c4',score:0.2},{move:'b7a6',score:-0.1},sacrificePosition).symbol,'!?');
assert.equal(gradeMove(sacrificeMove,{move:'b5c4',score:-1.0},{move:'b7a6',score:1.1},sacrificePosition).symbol,'');
console.log('PASS: !!, !, !?, ?!, ?, ?? grading, incomplete MultiPV safeguards, and soundness requirement for interesting sacrifices.');
console.log('PASS: hints conceal the move until the correct piece is selected.');
})().catch(e=>{console.error(e);process.exit(1)});
