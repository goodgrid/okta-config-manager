
import config from './config.js'


export const isCommandLineValid = (action, target, filename) => {
    feedback.log("IMPLEMENT THIS")
    return true
}

export const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', () => {
        
        process.stdin.setRawMode(false)
        resolve()
    }))
  }

  export const getSourceObjects = async (db, instance, type, parentId) => {
    feedback.debug(`Getting '${type}' objects for parent ${parentId} from source ${instance}`)
    const sessions = await db.objects.distinct("session", { "type": type, "instance": instance})
    const mostRecentSession = sessions.sort().reverse()[0]

    const results = await db.objects.find({
        session: mostRecentSession,
        instance: instance,
        parentId: parentId,
        type: type
    })

    return await Promise.all(results.map(result => {
        return result.object
    }))
}

export const feedback = {
    debug: (msg) => {
        if (config.debug) {
            if (typeof msg == 'object') {
                console.log(msg)
            } else {
                console.log(`\x1b[34m${msg}\x1b[0m`)
            }
        }
    },
    error: (msg) => {
        //console.log(`\x1b[31m${msg}\x1b[0m`)
        if (typeof msg == 'object') {
            console.log(msg)
        } else {
            console.log(`\x1b[31m${msg}\x1b[0m`)
        }

    },
    log: (msg) => {
        console.log(`\x1b[32m${msg}\x1b[0m`)
    }
}
