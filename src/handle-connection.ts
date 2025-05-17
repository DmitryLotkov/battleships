import {WebSocket, RawData} from 'ws';
import {MessageBody} from './models/message-types';
import {MESSAGE_TYPES} from './models/message-enum';
import {CommandHandler} from "./handlers/command-handler";

let clientIndex = 0;

export const handleConnection = (ws: WebSocket): void => {
    ws.on('message', (raw: RawData) => {
        try {
            const message: MessageBody<string> = JSON.parse(raw.toString());

            const commandHandler = new CommandHandler()

            switch (message.type) {
                case MESSAGE_TYPES.REG: {
                    commandHandler.handleClientRegister(ws, message, clientIndex)
                    commandHandler.updateWinners(ws)
                    break;
                }
                case MESSAGE_TYPES.UPDATE_WINNERS: {
                    commandHandler.updateWinners(ws)
                    break;
                }

                case MESSAGE_TYPES.CREATE_ROOM: {
                    commandHandler.addUserToRoom(ws, message)
                    break;
                }

                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }

            console.log('Received message:', message);
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
};
