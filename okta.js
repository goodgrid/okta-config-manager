import axios from "axios"
import Bottleneck from "bottleneck";
import { feedback } from "./utils.js";
import config from "./config.js";


export const oktaApi = axios.create()

const limiter = new Bottleneck({
    minTime: config.apiRequestDelay
  });

oktaApi.interceptors.request.use(async reqConfig => {
    try {
        await limiter.schedule(() => {
            feedback.debug(`Throttling ${reqConfig.method} request to ${reqConfig.url}`)
        });
        feedback.debug(reqConfig.request)
        return reqConfig
    } catch (error) {
        feedback.error("Error while throttling")
    }
}, error => {
    feedback.error("Error while thottling")
})


oktaApi.interceptors.response.use(async response => {

    let totalData = response.data

    const next = nextPage(response.headers.link)

    if (next !== undefined) {
        feedback.debug(`next request needed`, response.request.path, next)

        try {
            
            const nextResponse = await oktaPublic.get(next)
            totalData = totalData.concat(nextResponse.data)
        } catch(err) {
            feedback.error(error)
        }
    }

    response.data = totalData
    return response;
});

const nextPage = (linkHeaders) => {

    if (linkHeaders == undefined) return undefined 

    
    const nextLink = linkHeaders.split(",")
    .find(header => {    
        return (header.indexOf(`rel="next"`) > -1)
    })

    if (!nextLink) return undefined

    return nextLink.split(";")[0].trim().replace(/[<>]/g,"")

}


