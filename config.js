import secrets from "./secrets.js"

const config = {
    forreal: true,
    debug: true,
    apiRequestDelay: 1000,
    db: {
        host: "cluster0.gmo8udc.mongodb.net",
        username: "okta-config-manager",
        password: secrets.mongo.password
    },
    instances: {
        
        cg: {
            baseUrl: "https://cloudguide.okta.com/api/v1",
            token: secrets.okta.cgToken
        },
        dev1: {
            baseUrl: "https://dev-4478738.okta.com/api/v1",
            token: secrets.okta.dev1Token
        },
        dev2: {
            baseUrl: "https://dev-05729419.okta.com/api/v1",
            token: secrets.okta.dev2Token
        },
        mazarsprod: {
            baseUrl: "https://mazarsnl.okta-emea.com/api/v1",
            token: secrets.okta.mazarsprdToken
        }
    }
}

export default config