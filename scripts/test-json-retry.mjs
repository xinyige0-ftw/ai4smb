import assert from 'node:assert/strict';
process.env.GROQ_API_KEY='synthetic-test-key';
const {generateWithGroq}=await import('../lib/ai-provider.ts');
const {default:Groq}=await import('groq-sdk');
const originalPost=Groq.prototype.post;
let responses=[],requests=[];
Groq.prototype.post=async(_path,{body:request})=>{requests.push(request);assert.ok(responses.length,'Unexpected extra request');const {status=200,body}=responses.shift();if(status>=400){const error=new Error('Synthetic provider failure');error.status=status;error.error=body;throw error;}return body;};
const good={choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]};
const failure={status:400,body:{error:{code:'json_validate_failed',failed_generation:'PRIVATE_FAILED_OUTPUT'}}};
try {
 responses=[failure,{body:good}];requests=[];
 assert.equal(JSON.parse((await generateWithGroq('test','test',{jsonMode:true,maxTokens:2048},'configured-model')).text).ok,true);
 assert.equal(requests.length,2);assert.equal(requests[1].model,'configured-model');assert.ok(requests[1].max_tokens>requests[0].max_tokens);
 responses=[failure,failure];requests=[];
 await assert.rejects(()=>generateWithGroq('test','test',{jsonMode:true}),e=>!e.message.includes('PRIVATE_FAILED_OUTPUT')&&e.message.includes('one retry'));
 assert.equal(requests.length,2);
 responses=[{status:401,body:{error:{code:'invalid_api_key'}}}];requests=[];
 await assert.rejects(()=>generateWithGroq('test','test',{jsonMode:true}));assert.equal(requests.length,1);
 responses=[{status:404,body:{error:{code:'model_not_found'}}}];requests=[];
 await assert.rejects(()=>generateWithGroq('test','test',{jsonMode:true}));assert.equal(requests.length,1);
 responses=[{body:{choices:[{finish_reason:'length',message:{content:'{"partial":'}}]}},{body:good}];requests=[];
 assert.equal(JSON.parse((await generateWithGroq('test','test',{jsonMode:true})).text).ok,true);assert.equal(requests.length,2);
 responses=[{body:{choices:[{finish_reason:'stop',message:{content:'ordinary text'}}]}}];requests=[];
 assert.equal((await generateWithGroq('test','test',{jsonMode:false})).text,'ordinary text');assert.equal(requests.length,1);
 console.log('JSON retry regression passed: one bounded retry, no auth/model retries, no failed-output disclosure.');
} finally {Groq.prototype.post=originalPost;}
