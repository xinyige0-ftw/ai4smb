import assert from 'node:assert/strict';
import {campaignFields,validateCampaign} from '../lib/campaign-schema.ts';
const channels=Object.entries(campaignFields).map(([channel,fields])=>{const v=Object.fromEntries(Object.entries(fields).map(([k,s])=>[k,s.type==='array'?['test']:'test']));return {channel,why:'test',content:{variant_a:{...v},variant_b:{...v}}};});
const good={strategy:'test',channels,thisWeek:Array.from({length:3},()=>({day:'Monday',action:'test',why:'test'}))};
validateCampaign(good);
for(const mutate of [v=>delete v.channels[0].content.variant_b,v=>v.channels[0].content.variant_a.subject=3,v=>v.channels[3].content.variant_a.headlines='wrong',v=>v.channels.push(v.channels[0]),v=>v.thisWeek.pop(),v=>v.channels[0].channel='__proto__']) {const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateCampaign(bad),SyntaxError);}
console.log('Campaign schema regression passed: 8 channels, both variants, invalid fields and incomplete plans.');
