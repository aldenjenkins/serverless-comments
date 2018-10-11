'use strict';

const config = require('./config.json');
const captchaSecret = config['captchaSecret']; 
const mailTo = config['sendMailTo'];
const request = require('request');
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const ses = new AWS.SES();

function isURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name and extension
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?'+ // port
  '(\\/[-a-z\\d%@_.~+&:]*)*'+ // path
  '(\\?[;&a-z\\d%@_.,~+&:=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return pattern.test(str);
}

module.exports.processCommentRequest = (event, context, callback) => {

    // response to the user always uses this template
    var end = (resp) => {
        const response = {
            status: '200',
            statusDescription: 'OK',
            headers: {
                vary: [{
                    key: 'Vary',
                    value: '*',
                }],
                'last-modified': [{
                    key: 'Last-Modified',
                    value: '2018-09-19',
                }],
                'Content-Type': [{
                    key: 'Content-Type',
                    value: 'application/json',
                }],
            },
            body: JSON.stringify(resp),
        };

        callback(null, response);
    }

    console.log(JSON.stringify(event, null, 2));
    console.log(JSON.stringify(context, null, 2));

    var ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
    var time = Date.now();


    // Creating a new comment
    if (event.method == 'POST') {

        var name;
        var page;
        var website;
        var captcha;
        var comment;
        var params;

        function sanitizeBodyData(){

            var missing = new Array();

            name = event.body['name'];
            if (name === undefined || name === "" || name.length > 30) {
                if( name.length > 30) end({'result': 'error', 'reason': `Name must be less than 30 chars`})
                missing.push('name');
            }
            website = event.body['website'];
            if (website === undefined || website === "") {
                website = 'null';
            }
            if (website != 'null'){
              if (!isURL(website)){
                console.log("bad url: ", website)
                missing.push('website');
              }
            }
            page = event.body['article'];
            if (page === undefined || page === "") {
                missing.push('article');
            }
            comment = event.body['comment'];
            if (comment === undefined || comment === "" ) {
                if( comment.length > 500) end({'result': 'error', 'reason': `Comment must be less than 500 chars`})
                missing.push('comment');
            }
            captcha = event.body['g-recaptcha-response'];
            if(event.body['g-recaptcha-response'] === undefined || event.body['g-recaptcha-response'] === '' || event.body['g-recaptcha-response'] === null) {
                missing.push('reCAPTCHA');
            }
            console.log(missing);

            // If missing the name or comment, return an error
            if (missing.length != 0) {
                end({'result': 'error', 'reason': `missing fields: ${missing}`});
            }

            // Build the putitem object for ddb
            params = {
              TableName: config['dynamoTable'],
              Item: {
                'ts' : {N: time.toString()},
                'name' : {S: name},
                'comment': {S: comment},
                'page': {S: page},
                'website': {S: website},
              },
              ConditionExpression: 'attribute_not_exists(ts)'
            };
        }
        function checkArticleNot404(){
            return new Promise(function (resolve, reject){
                request(`${config['baseUrl']}${page}`,function(error, response, body){
                    if (response.statusCode == 200){
                        resolve(true);
                    }else{
                        end({'result': 'error', 'reason': `blog does not exist`});
                    }
                });
            });
        }
        function checkCaptcha(){
          return new Promise(function (resolve, reject) {
            var url = "https://www.google.com/recaptcha/api/siteverify?secret=" + captchaSecret + "&response=" + captcha;
            request(url,function(error,response,body) {
              body = JSON.parse(body);
              if (!error && response.statusCode == 200 && body.success == true){
                  resolve(true);
              }else{
                  end({result: "error", reason: "Bad captcha"});
              }
            });
          });
        }
        function sendMail(){
         name = name.trim();
         var subject = "New comment on blog " + page;
         var message = "Comment from " + name + "\n\n" + comment.trim();
         ses.sendEmail({
           Destination: {
             ToAddresses: [
               'Alden Jenkins <'+ config['sendMailTo'] + '>'
             ]
           },
           Message: {
             Body: {
                 Text: {
                 Data: message,
                 Charset: 'UTF-8'
               }
             },
             Subject: {
               Data: subject,
               Charset: 'UTF-8'
             }
           },
           Source: 'Comment bot 2.fun <' +  config['sendMailTo'] + '>',
         }, (err, data) => {
           if (err) {
             // email was not sent
             console.log('Error Sending Email:', JSON.stringify(err, null, 2));
             end({result: "error", reason: "couldnt send email to owner"});
           }
         });
        }
        (async () => {
            await Promise.all([sanitizeBodyData(), checkArticleNot404(), checkCaptcha()]);
            // Call DynamoDB to add the item to the table
            sendMail();
            ddb.putItem(params, function(err, data) {
              if (err) {
                //console.log("Error", err);
                end({result: "error", reason: err});
              } else {
                //console.log("Success", data);
                end({result: "ok", reason: data});
              }
            });
        })()

    // IT'S A GET, so get the comments
    } else if (event.method == 'GET') {
        // The query to send to ddb
        var params = {
            ExpressionAttributeValues: {
                ":v1": {
                    S: event.path.id
                }
            },
            KeyConditionExpression: `page = :v1`,
            TableName: config['dynamoTable']
        };
        ddb.query(params, function(err, data) {
            if (err) {
                end({result: "error", reason: err});
            } else {
                end(data);
            }
        });
    }
};
