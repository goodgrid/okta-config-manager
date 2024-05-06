import secrets from "./secrets.js"

const config = {
    debug: false,
    apiRequestDelay: 1500,
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
        dev3: {
            baseUrl: "https://dev-83532581.okta.com/api/v1",
            token: secrets.okta.dev3Token
        },
        dev4: {
            baseUrl: "https://dev-87185917.okta.com/api/v1",
            token: secrets.okta.dev4Token
        },
        dev5: {
            baseUrl: "https://dev-84374825.okta.com/api/v1",
            token: secrets.okta.dev5Token
        },
        dev6: {
            baseUrl: "https://dev-15886763.okta.com/api/v1",
            token: secrets.okta.dev6Token
        },
        mazarsprod: {
            baseUrl: "https://mazarsnl.okta-emea.com/api/v1",
            token: secrets.okta.mazarsprdToken
        }
    }
}

export default config