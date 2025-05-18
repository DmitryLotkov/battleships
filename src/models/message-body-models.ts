import {MESSAGE_TYPES} from "./message-enum";
import { Ship} from "./database-models";

export interface MessageBody <T> {
    type: MESSAGE_TYPES
    data: T | string;
    id: 0;
}

export interface RegisterRequestBody {
    name: string,
    password: string
}

export interface RegisterResponseBody {
    name: string,
    index: number | string
    error: boolean
    errorText: string
}

export interface UpdateWinnersRequestBody {
    name: string,
    wins: number
}

export interface AddUserToRoomResponseBody {
    indexRoom: number | string,
}

export interface AddShipsResponseBody {
    gameId: number
    ships: Ship[]
    indexPlayer: number
}

export interface StartGameRequestBody {
    ships: Ship[]
    currentPlayerIndex: number | string
}

export interface CreateGameRequestBody {
    idGame: string | number
    idPlayer: string | number
}

export interface TurnRequestBody {
    currentPlayer: number | string
}