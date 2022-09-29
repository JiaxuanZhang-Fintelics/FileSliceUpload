const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const Buffer = require('buffer/').Buffer 


app.use(bodyParser.json({ extended: true }));

app.use((req,res,next)=>{
    console.log(req.url);
    next();
})

/*
* End point for uploading file
*/
app.post('/uploadfile', function (req, res, next) {
    try
    {
        // Create directory if not exist
        if (!fs.existsSync(path.join(__dirname, req.body.hash))) {
            fs.mkdirSync(path.join(__dirname, req.body.hash), { recursive: true });
        }
        // If the chunk is already uploaded, skip
        else if(fs.existsSync(path.join(__dirname, req.body.hash+"/"+req.body.index))){
            return res.status(200).send('Skip');
        }
        // Write the chunk to file
        fs.writeFileSync(path.join(__dirname, req.body.hash+"/"+req.body.index),req.body.chunk);
    }
    // Handle internal error
    catch(err){
        console.log(err);
        return res.status(500).send('Fail');
    }
    // No error, upload success
    return res.status(200).send('Uploaded');
});

/*
* End point for combining file
*/
app.post('/combine',function(req,res,next){
    try
    {
        // Check whether the directory of file exist
        if (!fs.existsSync(path.join(__dirname, req.body.hash))) {
            return res.status(404).send('Not found');
        }
        // Clean previous output file
        if (fs.existsSync(path.join(__dirname, req.body.hash+"_output"))) {
            fs.unlinkSync(path.join(__dirname, req.body.hash+"_output"));
        }
        // Combine chunks to output file
        let index=0;
        while(fs.existsSync(path.join(__dirname, req.body.hash+"/"+index))){;
            fs.appendFileSync(path.join(__dirname, req.body.hash+"_output"), 
            fs.readFileSync(path.join(__dirname, req.body.hash+"/"+index).toString()));
            // Remove combined chunk
            fs.unlinkSync(path.join(__dirname, req.body.hash+"/"+index));
            index++;
        }
        // Combining ends due to missing chunk
        if(fs.readdirSync(path.join(__dirname, req.body.hash)).length){
            return res.status(403).send('Missing chunk');
        }
    }
    // Handle internal error
    catch(err){
        console.log(err);
        return res.status(500).send('Fail');
    }
    // Combining success
    return res.status(200).send('Combined');
})



const http = require('http');
const PORT = 8000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});