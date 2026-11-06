import {expect,test} from 'bun:test';
import {WindowsBridge,magneticNumber} from '../src/windowsBridge';
const agent = {id:'windows-1',machine:'PC',printer:'HiTi CS-200e'};
const image = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,192,0,17,8,2,126,3,243,3,1,17,0,2,17,1,3,17,1,255,217]).toString('base64');
test('normalizes exact entered digits and preserves leading zeroes',()=>{
 expect(magneticNumber('۰۱۲۳ ٤٥٦٧')).toBe('01234567');
 for(const value of ['', '12X3', '1'.repeat(67),'~2123|']) expect(()=>magneticNumber(value)).toThrow();
});
test('requires connector; claims a card only once and deduplicates requests',()=>{
 const bridge=new WindowsBridge();const job={id:'card-1',track2:'۰۰۱۲۳۴',image};
 expect(()=>bridge.submit(job,100)).toThrow();bridge.poll(agent,100);
 bridge.submit(job,101);expect(bridge.submit(job,102).status).toBe('waiting');
 expect(()=>bridge.submit({...job,track2:'999'},102)).toThrow();
 expect(bridge.poll(agent,103).job?.track2).toBe('001234');
 expect(bridge.poll(agent,104).job).toBeNull();
 expect(()=>bridge.poll({...agent,id:'other'},105)).toThrow();
 expect(()=>bridge.result({id:'other',jobId:job.id,ok:true,message:''})).toThrow();
 bridge.result({id:agent.id,jobId:job.id,ok:true,message:''});
 expect(bridge.status(106).job?.status).toBe('submitted');
 expect(bridge.submit(job,107).status).toBe('submitted');
});
test('expires undelivered cards and rejects malformed artwork',()=>{
 const bridge=new WindowsBridge();bridge.poll(agent,100);
 expect(()=>bridge.submit({id:'bad',track2:'123',image:'data:image/jpeg;base64,AAAA'},101)).toThrow();
 bridge.submit({id:'expires',track2:'123',image},101);
 expect(bridge.status(60200).job?.status).toBe('failed');
 expect(bridge.poll(agent,60300).job).toBeNull();
});

test('accepts up to 66 numeric characters with separators for long-track routing',()=>{
 expect(magneticNumber('0'.repeat(65)+'=')).toBe('0'.repeat(65)+'=');
 expect(()=>magneticNumber('1'.repeat(67))).toThrow();
 expect(()=>magneticNumber('12-34')).toThrow();
});
