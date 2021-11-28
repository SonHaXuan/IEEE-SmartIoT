# pull the Node.js Docker image
FROM node:10.18.0

# create the directory inside the container
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm install

# copy the generated modules and all other files to the container
COPY . .

# install pm2
RUN npm install pm2 -g

# compile source to es5
RUN npm run build-babel

# our app is running on port 5000 within the container, so need to expose it
EXPOSE 3333

# the command that starts our app
# CMD ["npm", "run", "dev"]
CMD ["pm2-runtime", "dist/index.js"]
