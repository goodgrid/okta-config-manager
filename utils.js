
export const isCommandLineValid = (action, target, filename) => {
    //TODO: Implement this!
    return true
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
