import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { io as createClient, Socket } from 'socket.io-client';
import { User } from './src/models/User.model';
import { disconnectUserSockets, initializeSocket } from './src/services/socket.service';
import { generateToken } from './src/utils/jwt.util';

process.env.JWT_SECRET = 'socket-auth-test-secret-with-sufficient-length';

const activeById: Record<string, boolean | null> = {
  active: true,
  watcher: true,
  packetuser: true,
  inactive: false,
  missing: null,
};

// Stub only the database lookup boundary; this exercises the actual Socket.IO
// handshake, packet middleware, and targeted-disconnect behavior without MongoDB.
(User as any).findById = (id: string) => {
  const user = activeById[id] === null || activeById[id] === undefined
    ? null
    : { _id: id, role: 'staff', isActive: activeById[id] };
  return {
    select: () => ({
      lean: async () => user,
      then: (resolve: (value: typeof user) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(user).then(resolve, reject),
    }),
  };
};

const connectClient = (url: string, token?: string): Promise<Socket> => new Promise((resolve, reject) => {
  const client = createClient(url, {
    ...(token ? { auth: { token } } : {}),
    reconnection: false,
    timeout: 3000,
  });
  client.once('connect', () => resolve(client));
  client.once('connect_error', (error) => {
    client.close();
    reject(error);
  });
});

const waitForDisconnect = (socket: Socket): Promise<void> => new Promise((resolve) => {
  if (!socket.connected) return resolve();
  socket.once('disconnect', () => resolve());
});

const main = async () => {
  const server = http.createServer();
  const socketServer = initializeSocket(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;

  try {
    const watcher = await connectClient(url, generateToken({ userId: 'watcher', role: 'staff' }));
    let onlineAnnouncementReceived = false;
    watcher.once('staff-online', () => { onlineAnnouncementReceived = true; });
    const active = await connectClient(url, generateToken({ userId: 'active', role: 'staff' }));
    active.emit('staff-online', {});
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(onlineAnnouncementReceived, true, 'active users retain authenticated socket events');

    const packetUser = await connectClient(url, generateToken({ userId: 'packetuser', role: 'staff' }));
    onlineAnnouncementReceived = false;
    activeById.packetuser = false;
    const packetDisconnect = waitForDisconnect(packetUser);
    packetUser.emit('staff-online', {});
    await packetDisconnect;
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(onlineAnnouncementReceived, false, 'inactive users cannot use an existing authenticated socket');

    // A live socket is disconnected promptly when the account is deactivated.
    activeById.active = false;
    const disconnected = waitForDisconnect(active);
    disconnectUserSockets('active');
    await disconnected;

    await assert.rejects(
      connectClient(url, generateToken({ userId: 'active', role: 'staff' })),
      /Account inactive/,
    );
    await assert.rejects(
      connectClient(url, generateToken({ userId: 'inactive', role: 'staff' })),
      /Account inactive/,
    );
    await assert.rejects(
      connectClient(url, generateToken({ userId: 'missing', role: 'staff' })),
      /User not found/,
    );
    await assert.rejects(connectClient(url, 'not-a-valid-token'), /Invalid token/);
    await assert.rejects(connectClient(url), /No token provided/);
    const expiredToken = jwt.sign({ userId: 'active', role: 'staff' }, process.env.JWT_SECRET!, { expiresIn: -1 });
    await assert.rejects(connectClient(url, expiredToken), /Invalid token/);

    active.close();
    packetUser.close();
    watcher.close();
    console.log('Socket authentication tests passed.');
  } finally {
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
