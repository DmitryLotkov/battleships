import 'dotenv/config'
import {httpServer} from "./src/http_server";

const HTTP_PORT = 8181;
const PORT = process.env.PORT || HTTP_PORT
httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})
