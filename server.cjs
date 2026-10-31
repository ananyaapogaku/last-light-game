const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173"
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const WORLD = { width: 1200, height: 760 };
const RESOURCE_TARGET = 8;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 190;
const rooms = new Map();
console.log("Server file loaded. Monster chase is enabled after emergency power is restored.");

app.use(express.static("dist"));
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Project: Last Light" }));

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[crypto.randomInt(chars.length)];
  return code;
}

function makeRoom(code) {
  const resources = [];
  const fuelPositions = [
    [675, 460], // Main supply crate
    [390, 437], // Cache 2
    [750, 285], // Cache 3
    [960, 475], // Cache 4
    [210, 323], // Cache 5
    [630, 209], // Cache 6
    [800, 300], // Cache 7
    [360, 570]  // Cache 8
  ];

  for (let i = 0; i < RESOURCE_TARGET; i++) {
    resources.push({
      id: `fuel-${i}`,
      x: fuelPositions[i][0],
      y: fuelPositions[i][1],
      collected: false,
      collectedBy: []
    });
  }

  return {
    code,
    players: new Map(),
    resources,
    phase: "ship",
    started: false,
    completed: false,
    storyPlayed: false,
    powerRestored: false,
    monsterActive: false,
    monster: { x: 0, z: -6 },
    evacuationStarted: false,
    createdAt: Date.now()
  };
}

function publicRoomState(room) {
  return {
    code: room.code,
    phase: room.phase,
    world: WORLD,
    started: room.started,
    completed: room.completed,
    powerRestored: room.powerRestored,
    monsterActive: room.monsterActive,
    monster: room.monster,
    evacuationStarted: room.evacuationStarted,
    resourceTarget: RESOURCE_TARGET,
    resourcesCollected: [...room.players.values()].reduce(
      (total, p) => total + p.fuelCollected, 0
    ),
    playerFuel: [...room.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      fuelCollected: p.fuelCollected
    })),
    resources: room.resources,
    playersAtShip: [...room.players.values()].filter(p => Math.hypot(p.x - 150, p.y - 150) < 92).length,
    playersRequired: room.players.size,
    extractionReady: [...room.players.values()].length > 0 &&
      [...room.players.values()].every(p => p.fuelCollected >= RESOURCE_TARGET),
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, x: p.x, y: p.y, color: p.color, ready: p.ready
    }))
  };
}

function emitState(room) {
  io.to(room.code).emit("state", publicRoomState(room));
}

function cleanName(value) {
  const name = String(value || "").trim().replace(/[<>]/g, "").slice(0, 16);
  return name || "Crewmate";
}

function getRoomForSocket(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}

