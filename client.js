// client.js - browser side
(() => {
  const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + ':3000';
  let ws;
  let myUsername = null;
  let activeRoom = null;

  const $ = id => document.getElementById(id);
  const loginOverlay = $('loginOverlay');
  const usernameInput = $('usernameInput');
  const roomInput = $('roomInput');
  const joinBtn = $('joinBtn');
  const createBtn = $('createBtn');
  const loginError = $('loginError');

  const chatApp = $('chatApp');
  const roomsList = $('roomsList');
  const usersList = $('usersList');
  const messages = $('messages');
  const messageForm = $('messageForm');
  const messageInput = $('messageInput');
  const roomTitle = $('roomTitle');
  const activeRoomName = $('activeRoomName');
  const notif = $('notif');

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.addEventListener('open', () => {
      console.log('connected to server');
    });
    ws.addEventListener('message', ev => {
      try {
        const data = JSON.parse(ev.data);
        handleMessage(data);
      } catch(e){ console.error(e) }
    });
    ws.addEventListener('close', ()=> {
      appendSystem('Disconnected from server.');
    });
  }

  function send(obj){
    if(ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function handleMessage(d){
    switch(d.type){
      case 'rooms_list':
        renderRooms(d.rooms);
        break;
      case 'rooms_update':
        renderRooms(d.rooms);
        break;
      case 'joined':
        myUsername = d.username;
        activeRoom = d.room;
        loginOverlay.classList.add('hidden');
        chatApp.classList.remove('hidden');
        roomTitle.textContent = d.room;
        activeRoomName.textContent = d.room;
        messages.innerHTML = '';
        appendSystem('Joined room: ' + d.room);
        break;
      case 'message':
        appendChat(d);
        break;
      case 'error':
        loginError.textContent = d.error;
        break;
      case 'user_list':
        renderUsers(d.users);
        break;
    }
  }

  function renderRooms(rooms){
    roomsList.innerHTML = '';
    rooms.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      if(r === activeRoom) li.classList.add('active');
      li.onclick = () => {
        if(r === activeRoom) return;
        send({type:'join_room', room: r});
      };
      roomsList.appendChild(li);
    });
  }

  function renderUsers(users){
    usersList.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li');
      li.textContent = u;
      if(u === myUsername) li.textContent += ' (you)';
      usersList.appendChild(li);
    });
  }

  function appendSystem(text){
    const div = document.createElement('div');
    div.className = 'message system';
    div.textContent = text;
    messages.appendChild(div);
    scrollBottom();
  }

  function formatText(raw){
    // Very small markdown-like: **bold**, *italic*, and links.
    let out = raw
      .replace(/(\*\*([^\*]+)\*\*)/g, (_,__,inner)=>('<b>'+inner+'</b>'))
      .replace(/(\*([^\*]+)\*)/g, (_,__,inner)=>('<i>'+inner+'</i>'));
    // linkify
    out = out.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return out;
  }

  function appendChat(d){
    const who = d.username || 'system';
    const isMe = who === myUsername;
    const div = document.createElement('div');
    div.className = 'message' + (isMe ? ' me' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = who + ' • ' + (new Date(d.ts)).toLocaleString();
    const text = document.createElement('div');
    text.className = 'text';
    text.innerHTML = formatText(d.text || '');
    div.appendChild(meta);
    div.appendChild(text);
    messages.appendChild(div);
    if(document.hidden || document.visibilityState !== 'visible'){
      notif.classList.remove('hidden');
      setTimeout(()=> notif.classList.add('hidden'), 2500);
    }
    scrollBottom();
  }

  function scrollBottom(){
    messages.scrollTop = messages.scrollHeight;
  }

  joinBtn.onclick = () => {
    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    loginError.textContent = '';
    if(!username) { loginError.textContent = 'Please enter a username.'; return; }
    if(!room) { loginError.textContent = 'Please enter or choose a room.'; return; }
    if(!ws || ws.readyState !== WebSocket.OPEN) connect();
    send({type:'set_username', username});
    // request join after slight delay to allow server to accept username
    setTimeout(()=> send({type:'join_room', room}), 120);
  };

  createBtn.onclick = () => {
    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();
    loginError.textContent = '';
    if(!username) { loginError.textContent = 'Please enter a username.'; return; }
    if(!room) { loginError.textContent = 'Please enter a room name to create.'; return; }
    if(!ws || ws.readyState !== WebSocket.OPEN) connect();
    send({type:'set_username', username});
    setTimeout(()=> send({type:'create_room', room}), 120);
  };

  messageForm.onsubmit = e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if(!text) return;
    send({type:'message', text});
    messageInput.value = '';
  };

  // initial connect to fetch rooms
  connect();
  // request rooms after small delay
  setTimeout(()=> {
    if(ws && ws.readyState === WebSocket.OPEN) send({type:'list_rooms'});
  }, 200);

  // hide notification when window gets focus
  document.addEventListener('visibilitychange', ()=> {
    if(document.visibilityState === 'visible') notif.classList.add('hidden');
  });
})();
