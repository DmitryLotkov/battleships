import {MESSAGE_TYPES} from "./message-enum";

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

export interface AddUserToRoomRequestBody {
    indexRoom: number | string,
}