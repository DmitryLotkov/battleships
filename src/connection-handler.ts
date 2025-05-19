import {WebSocket, RawData} from 'ws';
import {MessageBody} from './models/message-body-models';
import {MESSAGE_TYPES} from './models/message-enum';
import {CommandHandler} from "./command-handler";

const commandHandler = new CommandHandler();

export const connectionHandler = (ws: WebSocket): void => {
    ws.on('message', (raw: RawData) => {
        try {
            const message: MessageBody<string> = JSON.parse(raw.toString());

            switch (message.type) {
                case MESSAGE_TYPES.REG:
                    commandHandler.handleClientRegister(ws, message);
                    commandHandler.updateRoom();
                    commandHandler.updateWinners(ws);
                    break;

                case MESSAGE_TYPES.UPDATE_WINNERS: {
                    commandHandler.updateWinners(ws);
                    break;
                }

                case MESSAGE_TYPES.CREATE_ROOM: {
                    commandHandler.createRoom(ws, message);
                    break;
                }

                case MESSAGE_TYPES.ADD_USER_TO_ROOM: {
                    commandHandler.addUserToRoom(ws, message);
                    break;
                }

                case MESSAGE_TYPES.ADD_SHIPS: {
                    commandHandler.addShips(ws, message)
                    break
                }

                case MESSAGE_TYPES.ATTACK: {
                    commandHandler.attackCommand(ws,message)
                    break
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
