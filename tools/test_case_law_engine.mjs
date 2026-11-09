import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {normalize,search,sweep,evidence,concordance,safeURL} from '../public/play/open-case-law/engine.mjs';
test('source ranking and fusion preserve discovery distinction',async()=>{
 const docs=await normalize([{id:'a',title:'Notice',text:'Public hearing requires notice.',metadata:{authority:{stage:'final'}},publication:'published'},{id:'b',title:'Different',text:'Notice was given.'},{id:'c',title:'Summary',text:'Public hearing requires notice.',content_type:'research_summary'}]);
 assert.equal(search(docs,'public hearing')[0].doc.id,'a');assert.equal(search(docs,'public hearing').length,1);
 assert.equal(search(docs,'public private',{mode:'any'}).length,1);
 assert.equal(sweep(docs,['notice','hearing','notice']).coverage.length,2);
 assert.equal(sweep(docs,['notice','hearing']).results[0].doc.id,'a');
 assert.equal(concordance(docs,['public hearing','notice'],100).results.length,1);
 assert.equal(concordance(docs,['public hearing','notice'],5).results.length,0);
 const note=evidence(docs[0],{issue:'Notice?',position:'supports',role:'holding',fit:'analogical',quote:'Public hearing requires notice.',pinpoint:'p. 1'});
 docs[0].text='Changed';assert.equal(note.source.text,'Public hearing requires notice.');assert.equal(note.source.sha256.length,64);
 assert.throws(()=>evidence(docs[2],{issue:'Question',quote:'Public hearing requires notice.',pinpoint:'p. 1'}));
 assert.throws(()=>evidence(docs[1],{issue:'Question',role:'holding',quote:'Notice was given.',pinpoint:'p. 1'}));
 assert.equal(safeURL('javascript:alert(1)'), '');assert.equal(safeURL('https://example.org/'),'https://example.org/');
});
test('imports reject malformed data before use',async()=>{
 await assert.rejects(normalize([{title:'Missing'}]));await assert.rejects(normalize([{title:'Bad',text:'Source',content_type:'invented'}]));
 const docs=await normalize([{title:'Dissent',text:'Disagree.',metadata:{authority:{stage:'final'},opinion_type:'040dissent'}}]);
 assert.throws(()=>evidence(docs[0],{issue:'Question',role:'holding',quote:'Disagree.',pinpoint:'p. 1'}));
});
