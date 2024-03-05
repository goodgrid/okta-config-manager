import { MongoClient, ServerApiVersion } from "mongodb";
import config from "./config.js";

const uri = `mongodb+srv://${config.db.username}:${config.db.password}@${config.db.host}/?retryWrites=true&w=majority&ssl=true`

let client 
let myDB


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
                feedback.error(error)
            }
        },
        insertMany: async (objects) => {
            try {
                const myColl = myDB.collection("objects");
                return await myColl.insertMany(objects)
            } catch(error) {
                feedback.error(error)
            }
        },
        find: async (query) => {
            const myColl = myDB.collection("objects");
            const results = await myColl.find(query)

            const resultArray = []

            for await (const result of results) {
                resultArray.push(result)
            }
            return resultArray
        },
        findOne: async (query) => {
            const myColl = myDB.collection("objects");
            return await myColl.findOne(query)
        },
        distinct: async (field, query) => {
            const myColl = myDB.collection("objects");
            return await myColl.distinct(field, query)

        }
    }
}

export default db