import secrets from "./secrets.js"

const config = {
    forreal: true,
    debug: true,
    apiRequestDelay: 1000,
    db: {
        host: "cluster0.gmo8udc.mongodb.net",
        username: "okta-config-manager",
        password: "OWdRnw1sh9F1xYe3"
    },
    instances: {
        
        cg: {
            baseUrl: "https://cloudguide.okta.com/api/v1",
            token: secrets.cgToken
        },
        dev1: {
            baseUrl: "https://dev-4478738.okta.com/api/v1",
            token: secrets.dev1Token
        },
        dev2: {
            baseUrl: "https://dev-05729419.okta.com/api/v1",
            token: secrets.dev2Token
        },
        mazarsprod: {
            baseUrl: "https://mazarsnl.okta-emea.com/api/v1",
            token: secrets.mazarsprdToken
        }
    }
}

export default config