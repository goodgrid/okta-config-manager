import _ from 'lodash'
import db from './mongo.js';
import logger from './logger.js';
import { oktaApi } from "./okta.js"
import objectTypes from './types.js';
import { isCommandLineValid, keypress, summarizeOktaError } from './utils.js';
import config from "./config.js"

export const get = async (db, session, source, objectDef, parentId) => {
    logger.info(`Getting and storing objects of type ${objectDef.name} from source ${source} for parent ${parentId?parentId:"(none)"}`)
    const childObjectDefinitions = objectTypes.filter(definition => definition.parents.indexOf(objectDef.name) > -1)

    const instanceObjects = await getInstanceObjects(objectDef, source, parentId)

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
    const targetObjects = await get(db, session, target, objectDef, parentId)


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
                The source object is turned into a target object by switching references to
                groups, zones, etc to the id's of the target instance.

            */
            await prepareObject(db, object.body, objectDef, source, target)

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
            const existingTargetObject = targetObjects.find(targetObject => {
                return _.get(targetObject.body, objectDef.comparisonProp) == _.get(object.body, objectDef.comparisonProp)
            })

            let touchedTargetObject
            if (existingTargetObject) {
                touchedTargetObject = await updateInstanceObject(object.body, objectDef, target, existingTargetObject.body.id, parentId)

            } else {
                touchedTargetObject = await createInstanceObject(object.body, objectDef, target, parentId)

                if (!(touchedTargetObject instanceof Error)) {
                    logger.info("New object succesfully created")
                }
                
            }

            if (!(touchedTargetObject instanceof Error)) {
                logger.info(`Target object succesfully ${existingTargetObject?"UPDATED":"CREATED"}`)

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



const prepareObject = async (db, object, objectDef, source, target) => {
    /*
        STEP 1
        Sanitize the currently processed config object by removing any properties
        that need removal before importing into the target instance.
    */
    for (const deletableProp of objectDef.deletableProps) {
        logger.debug(`Removing property ${deletableProp} from config object`)
        _.unset(object, deletableProp)
    }

    /*
        STEP 2
        If the object definition contains properties that require replacing with
        values of the target environment, such as ID's, this is done now.

        This routine switches references which are unique for the
        source instance by the reference fot the same object in the
        target environment. For example, a reference to a group is 
        done via the group ID. The object is looked up in the source
        instance by ID and then it's name is used to find the ID in the
        target environment.

        For up to date switching, this requires that the dependant objects
        such as groups and zones have been processed before this current 
        object type.

    */
    for (const replaceProp of objectDef.replaceProps) {

        // Get the current value for the property 
        const currentPropertyValue = _.get(object, replaceProp.path)

        // Only execute logic if the property exists
        if (currentPropertyValue) {
            // Check if it's an array of values or a single value
            if (_.isArray(currentPropertyValue)) {
                // It's an array of values and we're looping over each one of them
                const newPropertyValue = await Promise.all(currentPropertyValue.map(async currentPropertyValueElement => {
                    
                    logger.debug(`(array) I would now lookup object with the id '${currentPropertyValueElement}' of type ${replaceProp.object} for the target instance`)

                    const sourceObject = await db.objects.findOne({
                        "type": replaceProp.object,
                        "instance": source,
                        "config.id": currentPropertyValueElement
                    }, {
                        ignoreExclusion: true
                    })

                    //TODO I have to make sure the below query finds a recent object, since the database
                    // could contain really old objects.
                    const targetObject = await db.objects.findOne({
                        "type": replaceProp.object,
                        "instance": target,
                        [`config.${replaceProp.comparisonProp}`]: _.get(sourceObject, `config.${replaceProp.comparisonProp}`) //sourceobject.body.profile.name]
                    },{
                        ignoreExclusion: true
                    })

                    return targetObject ? targetObject.body.id : null
                }))
                
                _.set(object, replaceProp.path, newPropertyValue)
            } else {
                const currentPropertyValue = _.get(object, replaceProp.path)
                logger.debug(`(non-array) I would now lookup the ${replaceProp.comparisonProp} '${currentPropertyValue}' of type ${replaceProp.object} for the target instance`)
                // TODO implement lookup and switch
                _.set(object, replaceProp.path, "TODO implement lookup and switch")
            }
        }
    }   
    
}

const getInstanceObjects = async (objectDef, source, parentObjectId) => {
    try {           
        
        const endpoint = objectDef.endpoint.replace(/(\{id\})/, parentObjectId)
        const response = await oktaApi.get(`${config.instances[source].baseUrl}/${endpoint}?${objectDef.queryString}`, {
            headers: {
                "Authorization": `SSWS ${config.instances[source].token}`
            }
        })
        return response.data
        
    } catch(error) {
        if (error.response) {
            logger.error(summarizeOktaError(error.response))
        } else {
            logger.error(error)
        }
    }
    
}

const updateInstanceObject = async (body, objectDef, target, existingTargetObjectId, parentId) => {

    logger.info(`Updating ${(body.profile) ? body.profile.name : body.name }`)
    try {
        const response = await oktaApi.put(`${config.instances[target].baseUrl}/${objectDef.endpoint.replace("{id}",parentId)}/${existingTargetObjectId}`, {
            ...body
        },{
            headers: {
                "Authorization": `SSWS ${config.instances[target].token}`
            }
        }) 
        return response.data
    } catch(error) {
        if (error.response) {
            logger.error(summarizeOktaError(error.response))
        } else {
            logger.error(error)
        }
        logger.error("Failing object follows")
        logger.error(JSON.stringify(body, null, 4))
        return error
    }

}


const createInstanceObject = async (body, objectDef, target, parentId) => {

    logger.info(`Creating ${objectDef.name} object '${(body.profile) ? body.profile.name : body.name }'`)
    try {
        const response = await oktaApi.post(`${config.instances[target].baseUrl}/${objectDef.endpoint.replace("{id}",parentId)}`, {
            ...body                            
        },{
            headers: {
                "Authorization": `SSWS ${config.instances[target].token}`
            }
        }) 
        return response.data
    } catch(error) {
        if (error.response) {
            logger.error(summarizeOktaError(error.response))
        } else {
            logger.error(error)
        }
        logger.error("Failing object follows")
        logger.error(JSON.stringify(body, null, 4))
        return error

    }

}

export const getSourceObjects = async (db, instance, type, parentId) => {
    logger.debug(`Getting '${type}' objects for parent ${parentId?parentId:"(none)"} from source ${instance}`)
    const sessions = await db.objects.distinct("session", { "type": type, "instance": instance}, {ignoreExclusion: true})
    const mostRecentSession = sessions.sort().reverse()[0]

    return await db.objects.find({
        session: mostRecentSession,
        instance: instance,
        parentId: parentId,
        type: type
    })
}

const main = async () => {
    const action = (process.argv[2] !== undefined)?process.argv[2]:"get"
    const source = (process.argv[3] !== undefined)?process.argv[3]:undefined
    const target = (process.argv[4] !== undefined)?process.argv[4]:undefined
    
    if (!isCommandLineValid(action, target, source)) {
        logger.info("There is an error in your command. Check the commmand line")
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

await main()