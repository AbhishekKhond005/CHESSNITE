import test from 'node:test';
import assert from 'node:assert/strict';
import { squarePoint, pointerSquare, replyDelay, pause } from '../src/interaction.js';
test('pointer positions map correctly on either orientation, and outside drops are rejected', () => {
  const rect = {left:100, top:50, right:900, bottom:850, width:800, height:800};
  for (const flipped of [true,false]) for (const file of 'abcdefgh') for (let rank=1;rank<=8;rank++) {
    const square=file+rank, point=squarePoint(square,flipped);
    assert.equal(pointerSquare(100+(point.x+.5)*100,50+(point.y+.5)*100,rect,flipped),square);
  }
  assert.equal(pointerSquare(99,60,rect),null);
  assert.equal(pointerSquare(900,60,rect),null);
});
test('replies have a deliberate bounded pause and can be cancelled', async () => {
  assert.equal(replyDelay(()=>0),1000); assert.equal(replyDelay(()=>1),1600);
  assert.equal(replyDelay(()=>0,true),700);
  const controller=new AbortController();const waiting=pause(10000,controller.signal);controller.abort();
  await assert.rejects(waiting,error=>error.name==='AbortError');
});
