import config from "./config.js"

export const validateCommandline = (action, source, target) => {
    const retValue = {
        valid: false,
        error: ""
    }

    const errors = []
    let actionValid = false
    let sourceValid = false
    let targetValid = false

    if ( ["get", "set"].indexOf(action) > -1 ) {
        actionValid = true
    } else {
        errors.push("The first argument should be the action to perform (get or set) and is invalid")
    }

    if ( Object.keys(config.instances).indexOf(source) > -1 ) {
        sourceValid = true
    } else {
        errors.push("The second argument should be the Okta instance of which its configuration is the source")
    }

    if ( Object.keys(config.instances).indexOf(target) > -1 ) {
        targetValid = true
    } else {
        errors.push("The third argument should be the target Okta instance which is being synced with configuration from the source")
    }
    
    if (actionValid && sourceValid && targetValid) {
        retValue.valid = true
    } else {
        retValue.error = errors.join(". ")
    }

    return retValue


}

export const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', () => {
        
        process.stdin.setRawMode(false)
        resolve()
    }))
  }

export const summarizeOktaError = (response) => {
    return [
        response.data.errorSummary,
        ...response.data.errorCauses.map(errorCause => {
            return errorCause.errorSummary
        })
    ]
}
