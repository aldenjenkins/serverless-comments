# Serverless Comment System
Deploy an entirely functional comment system to your entirely static website.

# Features
* AWS Lambda
* Google reCAPTCHA verification
* DynamoDB
* SES mailing to the site owner for comment updates

# Installation
* Install the [serverless framework](https://serverless.com/)
* Create an AWS account
* Add IAM permissions for serverless. Serverless has a [video tutorial](https://www.youtube.com/watch?v=KngM5bfpttA), but ive included the instructions below
  - In the AWS search bar, search for “IAM”.
  - On the IAM page, click on “Users” on the sidebar, then the “Add user” button.
  - On the Add user page, give the user a name – something like “serverless” is appropriate. Check “Programmatic access” under Access type then click next.
  - On the permissions screen, click on the “Attach existing policies directly” tab, search for “AdministratorAccess” in the list, check it, and click next.
  - On the review screen you should see your user name, with “Programmatic access”, and “AdministratorAccess”, then create the user.
  - The confirmation screen shows the user “Access key ID” and “Secret access key”, you’ll need these to provide the Serverless Framework with access. In your CLI, type 
      `yarn sls config credentials --provider aws --key YOUR_ACCESS_KEY_ID --secret YOUR_SECRET_ACCESS_KEY`, replacing YOUR_ACCESS_KEY_ID and YOUR_SECRET_ACCESS_KEY with the keys on the confirmation screen.

Your credentials are configured now, but while we’re in the AWS console let’s 

* [Set up Simple Email Service](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-email-addresses-procedure.html)

  - Click Console Home in the top left corner to go home.
  - On the home page, in the AWS search bar, search for “Simple Email Service”.
  - On the SES Home page, click on “Email Addresses” in the sidebar.
  - On the Email Addresses listing page, click the “Verify a New Email Address” button.
  - In the dialog window, type your email address then click “Verify This Email Address”.
  - You’ll receive an email in moments containing a link to verify the address. Click on the link to complete the process.

* Create a DynamoDB table. I recommend using a partition key called 
“page” of type “string”, and a primary sort key called “ts” (“timestamp” is a reserved word in dynamodb) of type “number”. 
call the table “\<your name\>-comments”:
* 
* `cp config.json.example config.json` 
* Edit config.json to make it your own values
* Run serverless Deploy

# Troubleshooting
* Be sure you are using the same Jquery link provided in the form.html, using
  a different version can change the names of data when they are sent during
  requests. Ex. one version of jquery sends a post that includes 
  `"method": "POST"` while another Jquery version refers to it in the request
  as `"httpMethod": "POST"`
* Be sure you include the `integration: LAMBDA` in serverless.yaml, otherwise
    you will run into CORS issues.
