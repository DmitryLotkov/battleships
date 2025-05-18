import { WebSocket } from 'ws';
export interface Client {
    index: number // 0 | 1
    wins: number
    name: string
    ws: WebSocket;
}
export interface Room {
    index: number;
    players: Client[];
}