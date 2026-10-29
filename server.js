const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "snake-arena" }));

const WORLD = { width: 1800, height: 1200 };
const TICK_MS = 50;
const FOOD_COUNT = 180;
const SNAKE_START_LENGTH = 10;
const SNAKE_SPACING = 8;
const SPEED = 2.6;
const TURN_RATE = 0.12;
const players = new Map();
const foods = new Map();

function rand(min, max) { return Math.random() * (max - min) + min; }
function makeFood() {
  const id = Math.random().toString(36).slice(2, 10);
  foods.set(id, { id, x: rand(20, WORLD.width - 20), y: rand(20, WORLD.height - 20), r: rand(3, 6), color: ["#5eead4", "#fbbf24", "#fb7185", "#a78bfa", "#60a5fa"][Math.floor(Math.random() * 5)] });
}
for (let i = 0; i < FOOD_COUNT; i++) makeFood();

function spawnPlayer(id, name) {
  const angle = rand(0, Math.PI * 2);
  const x = rand(150, WORLD.width - 150);
  const y = rand(150, WORLD.height - 150);
  const body = [];
  for (let i = 0; i < SNAKE_START_LENGTH; i++) body.push({ x: x - Math.cos(angle) * i * SNAKE_SPACING, y: y - Math.sin(angle) * i * SNAKE_SPACING });
  return { id, name: String(name || "Player").slice(0, 16), x, y, angle, targetAngle: angle, body, score: 0, color: ["#65e6c2", "#ffb86b", "#a78bfa", "#60a5fa", "#fb7185", "#f472b6"][Math.floor(Math.random() * 6)], alive: true };
}
function angleDelta(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }

io.on("connection", (socket) => {
  socket.on("joinGame", (rawName) => {
    if (players.has(socket.id)) return;
    const name = typeof rawName === "string" ? rawName.trim().slice(0, 16) : "";
    players.set(socket.id, spawnPlayer(socket.id, name || `Player${Math.floor(rand(100,999))}`));
    socket.emit("joined", { id: socket.id, world: WORLD });
  });
  socket.on("aim", (data) => {
    const p = players.get(socket.id);
    if (!p || !data || !Number.isFinite(data.angle)) return;
    p.targetAngle = data.angle;
  });
  socket.on("disconnect", () => players.delete(socket.id));
});

setInterval(() => {
  for (const p of players.values()) {
    p.angle += Math.max(-TURN_RATE, Math.min(TURN_RATE, angleDelta(p.angle, p.targetAngle)));
    p.x = Math.max(10, Math.min(WORLD.width - 10, p.x + Math.cos(p.angle) * SPEED));
    p.y = Math.max(10, Math.min(WORLD.height - 10, p.y + Math.sin(p.angle) * SPEED));
    p.body.unshift({ x: p.x, y: p.y });
    const desired = SNAKE_START_LENGTH + Math.floor(p.score / 10);
    p.body.length = Math.min(p.body.length, desired * 4);
    // Keep body points spaced so the snake remains smooth and compact.
    if (p.body.length > desired * 3) p.body.length = desired * 3;

    for (const [id, f] of foods) {
      const dx = p.x - f.x, dy = p.y - f.y;
      if (dx * dx + dy * dy < 18 * 18) {
        p.score += 1;
        foods.delete(id);
        makeFood();
      }
    }
  }

  // Simple collision rule: a head touching another snake's body loses.
  for (const p of players.values()) {
    let hit = false;
    for (const other of players.values()) {
      if (other.id === p.id) continue;
      for (let i = 8; i < other.body.length; i += 3) {
        const q = other.body[i];
        const dx = p.x - q.x, dy = p.y - q.y;
        if (dx * dx + dy * dy < 12 * 12) { hit = true; break; }
      }
      if (hit) break;
    }
    if (hit) {
      for (let i = 0; i < Math.min(20, p.body.length); i += 2) {
        const q = p.body[i];
        const id = Math.random().toString(36).slice(2, 10);
        foods.set(id, { id, x: q.x, y: q.y, r: 4, color: p.color });
      }
      const fresh = spawnPlayer(p.id, p.name);
      fresh.score = 0;
      players.set(p.id, fresh);
    }
  }

  io.emit("state", {
    world: WORLD,
    players: [...players.values()].map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle, body: p.body.filter((_, i) => i % 2 === 0), score: p.score, color: p.color })),
    foods: [...foods.values()]
  });
}, TICK_MS);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Snake Arena running at http://localhost:${PORT}`);
});