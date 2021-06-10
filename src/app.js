const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cors = require("cors");

app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    })
);

app.get("/", (req, res) => {
    res.send("<h1>Hello world</h1>");
});

const messages = [];

const usersState = new Map();

const messageHandler = (message, user) => ({
    message,
    id: "12345" + new Date().getTime(),
    user,
});

io.on("connection", (socket) => {
    socket.on("client-user-joined", (data, cb) => {
        if (!data.name || !data.room) {
            return cb("Incorrect data");
        }

        socket.join(data.room);

        cb(socket.id);

        usersState.set(socket, {
            id: socket.id,
            name: data.name,
            room: data.room,
        });

        socket.emit(
            "new-message-sent",
            messageHandler(`${data.name} welcom the room`, {
                id: "1",
                name: "admin",
                room: data.room,
            })
        );

        socket.broadcast.to(data.room).emit(
            "new-message-sent",
            messageHandler(`${data.name} entered to room`, {
                id: "1",
                name: "admin",
                room: data.room,
            })
        );
    });

    socket.on("disconnect", () => {
        usersState.delete(socket);
        console.log("a user disconnected");
    });

    socket.on("client-typed", () => {
        socket.broadcast.emit("user-is-typing", usersState.get(socket));
    });

    socket.on("client-message-sent", (message, successFn) => {
        if (typeof message !== "string" || message.length > 300) {
            successFn("Message length should be less than 300 chars");
            return;
        }

        const user = usersState.get(socket);

        let messageItem = {
            message: message,
            id: "12345" + new Date().getTime(),
            user: { id: user.id, name: user.name, room: user.room },
        };
        messages.push(messageItem);

        io.emit("new-message-sent", messageItem);

        successFn(null);
    });

    socket.on("client-deleted-all-messages", () => {
        messages.length = 0;
    });

    socket.emit("init-messages-published", messages);

    console.log("a user connected");
});

const PORT = process.env.PORT || 3009;

http.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});
