FROM node:18.14.2
WORKDIR /lifeeasy-server
COPY . .
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]