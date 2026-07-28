import {HEADERS} from "./config.js";

export function success(imageBase64){

    return new Response(JSON.stringify({

        success:true,
        imageBase64:imageBase64

    }),{

        status:200,
        headers:HEADERS

    });

}

export function error(message){

    return new Response(JSON.stringify({

        success:false,
        error:message

    }),{

        status:400,
        headers:HEADERS

    });

}
