import {test,expect} from 'bun:test';
import {parseEncoding,encodingCommands} from '../src/magneticEncoding';
test('splits sentinel tracks and preserves spaces and punctuation in Track 1',()=>{
 expect(encodingCommands('%B000123^ACCESS /TEST^9912?;000123=9912? +000123=123?')).toEqual(['~1B000123^ACCESS /TEST^9912|','~2000123=9912|','~3000123=123|']);
});
test('supports reader colon separator without rewriting numeric track data',()=>{
 expect(parseEncoding('%B0001^TEST /CARD^9912:0001=9912? +0001=123?')).toHaveLength(3);
 expect(()=>parseEncoding('%B0001^TEST^9912:0001=9912? +0001 23= -364?')).toThrow('ترک 3');
});
test('rejects duplicate, incomplete and over-capacity tracks',()=>{
 for(const text of [';123?;456?','%ABC',';'+ '1'.repeat(38)+'?','+12-34?']) expect(()=>parseEncoding(text)).toThrow();
 expect(encodingCommands('0'.repeat(66))).toEqual(['~3'+'0'.repeat(66)+'|']);
});
