import {test,expect} from 'bun:test';
import {DEFAULT_DESIGN} from '../src/design';
import {madarDesign,updateMadarField} from '../src/madar';
import {cardTrack2} from '../src/cardNumber';
test('Track 2 follows the current Card / member number without a separate record',()=>{
 expect(cardTrack2({...DEFAULT_DESIGN,number:'۰۰۱۲ ٣٤'})).toBe('001234');
 const design=madarDesign(DEFAULT_DESIGN);
 design.elements=updateMadarField(design,'number','0012345678901234');
 expect(cardTrack2(design)).toBe('0012345678901234');
 design.elements=updateMadarField(design,'number','9876');
 expect(cardTrack2(design)).toBe('9876');
 design.elements=updateMadarField(design,'number','');
 expect(cardTrack2(design)).toBe('');
});

test('long card values and separators survive the Madar artwork round trip',()=>{
 const design=madarDesign(DEFAULT_DESIGN);
 const number='00123456789012345678901234567890=12345678901234567890123456789012345';
 design.elements=updateMadarField(design,'number',number);
 expect(cardTrack2(design)).toBe(number);
});
