import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../salao-social.js',import.meta.url),'utf8');
function fixture(){
  const handlers={},nodes=new Map(),sends=[],sockets=[],timeouts=new Map();
  let sequence=0;
  class Element {
    constructor(){this.value='';this.textContent='';this.children=[];this.handlers={};this.hidden=false;}
    addEventListener(name,callback){this.handlers[name]=callback}
    dispatchEvent(event){this.handlers[event.type]?.(event);return true}
    focus(){}
    append(...nodes){this.children.push(...nodes)}
    remove(){this.children.shift()}
    get firstElementChild(){return this.children[0]}
    get scrollHeight(){return this.children.length}
    set scrollTop(_value){}
  }
  const find=selector=>{
    if(!nodes.has(selector))nodes.set(selector,new Element());
    return nodes.get(selector);
  };
  const document={
    querySelector:find,createElement:()=>new Element(),
    createTextNode:text=>({textContent:text}),addEventListener(){},hidden:false
  };
  const parent={postMessage(){}};
  const window={parent,addEventListener(name,callback){handlers[name]=callback}};
  class FakeWebSocket {
    static OPEN=1;
    static CLOSED=3;
    constructor(){this.readyState=FakeWebSocket.OPEN;sockets.push(this)}
    send(body){sends.push(JSON.parse(body))}
    close(){this.readyState=FakeWebSocket.CLOSED}
  }
  class FakeURL {
    constructor(url){this.href=url;this.searchParams={set(){}}}
  }
  class FakeEvent {constructor(type){this.type=type}}
  vm.runInNewContext(source,{
    window,document,WebSocket:FakeWebSocket,URL:FakeURL,Event:FakeEvent,
    setInterval:()=>1,setTimeout(callback,delay){const id=++sequence;timeouts.set(id,{callback,delay});return id},
    clearTimeout(id){timeouts.delete(id)}
  });
  const sendParent=(type,data={})=>handlers.message({
    source:parent,origin:'https://viladacolheita.ddns.net',data:{type,...data}
  });
  sendParent('mf-salon-init',{ticket:'demo',endpoint:'wss://localhost/api/salon/ws'});
  const ws=sockets[0];ws.onopen();ws.onmessage({data:JSON.stringify({t:'welcome',uid:'owner',room:'praca',players:[]})});
  return {find,sends,sendParent,flushTyping(){
    const timer=[...timeouts.entries()].find(([,entry])=>entry.delay===1500);
    assert.ok(timer,'deve existir timer de inatividade');
    timeouts.delete(timer[0]);timer[1].callback();
  }};
}

test('balão aparece ao digitar e desaparece após parar mesmo com frase escrita',()=>{
  const f=fixture(),input=f.find('#message');
  input.value='ainda escrito';
  input.dispatchEvent({type:'input'});
  assert.equal(f.sends.at(-1)?.t,'typing');
  assert.equal(f.sends.at(-1)?.active,true);
  f.flushTyping();
  assert.equal(f.sends.at(-1)?.t,'typing');
  assert.equal(f.sends.at(-1)?.active,false);
  assert.equal(input.value,'ainda escrito');
});

test('digitação redirecionada pelo teclado da fazenda também ativa balão',()=>{
  const f=fixture(),input=f.find('#message');
  f.sendParent('mf-salon-type',{key:'A'});
  assert.equal(input.value,'A');
  assert.equal(f.sends.at(-1)?.active,true);
  f.find('#chat').onsubmit({preventDefault(){}});
  assert.ok(f.sends.some(m=>m.t==='typing'&&m.active===false));
  assert.ok(f.sends.some(m=>m.t==='chat'&&m.text==='A'));
  assert.equal(input.value,'');
});
