import { MongoClient, ServerApiVersion } from "mongodb";
import config from "./config.js";

const uri = `mongodb+srv://${config.db.username}:${config.db.password}@${config.db.host}/?retryWrites=true&w=majority&ssl=true`

let client 
let myDB

/*
    All mehthods to write and retrieve json documents to/from Mongo.

    TODO: These documents can contain sensitive information. We should encrypt before
    writing to a public cloud service.
*/

const db = {
    open: () => {
        client = new MongoClient(uri, {
            serverApi: {
              version: ServerApiVersion.v1,
              //strict: true,
              deprecationErrors: true,
            }
          });
          myDB = client.db("okta-config-manager");
    },
    close: async () => {
        await client.close();
    },
    objects: {
        insertOne: async (object) => {
            try {
                const myColl = myDB.collection("objects");
                return await myColl.insertOne(object)
            } catch(error) {
                logger.error(error)
            }
        },
        insertMany: async (objects) => {
            try {
                const myColl = myDB.collection("objects");
                return await myColl.insertMany(objects)
            } catch(error) {
                logger.error(error)
            }
        },
        find: async (query, options = {ignoreExclusion: false}) => {
            const myColl = myDB.collection("objects")

            const q = {
                ...query,
                excluded: {$ne:true}
            }

            if (options.ignoreExclusion) delete q.excluded

            const results = await myColl.find(q)

            const resultArray = []

            for await (const result of results) {
                resultArray.push(result)
            }
            return resultArray
        },
        findOne: async (query, options = {ignoreExclusion: false}) => {
            const myColl = myDB.collection("objects");

            const q = {
                ...query,
                excluded: {$ne:true}
            }

            if (options.ignoreExclusion) delete q.excluded

            return await myColl.findOne(q)
        },
        distinct: async (field, query, options = {ignoreExclusion: false}) => {
            const myColl = myDB.collection("objects");

            const q = {
                ...query,
                excluded: {$ne:true}
            }

            if (options.ignoreExclusion) delete q.excluded

            return await myColl.distinct(field, q)

        }
    }
}

export default db