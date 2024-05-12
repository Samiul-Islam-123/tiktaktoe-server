const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

var UserMap = [];

io.on('connection', socket => {
    console.log("User connected");

    //event to join room
    socket.on("join-room", (data) => {
        socket.join(data.roomID);

        const roomIndex = UserMap.findIndex(room => room.roomID === data.roomID)

        if (roomIndex !== -1) {
            //add the user into the room


            //check for room size
            if(UserMap[roomIndex].users.length < 2){

                UserMap[roomIndex].users.push({
                    username: data.username,
                    avatar: data.avatar,
                    socketID : socket.id,
                    Symbol : "X"
                })
            }

            else{
                socket.emit("room-full")
            }
            

        }

        else {
            //create a new room
            UserMap.push({
                roomID: data.roomID,
                users: [{
                    username: data.username,
                    avatar: data.avatar,
                    socketID : socket.id,
                    Symbol : "O"
                }]
            })
        }
        
        const currentIndex = UserMap.findIndex(room => room.roomID === data.roomID);

        //console.log(UserMap[currentIndex])


        //broadcasting to other players
        io.to(data.roomID).emit('user-joined', UserMap[currentIndex])

        //condition to start game
        if(UserMap[currentIndex].users.length === 2)
            {
                io.to(data.roomID).emit('start-game')

                // Emit whose turn is first
            const currentPlayerSocketID = UserMap[currentIndex].users[0].socketID;
            io.to(data.roomID).emit('switch-turn', { currentPlayer: currentPlayerSocketID });
            }


    })

    socket.on('player-action', data=>{
        // Emit player action
        io.to(data.roomID).emit('player-action', data);

        // Switch turn
        const roomIndex = UserMap.findIndex(room => room.roomID === data.roomID);
        const currentPlayerIndex = UserMap[roomIndex].users.findIndex(user => user.socketID === data.user.socketID);
        const nextPlayerIndex = (currentPlayerIndex + 1) % 2;
        const nextPlayerSocketID = UserMap[roomIndex].users[nextPlayerIndex].socketID;
        io.to(data.roomID).emit('switch-turn', { currentPlayer: nextPlayerSocketID });
    });

    socket.on('winner-found', (data)=>{
        io.to(data.roomID).emit('winner-found', data.winner)
    })


    socket.on('disconnect', () => {
        console.log("User with ID : " + socket.id + " disconnected");
        UserMap.forEach(room => {
            const userIndex = room.users.findIndex(user => user.socketID === socket.id);
            if (userIndex !== -1) {
                // Remove the disconnected user from the room
                const disconnectedUser = room.users.splice(userIndex, 1)[0];
                io.to(room.roomID).emit('user-left', disconnectedUser); // Broadcast user left message
            }
        });
    });
    
})

const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
    console.log("Server is up and running on PORT : " + PORT);
})