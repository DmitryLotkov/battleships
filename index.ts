import 'dotenv/config'
import {httpServer} from "./src/http_server";
import {WebSocketServer, WebSocket} from "ws";
import {connectionHandler} from "./src/connection-handler";

const FRONT_PORT = process.env.PORT || 8181
const SOCKET_PORT = process.env.SOCKET_PORT || 3000

httpServer.listen(FRONT_PORT, () => {
    console.log(`Server is running at http://localhost:${FRONT_PORT}`)
})

const wss = new WebSocketServer({ port: Number(SOCKET_PORT) });

wss.on('connection', (ws:WebSocket) => {
    console.log('Client connected');
    connectionHandler(ws);
});

process.on('SIGINT', () => {
    console.log('Web socket connection closed');
    wss.close(() => process.exit(0));
});

console.log(`WebSocket server is running at ws://localhost:${SOCKET_PORT}`);
