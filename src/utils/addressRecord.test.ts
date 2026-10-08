import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accountId,
  chooseSelectedAddressId,
  createAddressBook,
  LEGACY_SAVED_ADDRESSES_KEY,
  LEGACY_SELECTED_ADDRESS_KEY,
  parseStoredAddresses,
  savedAddressStorageKey,
  selectedAddressStorageKey,
  storedPoint,
  type AddressKeyValueStore,
  type SavedAddress,
} from './addressRecord.ts';

const place = (id: string, label: string, lat = 8.38, lng = 77.61): SavedAddress => ({
  id,
  type: 'Home',
  address: label,
  fullAddress: label,
  location: { lat, lng },
});

function memoryStore(): AddressKeyValueStore & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    async getItem(key) {
      return items.has(key) ? items.get(key)! : null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
    async multiRemove(keys) {
      keys.forEach((key) => items.delete(key));
    },
  };
}

describe('saved address records', () => {
  it('keeps a selectable pin and drops an invalid one', () => {
    assert.deepEqual(storedPoint({ lat: 8.38, lng: 77.61 }), { lat: 8.38, lng: 77.61 });
    assert.equal(storedPoint({ lat: 0, lng: 0 }), undefined);
    assert.equal(storedPoint({ lat: 95, lng: 10 }), undefined);
    assert.equal(storedPoint('not-a-point'), undefined);
  });

  it('ignores corrupt storage instead of throwing', () => {
    assert.deepEqual(parseStoredAddresses('{'), []);
    assert.deepEqual(parseStoredAddresses('{"id":"addr-1"}'), []);
    const parsed = parseStoredAddresses(JSON.stringify([
      { id: 'addr-1', fullAddress: 'Valliyur', location: { lat: 8.38, lng: 77.61 } },
      { id: 'addr-2', fullAddress: 'Broken', location: { lat: 'south', lng: 77 } },
      { fullAddress: 'Missing id' },
    ]));
    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed[0].location, { lat: 8.38, lng: 77.61 });
    assert.equal(parsed[1].location, undefined);
  });

  it('uses the stored selection instead of the first address', () => {
    const addresses = [{ id: 'profile-address' }, { id: 'addr-new' }];
    assert.equal(chooseSelectedAddressId(addresses, null, 'addr-new'), 'addr-new');
    assert.equal(chooseSelectedAddressId(addresses, 'profile-address', 'addr-new'), 'profile-address');
    assert.equal(chooseSelectedAddressId(addresses, null, 'missing'), 'profile-address');
    assert.equal(chooseSelectedAddressId([], null, null), null);
  });
});

