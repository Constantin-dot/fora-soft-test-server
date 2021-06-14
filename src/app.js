const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cors = require("cors");
const users = require("./users")();

app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    })
);

app.get("/", (req, res) => {
    res.send("<h1>Hello world</h1>");
});

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

        users.remove(socket.id);
        users.add({
            id: socket.id,
            name: data.name,
            room: data.room,
        });

        cb(socket.id);

        io.to(data.room).emit("update-users", users.getByRoom(data.room));

        socket.emit(
            "new-message-sent",
            messageHandler(`${data.name} welcom to the room`, {
                id: "1",
                name: "admin",
                room: data.room,
            })
        );

        socket.broadcast.to(data.room).emit(
            "new-message-sent",
            messageHandler(`${data.name} entered the room`, {
                id: "1",
                name: "admin",
                room: data.room,
            })
        );
    });

    socket.on("client-user-Left", () => {
        const user = users.remove(socket.id);
        io.to(user.room).emit("update-users", users.getByRoom(user.room));
        io.to(user.room).emit(
            "new-message-sent",
            messageHandler(`${user.name} left the room`, {
                id: "1",
                name: "admin",
                room: user.room,
            })
        );

        socket.emit("user-left-room");

        console.log("user disconnected");
    });

    socket.on("disconnect", (user) => {
        users.remove(socket.id);

        io.to(user.room).emit("update-users", users.getByRoom(user.room));
        io.to(user.room).emit(
            "new-message-sent",
            messageHandler(`${user.name} left the room`, {
                id: "1",
                name: "admin",
                room: user.room,
            })
        );

        console.log("user disconnected");
    });

    socket.on("client-typed", () => {
        const user = users.get(socket.id);
        socket.broadcast
            .to(user.room)
            .emit("user-is-typing", users.get(socket.id));
    });

    socket.on("client-stop-typed", () => {
        const user = users.get(socket.id);
        socket.broadcast
            .to(user.room)
            .emit("user-stoped-typing", users.get(socket.id));
    });

    socket.on("client-message-sent", (message, successFn) => {
        if (typeof message !== "string" || message.length > 300) {
            successFn("Message length should be less than 300 chars");
            return;
        }

        const user = users.get(socket.id);
        if (user) {
            let messageItem = messageHandler(message, {
                id: user.id,
                name: user.name,
                room: user.room,
            });
            io.to(user.room).emit("new-message-sent", messageItem);
        }

        successFn(null);
    });

    console.log("user connected");
});

const PORT = process.env.PORT || 3009;

http.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});
