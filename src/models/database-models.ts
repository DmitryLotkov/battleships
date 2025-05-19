import { WebSocket } from 'ws';
import {Coordinates} from "./message-body-models";
export interface Client {
    index: number
    wins: number
    name: string
    ws: WebSocket | null
}
export interface Room {
    index: number
    players: Client[]
    ships: ShipsMap
    currentTurnIndex?: number
    hits?: HitsFullData
}

export interface Ship {
    position: Coordinates
    direction: boolean // true = вертикально, false = горизонтально
    length: ShipLengthType
    type: ShipType
}

export type ShipLengthType = 1 | 2 | 3 | 4

export type ShipsMap = {
    [indexPlayer: number]: Ship[];
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge' // 1 2 3 4

export interface HitItem {
    x: number;
    y: number
    status: HitStatusType
}

export type HitsFullData = {
    [indexPlayer: number]: HitItem[]
}

export type HitStatusType = "miss" | "shot" | "killed"