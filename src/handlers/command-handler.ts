import {
    RegisterRequestBody,
    MessageBody,
    AddUserToRoomRequestBody,
    UpdateWinnersRequestBody,
    RegisterResponseBody
} from '../models/message-types';
import { MESSAGE_TYPES } from '../models/message-enum';
import { WebSocket } from 'ws';
import { Client, Room } from '../models/client-model';
import { createMessage } from '../utils/create-message';

export class CommandHandler {
    private clients: Client[] = [];
    private clientIndex = 0;
    private roomIndex = 0;
    private rooms: Room[] = [];

    public handleClientRegister(ws: WebSocket, messageBody: MessageBody<string>) {
        const parsedData: RegisterRequestBody = JSON.parse(messageBody.data);

        const client: Client = {
            name: parsedData.name,
            index: ++this.clientIndex,
            wins: 0,
            ws
        };

        this.clients.push(client);

        const response = createMessage<RegisterResponseBody>(MESSAGE_TYPES.REG, {
            name: client.name,
            index: client.index,
            error: false,
            errorText: ''
        });

        ws.send(JSON.stringify(response));
    }

    public updateWinners(ws: WebSocket) {
        const response: MessageBody<UpdateWinnersRequestBody[]> = createMessage(MESSAGE_TYPES.UPDATE_WINNERS, [
            {
                name: this.clients[0].name,
                wins: 0
            }
        ]);

        ws.send(JSON.stringify(response));
    }

    public createRoom(ws: WebSocket, messageBody: MessageBody<string>) {
        if (!messageBody.data || messageBody.data.trim() === '') {
            const client = this.clients.find(c => c.ws === ws);

            if (!client) {
                console.warn('Client not found for this socket');
                return;
            }

            const room: Room = {
                index: ++this.roomIndex,
                players: [client]
            };

            this.rooms.push(room);
            console.log(`Created room ${room.index} by player ${client.name}`);

            this.updateRoom();
        }
    }

    public addUserToRoom(ws: WebSocket, messageBody: MessageBody<string>) {
        try {
            const parsedData: AddUserToRoomRequestBody = JSON.parse(messageBody.data);
            const { indexRoom } = parsedData;

            const room = this.rooms.find(r => r.index === indexRoom);
            if (!room) {
                console.warn('Room not found:', indexRoom);
                return;
            }

            const client = this.clients.find(c => c.ws === ws);
            if (!client) {
                console.warn('No current client to add to room');
                return;
            }

            room.players.push(client);
            console.log(`Client ${client.name} joined room ${indexRoom}`);

            this.updateRoom();

            if (room.players.length === 2) {
                console.log('Room full. Creating game...');
                for (const player of room.players) {
                    const response = createMessage(MESSAGE_TYPES.CREATE_GAME, {
                        idGame: room.index,
                        idPlayer: player.index
                    });
                    player.ws.send(JSON.stringify(response));
                }
            }
        } catch (e) {
            console.error('Invalid JSON in addUserToRoom:', messageBody.data);
            console.error(e);
        }
    }

    public updateRoom() {
        const availableRooms = this.rooms
            .filter(room => room.players.length === 1)
            .map(room => ({
                roomId: room.index,
                roomUsers: room.players.map(player => ({
                    name: player.name,
                    index: player.index
                }))
            }));

        const message = createMessage(MESSAGE_TYPES.UPDATE_ROOM, availableRooms);

        this.clients.forEach((client) => {
            client.ws.send(JSON.stringify(message));
        })
    }
}