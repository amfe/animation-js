import {expect} from 'chai';
import {Animation} from '../src/index';

describe('index.js', () => {
    it('export animation', () => {
        expect(Animation).to.be.a('function');
    });
    // it('export frame', () => {
    //     const animation= new Animation(parseFloat(duration), bezier, function(i1, i2) {
    //
    //     });
    //     expect(animation).to.be.a('function');
    // });
    // it('export requestFrame', () => {
    //     expect(Animation).to.be.a('function');
    // });

});