import { WebSocket } from 'ws';
export interface Client {
    index: number
    wins: number
    name: string
    ws: WebSocket
}
export interface Room {
    index: number
    players: Client[]
    ships: ShipsMap
    currentTurnIndex?: number
}

export interface Ship {
    position: {
        x: number;
        y: number
    }
    direction: boolean
    length: number
    type: ShipType
}

export type ShipsMap = {
    [indexPlayer: number]: Ship[];
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge'