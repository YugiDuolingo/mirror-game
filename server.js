const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};        // { roomName: [socketId1, socketId2] }
let currentColor = {}; // { roomName: "red" or "blue" }

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // find or create a room with less than 2 players
  let roomName = null;
  for (const [name, members] of Object.entries(rooms)) {
    if (members.length < 2) {
      roomName = name;
      break;
    }
  }

  if (!roomName) {
    roomName = `room_${socket.id}`;
    rooms[roomName] = [];
  }

  rooms[roomName].push(socket.id);
  socket.join(roomName);
  console.log(`Player ${socket.id} joined ${roomName}`);

  // Send current color for that room
  socket.emit("updateColor", currentColor[roomName] || null);
  socket.emit("playerNumber", rooms[roomName].length); // Player 1 or 2

  // handle color choice
  socket.on("chooseColor", (color) => {
    currentColor[roomName] = color;
    io.to(roomName).emit("updateColor", color);
  });

  // handle toggle
  socket.on("toggleColor", () => {
    const color = currentColor[roomName];
    if (!color) return;
    currentColor[roomName] = color === "red" ? "blue" : "red";
    io.to(roomName).emit("updateColor", currentColor[roomName]);
  });

  // cleanup on disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    if (roomName && rooms[roomName]) {
      rooms[roomName] = rooms[roomName].filter(id => id !== socket.id);
      if (rooms[roomName].length === 0) {
        delete rooms[roomName];
        delete currentColor[roomName];
      }
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("Server running on port", port));
