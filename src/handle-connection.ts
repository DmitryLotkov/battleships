import {WebSocket, RawData} from 'ws';
import {MessageBody} from './models/message-types';
import {MESSAGE_TYPES} from './models/message-enum';
import {CommandHandler} from "./handlers/command-handler";

export const handleConnection = (ws: WebSocket): void => {
    const commandHandler = new CommandHandler();

    ws.on('message', (raw: RawData) => {
        try {
            const message: MessageBody<string> = JSON.parse(raw.toString());

            switch (message.type) {
                case MESSAGE_TYPES.REG:
                    commandHandler.handleClientRegister(ws, message);
                    commandHandler.updateRoom();
                    commandHandler.updateWinners(ws);
                    break;

                case MESSAGE_TYPES.UPDATE_WINNERS:
                    commandHandler.updateWinners(ws);
                    break;

                case MESSAGE_TYPES.CREATE_ROOM:
                    commandHandler.createRoom(ws, message);
                    break;

                case MESSAGE_TYPES.ADD_USER_TO_ROOM:
                    commandHandler.addUserToRoom(ws, message);
                    break;

                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }

            console.log('Received message:', message);
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
};
