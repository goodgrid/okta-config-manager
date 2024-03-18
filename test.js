import { vp } from "./functions.js";

const obj = {
    "_id": {
      "$oid": "65f72ddc224e817c36ecf6e6"
    },
    "session": 1710697943948,
    "type": "groupRule",
    "instance": "mazarsprod",
    "parentId": null,
    "body": {
      "type": "group_rule",
      "id": "0pr384zgmCGBkR2gf0i6",
      "status": "ACTIVE",
      "name": "AD Func Beheer Signals",
      "created": "2016-03-31T14:03:58.000Z",
      "lastUpdated": "2016-03-31T14:37:08.000Z",
      "conditions": {
        "people": {
          "users": {
            "exclude": [
              "00ubdsxagFljtIw5w0i6",
              "00ubl0clnnfkcZ2eV0i6",
              "00ubjxv5kYbGhotEf0i6",
              "00ubi5w3waMKbNitl0i6",
              "00ubdelqyUSTbn4gk0i6",
              "00ubcikybQP2ds2F50i6",
              "00ubjblqv61aVEmgM0i6",
              "00ubkbphbq43ygXtr0i6",
              "00ubd67pwoUNH42DT0i6",
              "00ubcijg2zOkbeP6R0i6",
              "00ubcxf37xXmK01y30i6",
              "00ub0n87m2Efm3cn00i6",
              "00ubju5acbEynuULl0i6"
            ]
          },
          "groups": {
            "exclude": []
          }
        },
        "expression": {
          "value": "String.stringContains(user.email,\"vanraamsdonk.net\") or String.stringContains(user.email,\"martijnpol@home.nl\") or String.stringContains(user.email,\"loyensloeff.com\")",
          "type": "urn:okta:expression:1.0"
        }
      },
      "actions": {
        "assignUserToGroups": {
          "groupIds": [
            "00g384zeiiL5DSzar0i6"
          ]
        }
      },
      "allGroupsValid": true
    },
    "excluded": true
  }

const replaceProp =             {
    function: "groupExpressionChange",
    path: "conditions.expression.value",
    object: "oktaGroup",
    comparisonProp: "profile.name"
}


console.log(await vp.groupExpressionChange(null, obj, replaceProp, "mazarsprod", "dev4"))