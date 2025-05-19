import {
    RegisterRequestBody,
    MessageBody,
    AddUserToRoomResponseBody,
    RegisterResponseBody,
    UpdateWinnersRequestBody,
    AddShipsResponseBody,
    StartGameRequestBody,
    CreateGameRequestBody, TurnRequestBody, AttackRequestBody, Coordinates, AttackResponseBody
} from './models/message-body-models';
import {MESSAGE_TYPES} from './models/message-enum';
import {WebSocket} from 'ws';
import {Client, Room, Ship, HitStatusType, HitItem} from './models/database-models';
import {createMessage} from './utils/create-message';

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
        const winners:UpdateWinnersRequestBody[] = this.clients.map(client => ({
            name: client.name,
            wins: client.wins
        }));

        const message = createMessage<UpdateWinnersRequestBody[]>(MESSAGE_TYPES.UPDATE_WINNERS, winners);
        const payload = JSON.stringify(message);

        if (this.clients.length === 1) {
            ws.send(payload);
        } else {
            this.clients.forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(payload);
                }
            });
        }
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
                players: [client],
                ships: {}
            };

            this.rooms.push(room);
            console.log(`Created room ${room.index} by player ${client.name}`);

            this.updateRoom();
        }
    }

    public addUserToRoom(ws: WebSocket, messageBody: MessageBody<string>) {
        try {
            const parsedData: AddUserToRoomResponseBody = JSON.parse(messageBody.data);
            const { indexRoom } = parsedData;

            const room = this.getRoomById(indexRoom);
            if (!room) {
                console.warn('Room not found:', indexRoom);
                return;
            }

            const client = this.clients.find(c => c.ws === ws);
            if (!client) {
                console.warn('Client not found');
                return;
            }

            const alreadyInRoom = room.players.some(p => p.ws === ws);
            if (!alreadyInRoom) {
                room.players.push(client);
                console.log(`Client ${client.name} joined room ${indexRoom}`);
            }

            this.updateRoom();

            if (room.players.length === 2) {
                this.createGame(room);
            }
        } catch (e) {
            console.error('Invalid JSON in addUserToRoom:', messageBody.data);
            console.error(e);
        }
    }

    private createGame(currRoom: Room): void {
        console.log('Room full. Creating game...')
        currRoom.players.forEach((player) => {
            const response = createMessage<CreateGameRequestBody>(MESSAGE_TYPES.CREATE_GAME, {
                idGame: currRoom.index,
                idPlayer: player.index
            });
            player.ws.send(JSON.stringify(response));
        })
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

    public addShips(ws: WebSocket, messageBody: MessageBody<string>) {
        try{
            const parsed: AddShipsResponseBody = JSON.parse(messageBody.data);

            const { gameId, ships, indexPlayer } = parsed;

            const room = this.getRoomById(gameId);
            if (!room) return;

            room.ships = {
                ...room.ships,
                [indexPlayer]: ships
            }

            // Кто первый расставил корабли, тот первый ходит
            if (room.currentTurnIndex === undefined) {
                room.currentTurnIndex = indexPlayer;
            }

            const bothReady = room.players.every((player) => room.ships[player.index])

            if (bothReady) {
                this.startGame(ws, room)
            }

        } catch {
            console.error(messageBody.data);
        }
    }

    private startGame(currentWSConnection: WebSocket, currentRoom: Room) {
        try {
            const currentPlayerIndex = currentRoom.currentTurnIndex!;

            currentRoom.players.forEach((player) => {
                const playerShips = currentRoom.ships[player.index]
                const request = createMessage<StartGameRequestBody>(MESSAGE_TYPES.START_GAME, {
                    ships: playerShips,
                    currentPlayerIndex: currentPlayerIndex
                })

                player.ws.send(JSON.stringify(request));
            })

            this.sendTurnCommandToOneClient(currentWSConnection, currentRoom)
        } catch (e) {
            console.log('Error when start the game', e)
        }
    }

    private getRoomById(id: number | string): Room | undefined {
        return this.rooms.find(r => r.index === id);
    }

    public sendTurnCommandToOneClient(ws: WebSocket, currentRoom: Room) {
        const client = this.clients.find(c => c.ws === ws);
        if (client) {
            const request = createMessage<TurnRequestBody>(MESSAGE_TYPES.TURN, {
                currentPlayer: currentRoom.currentTurnIndex!
            })

            try {
                currentRoom.players.forEach((player) => {
                    player.ws.send(JSON.stringify(request))
                })

            } catch (e) {
                console.log('Error when set player turn', e)
            }
        } else {
            console.log('Client not found')
        }
    }

    public attackCommand(messageBody: MessageBody<string>) {
            try {
                const {gameId, x, y, indexPlayer }: AttackRequestBody = JSON.parse(messageBody.data);
                const room = this.getRoomById(gameId);

                if (!room) {
                    return;
                }

                const currentPlayerIndex = indexPlayer;
                const enemy = room.players.find((player) => player.index !== currentPlayerIndex);
                if (!enemy) {
                    return;
                }

                const previousHits = room.hits?.[enemy.index] ?? [];
                const updatedHits = [...previousHits, { x, y, status: 'shot' }] satisfies HitItem[];

                if (previousHits.some(h => h.x === x && h.y === y)) {
                    // не даем стрелять в ту же клетку
                    return;
                }

                const hitStatus = this.checkEnemyShipForHits(room, enemy, { x, y }, updatedHits);

                room.hits = room.hits || {};
                room.hits[enemy.index] = [
                    ...previousHits,
                    { x, y, status: hitStatus }
                ];

                this.sendAttackMessage(room, { x, y }, currentPlayerIndex, hitStatus)

                if (hitStatus === 'miss') {
                    room.currentTurnIndex = enemy.index; // поменяем очередь хода если промахнулся игрок
                }

                if (hitStatus === 'killed') {
                    this.makeKilledShipBorderCellsMissed(room, indexPlayer, enemy, { x, y });
                }

                this.sendTurnCommandToBothClients(room)

            } catch (e) {
                console.error('Error in attackCommand:', e);
            }
    }

    private getShipCells(ship: Ship): Coordinates[] {
        return Array.from({ length : ship.length }, (_, i) => ({
            x: ship.direction ? ship.position.x : ship.position.x + i,
            y: ship.direction ? ship.position.y + i : ship.position.y,
        }))
    }

    private checkEnemyShipForHits(
        room: Room,
        enemy: Client,
        shotCoords: Coordinates,
        hits: HitItem[]
    ): HitStatusType {
        const enemyShips = room.ships[enemy.index];

        for (const ship of enemyShips) {
            const shipCells = this.getShipCells(ship);
            const hit = shipCells.find(cell => cell.x === shotCoords.x && cell.y === shotCoords.y);

            if (hit) {
                const isKilled = shipCells.every(cell =>
                    hits.some(h => h.x === cell.x && h.y === cell.y)
                );
                return isKilled ? 'killed' : 'shot';
            }
        }

        return 'miss';
    }

    private sendAttackMessage(room: Room, shootCoordinates: Coordinates, currentPlayerIndex: number | string, hitStatus: HitStatusType) {
        const attackMessage = createMessage<AttackResponseBody>(MESSAGE_TYPES.ATTACK, {
            position: shootCoordinates,
            currentPlayer: currentPlayerIndex,
            status: hitStatus
        });

        room.players.forEach(player => {
                player.ws.send(JSON.stringify(attackMessage))
        });
    }

    private sendTurnCommandToBothClients(room: Room) {
        const turnMessage = createMessage(MESSAGE_TYPES.TURN, {
            currentPlayer: room.currentTurnIndex
        });

        room.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(turnMessage));
            }
        });
    }

    private getShipBorderCells(ship: Ship): Coordinates[] {
        const shipCells = this.getShipCells(ship);
        const shipCellSet = new Set(shipCells.map(c => `${c.x},${c.y}`));

        const neighborOffsets = [-1, 0, 1];
        const allBorders = shipCells.flatMap(({ x, y }) =>
            neighborOffsets.flatMap(dx =>
                neighborOffsets.map(dy => ({ x: x + dx, y: y + dy }))
            )
        );

        const uniqueBorders = Array.from(
            new Set(
                allBorders
                    .filter(({ x, y }) => !shipCellSet.has(`${x},${y}`))  // исключаем сам корабль
                    .map(({ x, y }) => `${x},${y}`)
            )
        );

        return uniqueBorders.map(str => {
            const [x, y] = str.split(',').map(Number);
            return { x, y };
        });
    }

    private makeKilledShipBorderCellsMissed(
        room: Room,
        shooterIndex: number | string,
        enemy: Client,
        shootCoords: Coordinates
    ) {
        if (!room.hits) return;

        const killedShip = room.ships[enemy.index].find(ship =>
            this.getShipCells(ship).some(cell =>
                cell.x === shootCoords.x && cell.y === shootCoords.y
            )
        );

        if (!killedShip) return;

        const borderCells = this.getShipBorderCells(killedShip);
        const existingHits = room.hits[enemy.index];

        const newMisses: HitItem[] = borderCells
            .filter(({ x, y }) =>
                !existingHits.some(hit => hit.x === x && hit.y === y)
            )
            .map(({ x, y }) => ({ x, y, status: 'miss' }));

        room.hits[enemy.index].push(...newMisses);


        newMisses.forEach((miss) => {
            const attackMessage = createMessage<AttackResponseBody>(MESSAGE_TYPES.ATTACK, {
                position: { x: miss.x, y: miss.y },
                currentPlayer: shooterIndex,
                status: 'miss'
            });

            room.players.forEach(player => {
                if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify(attackMessage));
                }
            });
        })
    }
}