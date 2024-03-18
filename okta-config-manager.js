import _ from 'lodash'
import db from './mongo.js';
import logger from './logger.js';
import { sanitizeObject, replacePropertyValues, getInstanceObjects, updateInstanceObject, createInstanceObject, getSourceObjects } from './functions.js';
import objectTypes from './types.js';
import { validateCommandline, keypress, summarizeOktaError } from './utils.js';

export const get = async (db, session, source, objectDef, parentId) => {
    logger.info(`Getting and storing objects of type ${objectDef.name} from source ${source} for parent ${parentId?parentId:"(none)"}`)
    const childObjectDefinitions = objectTypes.filter(definition => definition.parents.indexOf(objectDef.name) > -1)

    const instanceObjects = await getInstanceObjects(objectDef, source, parentId)

    if (!(instanceObjects instanceof Error)) {
        const resultObjects = (await Promise.all(instanceObjects.map(async resultObject => {
            logger.debug(`${session} - Saving ${objectDef.name} ${resultObject.profile ? resultObject.profile.name : resultObject.name} to database`)

            // For every object of the current type, get child objects, if any
            for (const childObjectDef of childObjectDefinitions) {
                await get(db, session, source, childObjectDef, resultObject.id)
            }

            const result = {
                session: session,
                type: objectDef.name,
                instance: source,
                parentId: parentId,
                body: resultObject,
            }
            await db.objects.insertOne(result)
            return  result       
        })))

        return resultObjects
    }
}


export const set = async (db, session, source, target, objectDef, objects, parentId) => {
    logger.info(`Upserting ${objects.length} objects of type '${objectDef.name} into target '${target}' from source '${source}'`)

    /*
        Identifying optional child objects and their definitions for processing after this (then parent) objects
        is processed.
    */
    const childObjectDefinitions = objectTypes.filter(definition => definition.parents.indexOf(objectDef.name) > -1)

    /*
        Getting objects from target instance to easy querying and to avoid too many requests to
        Okta. The objects are saved to the database for recording of a usable snapshot, but also
        kept in memory
    */
    const targetInstanceObjects = await get(db, session, target, objectDef, parentId)


    /*
        Looping over the originally passed set of objects.
    */
    for (const object of objects) {     

        /*
            Skip config objects whose name are configured as excluded in the object 
            definition
        */
        if (objectDef.exclude.indexOf(object.body.name) == -1) {

            /*
                The source object is turned into a target object by switching references to groups, 
                zones, etc to the id's of the target instance. Also, using the sanitizeObject function, 
                properties that must be deleted according to the object definition are removed.
            */
            const preparedTargetObject = await replacePropertyValues(db, sanitizeObject(object, objectDef), objectDef, source, target)

            /*
                Check if the object that is about to be upserted already exists. This decides
                if the existing object needs updating or that the object needs to be newly inserted.

                All the target objects are looped and filtered for the same value in the 
                'comparisonProp'  

                If the target instance contains a config object with the same value for 'comparisonProp',
                we will update that object. The object is returned from the API and stored in the 
                database. This is neccessary to be able to swith references (id's)

                If the target instance does not contain a config object with the same value for 'comparisonProp',
                a new object is created. The object is returned by the API and stored in the database. This is 
                neccessary to be able to swith references (id's)
            */
            const existingTargetInstanceObject = targetInstanceObjects.find(targetInstanceObject => {
                return _.get(targetInstanceObject.body, objectDef.comparisonProp) == _.get(preparedTargetObject.body, objectDef.comparisonProp)
            })

            let touchedTargetObject
            if (existingTargetInstanceObject) {
                touchedTargetObject = await updateInstanceObject(preparedTargetObject.body, objectDef, target, existingTargetInstanceObject.body.id, parentId)

            } else {
                touchedTargetObject = await createInstanceObject(preparedTargetObject.body, objectDef, target, parentId)

                if (!(touchedTargetObject instanceof Error)) {
                    logger.info("New object succesfully created")
                }
                
            }

            if (!(touchedTargetObject instanceof Error)) {
                logger.info(`Target object succesfully ${existingTargetInstanceObject?"UPDATED":"CREATED"}`)

                await db.objects.insertOne({
                    session: session,
                    type: objectDef.name,
                    instance: target,
                    body: touchedTargetObject
                })

                // For every object of the current type, set child objects, if any
                for (const childObjectDef of childObjectDefinitions) {
                    logger.info(`Now starting to process child objects of type ${childObjectDef.name} for parent ${object.body.id}`)

                    const childSourceObjects = await getSourceObjects(db, source, childObjectDef.name, object.body.id)

                    await set(db, session, source, target, childObjectDef, childSourceObjects, touchedTargetObject.id)
                }

            } else {
                logger.error("The object could not be updated or created in the target. It was not stored in the database and child processing is skipped. ")
            }            
        } else {
            logger.debug(`Skipping ${object.name}`)
        }  
    }
        
}


const main = async () => {
    const action = process.argv[2]
    const source = process.argv[3]
    const target = process.argv[4]
    
    if (!validateCommandline(action, target, source).valid) {
        logger.error(validateCommandline(action, target, source).error)
    } else {
        if (action == "get") {
            logger.info(`We are Getting configuration from instance ${source}. `)
            logger.info("Press a key to continue")
            //await keypress()

        } else {
            logger.info(`We are Setting configuration to instance ${target}. The source is the latest snapshot from ${source}`)
            logger.info("Press a key to continue")
            //await keypress()
        }
        
        
        db.open()

        const session = (new Date()).getTime()

        // We process child objects (rules for example) within their parent, so we skip them here
        const parentObjectDefinitions = objectTypes.filter(definition => definition.parents.length == 0)

        if (action == "get") {
            /*
                Loop over the config object definitions. If the object is enabled for the action (get/set),
                the action is called and the current config object definition is passed.
            */
            for (const def of parentObjectDefinitions) {
                if (def.extract === true) {
                    logger.info(`Getting objects of type ${def.name}`)

                    await get(db, session, source, def)    
                }
            }
        }

        else if (action == "set") {
            /*
                Loop over the config object definitions. If the object is enabled for the action (get/set),
                the action is called and the current config object definition is passed. For this "set"
                action, the most recent objects of the currently processed config object type are fetched 
                from the database and these are also passed to the set routine.
            */
            
            for (const def of parentObjectDefinitions) {
                if (def.upsert === true) {
                    const objects = await getSourceObjects(db, source, def.name)

                    logger.info(`Calling SET for ${objects.length} objects of type ${def.name}`)
                    await set(db, session, source, target, def, objects)
                }            
            }
        }

        await db.close()
    }
}

await main()