function spawnPosition(index) {
  const positions = [
    { x: 245, y: 150 },
    { x: 265, y: 180 },
    { x: 230, y: 205 },
    { x: 280, y: 220 }
  ];
  return positions[index % positions.length];
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name } = {}, callback = () => {}) => {
    // Avoid leaving stale memberships if the client starts over.
    const oldRoom = getRoomForSocket(socket);
    if (oldRoom) {
      oldRoom.players.delete(socket.id);
      socket.leave(oldRoom.code);
      emitState(oldRoom);
    }

    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const room = makeRoom(code);
    rooms.set(code, room);
    joinRoom(socket, room, name, callback);
  });

  socket.on("joinRoom", ({ code, name } = {}, callback = () => {}) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return callback({ ok: false, error: "Room not found. Check the code and try again." });
    if (room.players.size >= MAX_PLAYERS) return callback({ ok: false, error: "That room is full (4 players maximum)." });
    if (room.started) return callback({ ok: false, error: "That mission has already started." });

    const oldRoom = getRoomForSocket(socket);
    if (oldRoom) {
      oldRoom.players.delete(socket.id);
      socket.leave(oldRoom.code);
      emitState(oldRoom);
    }

    joinRoom(socket, room, name, callback);
  });

  function joinRoom(socket, room, name, callback) {
    const pos = spawnPosition(room.players.size);
    const colors = ["#74e5ff", "#ffcf70", "#d8a2ff", "#8cf0ad"];
    const player = {
      id: socket.id,
      name: cleanName(name),
      x: pos.x,
      y: pos.y,
      color: colors[room.players.size % colors.length],
      ready: false,
      input: { up: false, down: false, left: false, right: false },
      lastCollect: 0,
      fuelCollected: 0
    };

    room.players.set(socket.id, player);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    callback({ ok: true, code: room.code, playerId: socket.id });
    emitState(room);
  }

  socket.on("setInput", input => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    console.log("MOVEMENT INPUT:", input);
    player.input = {
      up: !!input?.up,
      down: !!input?.down,
      left: !!input?.left,
      right: !!input?.right
    };
  });

  socket.on("collectFuel", (targetFuelIndex, callback = () => {}) => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started || room.completed) {
      return callback({ ok: false });
    }

    const player = room.players.get(socket.id);
    if (!player) return callback({ ok: false });

    if (player.fuelCollected >= RESOURCE_TARGET) {
      return callback({ ok: false, error: "Fuel target already reached." });
    }

    const resource = room.resources.find(
      r => r.id === `fuel-${targetFuelIndex}`
    );

    if (!Number.isInteger(targetFuelIndex) || !resource) {
      return callback({ ok: false, error: "Fuel cache not found." });
    }

    const distance = Math.hypot(
      resource.x - player.x,
      resource.y - player.y
    );

    if (distance >= 150) {
      return callback({ ok: false, error: "Move closer to a fuel cache." });
    }

    if (resource.collectedBy.includes(player.id)) {
      return callback({
        ok: false,
        error: "You already collected this fuel cache."
      });
    }

    resource.collectedBy.push(player.id);
    player.fuelCollected++;
    console.log(
      `FUEL COLLECTED: ${resource.id} | Total: ${player.fuelCollected}/8`
    );

    io.to(room.code).emit("resourceCollected", {
      playerName: player.name,
      resourceId: resource.id,
      fuelCollected: player.fuelCollected
    });

    emitState(room);
    callback({ ok: true, fuelCollected: player.fuelCollected });
  });

  socket.on("startMission", (_payload, callback = () => {}) => {
    const room = getRoomForSocket(socket);
    if (!room) return callback({ ok: false, error: "Join a room first." });
    if (room.players.size < 1) return callback({ ok: false, error: "At least one player is required." });
    room.started = true;
    room.phase = "ship";
    io.to(room.code).emit("missionStarted", { planet: "Asterion" });
    emitState(room);
    callback({ ok: true });
  });

  socket.on("continueStory", (callback = () => {}) => {
    const room = getRoomForSocket(socket);

    if (!room || !room.started || !room.storyPlayed) {
      return callback({
        ok: false,
        error: "The story transition is not ready."
      });
    }

    if (room.phase !== "story") {
      return callback({
        ok: false,
        error: "The crew has already advanced."
      });
    }

    room.phase = "orpheus";
    room.completed = false;
  
    room.powerRestored = false;
    room.monsterActive = false;
    room.monster = { x: 0, z: -6 };
    room.evacuationStarted = false;

    // Move the crew to the Orpheus-6 landing area.
    for (const player of room.players.values()) {
      player.x = 600;
      player.y = 475;
      player.input = { up: false, down: false, left: false, right: false };
    }

    io.to(room.code).emit("missionPhaseChanged", {
      phase: "orpheus",
      title: "ORPHEUS-6",
      message: "The ship enters orbit above the abandoned research station. Investigate the station and discover what happened to its missing crew."
    });

    emitState(room);
    callback({ ok: true });
  });


socket.on("restorePower", (callback = () => {}) => {
  const room = getRoomForSocket(socket);

  if (!room) {
    console.log("[MONSTER DEBUG] Restore rejected: no room for socket", socket.id);
    return callback({ ok: false, error: "No room found." });
  }

  console.log("[MONSTER DEBUG] restorePower received", {
    room: room.code,
    phase: room.phase,
    started: room.started,
    completed: room.completed,
    powerRestored: room.powerRestored,
    monsterActive: room.monsterActive
  });

  if (room.phase !== "orpheus" || !room.started || room.completed) {
    console.log("[MONSTER DEBUG] Restore rejected: invalid room state.");
    return callback({ ok: false, error: "Power cannot be restored right now." });
  }

  room.powerRestored = true;
  room.monsterActive = true;
    // Automatically begin evacuation when power is restored.
  room.evacuationStarted = true;

  io.to(room.code).emit("evacuationStarted", { seconds: 10 });

  emitState(room);

  setTimeout(() => {
    const currentRoom = rooms.get(room.code);

    if (!currentRoom || currentRoom !== room || room.completed) return;

    room.completed = true;

    io.to(room.code).emit("missionCompleted", {
      title: "EVACUATION SUCCESSFUL",
      message: "The crew survived the final 10 seconds and escaped Orpheus-6. Mission complete."
    });

    emitState(room);
  }, 10000);

  console.log("[MONSTER DEBUG] MONSTER ACTIVATED:", room.code);

  io.to(room.code).emit("powerRestored");
  io.to(room.code).emit("monsterAwakened", {
    message: "MOTION DETECTED. RUN TO THE LANDING PLATFORM!"
  });

  emitState(room);

  callback({ ok: true });
});




  socket.on("disconnect", () => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    room.players.delete(socket.id);
    if (room.players.size === 0) {
      rooms.delete(room.code);
    } else {
      emitState(room);
    }
  });
});

