import * as express from "express";
import * as bp from "body-parser";
import { procedure } from "./db";
import * as algoliasearch from "algoliasearch";
import { createServer } from "http";
import { Socket } from "net";
import * as socket from 'socket.io';



const client = algoliasearch("NGFATQMT4B", "3c9872f8338b96966a9dab158cc77e70");

// CHANGE INDEX TO "FinalJobs" WHEN USING THESE FUNCTIONS FOR JOBS AND TO "FinalUsers" FOR USERS

const index = client.initIndex('FinalUsers');

const app = express();
const server = createServer(app);
const io = socket.listen(server);

app.use(bp.json());


// SOCKET AND MESSAGING BULLSHIT

io.on('connection', (socket) => {
    console.log('user connected');

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.on('add-message', (message) => {
        console.log(message)
        procedure('spInsertMessage', [message.user_id, message.chat_id, message.message])
        .then((pack)=> {
            console.log("Inside whatever", pack)
            io.emit('message', pack[0][0])
        })
    })
})

app.get("/api/chat/rooms/:id", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    procedure("spGetChatroomsByUser", [+req.params.id] )
    .then((chatrooms: any) => {
        res.json(chatrooms[0])
        console.log(chatrooms[0])
    })
})

app.get("/api/chat/messages/:id", (req: express.Request, res: express.Response, next: express.NextFunction) =>{
    procedure("spGetMessagesByChatroom", [+req.params.id])
    .then((messages: any) => {
        res.json(messages[0])
        console.log(messages[0])
    })
})
// USE TO GET USERS OR JOBS AND STORE THEM IN THE INDEX

app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    procedure("spGetUsers")
    .then((users: any) => {
        res.json(users[0])
        const result = users[0].map((s: any) => {
         s.skills = s.skills.split(', ')
            return s;
        })
        index.addObjects(result, (err, content) => {
            console.log(content);
        });
    })
})

// USER TO CREATE A USER OR JOB AND ADD TO THE INDEX AND SQL DATABASE

app.post('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    index.addObject(req.body, (err, content) => {
        console.log(content)
        procedure("spInsertUser", [req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img, content.objectID])
        .then((id: any) => {
            console.log(id[0][0].id)

            index.partialUpdateObject({
                id: id[0][0].id,
                objectID: content.objectID
            })
        })
    })   
})

// USE TO DELETE A USE OR JOB FROM THE INDEX AND THE SQL DATA BASE
 
app.delete('/:id', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    procedure("spGetUser", [+req.params.id])
    .then((user: any) => {
        console.log(user[0][0])
        index.deleteObject(user[0][0].index_id, (err) => {
            if (!err) {
              console.log('success');
            }
        });

        procedure("spDeleteUser", [+user[0][0].id])
        .then((res) => {
            console.log('deleted')
        })
    })
})

// USE TO UPDATE A USER OR JOB IN THE INDEX AND THE DATABASE 

app.put('/index/:id', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    procedure("spUpdateUser", [+req.params.id, req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img] )
    .then((user:any) => {
        res.json(user);
        procedure("spGetUser", [+req.params.id])
        .then((user: any) => {
            console.log(user[0][0])
            index.saveObject({
                ...user[0][0],
                 objectID: user[0][0].index_id 
                }, (err, content) => {
                console.log(content)
            })
        })
    })
})

//USE TO CREATE USERSKILLS WHEN CREATING USER

app.post('/skills', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    procedure("spInsertUser", [req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img, req.body.index_id])
    .then((id) => {
        console.log(id[0][0].id)
        const skillIDs = req.body.skills;

        const skillPromises = skillIDs.map((s: any) => {
            return procedure("spInsertUserskill", [id[0][0].id, s])
        });

        Promise.all(skillPromises)
        .then(()=> {
            res.end();
        })
        
    })
})

server.listen(3000, () => {
    console.log("listening on 3000");
})
