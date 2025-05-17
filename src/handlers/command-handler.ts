import {
    RegisterRequestBody,
    MessageBody,
    AddUserToRoomRequestBody,
    UpdateWinnersRequestBody, RegisterResponseBody
} from "../models/message-types";
import {MESSAGE_TYPES} from "../models/message-enum";
import {WebSocket} from 'ws';

export class CommandHandler {
    private userData: any[] = []

    public handleClientRegister (ws: WebSocket, messageBody: MessageBody<string>, clientIndex: number) {
        const parsedData: RegisterRequestBody = JSON.parse(messageBody.data);

        const client = {
            name: parsedData.name,
            index: ++clientIndex,
        }

        const response: MessageBody<RegisterResponseBody> = {
            type: MESSAGE_TYPES.REG,
            data: JSON.stringify({
                ...client,
                error: false,
                errorText: '',
            }),
            id: 0,
        };
        this.userData.push(client)

        ws.send(JSON.stringify(response));
    }

    public updateWinners(ws: WebSocket) {
        const response: MessageBody<UpdateWinnersRequestBody[]> = {
            type: MESSAGE_TYPES.UPDATE_WINNERS,
            data: JSON.stringify([{
                name: this.userData[0].name,
                wins: 0
            }]),
            id: 0,
        };

        ws.send(JSON.stringify(response));
    }

    public addUserToRoom (ws: WebSocket, messageBody: MessageBody<string>) {
        const response: MessageBody<AddUserToRoomRequestBody> = {
            type: MESSAGE_TYPES.ADD_USER_TO_ROOM,
            data: JSON.stringify({
                indexRoom: 0
            }),
            id: 0,
        };

        ws.send(JSON.stringify(response));
    }
}