// Simple authoritative movement and resource collection.
setInterval(() => {
  const dt = 1 / 30;
  for (const room of rooms.values()) {
    if (!room.started || room.completed) continue;

    for (const player of room.players.values()) {
      let dx = Number(player.input.right) - Number(player.input.left);
      let dy = Number(player.input.down) - Number(player.input.up);
      const length = Math.hypot(dx, dy) || 1;
      if (dx || dy) {
        dx /= length;
        dy /= length;
      }

      const nextX = player.x + dx * PLAYER_SPEED * dt;
      const nextY = player.y + dy * PLAYER_SPEED * dt;
      const inStation = room.phase === "orpheus";

      // Block movement through Orpheus-6 building walls.
      const sceneX = (nextX / 1200 - 0.5) * 40;
      const sceneZ = (nextY / 760 - 0.5) * 40;

      const walls = [
        // Main research station
        { x: 0, z: -8.4, w: 12, d: 0.3 },
        { x: -5.9, z: -5, w: 0.3, d: 6.8 },
        { x: 5.9, z: -5, w: 0.3, d: 6.8 },
        { x: -4.05, z: -1.6, w: 3.9, d: 0.3 },
        { x: 4.05, z: -1.6, w: 3.9, d: 0.3 },

        // Auxiliary research lab
        { x: -19.5, z: 0, w: 0.3, d: 10 },
        { x: -15, z: -5, w: 9, d: 0.3 },
        { x: -15, z: 5, w: 9, d: 0.3 },
        { x: -10.5, z: -3.5, w: 0.3, d: 3 },
        { x: -10.5, z: 3.5, w: 0.3, d: 3 },

        // Storage shelter
        { x: 19.5, z: 0, w: 0.3, d: 10 },
        { x: 15, z: -5, w: 9, d: 0.3 },
        { x: 15, z: 5, w: 9, d: 0.3 },
        { x: 10.5, z: -3.5, w: 0.3, d: 3 },
        { x: 10.5, z: 3.5, w: 0.3, d: 3 },

        // Communications outpost
        { x: 0, z: -20.5, w: 10, d: 0.3 },
        { x: -5, z: -17, w: 0.3, d: 7 },
        { x: 5, z: -17, w: 0.3, d: 7 }
      ];

      const playerRadiusX = 0.5;
      const playerRadiusZ = 0.5;

      const blockedByWall = inStation && walls.some(wall =>
        Math.abs(sceneX - wall.x) < wall.w / 2 + playerRadiusX &&
        Math.abs(sceneZ - wall.z) < wall.d / 2 + playerRadiusZ
      );

      if (!blockedByWall) {
        player.x = Math.max(
          PLAYER_RADIUS,
          Math.min(WORLD.width - PLAYER_RADIUS, nextX)
        );
        player.y = Math.max(
          PLAYER_RADIUS,
          Math.min(WORLD.height - PLAYER_RADIUS, nextY)
        );
      }
    }// SERVER-AUTHORITATIVE MONSTER CHASE
// Chase the nearest player continuously after emergency power is restored.
// SERVER-AUTHORITATIVE MONSTER CHASE
if (room.phase === "orpheus" && room.monsterActive && !room.completed) {
  const MONSTER_SPEED = 9.0;
  const STOP_DISTANCE = 0.25;

  let target = null;
  let nearestDistance = Infinity;

  for (const player of room.players.values()) {
    const targetX = (player.x / WORLD.width - 0.5) * 40;
    const targetZ = (player.y / WORLD.height - 0.5) * 40;

    const distance = Math.hypot(
      targetX - room.monster.x,
      targetZ - room.monster.z
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      target = { x: targetX, z: targetZ };
    }
  }

  if (target && nearestDistance > STOP_DISTANCE) {
    const step = Math.min(
      MONSTER_SPEED * dt,
      nearestDistance - STOP_DISTANCE
    );

    room.monster.x +=
      ((target.x - room.monster.x) / nearestDistance) * step;

    room.monster.z +=
      ((target.z - room.monster.z) / nearestDistance) * step;
  }
}

    const allFuelRecovered =
      room.players.size > 0 &&
      [...room.players.values()].every(
        player => player.fuelCollected >= RESOURCE_TARGET
      );

    if (allFuelRecovered && !room.storyPlayed) {
      room.storyPlayed = true;
      room.phase = "story";

      io.to(room.code).emit("storyTransition", {
        title: "DISTRESS SIGNAL",
        message: "The fuel is secured. A distress signal from the research station interrupts the ship's systems. The transmission is eleven years old. Coordinates point to Orpheus-6. Your crew is the only one close enough to investigate."
      });

      emitState(room);
    }

    emitState(room);
  }
}, 1000 / 30);

server.listen(PORT, () => {
  console.log(`Project: Last Light running at http://localhost:${PORT}`);
});