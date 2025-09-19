// server.js - simple WebSocket server using 'ws'
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log('WebSocket server running on port', PORT);
});

// rooms: { roomName: { users: Set of usernames, sockets: Set of ws } }
const rooms = new Map();
// usernames in use globally (to prevent duplicates)
const usernames = new Set();
// map ws -> { username, room }
const clients = new Map();

function broadcastToRoom(roomName, obj){
  const room = rooms.get(roomName);
  if(!room) return;
  const payload = JSON.stringify(obj);
  room.sockets.forEach(ws => {
    if(ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

function send(ws, obj){
  if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function safeTimestamp(){ return Date.now(); }

wss.on('connection', (ws) => {
  clients.set(ws, { username: null, room: null });
  // send current room list
  send(ws, { type:'rooms_list', rooms: Array.from(rooms.keys()) });

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch(e){ return; }
    const info = clients.get(ws);

    if(data.type === 'set_username'){
      const desired = String(data.username || '').trim();
      if(!desired){ send(ws, {type:'error', error:'Invalid username.'}); return; }
      if(usernames.has(desired)){
        send(ws, {type:'error', error:'Username already in use. Choose another.'});
        return;
      }
      // if this ws had earlier username, free it
      if(info.username) usernames.delete(info.username);
      info.username = desired;
      usernames.add(desired);
      send(ws, {type:'user_list', users: getUsersInRoom(info.room)});
    }

    if(data.type === 'create_room'){
      const room = String(data.room || '').trim();
      if(!room){ send(ws, {type:'error', error:'Invalid room name.'}); return; }
      if(!rooms.has(room)){
        rooms.set(room, { users: new Set(), sockets: new Set() });
        broadcastRooms();
      }
      // join after creation
      joinRoom(ws, room);
    }

    if(data.type === 'list_rooms'){
      send(ws, {type:'rooms_list', rooms: Array.from(rooms.keys())});
    }

    if(data.type === 'join_room'){
      const room = String(data.room || '').trim();
      if(!room || !rooms.has(room)){ send(ws, {type:'error', error:'Room does not exist.'}); return; }
      joinRoom(ws, room);
    }

    if(data.type === 'message'){
      const text = String(data.text || '').trim();
      if(!text) return;
      if(!info.username || !info.room){ send(ws, {type:'error', error:'You must join a room first.'}); return; }
      const msg = { type:'message', username: info.username, text, ts: safeTimestamp() };
      broadcastToRoom(info.room, msg);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if(info){
      if(info.username) usernames.delete(info.username);
      if(info.room && rooms.has(info.room)){
        const room = rooms.get(info.room);
        room.users.delete(info.username);
        room.sockets.delete(ws);
        // notify others
        broadcastToRoom(info.room, { type:'message', username: 'system', text: (info.username || 'A user') + ' left the room.', ts: safeTimestamp() });
        // update user list
        broadcastToRoom(info.room, { type:'user_list', users: Array.from(room.users) });
        // if empty room, delete
        if(room.users.size === 0){
          rooms.delete(info.room);
          broadcastRooms();
        }
      }
    }
    clients.delete(ws);
  });
});

function joinRoom(ws, roomName){
  const info = clients.get(ws);
  if(!info || !info.username){
    send(ws, {type:'error', error:'Set username before joining a room.'});
    return;
  }
  // if already in a room, leave it
  if(info.room && rooms.has(info.room)){
    const prev = rooms.get(info.room);
    prev.users.delete(info.username);
    prev.sockets.delete(ws);
    broadcastToRoom(info.room, { type:'message', username: 'system', text: info.username + ' left the room.', ts: safeTimestamp() });
    broadcastToRoom(info.room, { type:'user_list', users: Array.from(prev.users) });
    if(prev.users.size === 0){
      rooms.delete(info.room);
    }
  }
  // add to new room
  if(!rooms.has(roomName)) rooms.set(roomName, { users: new Set(), sockets: new Set() });
  const room = rooms.get(roomName);
  // prevent duplicate username inside room (already globally prevented)
  room.users.add(info.username);
  room.sockets.add(ws);
  info.room = roomName;
  // notify the joining socket
  send(ws, { type:'joined', username: info.username, room: roomName });
  // announce to others
  broadcastToRoom(roomName, { type:'message', username: 'system', text: info.username + ' joined the room.', ts: safeTimestamp() });
  broadcastToRoom(roomName, { type:'user_list', users: Array.from(room.users) });
  broadcastRooms();
}

function broadcastRooms(){
  const list = Array.from(rooms.keys());
  const obj = { type:'rooms_update', rooms: list };
  // send to all connected
  wss.clients.forEach(ws => {
    if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  });
}

function getUsersInRoom(roomName){
  if(!roomName || !rooms.has(roomName)) return [];
  return Array.from(rooms.get(roomName).users);
}
