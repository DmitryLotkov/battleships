import http, { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from "node:url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.resolve(dirname, '..', '..');

export const httpServer = http.createServer(
    (req: IncomingMessage, res: ServerResponse) => {
        const filePath = projectRoot + (req.url === '/' ? '/front/index.html' : '/front' + req.url);

        fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: true, message: 'File not found' }));
                return;
            }

            res.writeHead(200);
            res.end(data);
        });
    }
);