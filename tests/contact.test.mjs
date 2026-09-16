import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const source = ts.transpileModule(fs.readFileSync('src/scripts/contact.ts', 'utf8').replace('export function', 'function'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(fetchResponse) {
  const attributes = () => ({ attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, removeAttribute(k) { delete this.attrs[k]; }, getAttribute(k) { return this.attrs[k]; }, focus() {} });
  const fields = ['name','company','email','phone'].map(name=>({ ...attributes(), name, id:name, value:name==='phone'?'':'valid', required:name!=='phone', events:{}, checkValidity(){return true;}, addEventListener(event,fn){this.events[event]=fn;} }));
  const status = {...attributes(), textContent:'', dataset:{}, hidden:true};
  const submit = {disabled:false}; const label = {textContent:''};
  const errors = Object.fromEntries(fields.map(f=>[f.name,{textContent:'',id:''}]));
  let handler; let resets=0; let tokenResets=0; let calls=0; const payloads=[];
  const form = {...attributes(), dataset:{endpoint:'/api/contact.php'},
    querySelectorAll(){return fields;},
    querySelector(selector){if(selector.includes('button'))return submit;if(selector.includes('data-submit-label'))return label;if(selector.includes('data-form-status'))return status;return errors[selector.match(/data-error-for="([^"]+)/)?.[1]];},
    addEventListener(_,fn){handler=fn;}, reset(){resets++;},
  };
  const context={document:{querySelectorAll:()=>[form]},crypto:webcrypto,AbortSignal,
    window:{turnstile:{reset(){tokenResets++;}}},
    FormData:class{entries(){return [...fields.map(f=>[f.name,f.value]),['cf-turnstile-response','token'],['companyUrl','']];}},
    fetch:async (_,options)=>{calls++; const data=JSON.parse(options.body);payloads.push(data);return fetchResponse(data);},
  };
  vm.runInNewContext(source+'\ninitContactForms();',context);
  return {fields,status,submit,label,form,payloads,run:()=>handler({preventDefault(){}}),get calls(){return calls;},get resets(){return resets;},get tokenResets(){return tokenResets;}};
}
test('contact success requires matching JSON receipt and resets widget',async()=>{
  const app=setup(data=>({ok:true,status:200,json:async()=>({ok:true,requestId:data.requestId})}));
  await app.run(); assert.equal(app.status.dataset.state,'success'); assert.equal(app.resets,1);assert.equal(app.tokenResets,1);assert.equal(app.submit.disabled,false);
});
test('HTML or unrecognised 200 response cannot produce false success',async()=>{
  const app=setup(()=>({ok:true,status:200,json:async()=>({ok:true,requestId:'wrong'})}));
  await app.run();assert.equal(app.status.dataset.state,'error');assert.equal(app.resets,0);
});
test('network failure preserves values and same idempotency key on retry',async()=>{
  const app=setup(()=>{throw new Error('offline');});await app.run();await app.run();
  assert.equal(app.resets,0);assert.equal(app.fields[0].value,'valid');assert.equal(app.payloads[0].requestId,app.payloads[1].requestId);
  app.fields[0].events.input();await app.run();assert.notEqual(app.payloads[1].requestId,app.payloads[2].requestId);
});
test('double submission cannot trigger two concurrent requests',async()=>{
  let resolve;const app=setup(data=>new Promise(r=>{resolve=()=>r({ok:true,json:async()=>({ok:true,requestId:data.requestId})});}));
  const first=app.run();await app.run();assert.equal(app.calls,1);assert.equal(app.submit.disabled,true);resolve();await first;assert.equal(app.submit.disabled,false);
});
test('server errors render as text, preserve fields and reset Turnstile',async()=>{
  const app=setup(()=>({ok:false,status:429,json:async()=>({message:'<img src=x onerror=alert(1)>'})}));await app.run();
  assert.equal(app.status.textContent,'<img src=x onerror=alert(1)>');assert.equal(app.status.dataset.state,'error');assert.equal(app.resets,0);assert.equal(app.tokenResets,1);
});
test('invalid phone and whitespace required field never reach network',async()=>{
  const app=setup(()=>{throw new Error('must not fetch');});app.fields[3].value='invalid';await app.run();assert.equal(app.calls,0);
  app.fields[3].value='';app.fields[0].value='   ';await app.run();assert.equal(app.calls,0);
});
