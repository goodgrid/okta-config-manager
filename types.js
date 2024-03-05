
const objectTypes = [
    { 
        name: "oktaGroups",
        parents: [],
        extract: true,
        upsert: false,
        exclude: ["Everyone", "Okta Administrators"],
        replaceProps: [],
        deletableProps: [],
        endpoint: "groups",
        queryString: '', //`filter=type eq "OKTA_GROUP"`,
        comparisonProp: "profile.name",
    },
    {
        name: "zones",
        parents: [],
        extract: true,
        upsert: false,
        exclude: [],
        replaceProps: [],
        deletableProps: [],
        endpoint: "zones",
        queryString: ``,
        comparisonProp: "name",
    },

    {
        name: "groupRules",
        parents: [],
        extract: false,
        upsert: false,
        exclude: [],
        deletableProps: [],
        endpoint: "groups/rules",
        queryString: ``,
        comparisonProp: "name",

    },
    {
        name: "authenticationPolicies",
        parents: [],
        extract: false,
        upsert: false,
        endpoint: "policies",
        queryString: "type=ACCESS_POLICY",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],

    },
    {    
        name: "passwordPolicies",
        parents: [],
        extract: true,
        upsert: true,
        endpoint: "policies",
        queryString: "type=PASSWORD",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                path: "conditions.people.groups.include",
                //type: "array",
                object: "oktaGroups",
                //comparisonProp: "id"
            }
        ]

    },
    {
        name: "policyRules",
        parents: ["passwordPolicies"],
        extract: true,
        upsert: true,
        endpoint: "policies/{id}/rules",
        queryString: "",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [            {
            path: "conditions.network.include",
            //type: "string",
            object: "zones",
            //comparisonProp: "id"
        }
]

    }

]


// Upserting the objects is in the order of definition
/*
const definitions = {
    {
        nane: "apps",
        parents: [],
        extract: false,
        upsert: false,
        exclude: ["saasure", "okta_enduser", "okta_browser_plugin", "flow", "okta_flow_sso", "hellosign_hellofax", "bookmark", "scim1testapp", "scim2testapp", "oidc_client", "scim2headerauth", "scaleft", "office365", "slack", "asana", "dropbox_for_business", "zoom"],
        deletableProps: ["keys", "credentials.signing.kid"],
        endpoint: "apps",
        queryString: `filter=status eq "ACTIVE"`,
        comparisonProp: "name",
    },
    {
        name: "idps",
        parents: [],
        extract: false,
        upsert: false,
        endpoint: "idps",
        queryString: "",
        comparisonProp: "name",
        exclude: []
        //TODO: IdP Routing rules
    },
    {
        name: "authenticators",
        parents: [],
        extract: false,
        upsert: false,
    },

    "oktaGroups": {
        name: "oktaGroups",
        function: "generic",
        extract: false,
        upsert: true,
        exclude: [],
        deletableProps: [],
        endpoint: "groups",
        queryString: `filter=type eq "OKTA_GROUP"`,
        comparisonProp: "profile.name",
    },
    "groupRules": {
        function: "generic",
        extract: false,
        upsert: false,
        exclude: [],
        deletableProps: [],
        endpoint: "groups/rules",
        queryString: ``,
        comparisonProp: "name",

    },
    "apps": {
        function: "generic",
        extract: false,
        upsert: false,
        exclude: ["saasure", "okta_enduser", "okta_browser_plugin", "flow", "okta_flow_sso", "hellosign_hellofax", "bookmark", "scim1testapp", "scim2testapp", "oidc_client", "scim2headerauth", "scaleft", "office365", "slack", "asana", "dropbox_for_business", "zoom"],
        deletableProps: ["keys", "credentials.signing.kid"],
        endpoint: "apps",
        queryString: `filter=status eq "ACTIVE"`,
        comparisonProp: "name",
    },
    "zones": {
        function: "generic",
        extract: false,
        upsert: false,
        exclude: [],
        deletableProps: [],
        endpoint: "zones",
        queryString: ``,
        comparisonProp: "name",
    },
    "idps": {
        function: "generic",
        extract: false,
        upsert: false,
        endpoint: "idps",
        queryString: "",
        comparisonProp: "name",
        exclude: []
        //TODO: IdP Routing rules
    },

    "authenticators": {
        
        extract: false,
        upsert: false,
    },
    "authenticationPolicies": {
        function: "generic",
        extract: false,
        upsert: false,
        endpoint: "policies",
        queryString: "type=ACCESS_POLICY",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],

    },
    "passwordPolicies": {
        function: "generic",
        extract: true,
        upsert: false,
        endpoint: "policies",
        queryString: "type=PASSWORD",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceValues: [
            {
                path: "conditions.people.groups.include",
                type: "array",
                object: "oktaGroups",
                comparisonProp: "id"
            }
        ]

    },
    "globalSignOnPolicies": {
        extract: false,
        upsert: false
    },
    "enrollmentPolicies": {
        extract: false,
        upsert: false
    },
    // TODO "authorizationPolicies",
    "idpDiscoveryPolicies": {
        extract: false,
        upsert: false
    },
    "brands": {
        extract: false,
        upsert: false

    },
    "schemas": {
        // The Okta Schemas API provides operations to manage custom User profiles
    },
    "trustedOrigings": {}
}
*/

export default objectTypes