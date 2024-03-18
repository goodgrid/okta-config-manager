import _ from 'lodash'
import { oktaApi } from "./okta.js"
import logger from "./logger.js"
import { summarizeOktaError } from "./utils.js"
import config from "./config.js"


export const sanitizeObject = (object, objectDef) => {
    /*
        Sanitize the currently processed config object by removing any properties
        that need removal before importing into the target instance.
    */
    for (const deletableProp of objectDef.deletableProps) {
       logger.debug(`Removing property ${deletableProp} from config object`)
        _.unset(object.body, deletableProp)
    }
    return object
}

export const replacePropertyValues = async (db, object, objectDef, source, target) => {
    /*
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
        logger.info(`Replacing property value for property ${replaceProp.path}`)

        const targetInstanceValue = await vp[replaceProp.function](db, object, replaceProp, source, target)
        _.set(object.body, replaceProp.path, targetInstanceValue)

    }   
    return object
}


export const getInstanceObjects = async (objectDef, source, parentObjectId) => {
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
        return error
    }
    
}

export const updateInstanceObject = async (body, objectDef, target, existingTargetObjectId, parentId) => {

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


export const createInstanceObject = async (body, objectDef, target, parentId) => {

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




export const vp = {
    arrayIdSwitch: async (db, object, replaceProp, source, target) => {
        /*
            This replacer function receives the current array of Okta id's, loopt through it
            to find the name of the object in the source. Given that name and the object type,
            it finds the object in the target and uses the Okta id to build the new array
            of Okta id's which is suitable for the target.
        */

        const sourceValueArray = _.get(object.body, replaceProp.path)

        if (sourceValueArray) {
            return await Promise.all(sourceValueArray.map(async sourceValue => {
                return await helperReplaceOktaId(db, sourceValue, replaceProp, source, target)
            }))
        }
        

    },

    groupExpressionChange: async (db, object, replaceProp, source, target) => {
        const sourceValue = _.get(object.body, replaceProp.path)
        let targetValue = sourceValue
        const re = /isMemberOfAnyGroup\(\"([0-9A-z]+)\"\)/g

        const sourceValueArray = Array.from(sourceValue.matchAll(/isMemberOfAnyGroup\(\"([0-9A-z]+)\"\)/g), (m) => m[1])

        
        if (sourceValueArray) {
            const fromTo = await Promise.all(sourceValueArray.map(async sourceValue => {
                return {
                    from: sourceValue,
                    to: await helperReplaceOktaId(db, sourceValue, replaceProp, source, target)
                }
            }))
        
            for (const replacement of fromTo) {
                targetValue = sourceValue.replace(replacement.from, replacement.to)
            }
            
            return targetValue
        }
        
    },

    simpleStringReplacement: () => {
        const currentPropertyValue = _.get(object, replaceProp.path)
        logger.debug(`(non-array) I would now lookup the ${replaceProp.comparisonProp} '${currentPropertyValue}' of type ${replaceProp.object} for the target instance`)
        // TODO implement lookup and switch
        _.set(object, replaceProp.path, "TODO implement lookup and switch")

    }

}

const helperReplaceOktaId = async (db, sourceValue, replaceProp, source, target) => {
    
        const sourceDatabaseObject = await db.objects.findOne({
            "instance": source,
            "body.id": sourceValue
        }, {
            ignoreExclusion: true
        })


        // TODO: Make sure I work with the most recent object available
        const targetDatabaseObject = await db.objects.findOne({
            "type": replaceProp.object,
            "instance": target,
            "type": replaceProp.object,
            [`body.${replaceProp.comparisonProp}`]: _.get(sourceDatabaseObject, `body.${replaceProp.comparisonProp}`)
        },{
            ignoreExclusion: true
        })
        return targetDatabaseObject ? targetDatabaseObject.body.id : null
}