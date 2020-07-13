const fetch = require('node-fetch');
const URL   = require('url')
require('dotenv').config()
const config = require('./config');
const projectKey = config["projectKey"]
const { USERNAME, PASSWORD } = process.env

const baseUrl = config['port'] ? `${config['domain']}:${config['port']}/${config['apiPath']}` : `${config['domain']}/${config['apiPath']}`
const endpoint = 'createmeta'
const [epic, story] = config['supportedTypes'].split(',');

var headers = {
    "Content-Type":"application/json",
    'Authorization': 'Basic ' + Buffer.from(USERNAME + ":" + PASSWORD).toString('base64')
}

let cachedIssueInfo = {}

const queryURL = (issueType) => {
    //example: http://34.105.88.232:8080/rest/api/2/issue/createmeta?projectKey=FAN&issuetypeNames=Epic&expand=projects.issuetypes.fields
    let params = {projectKey: projectKey, issuetypeNames: issueType, expand: 'projects.issuetypes.fields'}
    let url  = `${baseUrl}/${endpoint}${URL.format({ query: params })}` 
    return url
}


const saveIssueInfo = async (issueType) => {
    let url = queryURL(issueType)
    if (!cachedIssueInfo.hasOwnProperty(issueType)){
        //console.log('fetching from server')
        let response = await fetch(url, {headers: headers})
        let data = await response.json()
        cachedIssueInfo[issueType] = data["projects"][0]["issuetypes"][0]
    }else{
        //console.log('fetching from cache')
    }
    return cachedIssueInfo[issueType]
}

const requestBody = async (issueType) => {
    let body = {} 
    await saveIssueInfo(issueType)
    let timestamp = Date.now()
    if (issueType == 'Story'){
        body = {"fields":{"project":{"key": projectKey}, 
        "summary": `Story ${timestamp} via REST`,
        "description": "Creating a Story via REST",
        "issuetype": {"name": "Story"}}}
    } else if(issueType == 'Epic'){
        //identify customfield_xxx object with key "name" which is set to "Epic Name" to use it in the payload
        let fields = cachedIssueInfo[issueType]['fields']
        let keys = Object.keys(fields);
        let cfKeys = keys.filter(key => key.toLowerCase().includes("customfield_"));
        for (let val of cfKeys){
            if (fields[val]["name"] == 'Epic Name'){
                body = {"fields":{"project":{"key": projectKey}, 
                         [val]: `Epic ${timestamp}`,
                         "summary": `Epic ${timestamp}`,
                         "description": "Creating an Epic via REST",
                         "issuetype": {"name": "Epic"}}}
            }
         }
    }
    return body
}

const createIssue = async (body = {}) => {
    try{
        const response = await fetch(baseUrl, {
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            credentials: 'same-origin', 
            headers: headers,
            body: JSON.stringify(body) 
          });
        return response.json(); 
    }catch{
      console.log(err)
    }
  }

  const deleteIssues = async (index) => {
    try{
        deleteUrl = `${baseUrl}/${projectKey}-${index}`
        const response = await fetch(deleteUrl, {
          method: 'DELETE', 
          mode: 'cors', 
          cache: 'no-cache', 
          credentials: 'same-origin', 
          headers: headers
        });
        return response.text; 
    } catch(err){
        console.log(err)
    }
  }

(async function() {
    for(let i = 0; i < 11; i++){
        await new Promise(async next => {
            await requestBody(epic).then(createIssue); 
            if (i % 10 == 0){
                console.log(`posting ${i}th item...`)
            }
            next()
        })
    }
})()




