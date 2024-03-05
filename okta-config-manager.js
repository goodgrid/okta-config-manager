import _ from 'lodash'
import db from './mongo.js';
import { oktaApi } from "./okta.js"
import objectTypes from './types.js';
import { isCommandLineValid, keypress, getSourceObjects, feedback } from './utils.js';
import config from "./config.js"

export const get = async (db, session, source, objectDef, parentId) => {
    feedback.log(`Getting and storing objects of type ${objectDef.name}`)
    const childObjectDefinitions = objectTypes.filter(definition => definition.parents.indexOf(objectDef.name) > -1)

    const instanceObjects = await getInstanceObjects(objectDef, source, parentId)

    const resultObjects = (await Promise.all(instanceObjects.map(async resultObject => {
        feedback.debug(`${session} - Saving ${objectDef.name} ${resultObject.profile ? resultObject.profile.name : resultObject.name}`)

        // For every object of the current type, get child objects, if any
        for (const childObjectDef of childObjectDefinitions) {
            await get(db, session, source, childObjectDef, resultObject.id)
        }

        const result = {
            session: session,
            type: objectDef.name,
            instance: source,
            parentId: parentId,
            object: resultObject,
        }
        await db.objects.insertOne(result)
        return  result       
    })))

    return resultObjects
}


export const set = async (db, session, source, target, objectDef, objects, parentId) => {
    feedback.log(`Upserting ${objects.length} into target '${target}' objects of type '${objectDef.name} from source '${source}'`)

    const childObjectDefinitions = objectTypes.filter(definition => definition.parents.indexOf(objectDef.name) > -1)

    /*
        Getting objects from target instance to easy queryind and to avoid too many requests to
        Okta. The objects are saved to the database for recording of a usable snapshot, but also
        kept in memory
    */
    const targetObjects = await get(db, session, target, objectDef, parentId)

    for (const object of objects) {            
        /*
            Skip config objects whose name are configured as excluded in the object 
            definition
        */
        if (objectDef.exclude.indexOf(object.name) == -1) {
            /*
                The source object is turned into a target object by switching references to
                groups, zones, etc to the id's of the target instance.

            */
            await prepareObject(db, object, objectDef, source, target)

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
                return _.get(targetObject.object, objectDef.comparisonProp) == _.get(object, objectDef.comparisonProp)
            })

            let touchedTargetObject
            if (existingTargetObject) {
                touchedTargetObject = await updateInstanceObject(object, objectDef, target, existingTargetObject.object.id)
            } else {
                touchedTargetObject = await createInstanceObject(object, objectDef, target)
            }

            if (touchedTargetObject) {
                await db.objects.insertOne({
                    session: session,
                    type: objectDef.name,
                    instance: target,
                    object: touchedTargetObject
                })

                // For every object of the current type, set child objects, if any
                for (const childObjectDef of childObjectDefinitions) {
                    const childSourceObjects = await getSourceObjects(db, source, childObjectDef.name, touchedTargetObject.id)
                    await set(db, session, source, target, childObjectDef, childSourceObjects, touchedTargetObject.id)
                }
            } else {
                feedback.error("The object could not be updated or created in the target. It was not stored in the database and child processing is skipped. ")
            }            
        } else {
            feedback.debug(`Skipping ${object.name}`)
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
        feedback.debug(`Removing property ${deletableProp} from config object`)
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

        // Check if it's an array of values or a single value
        if (_.isArray(currentPropertyValue)) {
            // It's an array of values and we're looping over each one of them
            const newPropertyValue = await Promise.all(currentPropertyValue.map(async currentPropertyValueElement => {
                
                feedback.debug(`(array) I would now lookup object with the id '${currentPropertyValueElement}' of type ${replaceProp.object} for the target instance`)

                const sourceObject = await db.objects.findOne({
                    "type": replaceProp.object,
                    "instance": source,
                    "object.id": currentPropertyValueElement
                })

                //TODO I have to make sure the below query finds a recent object, since the database
                // could contain really old objects.
                const targetObject = await db.objects.findOne({
                    "type": replaceProp.object,
                    "instance": target,
                    "object.profile.name": sourceObject.object.profile.name
                })

                feedback.debug(targetObject)
                //if ()
                return targetObject ? targetObject.object.id : null

            }))
            
            _.set(object, replaceProp.path, newPropertyValue)
        } else {
            const currentPropertyValue = _.get(object, replaceProp.path)
            feedback.debug(`(non-array) I would now lookup the ${replaceProp.comparisonProp} '${currentPropertyValue}' of type ${replaceProp.object} for the target instance`)
            _.set(object, replaceProp.path, "test")
            // TODO implement lookup and switch
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
        feedback.error(`\x1b[33m Error querying ${config.instances[source].baseUrl}/${objectDef.endpoint}?${objectDef.queryString} \x1b[0m`);
        feedback.error(error)
    }
    
}

const updateInstanceObject = async (object, objectDef, target, existingTargetObjectId) => {
    feedback.log(`Updating ${(object.profile) ? object.profile.name : object.name }`)
    try {
        //feedback.log(JSON.stringify(object, null, 4))
        if (config.forreal) { 
            const response = await oktaApi.put(`${config.instances[target].baseUrl}/${objectDef.endpoint}/${existingTargetObjectId}`, {
                ...object                            
            },{
                headers: {
                    "Authorization": `SSWS ${config.instances[target].token}`
                }
            }) 
            return response.data
        }
    } catch(error) {
        if (error.response) {
            feedback.error(`\x1b[31m -------- ERROR ------------- \x1b[0m`)
            feedback.error(error.response.data)
            feedback.error(`\x1b[31m --------  END  ------------- \x1b[0m`)
        } else {
            feedback.error(error)
        }
    }

}


const createInstanceObject = async (object, objectDef, target) => {
    feedback.log(`Creating ${(object.profile) ? object.profile.name : object.name }`)
    try {
        //feedback.log(JSON.stringify(object, null, 4))
        if (config.forreal) {
            const response = await oktaApi.post(`${config.instances[target].baseUrl}/${objectDef.endpoint}`, {
                ...object                            
            },{
                headers: {
                    "Authorization": `SSWS ${config.instances[target].token}`
                }
            }) 
            return response.data
        }
        
    } catch(error) {
        if (error.response) {
            feedback.error(`\x1b[31m -------- ERROR ------------- \x1b[0m`)
            feedback.error(error.response.data)
            feedback.error(`\x1b[31m --------  END  ------------- \x1b[0m`)
        } else {
            feedback.error(error)
        }
    }

}


const main = async () => {
    const action = (process.argv[2] !== undefined)?process.argv[2]:"get"
    const source = (process.argv[3] !== undefined)?process.argv[3]:undefined
    const target = (process.argv[4] !== undefined)?process.argv[4]:undefined
    
    if (!isCommandLineValid(action, target, source)) {
        feedback.log("There is an error in your command. Check the commmand line")
    } else {
        if (action == "get") {
            feedback.log(`We are Getting configuration from instance ${source}. `)
            feedback.log("Press a key to continue")
            //await keypress()

        } else {
            feedback.log(`We are Setting configuration to instance ${target}. The source is the latest snapshot from ${source}`)
            feedback.log("Press a key to continue")
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
                feedback.log(`Getting objects of type ${def.name}`)

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
                feedback.log(`Upserting objects of type ${def.name}`)

                const objects = await getSourceObjects(db, source, def.name)

                feedback.log(`Setting objects of type ${def.name}`)
                await set(db, session, source, target, def, objects)
            }            
        }
    }

    await db.close()
}

await main()