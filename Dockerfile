FROM node:argon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/data
VOLUME /usr/src/data
ENV WATZDPRICE_SITEMAP_PATH /usr/src/data/
COPY ./package.json /usr/src/app/
RUN npm install --no-dev --no-bin-links

COPY ./src /usr/src/app/src
COPY ./config /usr/src/app/config

CMD [ "npm", "start" ]
