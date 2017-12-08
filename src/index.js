"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bp = require("body-parser");
const db_1 = require("./db");
const algoliasearch = require("algoliasearch");
const client = algoliasearch("NGFATQMT4B", "3c9872f8338b96966a9dab158cc77e70");
// CHANGE INDEX TO "FinalJobs" WHEN USING THESE FUNCTIONS FOR JOBS AND TO "FinalUsers" FOR USERS
const index = client.initIndex('FinalUsers');
const app = express();
app.use(bp.json());
// USE TO GET USERS OR JOBS AND STORE THEM IN THE INDEX
app.get('/', (req, res, next) => {
    db_1.procedure("spGetUsers")
        .then((users) => {
        res.json(users[0]);
        const result = users[0].map((s) => {
            s.skills = s.skills.split(', ');
            return s;
        });
        index.addObjects(result, (err, content) => {
            console.log(content);
        });
    });
});
// USER TO CREATE A USER OR JOB AND ADD TO THE INDEX AND SQL DATABASE
app.post('/', (req, res, next) => {
    index.addObject(req.body, (err, content) => {
        console.log(content);
        db_1.procedure("spInsertUser", [req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img, content.objectID])
            .then((id) => {
            console.log(id[0][0].id);
            index.partialUpdateObject({
                id: id[0][0].id,
                objectID: content.objectID
            });
        });
    });
});
// USE TO DELETE A USE OR JOB FROM THE INDEX AND THE SQL DATA BASE
app.delete('/:id', (req, res, next) => {
    db_1.procedure("spGetUser", [+req.params.id])
        .then((user) => {
        console.log(user[0][0]);
        index.deleteObject(user[0][0].index_id, (err) => {
            if (!err) {
                console.log('success');
            }
        });
        db_1.procedure("spDeleteUser", [+user[0][0].id])
            .then((res) => {
            console.log('deleted');
        });
    });
});
// USE TO UPDATE A USER OR JOB IN THE INDEX AND THE DATABASE 
app.put('/index/:id', (req, res, next) => {
    db_1.procedure("spUpdateUser", [+req.params.id, req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img])
        .then((user) => {
        res.json(user);
        db_1.procedure("spGetUser", [+req.params.id])
            .then((user) => {
            console.log(user[0][0]);
            index.saveObject(Object.assign({}, user[0][0], { objectID: user[0][0].index_id }), (err, content) => {
                console.log(content);
            });
        });
    });
});
//USE TO CREATE USERSKILLS WHEN CREATING USER
app.post('/skills', (req, res, next) => {
    db_1.procedure("spInsertUser", [req.body.name, req.body.password, req.body.email, req.body.city, req.body.state, req.body.phone, req.body.bio, req.body.img, req.body.index_id])
        .then((id) => {
        console.log(id[0][0].id);
        const skillIDs = req.body.skills;
        const skillPromises = skillIDs.map((s) => {
            return db_1.procedure("spInsertUserskill", [id[0][0].id, s]);
        });
        Promise.all(skillPromises)
            .then(() => {
            res.end();
        });
    });
});
app.listen(3000, () => {
    console.log("listening on 3000");
});
