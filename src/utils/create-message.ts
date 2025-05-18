import {MessageBody} from "../models/message-types";
import {MESSAGE_TYPES} from "../models/message-enum";

export function createMessage<T>(type: MESSAGE_TYPES, data: T): MessageBody<T> {
    return {
        type,
        data: JSON.stringify(data),
        id: 0,
    };
}
