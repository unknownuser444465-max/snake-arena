(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const socket = typeof io === "function" ? io() : null;
  let mode = "connecting";
  let joined = false;
  let myId = null;
  let world = { width: 1800, height: 1200 };
  let players = [];
  let foods = [];
  let localSnake = null;
  let lastAimAt = 0;
  let soundOn = false;
  let audioContext = null;
  let camera = { x: 0, y: 0 };
  let width = 800, height = 500, dpr = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function setConnection(text, online) {
    $("connectionText").textContent = text;
    document.querySelector(".pulse").style.background = online ? "var(--mint)" : "#fbbf24";
  }
  if (socket) {
    socket.on("connect", () => { mode = "online"; setConnection("Server connected", true); $("modeLabel").textContent = "MULTIPLAYER ARENA"; });
    socket.on("disconnect", () => { mode = "offline"; setConnection("Server disconnected", false); $("modeLabel").textContent = "LOCAL PRACTICE"; });
    socket.on("joined", (data) => { myId = data.id; world = data.world; joined = true; $("startOverlay").classList.add("hidden"); $("gameOverOverlay").classList.add("hidden"); });
    socket.on("state", (state) => { players = state.players || []; foods = state.foods || []; world = state.world || world; updateHUD(); });
  } else { mode = "offline"; setConnection("Local practice", false); }

  function updateHUD() {
    const me = players.find(p => p.id === myId);
    $("score").textContent = me ? me.score : (localSnake ? localSnake.score : 0);
    $("playersOnline").textContent = players.length;
    const list = $("leaderboard");
    const sorted = [...players].sort((a,b) => b.score-a.score).slice(0,8);
    list.innerHTML = "";
    if (!sorted.length) { list.innerHTML = '<li class="empty-rank">Join the game to appear here.</li>'; return; }
    sorted.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="rank-number">${String(i+1).padStart(2,"0")}</span><span class="rank-color" style="color:${p.color};background:${p.color}"></span><span class="rank-name"></span><span class="rank-score">${p.score}</span>`;
      li.querySelector(".rank-name").textContent = p.name + (p.id === myId ? " (you)" : "");
      list.appendChild(li);
    });
  }

  function startGame() {
    const name = ($("playerName").value || "").trim().slice(0,16) || "SnakeRookie";
    $("playerName").value = name;
    if (socket && socket.connected) {
      socket.emit("joinGame", name);
      $("hint").textContent = "Move your mouse to steer";
    } else {
      startLocal(name);
    }
  }
  $("playBtn").addEventListener("click", startGame);
  $("againBtn").addEventListener("click", () => {
    if (socket && socket.connected) {
      // Server currently keeps the same connected player's snake alive after collisions.
      $("gameOverOverlay").classList.add("hidden");
    } else startLocal($("playerName").value || "SnakeRookie");
  });
  $("playerName").addEventListener("keydown", e => { if (e.key === "Enter") startGame(); });

  function startLocal(name) {
    const x = world.width/2, y = world.height/2;
    localSnake = { id: "local", name, x, y, angle: 0, targetAngle: 0, body: [], score: 0, color: "#65e6c2" };
    for (let i=0;i<12;i++) localSnake.body.push({x:x-i*9,y});
    foods = Array.from({length:150}, (_,i) => ({id:String(i),x:Math.random()*world.width,y:Math.random()*world.height,r:3+Math.random()*3,color:["#5eead4","#fbbf24","#fb7185","#a78bfa","#60a5fa"][i%5]}));
    players = [localSnake]; myId = "local"; joined = true;
    $("startOverlay").classList.add("hidden"); $("gameOverOverlay").classList.add("hidden");
    $("modeLabel").textContent = "LOCAL PRACTICE"; setConnection("Local practice", false); updateHUD();
  }

  function aimFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const me = players.find(p=>p.id===myId) || localSnake;
    if (!me) return;
    const sx = width/2, sy = height/2;
    const angle = Math.atan2(py-sy, px-sx);
    if (socket && socket.connected && joined && myId !== "local") {
      const now = performance.now();
      if (now-lastAimAt>35) { socket.emit("aim",{angle}); lastAimAt=now; }
    } else if (localSnake) localSnake.targetAngle = angle;
  }
  canvas.addEventListener("pointermove", aimFromPointer);
  canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture?.(e.pointerId); aimFromPointer(e); });
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn; $("soundBtn").textContent = soundOn ? "♫" : "♪";
    if (soundOn) { try { audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume(); } catch (_) {} }
  });
  $("copyLinkBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); $("copyStatus").textContent = "Link copied!"; }
    catch (_) { $("copyStatus").textContent = "Copy this page URL from your browser."; }
  });

  function updateLocal(dt) {
    if (!localSnake || (socket && socket.connected && myId !== "local")) return;
    const p = localSnake;
    const delta = Math.atan2(Math.sin(p.targetAngle-p.angle),Math.cos(p.targetAngle-p.angle));
    p.angle += Math.max(-0.12,Math.min(0.12,delta));
    const speed = 2.1 * dt;
    p.x = (p.x+Math.cos(p.angle)*speed+world.width)%world.width;
    p.y = (p.y+Math.sin(p.angle)*speed+world.height)%world.height;
    p.body.unshift({x:p.x,y:p.y});
    const max = 12 + p.score*2;
    if (p.body.length>max) p.body.length=max;
    for (let i=foods.length-1;i>=0;i--) {
      const f=foods[i], dx=p.x-f.x,dy=p.y-f.y;
      if(dx*dx+dy*dy<18*18){p.score++;foods.splice(i,1);foods.push({id:Math.random().toString(36),x:Math.random()*world.width,y:Math.random()*world.height,r:3+Math.random()*3,color:["#5eead4","#fbbf24","#fb7185","#a78bfa"][Math.floor(Math.random()*4)]});}
    }
    players=[p]; updateHUD();
  }

  function drawGrid() {
    ctx.fillStyle="#091324";ctx.fillRect(0,0,width,height);
    const grid=40, ox=(-camera.x%grid+grid)%grid, oy=(-camera.y%grid+grid)%grid;
    ctx.strokeStyle="rgba(92,124,170,.10)";ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=ox;x<width;x+=grid){ctx.moveTo(x,0);ctx.lineTo(x,height);}
    for(let y=oy;y<height;y+=grid){ctx.moveTo(0,y);ctx.lineTo(width,y);}
    ctx.stroke();
  }
  function drawFood(f) {
    const x=f.x-camera.x+width/2,y=f.y-camera.y+height/2;
    if(x < -20 || y < -20 || x > width+20 || y > height+20)return;
    ctx.save();ctx.shadowBlur=13;ctx.shadowColor=f.color;ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(x,y,f.r||4,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawSnake(p) {
    if(!p.body || !p.body.length)return;
    ctx.lineCap="round";ctx.lineJoin="round";
    // Draw tail to head using body samples from server.
    for(let i=p.body.length-1;i>=0;i--){
      const b=p.body[i],x=b.x-camera.x+width/2,y=b.y-camera.y+height/2;
      const radius=Math.max(3.5,9-i*.025);
      ctx.beginPath();ctx.fillStyle=p.color;ctx.globalAlpha=Math.max(.48,1-i/p.body.length*.42);ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    const x=p.x-camera.x+width/2,y=p.y-camera.y+height/2;
    ctx.save();ctx.shadowBlur=17;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.restore();
    const ex=x+Math.cos(p.angle)*3.5,ey=y+Math.sin(p.angle)*3.5;
    ctx.fillStyle="#07121b";ctx.beginPath();ctx.arc(ex+Math.cos(p.angle+Math.PI/2)*3,ey+Math.sin(p.angle+Math.PI/2)*3,2.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(ex+Math.cos(p.angle-Math.PI/2)*3,ey+Math.sin(p.angle-Math.PI/2)*3,2.2,0,Math.PI*2);ctx.fill();
    ctx.font="600 11px system-ui";ctx.textAlign="center";ctx.fillStyle="#dce8ff";ctx.fillText(p.name||"Player",x,y-18);
  }
  let previous = performance.now();
  function frame(now) {
    const dt=Math.min(2,(now-previous)/16.67||1);previous=now;
    updateLocal(dt);
    const me=players.find(p=>p.id===myId)||localSnake;
    if(me){camera.x+=(me.x-camera.x)*.12;camera.y+=(me.y-camera.y)*.12;}
    drawGrid();
    for(const f of foods)drawFood(f);
    for(const p of players)drawSnake(p);
    if(!joined && !players.length){
      ctx.fillStyle="rgba(145,164,195,.65)";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText("Press Play now to enter the arena",width/2,height-25);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();