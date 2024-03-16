
const objectTypes = [
    { 
        name: "userSchema",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        replaceProps: [],
        deletableProps: [],
        endpoint: "meta/schemas/user/default",
        queryString: ``,
        comparisonProp: "name",
    },
/*
    { 
        name: "oktaGroup",
        parents: [],
        extract: true,
        upsert: true,
        exclude: ["Everyone", "Okta Administrators"],
        replaceProps: [],
        deletableProps: [],
        endpoint: "groups",
        queryString: `filter=type eq "OKTA_GROUP" or type eq "BUILT_IN"`,
        comparisonProp: "profile.name",
    },
    {
        name: "zone",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        replaceProps: [],
        deletableProps: [],
        endpoint: "zones",
        queryString: ``,
        comparisonProp: "name",
    },

    {
        name: "groupRule",
        parents: [],
        extract: true,
        upsert: true,
        exclude: [],
        deletableProps: [],
        endpoint: "groups/rules",
        queryString: ``,
        comparisonProp: "name",
        exclude: [],
        deletableProps: [
            "conditions.people.users.exclude",
            "conditions.people.groups.exclude",
        ],
        replaceProps: [
            {
                path: "actions.assignUserToGroups.groupIds",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ],
        postCreateActions: [ //TODO: Implement this
            {
                method: "POST",
                endpoint: "groups/rules/{id}/lifecycle/activate",
                body: {}
            }
        ]

    },
    {
        name: "globalSignOnPolicy",
        parents: [],
        extract: true,
        upsert: true,
        endpoint: "policies",
        queryString: "type=OKTA_SIGN_ON", 
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                path: "conditions.people.groups.include",
                //type: "array",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]
    },
    {
        //    This object is only present in Okta Identity Engine. Disable it for use with 
        //    Okta Classic instances.
        name: "accessPolicy", 
        parents: [],
        extract: false,
        upsert: false,
        endpoint: "policies",
        queryString: "type=ACCESS_POLICY",
        comparisonProp: "name",
        exclude: [],
        deletableProps: [],
        replaceProps: [
            {
                path: "conditions.people.groups.include",
                //type: "array",
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]


    },
    {    
        name: "passwordPolicy",
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
                object: "oktaGroup",
                comparisonProp: "profile.name"
            }
        ]

    },
    {
        name: "policyRule",
        parents: ["passwordPolicy", "globalSignOnPolicy", "accessPolicy"],
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
            object: "zone",
            comparisonProp: "name"
        }
]

    }
*/
]


export default objectTypes