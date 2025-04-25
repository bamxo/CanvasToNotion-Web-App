Current setup:

ok. so we have:
firebase for handling hosting. to work with firebase, you need to globally install the firebase command line tools by doing: 

npm install -g firebase

which installs firebase to your terminal so you can call firebase as a command

now in my command line i also called:

firebase experiments:enable webframeworks

firebase init hosting

in the root of my server.

i believe these should re-direct you to the firebase website ni order to log into your firebase account. 

I used this as a reference for figuring out how to set up fb:
https://firebase.google.com/docs/hosting/frameworks/frameworks-overview
https://firebase.google.com/docs/hosting/frameworks/express

in order to launch the backend locally you have to:

build the typescript into javascript by calling 
tsc src/*

run node on the server in the dist/ folder

to deploy the server onto the internet, you would run 

firebase deploy, which should deploy whatever is in the "public" folder. 

the idea for me was to in this way distinguish between what is being tested and what has been deployed onto the firebase cloud.

Additionally, for testing you would create tests with ts-jest. 

Issues with this method:

I find that this setup is somewhat hacky since i don't have like a streamlined environment for developing the server.