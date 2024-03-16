import axios from "axios"
import Bottleneck from "bottleneck";
import logger from "./logger.js";
import config from "./config.js";


export const oktaApi = axios.create()

const limiter = new Bottleneck({
    minTime: config.apiRequestDelay
  });

oktaApi.interceptors.request.use(async reqConfig => {
    try {
        await limiter.schedule(() => {
            logger.debug(`Throttling ${reqConfig.method.toUpperCase()} request to ${reqConfig.url}`)
        });
        //logger.debug(JSON.stringify(reqConfig.data, null, 4))
        return reqConfig
    } catch (error) {
        logger.error("Error while throttling")
    }
}, error => {
    logger.error("Error while thottling")
})


oktaApi.interceptors.response.use(async response => {

    let totalData = response.data

    const next = nextPage(response.headers.link)

    if (next !== undefined) {
        logger.debug(`next request needed`, response.request.path, next)

        try {
            
            const nextResponse = await oktaPublic.get(next)
            totalData = totalData.concat(nextResponse.data)
        } catch(err) {
            logger.error(error)
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


