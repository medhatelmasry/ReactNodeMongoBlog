import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();
const PORT = 8000;

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        MongoClient.connect("mongodb://localhost:27017", 
            {useNewUrlParser: true, useUnifiedTopology: true}, 
            async function(err, database) {

            const db = database.db('my-blog')

            await operations(db);

        });
    } catch (error) {
        res.status(500).json({message: 'Error connecting to the database', error});
    }  
}

app.get('/hello', (req, res) => {
    res.send("Hello!");
});

app.get('/hello/:name', (req, res) => {
    res.send(`Hello ${req.params.name}!`);
});

app.post('/hello', (req, res) => {
    res.send(`Hello ${req.body.name}!`);
});

app.post('/api/articles/:name/upvote', (req, res) => {
    withDB( async (db) => {
        const articleName = req.params.name;
        const articlesInfo = await db.collection('articles').findOne({name: articleName});

        if (articlesInfo != null) {
            await db.collection('articles').updateOne({name: articleName}, {
                '$set': {
                    upvotes: articlesInfo.upvotes + 1
                }
            });
            const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
            res.status(200).json(updatedArticleInfo);
        } else {
            res.status(404).json({message: `Article ${articleName} cannot be found.`});
        }
    }, res);
});

app.get('/api/articles/:name', (req, res) => {
    withDB( async (db) => {
        const articleName = req.params.name;
        const articlesInfo = await db.collection('articles').findOne({name: articleName});
        if (articlesInfo != null) {
            res.status(200).json(articlesInfo);
        } else {
            res.status(404).json({message: `Article ${articleName} cannot be found.`});
        }
    }, res);
});

app.post('/api/articles/:name/add-comment', (req, res) => {
    const {username, text} = req.body;
    const articleName = req.params.name;

    console.log(articleName);
    
    withDB( async (db) => {
        const articlesInfo = await db.collection('articles').findOne({name: articleName});

        if (articlesInfo != null) {
            console.log(articlesInfo);
            await db.collection('articles').updateOne({name: articleName},
                {
                    '$set': {
                        comments: articlesInfo.comments.concat( {username, text} )
                    }
                }
            );
            const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
            res.status(200).json(updatedArticleInfo);
        } else {
            res.status(404).json({message: `Article ${articleName} cannot be found.`});
        }
    }, res);
});

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '/build/index.html'));
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});