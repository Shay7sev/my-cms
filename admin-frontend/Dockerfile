FROM nginx:alpine

ADD ./dist /usr/share/nginx/html/dist
ADD ./nginx.conf /etc/nginx/nginx.conf

RUN chmod -R 777 /usr/share/nginx/html

ENV PORT 6011