describe('account address books', () => {
  it('uses user.id and falls back to _id', () => {
    assert.equal(accountId({ id: 'user-a', _id: 'other' }), 'user-a');
    assert.equal(accountId({ id: '   ', _id: 'user-b' }), 'user-b');
    assert.equal(accountId('  user-c  '), 'user-c');
    assert.equal(accountId({ email: 'person@example.test', phone: '9000000000' }), null);
    assert.equal(accountId(null), null);
    assert.equal(accountId('   '), null);
  });

  it('keeps account A private from account B', async () => {
    const store = memoryStore();
    const book = createAddressBook(store);
    await book.addAddress('user-a', place('addr-a', 'Place A'));
    await book.setSelectedAddressId('user-a', 'addr-a');
    await book.addAddress('user-a', place('addr-a', 'Place A updated', 8.39, 77.62));

    assert.deepEqual((await book.getAddresses('user-b')).map((item) => item.id), []);
    await book.removeAddress('user-b', 'addr-a');
    await book.setSelectedAddressId('user-b', 'addr-a');
    assert.equal(await book.getSelectedAddressId('user-a'), 'addr-a');
    await book.addAddress('user-b', place('addr-b', 'Place B', 8.4, 77.63));
    await book.setSelectedAddressId('user-b', 'addr-b');

    const savedByA = await book.getAddresses('user-a');
    assert.deepEqual(savedByA.map((item) => item.id), ['addr-a']);
    assert.equal(savedByA[0].fullAddress, 'Place A updated');
    assert.deepEqual(savedByA[0].location, { lat: 8.39, lng: 77.62 });
    assert.equal(await book.getSelectedAddressId('user-a'), 'addr-a');
    assert.equal(await book.getSelectedAddressId('user-b'), 'addr-b');
    assert.deepEqual((await book.getAddresses('user-b')).map((item) => item.id), ['addr-b']);

    await book.removeAddress('user-a', 'addr-a');
    assert.deepEqual(await book.getAddresses('user-a'), []);
    assert.deepEqual((await book.getAddresses('user-b')).map((item) => item.id), ['addr-b']);
  });

  it('does not read or write when the account id is missing', async () => {
    const store = memoryStore();
    const book = createAddressBook(store);
    await book.addAddress('user-a', place('addr-a', 'Place A'));
    await book.setSelectedAddressId('user-a', 'addr-a');

    for (const missing of [null, '', '   ', { id: '  ' }]) {
      assert.deepEqual(await book.getAddresses(missing), []);
      assert.equal(await book.getSelectedAddressId(missing), null);
      assert.equal(await book.getSelectedAddress(missing), null);
      await book.addAddress(missing, place('intruder', 'Other place'));
      await book.removeAddress(missing, 'addr-a');
      await book.setSelectedAddressId(missing, 'intruder');
    }

    assert.deepEqual((await book.getAddresses('user-a')).map((item) => item.id), ['addr-a']);
    assert.equal(await book.getSelectedAddressId('user-a'), 'addr-a');
    assert.equal(store.items.has(LEGACY_SAVED_ADDRESSES_KEY), false);
  });

  it('drops unowned legacy keys instead of adopting them', async () => {
    const store = memoryStore();
    store.items.set(LEGACY_SAVED_ADDRESSES_KEY, JSON.stringify([place('legacy', 'Old place')]));
    store.items.set(LEGACY_SELECTED_ADDRESS_KEY, 'legacy');
    const book = createAddressBook(store);

    assert.deepEqual(await book.getAddresses('user-a'), []);
    assert.equal(await book.getSelectedAddressId('user-a'), null);
    assert.deepEqual(await book.getAddresses('user-b'), []);
    assert.equal(store.items.has(LEGACY_SAVED_ADDRESSES_KEY), false);
    assert.equal(store.items.has(LEGACY_SELECTED_ADDRESS_KEY), false);
    assert.equal(store.items.has(savedAddressStorageKey('user-a')), false);
  });

  it('keeps a delayed write on the account captured at the start', async () => {
    const store = memoryStore();
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const book = createAddressBook({
      ...store,
      async getItem(key) {
        if (key === savedAddressStorageKey('user-a')) await blocked;
        return store.getItem(key);
      },
    });

    const pending = book.addAddress('user-a', place('addr-a', 'Place A'));
    await book.addAddress('user-b', place('addr-b', 'Place B', 8.4, 77.63));
    release();
    await pending;

    assert.deepEqual((await book.getAddresses('user-a')).map((item) => item.id), ['addr-a']);
    assert.deepEqual((await book.getAddresses('user-b')).map((item) => item.id), ['addr-b']);
    assert.equal(store.items.has(LEGACY_SAVED_ADDRESSES_KEY), false);
    assert.equal(store.items.has(selectedAddressStorageKey('user-a')), false);
  });

  it('keeps the same account after a signed-out read and drops an invalid pin', async () => {
    const store = memoryStore();
    const book = createAddressBook(store);
    await book.addAddress('user-a', place('addr-a', 'Place A', 0, 0));
    assert.equal((await book.getAddresses('user-a'))[0].location, undefined);
    assert.deepEqual(await book.getAddresses(null), []);
    assert.deepEqual((await book.getAddresses({ id: 'user-a' })).map((item) => item.id), ['addr-a']);
  });
});
