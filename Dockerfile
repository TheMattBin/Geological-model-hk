# Use Node.js as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (change if necessary)
EXPOSE 3000

# Command to run your application in development mode
CMD ["npm", "run", "dev"]