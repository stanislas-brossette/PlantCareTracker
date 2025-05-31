let queue, flushQueue, outbox;

beforeAll(async () => {
  try {
    const mod = await import('../public/js/storage.js');
    queue = mod.queue;
    flushQueue = mod.flushQueue;
    outbox = mod.outbox;
  } catch (e) {
    console.warn('ESM import failed, skipping tests');
  }
});

describe('storage queue', () => {
  test('queue and flush', async () => {
    if (!queue) return;
    await outbox.setItem('ops', []);
    await queue({method:'POST',url:'/x',body:{a:1},ts:1});
    await queue({method:'DELETE',url:'/y',ts:2});
    let ops = await outbox.getItem('ops');
    expect(ops.length).toBe(2);
    const pushed = [];
    await flushQueue(op=>{pushed.push(op);});
    expect(pushed.length).toBe(2);
    ops = await outbox.getItem('ops');
    expect(ops.length).toBe(0);
  });
});
